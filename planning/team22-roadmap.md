# Team 22 - Eisai Studio roadmap

Deadline: November 15, 2026 (exact submission time to confirm). Planning begins October 13; four delivery weeks run October 19-November 15 with early setup before them. All work remains unassigned.

Preserve Team 11 roles: PM, API Dev, Front-End, Database. UI/UX is an additional frontend responsibility; Flutter work remains Front-End and is clearly named. Each task has a start date and target date for the roadmap/Gantt. Dates are planning targets, not commitments already agreed with the client.

Scope sources: `[8.1] Large Project.pdf` (course slides 3, 8-13) and `Meeting for web page – 2026_10_09 09_57 EDT – Notes by Gemini.pdf` (meeting decisions and full transcript). Course requires MERN, React TypeScript, remote MongoDB, Flutter, verification before login, password reset, stronger authentication, prototypes, SwaggerHub, diagrams, Gantt and unit/integration results. Figma is our selected design tool; the slides recommend it among alternatives. Client baseline: home, dynamic menu and client-only admin with photos. GrubHub/loyalty is a feasibility decision, not committed custom commerce.

## Milestones

- October 21: scope, API/data design, prototypes and client design review.
- November 1: core web/admin/mobile functionality.
- November 8: integrated testing, client acceptance review and release readiness.
- November 15: delivery, with production target November 12 and rehearsal November 14.

## Tasks

