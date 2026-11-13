# Lightsail staging deployment

Issue #22. Target: one client-owned Linux Lightsail instance for Nginx, the built React site, one Node API process and authenticated MongoDB. The Eisai project's selected Region is US East (Ohio), `us-east-2`, using AWS profile `eisai`. All Regional resources must remain in this Region. The user selected Lightsail. Production runs on a 2 GB Lightsail instance at `eisaistudio.com` / `api.eisaistudio.com`, with a $20/month budget alert and daily automatic snapshots; see [production-handoff.md](production-handoff.md#ownership-and-billing) for billing, backups and the remaining maintenance-owner confirmation. These instructions do not provision AWS resources.

## Production server as built (November 2026)

This section records what is actually deployed and why. The generic runbook below still applies. For live status, the pre-handoff checklist and day-to-day commands, see [production-handoff.md](production-handoff.md).

| Item               | Value                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lightsail instance | `eisai-prod`, `us-east-2a`, Ubuntu **22.04** LTS, 2 GB RAM bundle (`small_3_0`)                                                                                                                                                          |
| Static IP          | `eisai-prod-ip` = `18.189.160.224`                                                                                                                                                                                                       |
| API hostname       | `https://api.eisaistudio.com` (GoDaddy DNS: `A api → 18.189.160.224`). The website will live on `eisaistudio.com`, so the API has its own Nginx server block instead of the shared-origin template.                                      |
| Database           | MongoDB 8.0 on the same instance, loopback only, auth on, database `eisai_production`, app user `eisaiApp` (`readWrite` on that database only). Admin credentials: `/etc/eisai/mongo-admin.env` (root-only).                             |
| Secrets            | `/etc/eisai/api.env` (root-only). Set or rotate with `sudo eisai-set-secrets`.                                                                                                                                                           |
| Deploys            | `sudo eisai-deploy [commit]`: builds the commit in its own release folder, switches only if checks pass, auto-rolls back if unhealthy. See [Updating to a new commit](#updating-to-a-new-commit).                                        |
| Website            | `https://eisaistudio.com` (`www` redirects). Nginx serves `/srv/eisai/current/apps/web/dist` and proxies `/api/` to the API, so the site and API deploy together. Config: [deploy/eisai-web.nginx.conf](../deploy/eisai-web.nginx.conf). |
| Image storage      | Lightsail bucket `eisai-menu-images-8402db`, public object reads, accessed with a bucket access key.                                                                                                                                     |
| Firewall           | 80/443 open; SSH (22) only from Lightsail browser SSH (`lightsail-connect`). Also `ufw` on the host.                                                                                                                                     |
| TLS                | Let's Encrypt via `sudo certbot --nginx -d api.eisaistudio.com`; certbot edited the Nginx site file and renews automatically.                                                                                                            |
| Provisioning       | [deploy/lightsail-bootstrap.sh](../deploy/lightsail-bootstrap.sh), passed as the instance launch script. It sets up Nginx for HTTP only; certbot adds HTTPS afterwards.                                                                  |
| Email              | Mailtrap, on the client's account (`contact@eisaistudio.com`), sending domain `eisaistudio.com` (verified). Token set with `sudo eisai-set-secrets`.                                                                                     |

### Why Ubuntu 22.04 and not 24.04

The first build used Lightsail's Ubuntu 24.04 image. MongoDB 8.0 refused to start:

> MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB.

Lightsail's 24.04 image ships a 6.19+ kernel. MongoDB 8.0+ crashes on those kernels because its bundled TCMalloc violates the kernel's rseq ABI, so MongoDB added a startup check that exits instead ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912); see also SERVER-125742 and SERVER-136848). No fixed MongoDB version existed as of November 2026. Options considered:

- **Ubuntu 22.04 (chosen):** runs a pre-6.19 kernel, so MongoDB 8 works unmodified and the database stays on the instance as planned.
- MongoDB Atlas: avoids the kernel entirely, but the database would move off AWS billing and out of the planned design.
- Pinning an old kernel on 24.04: blocks kernel security updates and is easy to undo by accident.

