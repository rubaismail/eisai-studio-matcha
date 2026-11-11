# Production handoff

Status as of November 11, 2026. The production **website** is live at `https://eisaistudio.com` and the **API** at `https://api.eisaistudio.com`. Live email works through the client's Mailtrap account. The mobile app is not released to the public. Server details and the reasons behind them are in [deployment.md](deployment.md#production-server-as-built-november-2026).

This repository is public. Never put secrets, AWS account IDs, or customer data in this file.

## What is live

| Component     | Where                                             | Notes                                                                                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API           | `https://api.eisaistudio.com/api/...`             | Node 24, systemd service `eisai-api`, behind Nginx. Let's Encrypt TLS, auto-renewed by certbot (first certificate expires 2027-02-04).                                                                                                                                                               |
| Database      | MongoDB 8.0 on the same Lightsail instance        | Database `eisai_production`. Empty: nothing seeded.                                                                                                                                                                                                                                                  |
| Image storage | Lightsail bucket `eisai-menu-images-8402db`       | Public object reads. Upload not yet tested live.                                                                                                                                                                                                                                                     |
| Server        | Lightsail `eisai-prod`, Ubuntu 22.04, `us-east-2` | Static IP `18.189.160.224`. SSH only through the Lightsail console's browser SSH.                                                                                                                                                                                                                    |
| DNS           | GoDaddy                                           | `A @ → 18.189.160.224` (website), `CNAME www → @`, `A api → 18.189.160.224`, plus Mailtrap records `mt29` (client account), `mt98` (old personal account, to delete), `mt-link`, `rwmt1._domainkey`, `rwmt2._domainkey`. Microsoft 365 email records (MX, autodiscover, SPF, etc.) were not changed. |

### Verified on November 7, 2026

- `GET /api/health` → 200 `{"status":"ok"}` over HTTPS.
- `GET /api/menu` and `/api/menu/seasonal` → 200, empty lists.
- `GET /api/admin/menu` with no login → 401.
- `npm run check` (lint, type checks, all tests, both builds) passed on the server for commit `d9d91e0`.
- Live email through the client's Mailtrap account: register → resend-verification → verification email received → verify link → `Email verified`. A direct Mailtrap API send from the server also succeeded.
- A verified account was promoted to `admin` with the database shell ([admin-account-setup.md](admin-account-setup.md)). It is a team member's temporary account; see the credentials checklist below.

### Not yet verified

