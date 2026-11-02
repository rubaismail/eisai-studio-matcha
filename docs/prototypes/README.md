# Eisai Studio — Mobile Prototype

**Design:** Figma  
**Implementation target:** Flutter (Android and iOS)  
**Status:** Prototype interactions tested by the design owner; backend and external email flows are not implemented in Figma.

[View the mobile prototype in Figma](https://www.figma.com/design/YPmYcFUmGOnUbTH89i4P7q/Eisai-Studio-Website--Copy-?node-id=2007-114)

## Overview

This prototype covers the agreed mobile experience for **Home, Our Drinks (Menu), and Account**, along with Our Story, Our Location, drink details, and supporting states. It demonstrates navigation and expected user flows before Flutter implementation.

## Screens and states

| Area | Screens / states |
| --- | --- |
| Discovery | Home, alternative Landing Concept, Our Story, Our Location |
| Menu | Our Drinks, six specialty drink details, four filter states |
| Menu feedback | No Results Found, loading, retrieval error |
| Account | Login, Create Account, Account Profile |
| Login feedback | Incorrect email, incorrect password, both incorrect |
| Verification | Check Your Inbox, checking email, email verified |
| Password recovery | Forgot Password, Reset Link Sent, Set New Password |
| Navigation | Hamburger menu overlay |

## User workflows

### 1. Navigation and Home

- **Hamburger menu:** Open the overlay from the header, choose Home, Our Story, Our Drinks, Our Location, or Account, or close the overlay to remain on the current screen. The menu also works on the No Results Found state.
- **Home:** Scroll through the homepage and use menu/location buttons to navigate to the corresponding pages.
- **Spinning drink carousel:** Tap a drink to bring it forward and display its tasting profile; drag to advance to the next drink. **Figma limitation:** dragging advances in one direction regardless of swipe direction. Flutter should support left/right gestures.
- **At the pop-up:** Horizontal media-card layout; actual video playback is for implementation.
- **Design decision:** Home and Landing Concept are alternative designs; the final version requires client confirmation.

### 2. Our Drinks (Menu)

**Classic teas**
- **Matcha:** Choose one of three blends — **Chiyo Midori, Yugen, or Shun Midori** — prepared **clear or as a latte**.
- **Hojicha:** Choose **Tokusen**, the single hojicha blend, prepared **clear or as a latte**.

**Specialty drink filters**

| Filter | Displayed drinks |
| --- | --- |
| All (6) | Golden Hour, Mango Dango, Tokyo Rose, Toasted Coconut, Kyoto Fog, Okinawa Breeze |
| Matcha (6) | All six specialty drinks |
| Hojicha (3) | Golden Hour, Tokyo Rose, Toasted Coconut |
| Recommended (3) | Golden Hour, Mango Dango, Toasted Coconut |

Selecting a filter updates the visible cards and drink count **within the same page**; the active filter is highlighted. Selecting **All** restores the six drinks. Tapping a drink card opens its details.

**Search and feedback states:** The prototype includes a search field, No Results Found, menu loading, and retrieval error screens. The intended recovery actions are to adjust/clear a search, change filters, or retry after an error. Real search and network behavior will be implemented in Flutter.

### 3. Login and Account

1. Open **Account** to reach **Login** when signed out.
2. Enter credentials and submit; successful login leads to the account experience/profile.
3. Incorrect email, incorrect password, and both-incorrect states show feedback and allow the user to retry.
4. From Login, users can go to **Create Account** or **Forgot Password**.

Credential validation and account sessions require the backend; the prototype only demonstrates screen transitions.

### 4. Sign-up and email verification

1. **Create Account** → submit registration → **Check Your Inbox**.
2. **Resend Email** should keep the user on Check Your Inbox, briefly show progress, and confirm another email was requested.
3. Opening the verification link from an email should lead through **Checking Email** to **Email Verified**, then back to login or the agreed authenticated destination.

Actual email delivery, verification tokens, and resend cooldowns require backend integration.

### 5. Password reset

1. **Login** → **Forgot Password** → enter email → **Reset Link Sent**.
2. Open the email's reset link → **Set New Password**.
3. Submit a new password → show confirmation and return to Login.

The final success/confirmation screen should be confirmed against the approved designs. Password changes and secure reset tokens are implementation responsibilities.

### 6. Email-link browser handoff (implementation specification)

The mobile app must account for links opened outside the app:

- **Verification link:** Email/browser → verify token → return to app's checking/verified state, or show web confirmation with an **Open App** option.
- **Password-reset link:** Email/browser → securely open Set New Password in the app or an approved web reset page.
- **Expired/invalid link:** Show a clear error and an option to resend or restart.
- **App not installed:** Provide an appropriate browser fallback.

The team still needs to finalize the domain, deep-link configuration, and Android/iOS return behavior. These external handoffs are **documented expectations, not tested Figma integrations**.

## Prototype testing and design consistency

The design owner reports testing the prototype interactions: global navigation (including No Results Found), corrected Our Story/Our Drinks destinations, carousel tap/drag behavior, menu filters and drink details, account navigation, and loading/empty/error paths. This does **not** constitute testing of APIs, real emails, search, or device deep links.

The screens follow Eisai Studio's shared visual direction: periwinkle accents, light backgrounds, dark typography, peach accents where appropriate, and original drink imagery. Confirm the final design against the approved style guide. Flutter implementation should support accessible touch targets, readable error feedback, screen readers, safe areas, and reduced-motion alternatives.

## Deliverables and issue closeout

Store this README and exported PNGs in the repository:

```text
docs/
└── prototypes/
    ├── README.md
    └── screens/
        ├── home.png
        ├── our-drinks.png
        ├── login.png
        └── ... (remaining screens and UI states)
```

Export the primary screens, account and recovery states, menu loading/empty/error states, and representative filter variants and drink details. The [Figma prototype](https://www.figma.com/design/YPmYcFUmGOnUbTH89i4P7q/Eisai-Studio-Website--Copy-?node-id=2007-114) is the evidence for interactive behavior; PNGs show static states.

**Before closing the prototype issue:**

- [x] Design main screens and supporting UI states
- [x] Document prototype workflows and planned browser handoff
- [x] Test Figma interactions (reported by design owner)
- [ ] Confirm the client-approved Home option and final style guide
- [ ] Export and commit PNGs to `docs/prototypes/screens/`
- [ ] Record client feedback/approval and date
- [ ] Confirm dependencies [#1](https://github.com/rubaismail/eisai-studio-matcha/issues/1) and [#6](https://github.com/rubaismail/eisai-studio-matcha/issues/6)
- [ ] Link the README, Figma design, PNG commit/PR, and approval evidence in the issue

> **Note:** Keep this document aligned with the final approved Figma design as the Flutter work proceeds.
