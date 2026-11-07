#!/bin/sh
# Lightsail launch script ("user data") used to build the production server.
# See docs/deployment.md > "Production server as built" for why it looks like this.
# - Must run on Ubuntu 22.04: MongoDB 8 refuses Linux kernel >= 6.19 (SERVER-121912),
#   and Lightsail's Ubuntu 24.04 image ships a 6.19+ kernel.
# - Lightsail runs user data with /bin/sh and ignores the shebang, so this sh-compatible
#   wrapper writes the real bash script to a file and runs it with bash.
# - Contains no secrets. COMMIT pins the first release; update it before reuse.
cat > /root/eisai-bootstrap.sh <<'EOS'
#!/bin/bash
# Eisai Studio production bootstrap (Lightsail first boot, runs as root).
# Contains NO secrets: database password and JWT secret are generated on the box.
set -euo pipefail
exec > >(tee -a /var/log/eisai-bootstrap.log) 2>&1
echo "=== bootstrap start $(date -u)"
COMMIT=d9d91e0257d4c9780b6e9692d01fc8a0ca02a394
REPO=https://github.com/rubaismail/eisai-studio-matcha.git
API_HOST=api.eisaistudio.com
export DEBIAN_FRONTEND=noninteractive

# MongoDB 8 refuses kernels >= 6.19 (SERVER-121912); fail loudly if so.
uname -r
KMAJ=$(uname -r | cut -d. -f1); KMIN=$(uname -r | cut -d. -f2)
if [ "$KMAJ" -gt 6 ] || { [ "$KMAJ" -eq 6 ] && [ "$KMIN" -ge 19 ]; }; then echo "FATAL: kernel too new for MongoDB 8"; exit 1; fi

# --- swap (2 GB box: MongoDB + builds) ---
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- packages ---
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx ufw openssl
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update -y
apt-get install -y mongodb-org mongodb-database-tools
node --version

# --- host firewall (Lightsail firewall is the outer layer) ---
ufw allow OpenSSH; ufw allow 'Nginx Full'; ufw --force enable

# --- MongoDB: loopback only, auth on, app user scoped to eisai_production ---
install -d -m 0750 /etc/eisai
systemctl enable --now mongod
ok=0; for i in $(seq 1 30); do mongosh --quiet --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 && { ok=1; break; }; sleep 2; done
[ "$ok" = 1 ] || { echo "FATAL: mongod did not start"; journalctl -u mongod -n 20 --no-pager; exit 1; }
if ! grep -q '^security:' /etc/mongod.conf; then
  ADMIN_PW=$(openssl rand -hex 24); APP_PW=$(openssl rand -hex 24)
  umask 077
  printf 'MONGO_ADMIN_USER=eisaiAdmin\nMONGO_ADMIN_PASSWORD=%s\n' "$ADMIN_PW" > /etc/eisai/mongo-admin.env
  mongosh --quiet admin --eval "db.createUser({user:'eisaiAdmin',pwd:'$ADMIN_PW',roles:['root']})"
  mongosh --quiet eisai_production --eval "db.createUser({user:'eisaiApp',pwd:'$APP_PW',roles:[{role:'readWrite',db:'eisai_production'}]})"
  printf '\nsecurity:\n  authorization: enabled\n' >> /etc/mongod.conf
  sed -i 's/^\(\s*bindIp:\).*/\1 127.0.0.1/' /etc/mongod.conf
  systemctl restart mongod
  JWT=$(openssl rand -hex 48)
  cat > /etc/eisai/api.env <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
TRUST_PROXY=loopback
WEB_ORIGIN=https://eisaistudio.com
APP_URL=https://$API_HOST
MONGODB_URI=mongodb://eisaiApp:$APP_PW@127.0.0.1:27017/eisai_production?authSource=eisai_production
JWT_SECRET=$JWT
MAILTRAP_TOKEN=
EMAIL_FROM=
MAILTRAP_USE_SANDBOX=false
AWS_REGION=us-east-2
AWS_S3_BUCKET=
AWS_S3_PUBLIC_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
EOF
  chmod 600 /etc/eisai/api.env /etc/eisai/mongo-admin.env
fi
systemctl enable mongod

# --- service user + release ---
id eisai >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin eisai
install -d -o ubuntu -g ubuntu -m 0755 /srv/eisai /srv/eisai/releases
REL=/srv/eisai/releases/$COMMIT
if [ ! -d "$REL" ]; then
  sudo -u ubuntu git clone --quiet "$REPO" "$REL"
  sudo -u ubuntu git -C "$REL" checkout --quiet "$COMMIT"
fi
cd "$REL"
sudo -u ubuntu -H npm ci --no-audit --no-fund
if sudo -u ubuntu -H npm run check; then echo "CHECK: PASSED"; sudo -u ubuntu touch "$REL/.eisai-built"; else echo "CHECK: FAILED (falling back to build only)"; sudo -u ubuntu -H npm run build; fi
ln -sfn "$REL" /srv/eisai/current
cp deploy/eisai-api.service /etc/systemd/system/eisai-api.service
systemctl daemon-reload
systemctl enable eisai-api   # started after secrets are filled in

# --- nginx: HTTP only until DNS + certbot ---
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-available/eisai-api <<'EOF'
log_format eisai '$remote_addr [$time_local] "$request_method $uri $server_protocol" $status $body_bytes_sent';
server {
    listen 80;
    listen [::]:80;
    server_name api.eisaistudio.com;
    access_log /var/log/nginx/eisai-access.log eisai;
    error_log /var/log/nginx/eisai-error.log warn;
    client_max_body_size 6m;
    add_header Referrer-Policy no-referrer always;
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location / { return 404; }
}
EOF
ln -sfn /etc/nginx/sites-available/eisai-api /etc/nginx/sites-enabled/eisai-api
nginx -t && systemctl reload nginx

# --- helper: prompt for secrets without echoing them ---
cat > /usr/local/sbin/eisai-set-secrets <<'EOF'
#!/bin/bash
# Usage: sudo eisai-set-secrets   (prompts; leave blank to keep current value)
set -euo pipefail
F=/etc/eisai/api.env
setv() { local k=$1 v=$2; [ -z "$v" ] && return; grep -v "^$k=" "$F" > "$F.tmp" || true; printf '%s=%s\n' "$k" "$v" >> "$F.tmp"; chmod 600 "$F.tmp"; mv "$F.tmp" "$F"; }
for k in EMAIL_FROM AWS_S3_BUCKET AWS_S3_PUBLIC_URL AWS_ACCESS_KEY_ID; do read -rp "$k: " v; setv "$k" "$v"; done
for k in MAILTRAP_TOKEN AWS_SECRET_ACCESS_KEY; do read -rsp "$k (hidden): " v; echo; setv "$k" "$v"; done
# ExecStartPre runs the production preflight; a bad value stops startup.
if systemctl restart eisai-api; then sleep 3; curl -s http://127.0.0.1:4000/api/health; echo
else journalctl -u eisai-api -n 20 --no-pager; fi
EOF
chmod 700 /usr/local/sbin/eisai-set-secrets
# --- helper: sudo eisai-deploy [commit] (build, switch, auto-rollback) ---
if [ -f "$REL/deploy/eisai-deploy.sh" ]; then install -m 0755 "$REL/deploy/eisai-deploy.sh" /usr/local/sbin/eisai-deploy; fi
echo "=== bootstrap done $(date -u)"
EOS
chmod 700 /root/eisai-bootstrap.sh
bash /root/eisai-bootstrap.sh
