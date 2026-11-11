# Production handoff

Status as of November 7, 2026. The production **API** is live at `https://api.eisaistudio.com`. Live email works through the client's Mailtrap account. The website is not deployed yet. Server details and the reasons behind them are in [deployment.md](deployment.md#production-server-as-built-november-2026).

This repository is public. Never put secrets, AWS account IDs, or customer data in this file.

## What is live

| Component     | Where                                             | Notes                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API           | `https://api.eisaistudio.com/api/...`             | Node 24, systemd service `eisai-api`, behind Nginx. Let's Encrypt TLS, auto-renewed by certbot (first certificate expires 2027-02-04).                                                                                                                                                                  |
| Database      | MongoDB 8.0 on the same Lightsail instance        | Database `eisai_production`. Empty: nothing seeded.                                                                                                                                                                                                                                                     |
| Image storage | Lightsail bucket `eisai-menu-images-8402db`       | Public object reads. Upload not yet tested live.                                                                                                                                                                                                                                                        |
| Server        | Lightsail `eisai-prod`, Ubuntu 22.04, `us-east-2` | Static IP `18.189.160.224`. SSH only through the Lightsail console's browser SSH.                                                                                                                                                                                                                       |
| DNS           | GoDaddy                                           | `A api → 18.189.160.224`, plus Mailtrap records `mt29` (client account), `mt98` (old personal account, to delete), `mt-link`, `rwmt1._domainkey`, `rwmt2._domainkey`. The apex `eisaistudio.com` is still GoDaddy "Parked". Microsoft 365 email records (MX, autodiscover, SPF, etc.) were not changed. |

### Verified on November 7, 2026

- `GET /api/health` → 200 `{"status":"ok"}` over HTTPS.
- `GET /api/menu` and `/api/menu/seasonal` → 200, empty lists.
- `GET /api/admin/menu` with no login → 401.
- `npm run check` (lint, type checks, all tests, both builds) passed on the server for commit `d9d91e0`.
- Live email through the client's Mailtrap account: register → resend-verification → verification email received → verify link → `Email verified`. A direct Mailtrap API send from the server also succeeded.
- A verified account was promoted to `admin` with the database shell ([admin-account-setup.md](admin-account-setup.md)). It is a team member's temporary account; see the credentials checklist below.

### Not yet verified