The bootstrap script refuses to run on a 6.19+ kernel so this can't fail silently. **Follow-up:** Ubuntu 22.04 standard support ends April 2027. Before then, check MongoDB's release notes and the issues above. Once a MongoDB release supports kernel 6.19+, build a new 24.04 (or later) instance, restore a backup onto it, and move the static IP. Until then, don't install HWE or other kernels newer than 6.18 on this server; check with `uname -r`.

### Lightsail launch script gotcha

Lightsail runs launch scripts with `/bin/sh` and ignores the `#!/bin/bash` line, so bash-only syntax (`set -o pipefail`, `>(...)`) fails on line 1. The bootstrap script is a small sh wrapper that writes the real script to `/root/eisai-bootstrap.sh` and runs it with bash. Output goes to `/var/log/eisai-bootstrap.log`; cloud-init's own log is `/var/log/cloud-init-output.log`.

### Updating to a new commit

#### How it works

Updates go to the **same Lightsail instance**. You don't create a new server per update. Each deployed GitHub commit gets its own folder, and a shortcut (symlink) named `current` points at the one that is live:

```text
/srv/eisai/releases/
├── d9d91e0…/          ← previous release (kept for rollback)
└── 4f2a7c1…/          ← new release, cloned and built from GitHub
/srv/eisai/current  →  /srv/eisai/releases/4f2a7c1…   ← systemd runs the API from here
/etc/eisai/api.env     ← secrets, shared by every release, never in a release folder
MongoDB data           ← separate from the code; unaffected by switching releases
```

The flow:

1. Merge to `main` on GitHub. Never edit code on the server.
2. On the server, clone that commit into a **new** folder named after the commit, then install, test and build it there. The live API keeps running from the old folder while you do this.
3. Switch `current` to the new folder and restart `eisai-api`. That's the only moment of downtime, a few seconds. The service runs the production preflight on startup and refuses to start if the config is invalid.
4. Check health. If something's wrong, switch `current` back to the previous folder and restart. That rollback takes seconds because the old build is still on disk.

Unlike a `git pull` in a single folder, a failed build never touches the running site, and there's always a known-good version to go back to.

#### Deploy with `eisai-deploy` (recommended)

Open **Lightsail console → eisai-prod → Connect using SSH**, then run:

```sh
sudo eisai-deploy
```

That deploys the latest commit on `main`. To deploy a specific commit, pass its full 40-character hash: `sudo eisai-deploy <commit>`.

The script ([deploy/eisai-deploy.sh](../deploy/eisai-deploy.sh), installed as `/usr/local/sbin/eisai-deploy`) runs every step below in order:

1. Looks up the commit and clones it into `/srv/eisai/releases/<commit>`. If a folder for that commit is already there, it's reused.
2. Runs `npm ci && npm run check` as `ubuntu`. **If that fails, it stops and nothing live changes.** On success it writes a `.eisai-built` marker in the release folder.
3. Switches `current` atomically. If the release's `deploy/eisai-api.service` changed, it installs that too. Then it restarts `eisai-api`.
4. Waits up to 30 seconds for `/api/health` to report `ok`. **If it doesn't, the script prints the service log, switches back to the previous release and restarts it automatically.**

The script never deletes releases, secrets or database data. It prints the releases on disk so you can clean up old ones yourself.

Run it in a terminal you can leave open: the check step takes several minutes on the 2 GB server. The browser terminal is fine for this, because the command is short.

#### Roll back

```sh
ls -1t /srv/eisai/releases          # newest first; pick the previous known-good commit
sudo eisai-deploy PREVIOUS_COMMIT
```

A release that has the `.eisai-built` marker switches back in seconds, with no rebuild. A release without one, such as the first release built by the bootstrap script on an older server, is checked again first, which takes minutes. If the API is down and you need it back immediately, switch manually:

```sh
sudo ln -sfn /srv/eisai/releases/PREVIOUS_COMMIT /srv/eisai/current.next
sudo mv -Tf /srv/eisai/current.next /srv/eisai/current
sudo systemctl restart eisai-api
curl -s localhost:4000/api/health; echo
```

#### What the script does by hand (fallback)

Only needed if `eisai-deploy` isn't installed. **Never skip step 3.** The service runs the built code (`apps/api/dist`) and `node_modules` from the release folder, and `git clone` contains neither, so switching to an unbuilt release takes the API down. In the browser terminal, run each line separately, in one terminal tab, so `$C` stays set.