| ID | Task | Role | Start | Target | Dependencies |
| --- | --- | --- | --- | --- | --- |
| [T22-01](https://github.com/rubaismail/eisai-studio-matcha/issues/1) | Confirm MVP, account audience, and course submission checklist | PM | 2026-10-13 | 2026-10-15 | None |
| [T22-02](https://github.com/rubaismail/eisai-studio-matcha/issues/2) | Collect client brand assets, menu content, and access prerequisites | PM | 2026-10-13 | 2026-10-16 | None |
| [T22-03](https://github.com/rubaismail/eisai-studio-matcha/issues/3) | Research GrubHub ordering link and loyalty feasibility | API Dev | 2026-10-14 | 2026-10-16 | None |
| [T22-04](https://github.com/rubaismail/eisai-studio-matcha/issues/4) | Set up team repository, development workflow, and CI | PM | 2026-10-14 | 2026-10-17 | None |
| [T22-05](https://github.com/rubaismail/eisai-studio-matcha/issues/5) | Maintain Team 22 roadmap, Gantt chart, and weekly decisions | PM | 2026-10-13 | 2026-11-14 | None |
| [T22-06](https://github.com/rubaismail/eisai-studio-matcha/issues/6) | Define web and Flutter user flows and navigation | UI/UX | 2026-10-15 | 2026-10-17 | [T22-01](https://github.com/rubaismail/eisai-studio-matcha/issues/1) |
| [T22-07](https://github.com/rubaismail/eisai-studio-matcha/issues/7) | Create Figma brand system and reusable components | UI/UX | 2026-10-16 | 2026-10-19 | T22-02, T22-06 |
| [T22-08](https://github.com/rubaismail/eisai-studio-matcha/issues/8) | Prototype responsive website and admin dashboard in Figma | UI/UX | 2026-10-17 | 2026-10-20 | T22-06, T22-07 |
| [T22-09](https://github.com/rubaismail/eisai-studio-matcha/issues/9) | Prototype Flutter mobile flows in Figma | UI/UX | 2026-10-17 | 2026-10-20 | T22-06, T22-07 |
| [T22-10](https://github.com/rubaismail/eisai-studio-matcha/issues/10) | Review prototypes with client and finalize design handoff | UI/UX | 2026-10-20 | 2026-10-21 | T22-08, T22-09 |
| [T22-11](https://github.com/rubaismail/eisai-studio-matcha/issues/11) | Define MERN architecture and initial SwaggerHub API contract | API Dev | 2026-10-15 | 2026-10-18 | [T22-01](https://github.com/rubaismail/eisai-studio-matcha/issues/1) |
| [T22-12](https://github.com/rubaismail/eisai-studio-matcha/issues/12) | Design MongoDB collections and create ERD | Database | 2026-10-16 | 2026-10-19 | T22-01, T22-11 |
| [T22-13](https://github.com/rubaismail/eisai-studio-matcha/issues/13) | Provision remote MongoDB and application access | Database | 2026-10-17 | 2026-10-20 | [T22-12](https://github.com/rubaismail/eisai-studio-matcha/issues/12) |
| [T22-14](https://github.com/rubaismail/eisai-studio-matcha/issues/14) | Implement MongoDB models, indexes, and development seeds | Database | 2026-10-19 | 2026-10-22 | T22-12, T22-13 |
| [T22-15](https://github.com/rubaismail/eisai-studio-matcha/issues/15) | Scaffold Express API, configuration, and error handling | API Dev | 2026-10-18 | 2026-10-21 | T22-04, T22-11, T22-13 |
| [T22-16](https://github.com/rubaismail/eisai-studio-matcha/issues/16) | Implement registration and email verification | API Dev | 2026-10-21 | 2026-10-25 | T22-14, T22-15 |
| [T22-17](https://github.com/rubaismail/eisai-studio-matcha/issues/17) | Implement login, logout, and admin authorization | API Dev | 2026-10-22 | 2026-10-26 | [T22-16](https://github.com/rubaismail/eisai-studio-matcha/issues/16) |
| [T22-18](https://github.com/rubaismail/eisai-studio-matcha/issues/18) | Implement forgot-password and reset-password endpoints | API Dev | 2026-10-25 | 2026-10-28 | T22-16, T22-17 |
| [T22-19](https://github.com/rubaismail/eisai-studio-matcha/issues/19) | Implement public menu and seasonal-feature endpoints | API Dev | 2026-10-22 | 2026-10-25 | T22-14, T22-15 |
| [T22-20](https://github.com/rubaismail/eisai-studio-matcha/issues/20) | Implement protected menu management endpoints | API Dev | 2026-10-25 | 2026-10-28 | T22-17, T22-19 |
| [T22-21](https://github.com/rubaismail/eisai-studio-matcha/issues/21) | Implement secure photo upload and persistent storage | API Dev | 2026-10-26 | 2026-10-29 | T22-17, T22-20 |
| [T22-22](https://github.com/rubaismail/eisai-studio-matcha/issues/22) | Set up AWS staging deployment and email delivery | PM | 2026-10-20 | 2026-10-24 | T22-02, T22-04, T22-15 |
| [T22-23](https://github.com/rubaismail/eisai-studio-matcha/issues/23) | Scaffold React TypeScript app and shared API client | Front-End | 2026-10-18 | 2026-10-22 | T22-04, T22-11 |
| [T22-24](https://github.com/rubaismail/eisai-studio-matcha/issues/24) | Build responsive homepage and public menu | Front-End | 2026-10-22 | 2026-10-28 | T22-10, T22-19, T22-23 |
| [T22-25](https://github.com/rubaismail/eisai-studio-matcha/issues/25) | Build web registration, verification, login and password reset | Front-End | 2026-10-25 | 2026-10-30 | T22-10, T22-16, T22-17, T22-18, T22-23 |
| [T22-26](https://github.com/rubaismail/eisai-studio-matcha/issues/26) | Build client admin menu editor and photo management | Front-End | 2026-10-29 | 2026-11-01 | T22-10, T22-20, T22-21, T22-25 |
| [T22-27](https://github.com/rubaismail/eisai-studio-matcha/issues/27) | Polish web responsiveness and accessibility | Front-End | 2026-10-29 | 2026-11-02 | T22-24, T22-25, T22-26 |
| [T22-28](https://github.com/rubaismail/eisai-studio-matcha/issues/28) | Scaffold Flutter app and shared API integration | Front-End | 2026-10-18 | 2026-10-23 | T22-04, T22-11 |
| [T22-29](https://github.com/rubaismail/eisai-studio-matcha/issues/29) | Implement Flutter account and email-link flows | Front-End | 2026-10-26 | 2026-11-01 | T22-09, T22-10, T22-16, T22-17, T22-18, T22-28 |
| [T22-30](https://github.com/rubaismail/eisai-studio-matcha/issues/30) | Implement Flutter menu, home content, and agreed mobile features | Front-End | 2026-10-24 | 2026-11-01 | T22-09, T22-10, T22-19, T22-28 |
| [T22-31](https://github.com/rubaismail/eisai-studio-matcha/issues/31) | Create use-case and sequence or activity diagrams in PlantUML | PM | 2026-10-18 | 2026-10-22 | T22-06, T22-11 |
| [T22-32](https://github.com/rubaismail/eisai-studio-matcha/issues/32) | Create Flutter class diagram in PlantUML | Front-End | 2026-10-23 | 2026-10-26 | [T22-28](https://github.com/rubaismail/eisai-studio-matcha/issues/28) |
| [T22-33](https://github.com/rubaismail/eisai-studio-matcha/issues/33) | Implement backend and database unit tests | API Dev | 2026-10-25 | 2026-11-03 | T22-16, T22-17, T22-18, T22-19, T22-20, T22-21 |
| [T22-34](https://github.com/rubaismail/eisai-studio-matcha/issues/34) | Implement React and Flutter component/unit tests | Front-End | 2026-10-27 | 2026-11-03 | T22-24, T22-25, T22-26, T22-29, T22-30 |
| [T22-35](https://github.com/rubaismail/eisai-studio-matcha/issues/35) | Run web/mobile/API integration tests and fix blocking defects | API Dev | 2026-11-02 | 2026-11-06 | T22-22, T22-26, T22-29, T22-30, T22-33, T22-34 |
| [T22-36](https://github.com/rubaismail/eisai-studio-matcha/issues/36) | Run client acceptance review on staging | PM | 2026-11-06 | 2026-11-08 | T22-27, T22-35 |
| [T22-37](https://github.com/rubaismail/eisai-studio-matcha/issues/37) | Verify security, performance, and deployment recovery | API Dev | 2026-11-05 | 2026-11-08 | T22-22, T22-35 |
| [T22-38](https://github.com/rubaismail/eisai-studio-matcha/issues/38) | Finalize SwaggerHub and all diagrams against implemented system | API Dev | 2026-11-07 | 2026-11-10 | T22-32, T22-35, T22-37 |
| [T22-39](https://github.com/rubaismail/eisai-studio-matcha/issues/39) | Complete client corrections and release regression | Front-End | 2026-11-09 | 2026-11-11 | T22-36, T22-37 |
| [T22-40](https://github.com/rubaismail/eisai-studio-matcha/issues/40) | Deploy production and configure GoDaddy DNS and HTTPS | PM | 2026-11-11 | 2026-11-12 | T22-02, T22-22, T22-39 |
| [T22-41](https://github.com/rubaismail/eisai-studio-matcha/issues/41) | Prepare client handoff and maintenance documentation | PM | 2026-11-10 | 2026-11-13 | T22-36, T22-37 |
| [T22-42](https://github.com/rubaismail/eisai-studio-matcha/issues/42) | Package Flutter build and verify demonstration setup | Front-End | 2026-11-10 | 2026-11-13 | T22-38, T22-39 |
| [T22-43](https://github.com/rubaismail/eisai-studio-matcha/issues/43) | Assemble course deliverables and rehearse presentation | PM | 2026-11-12 | 2026-11-14 | T22-05, T22-38, T22-40, T22-41, T22-42 |
| [T22-44](https://github.com/rubaismail/eisai-studio-matcha/issues/44) | Submit final project and confirm delivery | PM | 2026-11-15 | 2026-11-15 | [T22-43](https://github.com/rubaismail/eisai-studio-matcha/issues/43) |

## T22-01: Confirm MVP, account audience, and course submission checklist

Done when: Reconcile course requirements with client scope; confirm whether verified accounts are customer accounts or invited client accounts and what Flutter must demonstrate; record submission format and exact deadline time. Baseline is public home/menu plus client-only admin; custom checkout, order queues and loyalty are deferred unless explicitly approved.

## T22-02: Collect client brand assets, menu content, and access prerequisites

Done when: Track receipt of logos, high-quality drink photos, names/descriptions/prices, location details, social links, client wishlist, AWS access and DNS cooperation. Confirm intended digital hex colors with the client because the transcript says the printed banner differs. Track missing inputs and agreed placeholders; never put credentials in issues.

## T22-03: Research GrubHub ordering link and loyalty feasibility

Done when: Time-box investigation to available merchant links and documented integration access; record evidence and client decision. Use a verified external ordering link if available; otherwise hide the CTA. Loyalty sync and custom ordering remain outside the baseline.

## T22-04: Set up team repository, development workflow, and CI

Done when: Document web/server/mobile layout, local setup, review workflow and env examples without secrets. CI runs appropriate lint, type checks, builds and tests. Confirm team access without assigning work automatically.

## T22-05: Maintain Team 22 roadmap, Gantt chart, and weekly decisions

Done when: Keep Role, status, dates, dependencies and milestones current; record weekly team/client decisions and blockers. Export a dated Gantt chart for submission. Owners remain blank until the team assigns them.

## T22-06: Define web and Flutter user flows and navigation

Done when: Map guest browsing, registration, verification, login, password reset and client admin flows. Agree a minimal Flutter experience using the same API; include empty, loading and error states.

## T22-07: Create Figma brand system and reusable components

Done when: Create client-confirmed colors, typography, spacing, buttons, form states and menu cards; check contrast and record responsive behavior. Deliver a shared Figma link and implementation notes.

## T22-08: Prototype responsive website and admin dashboard in Figma

Done when: Provide linked desktop/phone prototypes for home, menu, auth and admin item/photo management. Include key validation and failure states; ready for client review.

## T22-09: Prototype Flutter mobile flows in Figma

Done when: Deliver a mobile prototype for agreed browsing and account flows with navigation and loading/error states. Identify any admin functionality explicitly included in the agreed mobile scope.

## T22-10: Review prototypes with client and finalize design handoff

Done when: Record client feedback, approved digital colors/content direction, scope decisions and resolved revisions. Share component specs and assets with web/mobile implementers; do not treat an unanswered review as approval.

## T22-11: Define MERN architecture and initial SwaggerHub API contract

Done when: Document React TypeScript, Express/Node, remote MongoDB and Flutter shared API. Publish request/response schemas, validation, auth rules and errors for auth, public menu, admin menu and image upload. Define token/session handling for both clients.

## T22-12: Design MongoDB collections and create ERD

Done when: Model users/roles/verification state, expiring auth tokens, menu items and image metadata with IDs, required fields, indexes and relationships. Supply ERD source and readable export matching the document database model.

## T22-13: Provision remote MongoDB and application access

Done when: Remote database is reachable by backend with restricted network and least-privilege credentials; env setup is documented and a health check passes. Separate test data from client production data.

## T22-14: Implement MongoDB models, indexes, and development seeds

Done when: Implement validated models, unique email handling, token expiry indexes and menu queries; seed representative non-sensitive data. Record reproducible reset and seed steps.

## T22-15: Scaffold Express API, configuration, and error handling

Done when: Node/Express starts locally and connects to remote MongoDB; validates inputs and returns consistent JSON errors. Health endpoint and configuration examples work; no secrets or stack traces exposed.

## T22-16: Implement registration and email verification

Done when: Accounts are created with hashed passwords and non-admin defaults; deliver verification email using a configured provider. Block login until verified; implement safe resend plus expiring single-use verification tokens and test invalid/expired/reused tokens.

## T22-17: Implement login, logout, and admin authorization

Done when: Verified users authenticate using the agreed security mechanism; logout/expiry works for web and Flutter. Enforce server-side admin checks on every write/upload; public signup cannot self-elevate. Document secure initial client-admin provisioning.

## T22-18: Implement forgot-password and reset-password endpoints

Done when: Send reset email with expiring single-use token, accept new hashed password and invalidate old sessions as designed. Use generic request responses and test expired/replayed tokens and rate limiting.

## T22-19: Implement public menu and seasonal-feature endpoints

Done when: Serve published menu items and featured/seasonal content using documented schemas; exclude admin-only fields and unpublished items. Handle empty results and invalid requests.

## T22-20: Implement protected menu management endpoints

Done when: Client admins can create/update items and hide/archive them, including descriptions, agreed prices and seasonal status. Validate inputs and reject non-admin writes; changes appear in public data after successful save.

## T22-21: Implement secure photo upload and persistent storage

Done when: Admin-only uploads validate file type/size and persist outside ephemeral app storage; menu records reference usable image URLs. Handle failed uploads/replacement and document storage configuration and cleanup behavior.

## T22-22: Set up AWS staging deployment and email delivery

Done when: Deploy an HTTPS staging app/API with remote database, secrets configuration, logs and working email sender. Record cost assumptions and budget alerts with client; the meeting cost estimate is not a spending guarantee. Document redeploy and rollback.

## T22-23: Scaffold React TypeScript app and shared API client

Done when: React TypeScript app includes routing, reusable API layer, environment base URL and typed responses; shared loading/error/auth handling works against contract mocks and can switch to staging.

## T22-24: Build responsive homepage and public menu

Done when: Implement approved brand, seasonal highlight, social/location information and dynamic menu. Handle empty/error/loading states and image fallbacks. Add verified ordering link only if available; test phone and desktop layouts.

## T22-25: Build web registration, verification, login and password reset

Done when: All account flows use real APIs, including verification/resend, unverified-login errors, reset link handling and logout. Forms show accessible errors and prevent duplicate submission; non-admin accounts cannot enter client admin UI.

## T22-26: Build client admin menu editor and photo management

Done when: Authorized client can create/edit/hide items, change seasonal content and upload/replace photos. Show save failures and pending states; verify edits update the public menu. Destructive changes have confirmation or recovery.

## T22-27: Polish web responsiveness and accessibility

Done when: Check representative phone/tablet/desktop widths, keyboard navigation, focus, labels, contrast and image alt text. Fix overflow and inaccessible controls; attach review evidence.

## T22-28: Scaffold Flutter app and shared API integration

Done when: Flutter project builds for the agreed demonstration platform; implements routing, API configuration, typed models and loading/error patterns. No direct database access; document emulator/device setup.

## T22-29: Implement Flutter account and email-link flows

Done when: Implement agreed registration, verification, login/logout and password reset against the shared API. Securely store session material and test expiry; verification/reset links or documented browser handoff work on the demonstration device.

## T22-30: Implement Flutter menu, home content, and agreed mobile features

Done when: Build agreed home/menu browsing with real API data, item photos and loading/empty/error states; location/social/ordering links work where present. Implement any additional mobile flows accepted in the scope decision and record parity boundaries.

## T22-31: Create use-case and sequence or activity diagrams in PlantUML

Done when: Provide editable PlantUML source and readable use-case plus sequence OR activity diagram for key auth/admin/menu interactions; distinguish public visitors, account users and client admins. Schedule final sync to implemented behavior.

## T22-32: Create Flutter class diagram in PlantUML

Done when: Model actual mobile models, API services, state/controllers and key UI relationships; supply editable PlantUML and readable export, then refresh after feature completion.

## T22-33: Implement backend and database unit tests

Done when: Automate representative validation, role checks, token expiry/reuse and menu behavior tests; verify database uniqueness/query behavior with Database collaboration. Save reproducible commands and results; never use client production data.

## T22-34: Implement React and Flutter component/unit tests

Done when: Test meaningful auth/form/menu states and API error handling in web and Flutter; cover admin save failures on web. Keep tests reproducible and retain results for course evidence.

## T22-35: Run web/mobile/API integration tests and fix blocking defects

Done when: Exercise real staging registration/email verification/login/reset, menu reads and admin photo/item updates across web and Flutter. Verify non-admin and unauthenticated write rejection, expired tokens and network failures. Log defects, retest fixes and capture integration results.

## T22-36: Run client acceptance review on staging

Done when: Client tests real menu/photo editing and reviews content, digital colors and public pages. Record acceptance or specific defects and agreed fixes; keep new wishes outside deadline scope unless traded explicitly.

## T22-37: Verify security, performance, and deployment recovery

Done when: Review HTTPS, secret handling, CORS, auth/upload rate limits, authorization and dependency findings. Check representative mobile performance and image sizes; demonstrate documented backup/recovery and rollback with Database/PM support.

## T22-38: Finalize SwaggerHub and all diagrams against implemented system

Done when: SwaggerHub matches deployed routes/auth/errors and a live endpoint can be demonstrated. ERD, use-case, sequence/activity and Flutter class diagram reflect final code; retain editable sources and export images.

## T22-39: Complete client corrections and release regression

Done when: Resolve launch-blocking client/test defects with relevant roles and rerun affected tests on web and Flutter. Verify approved assets, links, menu and access controls; record remaining accepted limitations.

## T22-40: Deploy production and configure GoDaddy DNS and HTTPS

Done when: After client launch approval, deploy tested release to client AWS, configure approved DNS without disturbing unrelated records, verify HTTPS and renewal, emails, uploads and database access. Run production smoke checks and record rollback instructions.

## T22-41: Prepare client handoff and maintenance documentation

Done when: Provide menu/photo editing guide, architecture/setup/deploy README, account ownership and recovery guidance, known limits and ongoing cost assumptions. Confirm client can operate admin workflows; arrange removal of temporary team access at agreed handoff.

## T22-42: Package Flutter build and verify demonstration setup

Done when: Produce an installable build or instructor-accepted demo package for the agreed platform. Test on intended device/emulator, verify production/staging configuration and email-link behavior, and document reproducible build steps; app-store publication is not assumed.

## T22-43: Assemble course deliverables and rehearse presentation

Done when: Package Gantt, ERD, use-case, sequence/activity, Flutter class diagram, SwaggerHub, web/mobile prototypes and unit/integration results. Prepare demo and team-contribution narrative highlighting real client validation; verify rubric/checklist from scope issue and rehearse with backup evidence.

## T22-44: Submit final project and confirm delivery

Done when: Submit all required links/files before the instructor-confirmed deadline time on November 15. Check grader access to private repository and documentation, verify web/mobile demo availability and retain submission receipt. No assumed 11:59 PM deadline.

Iteration is the target delivery week; Start date and Target date show the full task span. Dependencies are completion gates and may overlap during work against agreed contracts. All issues initially use Todo and P1; review urgency during weekly planning.