- Forgot/reset password end to end. The email sends, but the link points to the website (`WEB_ORIGIN`), which is not deployed.
- Admin login, menu create/edit/delete, image upload to the bucket and public image URLs.
- Reboot recovery, certificate renewal dry run (`sudo certbot renew --dry-run`), backups and restore.
- The rest of the [live acceptance checklist](deployment.md#live-acceptance-checklist).

## Must change before handoff to the client

Things set up temporarily under a team member's identity, or not finished yet.

### Ownership and billing

- [ ] **AWS plan:** the project is on the AWS **Free plan** ($100 credits, ends **April 26, 2027**, or earlier if credits run out at about $13/month). Upgrade to the paid plan in **AWS Settings → Billing** before then, or the server, database and bucket are lost.
- [ ] Make sure the client owns the AWS project and invite maintainers as team members in AWS Settings. Set a budget alert or spend limit. Remove student team members' access at the end of the engagement.
- [ ] GoDaddy is currently accessed through delegate access. Confirm the client keeps full ownership, and remove delegate access when the work is done.

### Email (Mailtrap)

Mailtrap now runs on the client's account (`contact@eisaistudio.com`). Done on November 7, 2026:

- Sending domain `eisaistudio.com` (not `www.`) is **Verified**, with sender information and the compliance check complete. Its domain verification record is `CNAME mt29 → smtp.mailtrap.live` in GoDaddy. DKIM (`rwmt1`/`rwmt2._domainkey`), DMARC (`_dmarc`) and `mt-link` are the same for every Mailtrap account.
- API token `eisai-prod-api`: Admin on `eisaistudio.com` only (Mailtrap ticks "View Email Content" automatically with Admin), never expires. It is set on the server as `MAILTRAP_TOKEN`.

Remaining:

- [ ] Delete the `eisaistudio.com` domain and its token from the team member's personal Mailtrap account. Then delete the old verification record `CNAME mt98` in GoDaddy. Do **not** delete `mt29`, `mt-link`, `rwmt1`/`rwmt2._domainkey` or `_dmarc`.
- [ ] To replace the token later, create a new one with the same permissions, set it with `sudo eisai-set-secrets` (see the paste warning under [Day-to-day operations](#day-to-day-operations)), confirm email still sends, then delete the old token.
- [ ] `EMAIL_FROM` is `no-reply@eisaistudio.com`. If the client wants replies, change it to a real Microsoft 365 mailbox.

### Credentials to rotate or hand over

- [ ] **Bucket access key:** created by a team member. Create a new key in Lightsail (bucket → Permissions), set it with `sudo eisai-set-secrets`, then delete the old key. A Lightsail bucket allows at most two keys.
- [ ] **Certbot notification email:** change it to the client's or maintainer's address: `sudo certbot update_account --email NEW_ADDRESS`.
- [ ] **MongoDB admin credentials** live in `/etc/eisai/mongo-admin.env` on the server (root-only). Copy them into the client's password manager. The app uses a separate, limited user.
- [ ] `JWT_SECRET` and the database app password were generated on the server and never left it. No rotation is needed unless the server is compromised. Rotating `JWT_SECRET` logs everyone out.
- [ ] **Temporary developer admin accounts:** remove any admin accounts team members made for testing. List admins with `db.users.find({role: "admin"}, {email: 1})` in the database shell (see Day-to-day operations), then demote with `db.users.updateOne({email: "DEV_EMAIL"}, {$set: {role: "customer"}})` or delete with `db.users.deleteOne({email: "DEV_EMAIL"})`. Only the client's own admin account should be left.

### Unfinished production work

- [ ] **Backups:** there are none yet. At minimum, enable Lightsail automatic snapshots. Properly, schedule `mongodump` to a private backup bucket and test a restore ([deployment.md](deployment.md#backups-and-tested-restore)).
- [ ] **Website:** `https://eisaistudio.com`, served by Nginx on this server from the live release (`/srv/eisai/current/apps/web/dist`). The site calls `/api/` on its own origin, which Nginx proxies to the same API, so `sudo eisai-deploy` updates and rolls back the website and API together. No separate build or `VITE_API_URL` is needed. Config: [deploy/eisai-web.nginx.conf](../deploy/eisai-web.nginx.conf). One-time setup:
  1. GoDaddy: change the apex `A @` record from "Parked" to `18.189.160.224` (keep `CNAME www → @`).
  2. `sudo eisai-deploy` to put a release that includes the website live.
  3. `sudo cp /srv/eisai/current/deploy/eisai-web.nginx.conf /etc/nginx/sites-available/eisai-web`
  4. `sudo ln -sfn /etc/nginx/sites-available/eisai-web /etc/nginx/sites-enabled/eisai-web && sudo nginx -t && sudo systemctl reload nginx`
  5. Once `eisaistudio.com` resolves to the server: `sudo certbot --nginx -d eisaistudio.com -d www.eisaistudio.com` (choose redirect). `www` redirects to `https://eisaistudio.com` because the API only allows browser requests from exactly `WEB_ORIGIN`.
  6. Sign up with a test address and click the verification email through to `Email verified`; test a password reset.
- [ ] **Mobile app:** point Flutter's API base URL at `https://api.eisaistudio.com/api`.
- [ ] **Monitoring:** nothing alerts if the server or API goes down. Add Lightsail metric alarms (CPU, status checks) and an uptime check on `/api/health`.
- [ ] **OS end of support:** Ubuntu 22.04 standard support ends April 2027. Moving to a newer Ubuntu depends on MongoDB fixing the kernel 6.19+ bug ([why](deployment.md#why-ubuntu-2204-and-not-2404)).
- [ ] Optional hardening: add `server_tokens off;` to Nginx so it doesn't advertise its version.

## Day-to-day operations

All commands run in Lightsail browser SSH (**Lightsail console → eisai-prod → Connect using SSH**).

| Task                     | Command                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| API status / logs        | `sudo systemctl status eisai-api` / `sudo journalctl -u eisai-api -n 100 --no-pager`                                                         |
| Restart API              | `sudo systemctl restart eisai-api`                                                                                                           |
| Set or rotate secrets    | `sudo eisai-set-secrets` (blank answer keeps the current value)                                                                              |
| Health check             | `curl -s localhost:4000/api/health`                                                                                                          |
| Deploy a new commit      | `sudo eisai-deploy` (rollback: `sudo eisai-deploy PREVIOUS_COMMIT`). See [Updating to a new commit](deployment.md#updating-to-a-new-commit)  |
| Certificate renewal test | `sudo certbot renew --dry-run`                                                                                                               |
| Database shell (admin)   | `sudo bash -c 'source /etc/eisai/mongo-admin.env; mongosh -u "$MONGO_ADMIN_USER" -p "$MONGO_ADMIN_PASSWORD" --authenticationDatabase admin'` |

Secrets live only in `/etc/eisai/` on the server. Nothing in this repository contains them.

### Lightsail browser terminal gotchas

- **Long pastes break.** The browser terminal can drop the start of a long pasted command, or split it across lines. Paste short commands one at a time, and check that the line starts correctly before pressing Enter. Ctrl+C may not reach the server; close the tab instead.
- **Hidden prompts hide mistakes.** `sudo eisai-set-secrets` doesn't show what you type at `(hidden)` prompts. In November 2026, the command text itself was accidentally saved as `MAILTRAP_TOKEN`, and every email failed with `Unauthorized`. After setting a secret, check its length and last 4 characters without printing it:

  ```bash
  sudo awk -F= '/^MAILTRAP_TOKEN=/{print length($2), substr($2,length($2)-3)}' /etc/eisai/api.env
  ```

  Compare them with the masked token in Mailtrap (Settings → API Tokens).

- **Test Mailtrap directly** when email fails, using the token saved on the server (it isn't printed). Run each line separately:

  ```bash
  T=$(sudo awk -F= '/^MAILTRAP_TOKEN=/{print substr($0,index($0,"=")+1)}' /etc/eisai/api.env)
  J='{"from":{"email":"no-reply@eisaistudio.com"},"to":[{"email":"YOUR_EMAIL"}],"subject":"Test","text":"Test"}'
  curl -s https://send.api.mailtrap.io/api/send -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "$J"; echo; unset T J
  ```

  `{"success":true,...}` means the token and domain work, so the problem is in the app. Check `sudo journalctl -u eisai-api -n 100 --no-pager`.

## Rebuilding the server from scratch

1. Create a Lightsail instance in `us-east-2` from **Ubuntu 22.04**, 2 GB bundle. Paste [deploy/lightsail-bootstrap.sh](../deploy/lightsail-bootstrap.sh) as the launch script, after updating `COMMIT` to the release you want.
2. Attach the static IP `eisai-prod-ip`. Set the firewall to 80/443 open and SSH from Lightsail browser SSH only.
3. Watch `sudo tail -f /var/log/eisai-bootstrap.log` until `=== bootstrap done` (about 15 minutes).
4. Run `sudo eisai-set-secrets`, then `sudo certbot --nginx -d api.eisaistudio.com`.
5. Restore the database from the latest backup (see the backups item above; there is nothing to restore from yet).
