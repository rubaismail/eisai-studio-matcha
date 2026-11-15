# Responsiveness and accessibility review (issue #27)

Checked on November 15, 2026. Result: **pass**, after two fixes made during the review (page titles and a skip link, below).

## Setup

| | |
| --- | --- |
| Browser | Google Chrome 157 on macOS (Intel), driven through the Claude in Chrome extension |
| Public pages | Live site, `https://eisaistudio.com` |
| Account and admin pages | Same code run locally (`npm run dev`) against a throwaway in-memory MongoDB holding a copy of the live menu, a test admin and a test customer, so no real account or data was touched |
| Viewports | 375 px (phone), 768 px (tablet), 1280 px (desktop). Each page was loaded in a same-site frame at that exact width, because a desktop Chrome window can't be made narrower than about 500 px |
| Automated scan | Lighthouse 12.8.2 accessibility category (axe-core rules: contrast, labels, alt text, names, ARIA, headings, `lang`), mobile and desktop presets |

## Pages checked

Public: `/`, `/menu`, `/our-story`, `/products`, `/privacy`, `/login`, `/register`, `/forgot-password`, `/check-email`, `/reset-password`, `/verify-email`, and an unknown URL (404 page).
Signed in: `/account` (customer), `/admin`, `/admin/new`, `/admin/:id/edit` (admin).

## Layout at each width

For each page at each width the check measured horizontal overflow (page wider than the screen) and listed any element sticking out past the right edge.

| Pages | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| 12 public pages | No overflow | No overflow | No overflow |
| Account, admin list, add drink, edit drink | No overflow | No overflow | No overflow |

## Labels, alt text, names and structure

Same 48 page/width combinations:

- Every `<img>` has an `alt` attribute (decorative ones use `alt=""`).
- Every link and button has a name a screen reader can read. Admin controls name the drink they act on, e.g. "On menu: Golden Hour", "Edit Golden Hour", "Delete Golden Hour".
- Every form field has a label.
- Every page has exactly one `<h1>`, a `<main>` landmark and `lang="en"`.

## Lighthouse accessibility scores (live site)

| Page | Mobile | Desktop |
| --- | --- | --- |
| `/` (home) | 100 | — (see [lighthouse.md](lighthouse.md)) |
| `/menu` | 100 | 100 |
| `/our-story` | 100 | 100 |
| `/products` | 100 | 100 |
| `/privacy` | 100 | 100 |
| `/login` | 100 | 100 |
| `/register` | 100 | 100 |
| `/forgot-password` | 100 | 100 |

No failing audits, including color contrast.

## Keyboard

| Check | Result |
| --- | --- |
| Log in with keyboard only (type email, Tab, type password, Enter) | Pass, lands on the admin page |
| Focus is visible on links, buttons and fields | Pass, 2 px dark outline (`focusRing`) |
| Admin "Delete" dialog opened with Enter | Focus moves to **Cancel** |
| Tab inside the dialog | Stays inside (4 Tabs cycled back to "Delete for good") |
| Escape | Closes the dialog without deleting; focus returns to "Delete Golden Hour" |
| Phone menu and account "Delete account" step | Escape closes, Tab stays inside, focus returns to the button that opened it (covered by `Navbar` and `AccountPage` tests) |
| Skip link (after fix) | First Tab shows "Skip to main content"; Enter moves focus to `<main>`; next Tab lands on the first menu filter |

## Problems found and fixed

| Problem | Why it matters | Fix | Status |
| --- | --- | --- | --- |
| Every page's tab title was "Eisai Studio" | Screen readers announce the title first, and tabs and history were indistinguishable (WCAG 2.4.2) | `apps/web/src/pageTitle.ts` gives each route its own title, e.g. "Menu \| Eisai Studio", "Edit drink \| Eisai Studio"; set from `App.tsx` on every navigation | Fixed, tested |
| No way to skip the header links | Keyboard users tabbed through the header on every page (WCAG 2.4.1) | Hidden "Skip to main content" link, shown on focus, moves focus to `<main id="main">` | Fixed, tested |

## Noted, not changed

- A few standalone text links are shorter than 24 px tall (e.g. "Read our story →" at 21 px, footer "Privacy policy" at 11 px). They pass WCAG 2.5.8 through its spacing exception, since nothing else is within 24 px, so nothing was changed.
- The mobile app (Flutter) is out of scope here; its testing is in [mobile_testing.md](mobile_testing.md).