```sh
# 1. Note what's live now, so you can roll back.
readlink /srv/eisai/current

# 2. Find the latest commit on main and clone it into its own folder.
cd /srv/eisai/releases
C=$(git ls-remote https://github.com/rubaismail/eisai-studio-matcha.git refs/heads/main | cut -c1-40)
echo "Deploying $C"
git clone --quiet https://github.com/rubaismail/eisai-studio-matcha.git "$C"
cd "$C" && git checkout --quiet "$C"

# 3. Install, then lint + typecheck + test + build. Stop here if this fails;
#    nothing live has changed yet.
npm ci && npm run check && touch .eisai-built

# 4. Switch the live symlink atomically and restart the API.
sudo ln -sfn "/srv/eisai/releases/$C" /srv/eisai/current.next
sudo mv -Tf /srv/eisai/current.next /srv/eisai/current
sudo systemctl restart eisai-api

# 5. Verify. If it isn't ok, roll back (above).
sleep 3; curl -s localhost:4000/api/health; echo
```

`C=$(...)` and `echo "Deploying $C"` must be separate commands. On one line without `;`, `$C` is still empty when `echo` runs.

#### Installing or updating `eisai-deploy`

New servers get it from the bootstrap script. On a server built before the script existed, or to pick up a newer version of it, install it from a reviewed commit on `main`:

```sh
C=FULL_COMMIT_HASH
curl -fsSL "https://raw.githubusercontent.com/rubaismail/eisai-studio-matcha/$C/deploy/eisai-deploy.sh" -o /tmp/eisai-deploy
sudo install -m 0755 /tmp/eisai-deploy /usr/local/sbin/eisai-deploy && rm /tmp/eisai-deploy
```

Use a commit hash, not `main`, so you install exactly the version you reviewed.

Rollback only switches **code**. If the new release changed how data is stored in MongoDB, the old code may not understand the new data. Take a backup before deploying changes like that.

#### Clean up old releases

Each release folder is a few hundred MB (it includes `node_modules`). Keep the current one and the last two or three; delete older ones, but never the one `readlink /srv/eisai/current` shows:

```sh
rm -rf /srv/eisai/releases/OLD_COMMIT
```

#### When you _would_ create a new instance

