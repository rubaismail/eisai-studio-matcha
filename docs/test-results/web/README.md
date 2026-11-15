# Website test results — 2026-11-15 (issue #34)

Run on commit `5311392` (main; Node v24.21.0, Vitest 5.0.4, macOS 13 arm64). Raw output is saved unedited except for local folder paths, which are replaced with `<repo>`.

| Suite | Command | What it uses | Result |
| --- | --- | --- | --- |
| [Unit and component](unit-tests-2026-11-15.txt) | `npm test -w @eisai/web` (add `-- --reporter=verbose` to list every test) | Vitest and Testing Library in jsdom; `fetch` is mocked, so no API or database is needed | **251 / 251 passed** in 25 files |

To rerun: from the repository root, `npm ci`, then the command above. Tests live next to the code they cover (`apps/web/src/**/*.test.tsx`).

## What issue #34 asked for, and where it's tested

| Requirement | Test files | Examples |
| --- | --- | --- |
| Menu loading, empty and error states | `pages/MenuPage.test.tsx`, `pages/HomePage.test.tsx` | An empty menu says so instead of showing filters; a load error can be retried; no search matches offers to clear the search; a filter with no drinks offers to show them all; the home page holds space while the menu loads and offers to retry if it can't load |
| Registration and login errors | `pages/RegisterPage.test.tsx`, `pages/LoginPage.test.tsx`, `auth/validation.test.ts` | 409 says the email is taken and links to log in; 401 shows "incorrect email or password"; 403 asks to verify and can resend the link; 429 disables the button and says how long to wait; network and server failures; focus goes to the first invalid field |
| Verification and password-reset states | `pages/VerifyEmailPage.test.tsx`, `pages/CheckEmailPage.test.tsx`, `pages/ForgotPasswordPage.test.tsx`, `pages/ResetPasswordPage.test.tsx` | A good link verifies once and removes the token from the address bar; an expired or used link (400) offers a new one; a missing token shows "Link expired" without calling the API; the resend and reset limits (429); server errors can be retried |
| Admin guard | `auth/guards.test.tsx`, `App.test.tsx` | Signed-out visitors to `/admin` are sent to log in and back; customers see "Staff only"; an expired session is passed to the login page; admins see the dashboard |
| Form validation | `components/MenuItemForm.test.tsx` | Required-field errors linked to their fields with a focused summary; an empty category shows an error on the field |
| Failed save and upload feedback | `components/MenuItemForm.test.tsx`, `pages/AdminPage.test.tsx` | Wrong file type and photos over 5 MB rejected in the browser without uploading; a failed upload keeps the input; a failed save keeps everything typed and shows an error; failed list load, checkbox save and delete each show an error and leave the data unchanged |

Also covered: account deletion (`AccountPage`), the phone menu and keyboard focus (`Navbar`), page titles and the skip link (`App`, `pageTitle`, from #27), and lazy-loaded page errors (`App.lazyError`).

Not covered here: real API responses and email delivery. Those are in the [API test results](../api/README.md) and the [live acceptance run](../live-acceptance-2026-11-12.md).