- Sign-up, email verification and forgot/reset password end to end **through the website** (deployed November 11, 2026). Register with a test address, click the email link through to `Email verified`, then reset the password.
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
- [ ] **Monitoring:** nothing alerts if the server or API goes down. Add Lightsail metric alarms (CPU, status checks) and an uptime check on `/api/health`.
- [ ] **OS end of support:** Ubuntu 22.04 standard support ends April 2027. Moving to a newer Ubuntu depends on MongoDB fixing the kernel 6.19+ bug ([why](deployment.md#why-ubuntu-2204-and-not-2404)).
- [ ] Optional hardening: the API still shows its Nginx version (`Server: nginx/1.18.0 (Ubuntu)`). Add `server_tokens off;` to the `server` blocks in `/etc/nginx/sites-available/eisai-api`, then `sudo nginx -t && sudo systemctl reload nginx`. The website already hides it.

## Privacy and legal

General guidance from the team, not legal advice. Have a lawyer review before relying on it.

**What the site does today (November 2026):** no cookies, no analytics, no advertising pixels, no chat widgets, no embedded third-party video. Logging in stores a sign-in token in the browser's local storage (the app uses the phone's secure storage). Accounts hold first and last name, email, a hashed password and favorites. Because of this, **no cookie banner is needed**. The privacy policy is at [`/privacy`](https://eisaistudio.com/privacy) (`apps/web/src/pages/PrivacyPage.tsx`) and is linked from the footer and the sign-up form.

**Keep the privacy policy true.** It must describe what the site actually does. Whenever any of the following changes, update the policy and its "Last updated" date (`LAST_UPDATED` in `PrivacyPage.tsx`) in the same release:

- New information collected (phone number, birthday, address, order history...).
- A new service that receives customer data (email provider, hosting, payments...).
- Google Fonts removed (#93): delete its bullet under "Who we share it with".
- Account deletion added (#102, #103): update "Your choices".

**Before adding any of these, plan the legal requirements first.** These are the features that law firms target small businesses over:

| If the client wants to add...                                                                          | They also need                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Analytics, a Meta/TikTok/Pinterest pixel, session recording (Hotjar, Clarity), or a chat widget | A consent banner that **blocks those scripts until the visitor agrees** (not just a notice), plus a cookies/tracking section in the privacy policy. Tracking without consent is the basis of the California "wiretapping" (CIPA) lawsuits filed in bulk against small business sites. |
| Embedded YouTube/Vimeo/Instagram videos, together with any tracking pixel                              | The same consent banner. Video plus a pixel is the pattern behind Video Privacy Protection Act (VPPA) suits. Self-hosted videos, as the site uses now, avoid this.                                                                                                                    |
| A newsletter or marketing emails                                                                       | CAN-SPAM: an unsubscribe link that works within 10 business days, the business's physical mailing address in every email, honest subject lines. Add it to the privacy policy.                                                                                                         |
| Text messages (SMS) to customers                                                                       | TCPA: written opt-in consent before the first text, "Reply STOP to unsubscribe" honored immediately, and records of consent. TCPA penalties are per message, so this one is expensive to get wrong.                                                                                   |
| Online ordering or payments                                                                            | Use a hosted checkout (Square, Stripe Checkout) so card data never touches this server, and update the privacy policy and add Terms of Sale.                                                                                                                                          |

**Accessibility is the biggest lawsuit risk for a Florida business website.** Florida is one of the top states for ADA website suits. Lighthouse's accessibility score only covers automated checks. Keep new pages keyboard-usable with alt text and captions, and don't install "accessibility overlay" widgets: they don't make a site compliant and have been cited in lawsuits.

**Email tracking:** the GoDaddy `mt-link` record means Mailtrap can rewrite links to track opens and clicks. Turn click tracking off for account emails (verification, password reset) in Mailtrap's sending domain settings, or mention tracking in the privacy policy.

## Day-to-day operations

All commands run in Lightsail browser SSH (**Lightsail console → eisai-prod → Connect using SSH**).

| Task                     | Command                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Website                  | `https://eisaistudio.com` (`www` redirects)                                                                                                  | Built from the same release as the API and served by Nginx; `/api/` is proxied to the API. `sudo eisai-deploy` updates both. Let's Encrypt TLS, auto-renewed (first certificate expires 2027-02-09). Config: [deploy/eisai-web.nginx.conf](../deploy/eisai-web.nginx.conf), gzip in [deploy/eisai-gzip.nginx.conf](../deploy/eisai-gzip.nginx.conf), HTTP/2 on. |
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
5. Website: `sudo cp /srv/eisai/current/deploy/eisai-web.nginx.conf /etc/nginx/sites-available/eisai-web`, `sudo ln -sfn /etc/nginx/sites-available/eisai-web /etc/nginx/sites-enabled/eisai-web`, `sudo cp /srv/eisai/current/deploy/eisai-gzip.nginx.conf /etc/nginx/conf.d/eisai-gzip.conf`, `sudo nginx -t && sudo systemctl reload nginx`, then `sudo certbot --nginx -d eisaistudio.com -d www.eisaistudio.com` (choose redirect).
6. Turn on HTTP/2: `sudo sed -i 's/listen 443 ssl;/listen 443 ssl http2;/' /etc/nginx/sites-available/eisai-web /etc/nginx/sites-available/eisai-api`, then `sudo nginx -t && sudo systemctl reload nginx`.
7. Restore the database from the latest backup (see the backups item above; there is nothing to restore from yet).
