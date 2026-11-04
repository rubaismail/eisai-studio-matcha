# Eisai Studio — Mobile Prototype Workflows

**Design:** [Mobile Figma prototype](https://www.figma.com/design/YPmYcFUmGOnUbTH89i4P7q/Eisai-Studio-Website--Copy-?node-id=2007-114)  
**Target:** Flutter (Android/iOS)  
**Status:** Figma interactions tested by the design owner; external email links, API calls, and Flutter behavior are not yet implemented or tested.

## Scope and screen inventory

The prototype includes Home, Our Story, Our Drinks, Our Location, six specialty-drink detail screens, Login, Create Account, Account Profile, Check Your Inbox, mobile verification/reset request flows, and loading/empty/error states. The hamburger menu opens an overlay; closing it returns to the current screen, including the No Results Found state.

## 1. Discovery and menu

**Home:** Visitors browse featured drinks, open Our Drinks or Our Location, and interact with the spinning drink carousel. Tapping a drink brings it forward and displays its tasting profile. Dragging advances the Figma carousel one step; Flutter should support directional left/right swipes. The “At the pop-up” media strip is a design reference; actual video playback depends on final assets.

### Featured carousel — dynamic data and responsive behavior

The four drinks shown in Figma are **sample data**. In production, the homepage carousel will display publicly available drinks that the admin explicitly marks **Featured on Home** using the proposed `isFeatured: true` field. **Featured and Seasonal are independent:** the admin may feature regular drinks, seasonal drinks, a mixture, or none. A seasonal drink does not automatically appear in the carousel unless also marked featured.

The carousel will adapt to the number of available featured drinks:

- **0:** Hide the entire featured carousel section and collapse its space.
- **1:** Show one centered, static drink without rotation.
- **2–3:** Use an adapted layout with tap/swipe selection.
- **4 or more:** Show up to four orbit positions at once, while allowing rotation through all featured items (including 5, 6, 7, or more).

Images, drink identifiers, and counts must come from API data, not hardcoded Figma examples. The current Figma carousel demonstrates only the four-drink state. **`isFeatured` is proposed metadata and is not yet part of the existing API contract.** The adaptive behavior and field must be approved before implementation.

### Seasonal drinks on Home

`isSeasonal` remains the **existing, separate** API field identifying seasonal/limited-time drinks. The planned `GET /api/menu/seasonal` endpoint provides available seasonal items. Having zero seasonal drinks **does not automatically hide the Featured carousel**: regular drinks marked `isFeatured` may still appear there.

The review calls for an identified seasonal-drink section on Home. **Pending confirmation**, the proposed behavior is a distinct Seasonal Specials area that shows available seasonal items when present and **hides the entire seasonal area and collapses its space when none are available**. Alternatively, the team may agree to highlight seasonal drinks within the featured carousel using a Seasonal badge; that alternative does not replace the requirement without explicit approval. **Do not treat the separate seasonal section as completed in Figma yet.**

### Classic menu

There are three matcha blends—**Chiyo Midori, Yugen, and Shun Midori**—each offered clear or as a latte. **Tokusen** is the single hojicha blend, also available clear or as a latte. A blend is a tea selection; clear/latte is its preparation.

### Specialty drink filters

The Figma interactive component changes the visible cards without navigating to a new page. These are **sample/demo results**, not a fixed production catalog:

| Filter | Prototype examples | Sample count |
| --- | --- | ---: |
| All | Golden Hour, Mango Dango, Tokyo Rose, Toasted Coconut, Kyoto Fog, Okinawa Breeze | 6 |
| Matcha | All six examples | 6 |
| Hojicha | Golden Hour, Tokyo Rose, Toasted Coconut | 3 |
| Recommended | Golden Hour, Mango Dango, Toasted Coconut | 3 |

### API contract alignment — proposed changes pending approval

The current contract supports a single `category`, plus `isSeasonal` and `isAvailable`, but it does not yet represent drinks with both tea bases, Recommended status, or Featured on Home. The proposed additions are:

- **`teaBases`:** An array containing `matcha`, `hojicha`, or both. A drink with both appears in both filters.
- **`isRecommended`:** A boolean controlling inclusion in Recommended results and the Recommended badge.
- **`isFeatured`:** A boolean controlling inclusion in the Home spinning carousel, **independent of `isSeasonal`**.
- **`isSeasonal`:** The existing boolean identifying seasonal drinks; used by the seasonal endpoint and any approved seasonal display.
- **`isAvailable`:** The existing boolean controlling public visibility. Unavailable items must not appear in public menu or Home sections.

Keep the existing `category` field for compatibility; it will not determine Matcha, Hojicha, or Recommended filtering. The web admin's separate **Seasonal** and **Feature on Home** checkboxes are consistent with the proposed independent flags, subject to team agreement.

**Dynamic menu behavior:** The six specialty drinks and counts in Figma are examples only. Flutter will fetch currently available items and calculate counts from the returned data, reflecting admin changes to availability, tea bases, recommendations, featured status, and seasonality on refresh. Do not hardcode the six drink records or counts.

**Implementation requirements:** Record the approved decisions in a GitHub issue/PR, then update `docs/api/openapi.yaml`, the API documentation, database model, validation, tests, and web admin controls before Flutter depends on `teaBases`, `isRecommended`, or `isFeatured`. Until merged, these fields and their behavior are **proposals**, not implemented API capabilities.

**Search and failures:** Search can produce No Results Found (edit/clear the query or return to the menu). Data loading shows a Loading state; retrieval failures show an error with Retry. The hamburger menu remains usable in loading/empty/error states. Actual search and networking are Flutter implementation work.

## 2. Account and registration

**Registration:** The screen collects **First Name, Last Name, Email, Password, and Confirm Password**. Flutter validates password confirmation locally. The registration request contains `firstName`, `lastName`, `email`, and `password`. On successful registration, show Check Your Inbox.

### Login and authentication states

**Login:** Users submit email and password. Successful authentication returns the user's **ID, email, and role**, together with an authentication token. The API does not return a first or last name. The **Account Profile** therefore displays only the user's **email address** and does not assume a separate profile endpoint.

| Situation | Message / expected behavior |
| --- | --- |
| Invalid credentials (server response) | **“Invalid email or password.”** Permit retry or Forgot Password;  |
| Invalid email format (client-side) | **“Please enter a valid email address.”** Show beneath the email field. |
| Empty email (client-side) | **“Email is required.”** Show beneath the email field. |
| Empty password (client-side) | **“Password is required.”** Show beneath the password field. |
| HTTP 403 — unverified account | **“Please verify your email to log in.”** Direct users to their inbox or to request another verification email. |
| HTTP 429 — too many attempts | **“Too many login attempts. Please wait before trying again.”** Respect the API's `Retry-After` header. |
| Network or service failure | **“Unable to sign in right now. Check your connection and try again.”** Allow retry; final wording may be refined in Flutter. |

**Unverified-account recovery:** Show the verification-required message, explain how to check the inbox or request a new verification email, and direct users through browser verification back to Flutter Login. Verification does **not** create an authenticated session. The Figma resend guidance is not proof of a working backend action.

**Prototype and implementation notes:** Figma shows generic invalid credentials, invalid email format, empty password, 403 verification guidance, and 429 rate-limit guidance. These are visual states, not actual API behavior. Flutter should validate locally before submitting, branch on API response status, use secure storage for the authentication token, and navigate to Account Profile only after successful login. Network, rate-limit, and resend behavior will be finalized during implementation.

## 3. Email verification and password reset — browser baseline

**Verification:** Register → Check Your Inbox (**Flutter**) → open the verification link in a **browser** → browser reports verification success or failure → manually return to the app → **Login**. Verification **does not log the user in**. The completion action says **Continue to Login**, not Continue to Account. Resend Email requests another message while staying on Check Your Inbox; show sending/sent feedback and enforce cooldown/rate limits in implementation.

**Password reset:** Login → Forgot Password → enter email → Reset Link Sent (**Flutter**) → open reset link in **browser** → choose a new password in browser → browser confirms success → manually return to the app → **Login** using the new password. Set New Password is a **browser reference screen**, not part of the Flutter baseline. Request feedback should avoid revealing account existence (for example, “If an account exists, we'll send a reset link.”).

**Link and recovery guidance:** Figma includes a 403 login state and annotations on the separate **Browser Reference Screens** page for invalid/expired links and successful password reset.

| Event | Message | Recovery / next step |
| --- | --- | --- |
| Unverified account (403) | “Please verify your email to log in.” | Check inbox; request a new verification email if needed. |
| Verification link expired or invalid | “This verification link is invalid or has expired.” | Request a new verification email and open its browser link. |
| Reset link expired or invalid | “This password-reset link is invalid or has expired.” | Restart Forgot Password and request a new link. |
| Successful password reset | “Your password has been updated successfully.” | Return to Flutter and log in with the new password. |
| Successful email verification | “Your email has been verified.” | Return to Flutter and log in. |

**Native deep links, automatic app opening, and Open App actions are optional future work** unless separately agreed. No final deployed domain is needed to document this browser-first workflow.

## 4. Visual design and accessibility

Follow the shared style guide (periwinkle and peach accents, approved fonts, and original drink photos). Maintain consistent headers, usable tap targets, safe-area spacing, readable contrast, accessible error/selected-state feedback, and reduced-motion alternatives for animation. Revise Home, Menu, and Account layouts if approved web designs change.

## 5. Test evidence and implementation boundaries

The design owner reports testing Figma navigation, hamburger overlay (including No Results Found), carousel tap/drag, interactive filter examples, drink-detail links, account navigation, and UI-state transitions. **This is not evidence of working API filtering, email delivery, browser verification/reset, or Flutter behavior.** Re-test affected Figma interactions after review changes before final approval.

## 6. Review and handoff checklist

- [x] Figma prototype for Home, Menu, and Account flows
- [x] Document navigation, loading/empty/error states, account flows, and browser handoff
- [x] Split registration first/last name; exclude password confirmation from API payload
- [x] Generic server-side login error and 403/429 guidance
- [x] Profile simplified to email-only supported information
- [x] Browser reference frames separated from Flutter flows and completion actions return to Login
- [x] Figma annotations for unverified accounts, expired/invalid verification and reset links, and reset success
- [x] Empty-password local validation example in Figma
- [x] Document sample menu/filter counts and proposed independent `isFeatured` / `isSeasonal` behavior
- [x] Export updated PNGs to `docs/prototypes/screens/`
- [ ] Team approve `teaBases`, `isRecommended`, and `isFeatured` metadata; record decision in issue/PR
- [ ] Team confirm whether Home requires a distinct Seasonal Specials section or approved highlighting within Featured carousel
- [ ] Add/confirm seasonal Home presentation and zero-seasonal empty-state behavior in Figma
- [ ] Approve adaptive featured carousel rules (0 / 1 / 2–3 / 4+ drinks)
- [ ] Re-test affected Figma interactions and record client approval
- [ ] Confirm dependencies [#1](https://github.com/rubaismail/eisai-studio-matcha/issues/1) and [#6](https://github.com/rubaismail/eisai-studio-matcha/issues/6) satisfy their completion gates
- [ ] Link approved PR, Figma, and supporting evidence to the prototype issue

**Maintainer note:** Keep this README, Figma design, and exported PNGs synchronized as approved API contracts and client designs change.
