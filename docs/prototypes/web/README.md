# Eisai Studio — Website prototype (issue #8)

**Figma:** [New direction for website](https://www.figma.com/design/h82Vx8RQ9vRYnTgwrYywka/?node-id=218-114)
**Style guide:** [Style guide frame](https://www.figma.com/design/h82Vx8RQ9vRYnTgwrYywka/?node-id=322-999) (colors with contrast checks, type scale, buttons, fields, Tailwind tokens)
**User flows:** [User flows frame](https://www.figma.com/design/h82Vx8RQ9vRYnTgwrYywka/?node-id=318-2317)
**Status:** Approved by Eisai in the client meeting.

The PNGs in `screens/` are exports of the main Figma frames: desktop at 1440px wide and phone (390px layout) exported at 2x. Figma is the source of truth and also has every remaining state (password required, session expired, checking email, expired links, reset errors, admin loading/empty/error, and phone versions of every screen). The mobile app prototype is separate, in [`docs/prototypes/`](../README.md).

## Screens in this folder

### Public site
| Screen | Desktop | Phone |
| --- | --- | --- |
| Home | `Home _ Desktop.png` | `Home _ Phone.png` |
| Menu | `Our Drinks _ Desktop.png` | `Our Drinks _ Phone.png` |
| Menu loading | `Our Drinks • Menu loading _ Desktop.png` | |
| No search results | `Our Drinks • No matches _ Desktop.png` | |
| Menu load error | `Our Drinks • Load error _ Desktop.png` | |
| Our story | `Our Story _ Desktop.png` | `Our Story _ Phone.png` |
| Products (coming soon) | `Products • Coming soon _ Desktop.png` | |
| Page not found | `404 • Page not found _ Desktop.png` | |
| Phone navigation | | `Navigation • Open _ Phone.png` |

### Accounts
| Screen | Desktop | Phone |
| --- | --- | --- |
| Log in | `Login _ Desktop.png` | `Login _ Phone.png` |
| Incorrect email or password (401) | `Login • Incorrect email or password (401) _ Desktop.png` | |
| Email not verified (403) | `Login • Verification required (403) _ Desktop.png` | |
| Too many attempts (429) | `Login • Too many attempts (429) _ Desktop.png` | |
| Create account | `Create Account _ Desktop.png` | |
| Create account errors | `Create Account • Errors _ Desktop.png` | |
| Check your inbox | `Check your Inbox _ Desktop.png` | |
| Email verified | `Email verified _ Desktop.png` | |
| Forgot password | `Reset password • Enter email _ Desktop.png` | |
| Reset link sent | `Reset password • Link sent _ Desktop.png` | |
| New password | `Reset password • New password _ Desktop.png` | |
| Password updated | `Reset password • Password updated _ Desktop.png` | |
| My account | `Account Profile _ Desktop.png` | |

### Staff menu editor
| Screen | Desktop | Phone |
| --- | --- | --- |
| Menu editor (list + edit) | `Staff • Menu editor _ Desktop.png` | `Staff • Menu editor _ Phone.png` |
| Add a drink with errors | `Staff • Add a drink errors _ Desktop.png` | |
| Delete confirmation | `Staff • Delete confirmation _ Desktop.png` | |
| Signed in without staff access | `Staff • Staff only _ Desktop.png` | |

## Flows covered
1. Visitor browses the menu (filter, search, no matches, load error).
2. Sign up → check inbox → verify email → log in.
3. Log-in problems: wrong credentials (401), unverified (403), rate limited (429).
4. Forgot password → reset link sent → new password → password updated.
5. Staff edits the menu: list, edit, add, hide/unhide (“On menu”), delete with confirmation.

## Design decisions to know when building
- **Prices** are stored (the API requires them) but not shown on the public site for now.
- **No “+” on drink tiles**; there is no drink-detail page on the website.
- **Products** shows “Coming soon” until Eisai is ready.
- **Create account** asks for first and last name separately (API requirement).
- **Reset link sent** uses neutral wording so it never reveals whether an email has an account.
- Errors use `#b42318` text/borders on `#fff5f0`; every tap target is at least 44px; every image has alt text.
- Footer locations and hours come from Eisai’s Instagram schedule.
