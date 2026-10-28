# Brandon Notes - Admin Menu, Upload, and Review Fixes

## Overview
This work was focused on finishing the admin menu management feature, hardening the upload flow, and closing the review issues that were blocking merge. The goal was to make the API behave like a real production-safe admin tool instead of a placeholder implementation.

## What I changed

### 1) Admin menu management and visibility rules
Updated the menu route and controller behavior so admins can:
- create menu items
- update menu items
- hide/unhide items without deleting them
- permanently delete only when a real delete action is intended

Key behavior:
- `POST /api/menu` is admin-only
- `PUT /api/menu/:id` validates allowed fields and supports `isAvailable` toggling
- `DELETE /api/menu/:id` is permanent deletion, separate from hide/unhide
- public reads only return `isAvailable: true` items
- valid IDs must be checked before update/delete; bad IDs return 400 and missing IDs return 404

Files involved:
- `apps/api/src/routes/menu.routes.ts`
- `apps/api/src/controllers/menu.controller.ts`
- `apps/api/test/menu.test.ts`

### 2) Real JWT authentication and admin authorization
Replaced the placeholder admin token logic with a real auth path.

The issue was that placeholder checks like `admin-token` or `admin` allowed anyone to impersonate an admin. That was removed and replaced with real JWT verification plus DB-backed role enforcement.

This matters because protected routes must verify:
- the token is valid
- the user exists
- the user is actually authorized
- admin-only access is enforced per route

Files involved:
- `apps/api/src/middleware/auth.ts`
- related auth route and config updates

### 3) Uploaded menu images stored in real S3 storage
Implemented admin-only image upload support using multipart upload handling and S3 storage, with no fake success fallback.

The upload flow now:
- accepts only supported image types: `jpg`, `png`, `webp`
- enforces the ~5 MB limit
- validates actual file signatures instead of trusting the browser MIME type
- uploads to S3 using AWS credentials or role-based environment config
- returns a public URL after the object is successfully written

This removed the dangerous behavior where a fake URL could be returned even though nothing was actually stored.

Files involved:
- `apps/api/src/routes/upload.routes.ts`
- `apps/api/src/services/upload.ts`
- `apps/api/.env.example`
- `apps/api/src/config/env.ts`

### 4) Error handling and validation tightening
The review flagged several edge cases that were allowing invalid requests through or creating misleading responses.

I hardened the app so it now properly returns:
- `400` for malformed or unexpected request shapes
- `413` for oversized uploads
- `415` for unsupported image types
- `404` for valid-but-missing menu items
- `401`/`403` for auth violations

This prevents silent bad data and keeps the API contract predictable.

### 5) Regression tests for real app behavior
The tests were updated to check the real contracts instead of accepting placeholder tokens or mocked-away behavior.

Regression coverage includes:
- admin-only routes rejecting non-admins
- valid JWTs required for protected routes
- public menu reads hiding unavailable items
- invalid payloads returning the correct errors
- upload validation and S3 interaction checks
- missing IDs and malformed IDs returning the correct status

Files involved:
- `apps/api/test/menu.test.ts`

## New files vs existing files

### New files created
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/routes/upload.routes.ts`
- `apps/api/src/services/upload.ts`
- `docs/diagrams/erd.puml`
- `docs/diagrams/erd.png`
- `docs/brandonNotes.md`

### Existing files updated
- `apps/api/src/routes/menu.routes.ts`
- `apps/api/src/controllers/menu.controller.ts`
- `apps/api/src/config/env.ts`
- `apps/api/.env.example`
- `apps/api/test/menu.test.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/package.json`
- `package-lock.json`

## Why the PR review comments mattered
The main issues were not cosmetic; they were security and reliability issues:
- placeholder admin tokens allowed impersonation
- fake upload success responses created false positives
- trusting MIME type alone let plain text masquerade as valid image files
- invalid IDs and missing object handling were too loose
- the app was not behaving like a real S3-backed upload flow

These are exactly the kinds of bugs that become expensive later because they can pass local happy-path checks but fail in production.

## Branch and history notes
A key lesson from this work was about branch hygiene. Rewriting shared branch history or rebasing incorrectly can make a PR look massive even when the feature itself is small. The safe pattern is:
- keep `main` stable
- work off a feature branch
- rebase or merge only when the base is correct
- resolve conflicts while preserving verified fixes
- avoid rewriting a branch that already has shared history

This is where the review and cleanup work was important: keep the feature branch clean, preserve the actual fix set, and make the final diff readable.

## Debugging retention
If this feature regresses later, the fastest way to debug is to check the following sequence:
1. Auth: Is the JWT actually valid? Does the user exist and have the expected role?
2. Upload: Is the file validated by both type and content signature? Was the S3 write actually attempted?
3. Menu mutation: Are IDs validated before update/delete? Are hidden items still excluded from public reads?
4. Tests: Do the tests assert real auth and real S3 interactions rather than mocked placeholders?

## Final takeaway
The final fix set pushed the app from a placeholder admin mock to an actually reviewable, production-minded implementation: authenticated admin routes, real image uploads to permanent storage, strict validation, and regression tests that exercise real behavior.
