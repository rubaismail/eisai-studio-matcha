# Website (React + TypeScript + Tailwind)

Runs at `http://localhost:5173`. Start it from the repo root with `npm run dev`.

## Where your code goes

| Folder            | Put this here                                                                                | Example                              |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `src/pages/`      | One file per page/URL. Add its `<Route>` in `src/App.tsx`.                                   | `LoginPage.tsx`, `AdminPage.tsx`     |
| `src/components/` | Pieces used on more than one page.                                                           | `Button.tsx`, `MenuItemCard.tsx`     |
| `src/api/`        | Functions that call the API. Pages never call `fetch` directly.                              | `auth.ts` → `login(email, password)` |
| `src/auth/`       | Signed-in state, route guards and shared form checks. See [Authentication](#authentication). | `useAuth()`, `<RequireAdmin>`        |
| `src/types/`      | TypeScript types for API data. Must match SwaggerHub.                                        | `user.ts`                            |
| `src/index.css`   | Brand colors and fonts (Tailwind `@theme`). Style everything else with Tailwind classes.     |                                      |

Tests sit next to the file they test: `MenuPage.tsx` → `MenuPage.test.tsx`.

**Adding a page, step by step** (e.g. Login):

1. API call: `src/api/auth.ts`
2. Page: `src/pages/LoginPage.tsx` (build it from the Figma frame linked in the issue)
3. Route: add `<Route path="/login" element={<LoginPage />} />` in `src/App.tsx`
4. Link to it from `src/components/Navbar.tsx` if needed

## Authentication

Everything a page needs to know about the signed-in user. Don't read `localStorage` or decode the token yourself; use these instead.

### Who is signed in: `useAuth()`

```tsx
import { useAuth } from '../auth/AuthContext';

const { user, logOut } = useAuth();
// user: { _id, email, role: 'customer' | 'admin' } or null when signed out
```

| Field             | What it does                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `user`            | The signed-in user, or `null`. Kept across reloads and synced between tabs.                                                         |
| `sessionExpired`  | `true` if the last session ran out (the login page uses it to say "Your session expired").                                          |
| `signIn(session)` | Saves `{ token, user }` from `login()`. Only the login page should need this.                                                       |
| `logOut()`        | **Use this for "Log out" buttons.** Goes to the home page, then signs out. If a form has unsaved changes, its prompt can cancel it. |
| `signOut()`       | Signs out immediately, without navigating. Only for special cases, like "Log in with a staff account" on the Staff only page.       |

`useAuth()` only works inside `<AuthProvider>`, which `main.tsx` already wraps around the whole app.

Login tokens last 1 hour. When one runs out, the user is signed out automatically, and the next protected page sends them to log in with a "session expired" message. Login does not return the user's name, and there is no profile endpoint, so only `_id`, `email` and `role` are available.

### Protecting a page: `<RequireAuth>` and `<RequireAdmin>`

Wrap the page's route in `src/App.tsx`:

```tsx
import { RequireAdmin, RequireAuth } from './auth/guards';

<Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
<Route path="/admin/reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
```

| Visitor            | `RequireAuth`               | `RequireAdmin`              |
| ------------------ | --------------------------- | --------------------------- |
| Signed out         | Sent to `/login`, then back | Sent to `/login`, then back |
| Signed-in customer | Sees the page               | Sees "Staff only"           |
| Signed-in admin    | Sees the page               | Sees the page               |

New pages under `/admin/...` can go inside the existing `<RequireAdmin>` route group in `App.tsx` instead of being wrapped one by one.

The guards only decide what the website shows. The API checks the token and the admin role on every protected request, so never rely on a guard alone for security.

### Calling the API

Use the helpers in `src/api/client.ts` from your `src/api/*.ts` file:

| Helper                                   | Sends the login token? | Use for                               |
| ---------------------------------------- | ---------------------- | ------------------------------------- |
| `apiGet(path)`                           | No                     | Public reads, like the menu           |
| `apiRequest(path, { method, body })`     | Yes                    | Anything that needs a signed-in user  |
| `apiRequest(path, { ..., auth: false })` | No                     | Public calls, like login and register |
| `apiUpload(path, formData)`              | Yes                    | File uploads                          |

A failed request throws an `ApiError`:

```ts
import { ApiError } from './client';

try {
  await deleteMenuItem(id);
} catch (err) {
  if (err instanceof ApiError && err.status === 403) {
    // err.serverMessage: the API's "error" text, if any
    // err.retryAfterSeconds: how long to wait after a 429, if the API said
  }
}
```

If a request that sent the current token gets a `401`, the user is signed out automatically as an expired session. Pages don't need to handle that case themselves.

`src/api/auth.ts` already has every account call: `login`, `register`, `verifyEmail`, `resendVerification`, `forgotPassword`, `checkResetLink` and `resetPassword`. The reset page calls `checkResetLink` when it opens so a used or expired link shows "Link expired" before the form (#113).

### Account forms

Reuse these so every account page looks and behaves the same:

- `src/auth/validation.ts`: `emailError`, `newPasswordError` and `confirmPasswordError` return a message or `undefined`. They match the API's rules (8+ characters, at most 72 bytes, passwords never trimmed).
- `src/auth/useResendVerification.ts`: sends verification emails and handles the API's one-minute cooldown and 2-per-15-minutes limit. `components/ResendVerificationForm.tsx` is a ready-made "enter your email, send a new link" form, and `components/ResendStatusMessage.tsx` shows the result.
- `components/AccountLayout.tsx` (page heading and column), `TextField.tsx` (labelled input with error message), `Notice.tsx` (error or info box) and `styles.ts` (button and link classes).

Account pages so far: `/login`, `/register`, `/check-email`, `/verify-email` and `/account`. `/forgot-password` and `/reset-password` come with #50.
