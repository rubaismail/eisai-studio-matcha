# Brandon Notes - Menu Admin, Uploads, and ERD Updates

Date: 2026-10-28

## Overview
This change set adds the backend support needed for admin menu management and menu-image uploads in the Eisai Studio API. The work includes the route layer, controller validation, upload service, tests, and project documentation for future debugging.

## What changed

### Admin menu management
The API now supports the following admin menu actions:
- GET /api/admin/menu
- POST /api/menu
- PUT /api/menu/:id
- DELETE /api/menu/:id

The menu controller enforces validation for:
- required item name on create
- nonnegative price values
- category text
- description as a string
- imageUrl as a string
- isSeasonal and isAvailable as booleans
- rejection of unknown fields
- preventing empty update payloads

The update route is intentionally used for hide/unhide behavior by toggling isAvailable instead of creating a dedicated hide endpoint. This matches the API contract and keeps the menu hidden from public reads while maintaining the record for admin review.

### Public visibility behavior
The public menu endpoints still filter to items where isAvailable is true:
- GET /api/menu
- GET /api/menu/seasonal

Admin reads intentionally include hidden items so the dashboard can still view or restore them.

### Upload flow for menu photos
A new admin-only upload route was added at:
- POST /api/uploads

It accepts multipart form data with a single file field named image, validates MIME types, enforces the 5 MB limit, and returns the public URL for the uploaded image. This is designed to be passed to the menu create/update data as imageUrl.

The upload service is structured to support a permanent storage target in S3 instead of server disk storage.

### Config updates
The API env template now includes placeholder values for:
- AWS_S3_BUCKET
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_S3_PUBLIC_URL

These are documented as placeholders only; no real credentials are committed.

### ERD documentation
A PlantUML entity relationship diagram was created to document the User and MenuItem model contract:
- docs/diagrams/erd.puml
- docs/diagrams/erd.png

The diagram records the agreed field relationships and the favorites linkage described in the API contract.

## Files updated

### Existing files changed
- apps/api/src/routes/menu.routes.ts
- apps/api/src/controllers/menu.controller.ts
- apps/api/src/routes/index.ts
- apps/api/src/config/env.ts
- apps/api/.env.example
- apps/api/test/menu.test.ts
- apps/api/package.json
- package-lock.json

### New files added
- apps/api/src/middleware/auth.ts
- apps/api/src/routes/upload.routes.ts
- apps/api/src/services/upload.ts
- docs/diagrams/erd.puml
- docs/diagrams/erd.png
- docs/brandonNotes.md

## Validation completed
The API was validated with:
- npm run typecheck
- npm test -- --test-reporter=spec

The final test run passed successfully.

## Notes for future debugging
- The admin auth middleware is intentionally lightweight for this repo and checks for an admin token pattern. If this project later adopts real JWT verification, the middleware should be replaced with actual token decoding and role checking.
- The upload service is wired for S3-style public URLs, but real AWS credentials still need to be supplied in the local environment or deployment secrets.
- The public menu reads filter by isAvailable, so hidden items will not appear to customers.
- The menu update route is the place to hide and unhide items; permanent DELETE is separate and should only be used for actual removal.
- The ERD should be updated if the contract changes, especially if favorites or additional user roles are approved later.
