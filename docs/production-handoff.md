# Production handoff

Status as of November 7, 2026. The production **API** is live at `https://api.eisaistudio.com`. The website is not deployed yet, and live email is blocked on Mailtrap account steps (see below). Server details and the reasons behind them are in [deployment.md](deployment.md#production-server-as-built-november-2026).

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

### Not yet verified

- Email delivery: registration verification, resend, forgot/reset password. Blocked until Mailtrap sender information and the compliance check are done.
- Image upload to the bucket and public image URLs.
- First admin account ([admin-account-setup.md](admin-account-setup.md)) and admin menu create/edit/delete.
- Reboot recovery, certificate renewal dry run (`sudo certbot renew --dry-run`), backups and restore.
- The rest of the [live acceptance checklist](deployment.md#live-acceptance-checklist).

## Must change before handoff to the client

Things set up temporarily under a team member's identity, or not finished yet.

### Ownership and billing

- [ ] **AWS plan:** the project is on the AWS **Free plan** ($100 credits, ends **April 26, 2027**, or earlier if credits run out at about $13/month). Upgrade to the paid plan in **AWS Settings → Billing** before then, or the server, database and bucket are lost.
- [ ] Make sure the client owns the AWS project and invite maintainers as team members in AWS Settings. Set a budget alert or spend limit. Remove student team members' access at the end of the engagement.
- [ ] GoDaddy is currently accessed through delegate access. Confirm the client keeps full ownership, and remove delegate access when the work is done.

### Email (Mailtrap)

- [ ] Moving Mailtrap from a team member's personal account to the client's account (`contact@eisaistudio.com`):
  1. ~~Add `eisaistudio.com` (not `www.`) as a sending domain in the client's account.~~ Done. Its domain verification record is `CNAME mt29 → smtp.mailtrap.live`, added in GoDaddy. DKIM (`rwmt1`/`rwmt2._domainkey`), DMARC (`_dmarc`) and `mt-link` are the same for every Mailtrap account and were already in place.
  2. The account owner accepts Mailtrap's sending rules and clicks **Verify DNS records**.
  3. Complete **sender information** (the client's business name and address; only the account owner can edit it) and the **compliance check**.
  4. Create an API token with **Admin on the `eisaistudio.com` domain only** (no "View Email Content", nothing else).
  5. On the server, run `sudo eisai-set-secrets` and enter only the new `MAILTRAP_TOKEN` (press Enter to keep the other values).
  6. Delete the domain and token from the personal account, then delete the personal account's old verification record `CNAME mt98` in GoDaddy. Do **not** delete `mt29`, `mt-link`, `rwmt1`/`rwmt2._domainkey` or `_dmarc`.
- [ ] `EMAIL_FROM` is `no-reply@eisaistudio.com`. If the client wants replies, change it to a real Microsoft 365 mailbox.

### Credentials to rotate or hand over

- [ ] **Bucket access key:** created by a team member. Create a new key in Lightsail (bucket → Permissions), set it with `sudo eisai-set-secrets`, then delete the old key. A Lightsail bucket allows at most two keys.
- [ ] **Certbot notification email:** change it to the client's or maintainer's address: `sudo certbot update_account --email NEW_ADDRESS`.
- [ ] **MongoDB admin credentials** live in `/etc/eisai/mongo-admin.env` on the server (root-only). Copy them into the client's password manager. The app uses a separate, limited user.
- [ ] `JWT_SECRET` and the database app password were generated on the server and never left it. No rotation is needed unless the server is compromised. Rotating `JWT_SECRET` logs everyone out.
- [ ] **Temporary developer admin accounts:** remove any admin accounts team members made for testing. List admins with `db.users.find({role: "admin"}, {email: 1})` in the database shell (see Day-to-day operations), then demote with `db.users.updateOne({email: "DEV_EMAIL"}, {$set: {role: "customer"}})` or delete with `db.users.deleteOne({email: "DEV_EMAIL"})`. Only the client's own admin account should be left.

### Unfinished production work

- [ ] **Backups:** there are none yet. At minimum, enable Lightsail automatic snapshots. Properly, schedule `mongodump` to a private backup bucket and test a restore ([deployment.md](deployment.md#backups-and-tested-restore)).
- [ ] **Website:** the React site isn't deployed. Password-reset emails link to `https://eisaistudio.com/reset-password` (`WEB_ORIGIN`), so resets don't work until the site is live. To host it on this server:
  1. Build `apps/web` with `VITE_API_URL=https://api.eisaistudio.com/api`.
  2. Add an Nginx server block for `eisaistudio.com` and `www`.
  3. Change the GoDaddy apex `A @` record from "Parked" to `18.189.160.224`.
  4. Run `sudo certbot --nginx -d eisaistudio.com -d www.eisaistudio.com`.
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
| Deploy a new commit      | See [Updating to a new commit](deployment.md#updating-to-a-new-commit)                                                                       |
| Certificate renewal test | `sudo certbot renew --dry-run`                                                                                                               |
| Database shell (admin)   | `sudo bash -c 'source /etc/eisai/mongo-admin.env; mongosh -u "$MONGO_ADMIN_USER" -p "$MONGO_ADMIN_PASSWORD" --authenticationDatabase admin'` |

Secrets live only in `/etc/eisai/` on the server. Nothing in this repository contains them.

## Rebuilding the server from scratch

1. Create a Lightsail instance in `us-east-2` from **Ubuntu 22.04**, 2 GB bundle. Paste [deploy/lightsail-bootstrap.sh](../deploy/lightsail-bootstrap.sh) as the launch script, after updating `COMMIT` to the release you want.
2. Attach the static IP `eisai-prod-ip`. Set the firewall to 80/443 open and SSH from Lightsail browser SSH only.
3. Watch `sudo tail -f /var/log/eisai-bootstrap.log` until `=== bootstrap done` (about 15 minutes).
4. Run `sudo eisai-set-secrets`, then `sudo certbot --nginx -d api.eisaistudio.com`.
5. Restore the database from the latest backup (see the backups item above; there is nothing to restore from yet).
