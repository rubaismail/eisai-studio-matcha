# Website (React + TypeScript + Tailwind)

Runs at `http://localhost:5173`. Start it from the repo root with `npm run dev`.

## Where your code goes

| Folder            | Put this here                                                                            | Example                              |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `src/pages/`      | One file per page/URL. Add its `<Route>` in `src/App.tsx`.                               | `LoginPage.tsx`, `AdminPage.tsx`     |
| `src/components/` | Pieces used on more than one page.                                                       | `Button.tsx`, `MenuItemCard.tsx`     |
| `src/api/`        | Functions that call the API. Pages never call `fetch` directly.                          | `auth.ts` → `login(email, password)` |
| `src/types/`      | TypeScript types for API data. Must match SwaggerHub.                                    | `user.ts`                            |
| `src/index.css`   | Brand colors and fonts (Tailwind `@theme`). Style everything else with Tailwind classes. |                                      |

Tests sit next to the file they test: `MenuPage.tsx` → `MenuPage.test.tsx`.

**Adding a page, step by step** (e.g. Login):

1. API call: `src/api/auth.ts`
2. Page: `src/pages/LoginPage.tsx` (build it from the Figma frame linked in the issue)
3. Route: add `<Route path="/login" element={<LoginPage />} />` in `src/App.tsx`
4. Link to it from `src/components/Navbar.tsx` if needed