Only to replace the server itself: a newer Ubuntu (see [Why Ubuntu 22.04](#why-ubuntu-2204-and-not-2404)), a bigger bundle, or recovery from a broken server. Lightsail can't change an instance's OS in place, but a bigger bundle can be made from a snapshot. To move to a new instance:

1. Build the new instance with [deploy/lightsail-bootstrap.sh](../deploy/lightsail-bootstrap.sh). Its `/etc/eisai/api.env` gets a new database password and JWT secret.
2. Copy the database over (`mongodump` on the old server, `mongorestore` on the new one), then run `sudo eisai-set-secrets` with the same Mailtrap and bucket values.
3. Move the static IP `eisai-prod-ip` from the old instance to the new one: Lightsail → Networking → static IP → detach, then attach. DNS (`api → 18.189.160.224`) stays the same, so there's no GoDaddy change.
4. Run `sudo certbot --nginx -d api.eisaistudio.com` on the new instance, check health, then delete the old instance.

Changing `JWT_SECRET` logs out every user. To avoid that, copy the old `JWT_SECRET` into the new `api.env`.

## Readiness and scope

PR #71 implements `POST /api/auth/forgot-password` and `POST /api/auth/reset-password?token=...`; all 14 baseline API operations now have implementations. Verification links open `WEB_ORIGIN/verify-email` and reset links open `WEB_ORIGIN/reset-password`, so the website must be deployed before customers can verify or reset; the reset form is a separate dependency (#50). Do not describe the customer reset experience as ready until that page is deployed and tested. Admin pages and other frontend work remain separate. `/api/health` only checks MongoDB connectivity, not email or S3.

## Server prerequisites

1. Obtain individual access to the client-owned AWS account (#2). Confirm a monthly budget, named maintenance owner and AWS billing alert before purchasing (done for production; see [Ownership and billing](production-handoff.md#ownership-and-billing)). Choose a supported Ubuntu LTS image compatible with the selected MongoDB release (currently Ubuntu 22.04; see "Why Ubuntu 22.04 and not 24.04" above). Start with enough RAM for MongoDB plus Node and build tools; measure before selecting/resizing the bundle. Keep staging and production databases and credentials separate.
2. Attach a static IP, select a staging hostname and point its DNS to that IP. The template assumes the website and API share one HTTPS origin. Permit public TCP 80/443; permit SSH only from authorized administrator IPs. Apply the same restrictions to IPv6 if enabled. Do not expose 4000 or 27017. Configure the host firewall too.
3. Install Node 24 and npm, Nginx, Git, MongoDB server, MongoDB Database Tools and a certificate renewal client using their official instructions for that OS. Install Node at `/usr/bin/node`, or adjust both paths in the service file. Do not use a developer's nvm path in systemd. Run `node --version` before building.
4. Configure MongoDB persistent storage, bind only to loopback and enable authorization. Bootstrap the database administrator locally, then create an application user with `readWrite` on `eisai_staging` only. Use a separate backup identity. Enable `mongod` on boot. Keep staging test data non-sensitive. Atlas remains local-development-only for this project.
5. Create a system user `eisai` without interactive login. Use `/srv/eisai/releases/<commit>` for immutable application releases, `/srv/eisai/current` for the active symlink, and `/etc/eisai` for secrets. The API user needs read/execute access to releases, not write access. Nginx's worker needs read access to the built web files.

## Secrets and AWS image storage

Copy [deploy/.env.example](../deploy/.env.example) to `/etc/eisai/api.env`, root-owned mode `0600`. It is read by systemd, not committed. Use simple `KEY=value` entries, without shell substitutions. Set:

- `MONGODB_URI` to the authenticated local AWS database, e.g. `mongodb://USER:ENCODED_PASSWORD@127.0.0.1:27017/eisai_staging?authSource=eisai_staging`. Percent-encode credentials. Do not put it in command-line arguments or logs.
- A separate random `JWT_SECRET` of at least 32 characters; generate it privately with a cryptographic random generator.
- `WEB_ORIGIN` to the website's HTTPS origin (no trailing slash, to match browser CORS origins). Verification and password-reset email links open website pages on this origin. (`APP_URL` is no longer used; an old value in `api.env` is ignored and can be deleted.)
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

**Production today:** Lightsail automatic snapshots of the whole server run daily at 03:00 UTC, and Lightsail keeps the last seven. How to test a restore from a snapshot, and the status of the `mongodump` setup below, are tracked in [production-handoff.md](production-handoff.md#unfinished-production-work).

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

Production status (November 13, 2026). Evidence: [live acceptance test](test-results/live-acceptance-2026-11-12.md) and [production-handoff.md](production-handoff.md).

- [x] Public health returns 200 with `status: ok`; menu reads succeed; unauthenticated admin access returns 401.
- [ ] Authenticated MongoDB survives restart, unique email index exists, ports 4000/27017 are unreachable publicly. (Ports confirmed unreachable from outside; restart and index not yet checked on the server.)
- [x] Register a controlled test address, receive verification email, verify, log in and resend as needed.
- [x] Forgot-password email actually arrives, opens the website form (#50), resets once, rejects reuse/expiry, and old-password login fails while new-password login succeeds.
- [x] Provision first admin through [the restricted admin process](admin-account-setup.md). Test create/edit/hide/unhide/delete with test menu data; customer JWT cannot access admin routes.
- [ ] Upload a valid image larger than 1 MiB but no larger than 5 MiB, confirm its public URL loads, and reject an oversized image. Remove disposable test objects through an authorized maintenance identity.
- [ ] Verify proxy-aware rate limits cannot be bypassed with forged forwarding headers; check CORS from the actual website and configure Flutter's API base URL.
- [ ] Test certificate renewal, service reboot recovery, alerting, backup restore and rollback. Billing alerting and daily snapshots are set up (#22); record the remaining results in [production-handoff.md](production-handoff.md#not-yet-verified).

## References

- [AWS Lightsail regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html)
- [Nginx proxy path handling](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) and [body limits](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)
- [systemd service lifecycle](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [MongoDB backup tools](https://www.mongodb.com/docs/database-tools/mongodump/) and [restore tools](https://www.mongodb.com/docs/database-tools/mongorestore/)
