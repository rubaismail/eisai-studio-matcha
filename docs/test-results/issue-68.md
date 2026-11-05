# Issue #68: menu inspiration and photo alt text

Validation performed November 4, 2026 with Node 24.21.0.

## Automated checks

From the repository root:

```sh
npm ci
npm run check
```

Result: lint, API/web type checks, **134 API tests**, **2 web tests**, and both production builds passed. The 19 additional tests in `apps/api/test/menu.metadata.test.ts` cover:

- Trimmed create/update values and plain-text round trips.
- Omitted values, explicit clearing, and photo replacement/removal semantics.
- New-item and legacy-record defaults without a migration.
- All five public, seasonal and admin listing paths.
- Null and non-string input rejection without unintended writes.
- Unknown-field rejection and unauthenticated/customer write protection.
- Hidden-item exclusion and independent featured/recommended/seasonal flags.

These committed tests use real Mongoose validation, hydration and serialization with an in-memory mocked persistence boundary; they do not contact a shared database, email provider or S3.

## OpenAPI validation

The updated `docs/api/openapi.yaml` passed `@apidevtools/swagger-parser` validation. Additional assertions confirmed both fields are strings, create/response defaults are empty strings, and partial-update properties have no defaults that could clear omitted values. The repository export is updated; publishing it to SwaggerHub remains the API documentation workflow.

## Additional real-database verification

A one-off Supertest probe used `mongodb-memory-server` with an isolated MongoDB 7.0.14 process and a disposable `issue68_ephemeral` database. No shared development or production credentials were used.

Verified actual create persistence, all five listing paths, partial-update preservation, explicit clearing, invalid-update rejection without modifying another field, and legacy records inserted directly into the collection without the new fields. Legacy responses returned empty strings while the underlying records remained unmigrated. The process was stopped after the check. This supplementary probe is separate from the committed mocked regression suite and does not establish AWS/S3/email readiness.
