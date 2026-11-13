# Live acceptance test — November 12, 2026 (issue #35)

Manual and scripted checks of the **production** website and API, after the
November 12 redeploy of `main` (includes account deletion, PR #110). There is no
separate staging server, so this ran on production with a disposable test account,
which was deleted at the end. Mobile (Flutter) was out of scope; its design was
finalized earlier and is covered by [#52](mobile_testing.md).

## Environment

| | |
| --- | --- |
| Website | `https://eisaistudio.com` |
| API | `https://api.eisaistudio.com` (Lightsail `eisai-prod`, MongoDB 8.0, `us-east-2`) |
| Email | Client's Mailtrap account, delivered to a team member's Gmail `+alias` |
| Images | Lightsail bucket `eisai-menu-images-8402db` |
| Browser | Chrome on macOS 13 |
| Testers | Team member (passwords, admin flow, email links) and Claude Code (browser driving, API checks) |

Passwords were typed only by the team member. Screenshots that show the test
email address are not committed because this repository is public.

## Results

| # | Flow | Steps | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Sign-up | `/register` with name, email, password | "Check your inbox" page; email sent | Page shown with address, resend cooldown and spam hint; email arrived in Gmail | ✅ |
| 2 | Verify email | Open emailed link | "Email verified"; token removed from address bar | As expected ([screenshot](live-acceptance/email-verified.jpg)) | ✅ |
| 3 | Used verify link | Reopen the same link | Rejected | "Link expired… invalid, expired or already used" with resend form | ✅ |
| 4 | Login | `/login` with verified account | Logged in, lands on My account | As expected; header shows My account / Log out | ✅ |
| 5 | Customer blocked from admin (website) | Visit `/admin` as customer | Blocked | "Staff only… doesn't have staff access" | ✅ |
| 6 | Customer blocked from admin (API) | `POST /api/menu` and `GET /api/admin/menu` with the customer's session | 403, nothing created | Both 403 `Admin access required`; public menu unchanged | ✅ |
| 7 | Logout | Header → Log out | Session cleared, protected pages redirect | Saved token removed; `/account` redirects to `/login` | ✅ |
| 8 | Forgot password | `/forgot-password` | Generic "check your inbox"; email sent | As expected ([screenshot](live-acceptance/forgot-password-sent.jpg)); email arrived | ✅ |
| 9 | Reset password | Open reset link, set new password, log in | New password works, old one fails | Reported working by the team member | ✅ |
| 10 | Used reset link | Reopen the same reset link | Rejected | Rejected **only after submitting** a new password; no change to the account | ✅ (UX follow-up [#113](https://github.com/rubaismail/eisai-studio-matcha/issues/113)) |
| 11 | Delete account | My account → Delete account with password | Account removed, session ends | Reported working by the team member; test account removed | ✅ |
| 12 | Admin menu flow | Admin login → add item with photo → edit → hide/unhide → delete; check public menu after each | Public menu follows each change | Reported working by the team member | ✅ |
| 13 | Public images | Load `/menu` logged out | Photos load from the bucket without login | 8 of 8 images loaded from `eisai-menu-images-8402db.s3.us-east-2.amazonaws.com` | ✅ |
| 14 | Network failure: login | Block requests in the page, submit login | Error message, no crash | "Something went wrong on our end. Please try again in a moment." ([screenshot](live-acceptance/login-network-error.jpg)) | ✅ (see note) |
| 15 | Network failure: menu | Block requests, open Menu; then restore and Try again | Error state with retry; recovers | "A little hiccup… Check your connection" + Try again ([screenshot](live-acceptance/menu-network-error.jpg)); retry loaded all 8 drinks ([screenshot](live-acceptance/menu-recovered.jpg)) | ✅ |
| 16 | Rate limits | Repeated forgot-password requests | Extra requests blocked for 15 min | Emails stopped after the per-email limit (2 per 15 min), as configured in `apps/api/src/routes/auth.routes.ts` | ✅ |

Network failures were simulated by replacing `fetch` in the page, not by cutting
the real connection.

## API rejection checks

Run with `curl` against the live API, no login. Every write and admin route
rejects anonymous and forged-token callers.

```text
# Live API checks 2026-11-13T03:06:50Z
GET /health                                                expect 200  got 200  {"status":"ok"}
GET /menu (public)                                         expect 200  got 200  {"items":[{"_id":"6af4db3850120e74d78b92
GET /menu/seasonal (public)                                expect 200  got 200  {"items":[]}
GET /admin/menu no login                                   expect 401  got 401  {"error":"Authentication required"}
GET /menu/admin/menu no login                              expect 401  got 401  {"error":"Authentication required"}
GET /menu/admin-menu no login                              expect 401  got 401  {"error":"Authentication required"}
POST /menu no login                                        expect 401  got 401  {"error":"Authentication required"}
POST /menu forged/garbage token                            expect 401  got 401  {"error":"Invalid or expired token"}
PUT /menu/:id no login                                     expect 401  got 401  {"error":"Authentication required"}
DELETE /menu/:id no login                                  expect 401  got 401  {"error":"Authentication required"}
POST /uploads no login                                     expect 401  got 401  {"error":"Authentication required"}
GET /auth/verify bogus token                               expect 400  got 400  {"error":"Missing or invalid input, malf
GET /auth/verify no token                                  expect 400  got 400  {"error":"Missing or invalid input, malf
POST /auth/reset-password bogus token                      expect 400  got 400  {"error":"Missing or invalid input, malf
POST /auth/login unknown account                           expect 401  got 401  {"error":"Invalid email or password"}
POST /auth/delete-account no login                         expect 401  got 404  {"error":"Not found"}
```

The `delete-account` 404 was before the redeploy (the route was not live yet).
After the redeploy it returned **401** without a login.

Expired-token behavior (verify and reset links older than 15 minutes, expired
logins) is covered by the automated suites in [api/](api/README.md), including
integration tests against a real MongoDB.

## Findings

| Finding | Severity | Follow-up |
| --- | --- | --- |
| A used password-reset link is only rejected after the user types and submits a new password (the verify link is rejected on open) | Low, UX only | [#113](https://github.com/rubaismail/eisai-studio-matcha/issues/113) |
| Login network error says "Something went wrong on our end", although the cause was the visitor's connection | Cosmetic | Optional wording change; not filed |

No defects blocking release were found.
