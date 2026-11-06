# Lightsail staging deployment

Issue #22. Target: one client-owned Linux Lightsail instance for Nginx, the built React site, one Node API process and authenticated MongoDB. Region recommendation for Orlando: US East (N. Virginia), `us-east-1`. The user selected Lightsail; hostname, instance size/budget, account access and maintenance owner still need confirmation. Nothing in this PR provisions AWS resources.

## Readiness and scope

PR #71 implements `POST /api/auth/forgot-password` and `POST /api/auth/reset-password?token=...`; all 14 baseline API operations now have implementations. Reset links open `WEB_ORIGIN/reset-password`; the website form is a separate dependency (#50). Do not describe the customer reset experience as ready until that page is deployed and tested. Admin pages and other frontend work remain separate. `/api/health` only checks MongoDB connectivity, not email or S3.

## Server prerequisites

1. Obtain individual access to the client-owned AWS account (#2). Confirm a monthly budget, named maintenance owner and AWS billing alert before purchasing. Choose a supported Ubuntu LTS image compatible with the selected MongoDB release. Start with enough RAM for MongoDB plus Node and build tools; measure before selecting/resizing the bundle. Keep staging and production databases and credentials separate.
2. Attach a static IP, select a staging hostname and point its DNS to that IP. The template assumes the website and API share one HTTPS origin. Permit public TCP 80/443; permit SSH only from authorized administrator IPs. Apply the same restrictions to IPv6 if enabled. Do not expose 4000 or 27017. Configure the host firewall too.
3. Install Node 24 and npm, Nginx, Git, MongoDB server, MongoDB Database Tools and a certificate renewal client using their official instructions for that OS. Install Node at `/usr/bin/node`, or adjust both paths in the service file. Do not use a developer's nvm path in systemd. Run `node --version` before building.
4. Configure MongoDB persistent storage, bind only to loopback and enable authorization. Bootstrap the database administrator locally, then create an application user with `readWrite` on `eisai_staging` only. Use a separate backup identity. Enable `mongod` on boot. Keep staging test data non-sensitive. Atlas remains local-development-only for this project.
5. Create a system user `eisai` without interactive login. Use `/srv/eisai/releases/<commit>` for immutable application releases, `/srv/eisai/current` for the active symlink, and `/etc/eisai` for secrets. The API user needs read/execute access to releases, not write access. Nginx's worker needs read access to the built web files.

## Secrets and AWS image storage

Copy [deploy/.env.example](../deploy/.env.example) to `/etc/eisai/api.env`, root-owned mode `0600`. It is read by systemd, not committed. Use simple `KEY=value` entries, without shell substitutions. Set:

- `MONGODB_URI` to the authenticated local AWS database, e.g. `mongodb://USER:ENCODED_PASSWORD@127.0.0.1:27017/eisai_staging?authSource=eisai_staging`. Percent-encode credentials. Do not put it in command-line arguments or logs.
- A separate random `JWT_SECRET` of at least 32 characters; generate it privately with a cryptographic random generator.
- `WEB_ORIGIN` to the website's HTTPS origin (no trailing slash, to match browser CORS origins) and `APP_URL` to the API's HTTPS origin. Both are the staging hostname for this topology. Reset links use the former; verification links use the latter.
- Live Mailtrap credentials, a verified sender/domain and `MAILTRAP_USE_SANDBOX=false`. Sandbox captures messages and does not prove delivery to customers.
- `AWS_REGION`, `AWS_S3_BUCKET` and `AWS_S3_PUBLIC_URL` for the actual image bucket/distribution. Public image reads must work without a login. Keep a private S3 bucket behind CloudFront with origin access control, or document the approved public-read configuration. Never grant public write access.
- A dedicated least-privilege credential identity for uploads on Lightsail. Permit `s3:PutObject` only on `arn:aws:s3:::YOUR_IMAGE_BUCKET/menu/*`; add KMS permissions only if your chosen encryption requires them. Store and rotate credentials securely. Do not assume EC2 instance-profile roles are attached to Lightsail. For temporary credentials, arrange renewal and set `AWS_SESSION_TOKEN`.

Keep `HOST=127.0.0.1`, `TRUST_PROXY=loopback`, port 4000, and rate limiting enabled. Single-process rate-limit counters reset on restart; multiple workers require a shared store. Production startup fails on missing configuration, unsafe public URLs, disabled throttling or invalid limit values. Preflight validates settings, not remote permissions or delivery.

## Build and first deployment

On the target Linux architecture, check out an approved commit into a new release directory. Do not copy macOS `node_modules` or seed production automatically. As a non-root build/deployment user, from that release directory:

```sh
npm ci
npm run check
```

This builds `apps/api/dist` and `apps/web/dist`. The web client uses the same-origin API in this topology. Preserve the lockfile and record the exact commit and test results. Do not place an `apps/api/.env` file inside the release; systemd supplies the environment.

1. Point `/srv/eisai/current` to the tested release. Copy `deploy/eisai-api.service` to `/etc/systemd/system/eisai-api.service`. Confirm the user, binary paths and file permissions match the server.
2. Obtain a valid TLS certificate for the staging hostname using an HTTP-01 bootstrap server or DNS challenge. Replace the hostname/certificate paths in `deploy/nginx.conf.example`; install it in Nginx's `http` context (for example, a site file included from that context). Do not enable a configuration referring to nonexistent certificates. Remove conflicting default sites.
3. Run `sudo nginx -t`. Then `sudo systemctl daemon-reload`, `sudo systemctl enable --now eisai-api`, and reload Nginx. `ExecStartPre` executes the compiled deployment preflight with the real service environment; failed checks prevent startup.
4. Inspect `sudo systemctl status eisai-api` and `sudo journalctl -u eisai-api -n 100 --no-pager` privately. Do not paste secrets or raw action tokens into tickets. The access-log template omits query strings and referrers; restrict error-log access/retention because errors can include request URLs.
5. Run `node scripts/smoke-api.mjs https://YOUR_STAGING_HOST` from a trusted machine. Verify TLS certificate renewal. Reboot the server and repeat smoke checks to verify MongoDB, API and proxy recovery.

The Nginx template preserves `/api/`, overwrites forwarding headers, allows 6 MiB request bodies for 5 MiB images plus multipart overhead, and serves React routes through `index.html`. API authentication still determines access; CORS is not authorization.

## Redeploy, restart and rollback

Build each approved commit in a new release directory using `npm ci && npm run check`. Preserve the previous release and take a database backup before changes that affect data. Run preflight under the service environment before releasing (or let `ExecStartPre` gate the restart). Switch the current symlink atomically on Linux:

```sh
# Replace COMMIT with the approved release directory name.
sudo ln -s /srv/eisai/releases/COMMIT /srv/eisai/current.next
sudo mv -Tf /srv/eisai/current.next /srv/eisai/current
sudo systemctl restart eisai-api
node scripts/smoke-api.mjs https://YOUR_STAGING_HOST
```

If smoke tests fail, switch the symlink back to the recorded previous release and restart again. Inspect logs before retrying. Rollback does not undo database migrations: changes must be backward-compatible or have a separately tested restore/migration plan. Keep at least the current and last known-good releases. Restart only: `sudo systemctl restart eisai-api`. The process handles SIGTERM, stops accepting requests, drains active requests and disconnects MongoDB; a 15-second deadline bounds shutdown.

## Backups and tested restore

Use MongoDB Database Tools, a separate restricted backup identity and a private backup S3 bucket separate from image storage. Enable encryption, versioning and lifecycle retention according to the client's agreed retention policy. Restrict delete permissions so application credentials cannot delete backups. Enable Lightsail snapshots as an additional recovery layer, not the only backup.

Create root-owned mode-0600 `/etc/eisai/mongodump.yml` using the Database Tools `uri`/`password` configuration fields; keep credentials out of process arguments. Schedule a root-owned daily systemd timer or cron job that runs:

```sh
# Run in a shell script that stops on dump/upload failure.
set -eu
# Ensure this directory is root-only. Use a fresh archive name for every run.
backup_file="/var/backups/eisai/staging-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
umask 077
mongodump --config=/etc/eisai/mongodump.yml --db=eisai_staging --archive="$backup_file" --gzip
# Run the upload only if mongodump succeeds. Use a separate backup AWS credential profile.
aws s3 cp "$backup_file" s3://YOUR_PRIVATE_BACKUP_BUCKET/staging/ --profile eisai-backup
```

The scheduled wrapper must stop on any error (`set -eu`), prevent overlapping runs, alert the maintenance owner on failure, and delete local archives only after a verified remote upload. Choose a quiet maintenance window or pause API writes for a consistent standalone MongoDB dump. This single-server design has no replica-set oplog-based point-in-time recovery.

Before launch and periodically thereafter, download a backup to a restricted test host, restore into an isolated database/server (never overwrite the live database), and verify menu counts, user indexes and a test account login. Use `mongorestore --config=/etc/eisai/restore.yml --archive=DOWNLOADED_ARCHIVE --gzip --nsFrom='eisai_staging.*' --nsTo='eisai_restore_test.*'` with a restricted restore identity. Record backup timestamp, restore result and recovery duration. Agree recovery-point and recovery-time targets with the owner; remove restored sensitive data after the exercise.

## Live acceptance checklist

- [ ] Public health returns 200 with `status: ok`; menu reads succeed; unauthenticated admin access returns 401.
- [ ] Authenticated MongoDB survives restart, unique email index exists, ports 4000/27017 are unreachable publicly.
- [ ] Register a controlled test address, receive verification email, verify, log in and resend as needed.
- [ ] Forgot-password email actually arrives, opens the website form (#50), resets once, rejects reuse/expiry, and old-password login fails while new-password login succeeds.
- [ ] Provision first admin through [the restricted admin process](admin-account-setup.md). Test create/edit/hide/unhide/delete with test menu data; customer JWT cannot access admin routes.
- [ ] Upload a valid image larger than 1 MiB but no larger than 5 MiB, confirm its public URL loads, and reject an oversized image. Remove disposable test objects through an authorized maintenance identity.
- [ ] Verify proxy-aware rate limits cannot be bypassed with forged forwarding headers; check CORS from the actual website and configure Flutter's API base URL.
- [ ] Test certificate renewal, service reboot recovery, alerting, backup restore and rollback. Record evidence on #22; do not close it based on local tests alone.

## References

- [AWS Lightsail regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html)
- [Nginx proxy path handling](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) and [body limits](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)
- [systemd service lifecycle](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [MongoDB backup tools](https://www.mongodb.com/docs/database-tools/mongodump/) and [restore tools](https://www.mongodb.com/docs/database-tools/mongorestore/)
