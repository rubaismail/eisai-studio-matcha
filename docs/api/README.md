# Shared API contract

[openapi.yaml](openapi.yaml) is the reviewable source of truth for endpoint paths, request and response schemas, validation, status codes and access rules. [apiREADME](../../apps/api/apiREADME.md) explains the same API with walkthroughs. This formalizes that existing outline so API, React and Flutter developers can build together and import the contract into SwaggerHub or client/mock tools.

This is the **target contract**, not a claim that all routes exist. At this revision `GET /api/menu`, `GET /api/health` and `POST /api/auth/login` are implemented. Each operation has an `x-implementation-status` marker; update it as routes land. Schema validation of this file does not prove server conformance.

## Architecture and boundaries

React TypeScript website and Flutter app → JSON over HTTP (HTTPS when deployed) → Express/Node API → Mongoose → remote MongoDB Atlas. The API alone accesses the database, sends verification/reset email through an email service, and uploads menu photos to S3. Email and database credentials stay server-side. The clients use one configurable API base URL ending in `/api`; Swagger paths omit that prefix because it is already in `servers.url`.

All 14 operations are covered. Six account operations, public menu and seasonal reads, admin list including hidden items, create/update/delete, image upload and health. Hide/unhide are updates of `isAvailable`. GrubHub is a frontend link; favorites, checkout, loyalty, refresh tokens, logout and single-item reads are outside this baseline.

## Initial validation decisions

These rules complete the README's outline and are implementation requirements for the planned endpoints:

- Registration requires `firstName` and `lastName` as well as email/password, matching the current User model. Trim names and reject blank names. Trim and lowercase email for registration and account lookup; require valid email syntax.
- New passwords must have at least 8 characters and at most 72 UTF-8 bytes, to avoid silent bcrypt truncation. Do not trim passwords. Login accepts any nonempty password and checks credentials; it does not reapply new-password policy. The byte limit must be checked by server code because OpenAPI string length is not UTF-8 byte length.
- JSON request bodies are objects with only the documented properties. Reject unknown fields, explicit null, incorrect types and numeric strings with `400`. Registration cannot set a role or user ID. The server assigns customer role and unverified status.
- Menu names must contain non-whitespace text; prices are nonnegative JSON numbers in dollars. Creation requires name/price and applies the documented defaults. `PUT` remains a partial update as outlined in apiREADME; require at least one editable field, preserve omissions, and prohibit client-set IDs/timestamps. Categories remain free text; no unapproved category enum or price precision restriction is added.
- IDs are 24 hexadecimal characters. Malformed ID → `400`; valid missing menu item → `404`. Lists return `{ "items": [] }` when empty. All menu lists sort by name ascending; public reads exclude hidden items.
- Upload exactly one multipart `image` of type JPEG, PNG or WebP, at most 5,242,880 bytes. The server validates file contents and size; the schema's `x-max-file-size` documents the byte limit but does not enforce it. No file/multiple files → `400`, oversize → `413`, unsupported image → `415`.
- Errors use `{ "error": "..." }`; clients branch on HTTP status, not exact prose. Health's disconnected `503` uses `{ "status": "database disconnected" }` instead. Login returns only `_id`, `email` and `role` in its user projection; database models are not response DTOs. Other response objects allow extra fields so clients ignore incidental metadata such as Mongoose `__v`.

## Tokens and client behavior

Register → verify in browser → log in. Login issues an expiring JWT; protected operations require `Authorization: Bearer <token>` **and** server-verified admin access. Credentials must be checked before an unverified-account `403` is returned. Do not accept a client-supplied role as authorization.

The website keeps its token in memory for this baseline (reload requires login); Flutter uses secure storage. Both clear token/user state on logout or a protected request's `401` and prompt for login. A `403` does not mean token expiration: show verification-required or access-denied guidance. No refresh or logout API exists; clearing a token does not revoke other copies, and password reset does not promise revocation of existing JWTs.

Verification/reset tokens are separate, expiring and single-use. Website pages extract the email-link token and call the appropriate endpoint. Mobile users finish that browser flow then return to login. Successful reset consumes the token and requires a fresh login. Resend and forgot-password return neutral success messages for valid requests regardless of account eligibility/existence. Never log passwords, JWTs or action tokens.

Exact JWT and action-token lifetimes, email provider and deployed URLs remain server configuration decisions for auth/deployment work. Clients must not hardcode lifetimes or decode tokens to decide permissions. All tokens must expire, and the API is the authority on validity.

Login throttling returns `429` with a `Retry-After` header in seconds. Clients should wait before retrying. See [API deployment configuration](deployment.md) for current limits, proxy trust, Nginx settings and the single-process rate-limit storage assumption.

## SwaggerHub and maintaining the contract

**SwaggerHub:** [Eisai Studio API 1.0.0](https://app.swaggerhub.com/apis/ucf-1f0/eisai-studio-api/1.0.0), saved in the UCF workspace with private visibility. Workspace access is required. SwaggerHub reports zero validation issues. The checked-in YAML is the exact source imported into this version.

1. Use the linked version to browse the API and schemas; use the checked-in YAML independently for tooling.
2. For a downloadable SwaggerHub copy, choose **Export → Download API → YAML Unresolved** to preserve reusable schema references.
3. If edits happen in SwaggerHub, export YAML back to this file and review the diff in a PR. If edits start in Git, reimport the reviewed version so the two copies match. Do not maintain competing contracts.
4. For endpoint changes, update this spec, the API README and relevant client types/mocks in the same PR. Coordinate breaking changes before implementations merge. Add server integration tests against these status codes and response shapes as each endpoint lands.

Validate the file from the repository root without changing project dependencies:

```sh
npx --yes --package=@apidevtools/swagger-cli@4.0.4 swagger-cli validate docs/api/openapi.yaml
```

Schema validation checks OpenAPI structure and references. Review endpoint examples, access rules and actual server behavior separately; an accepted schema is not a substitute for integration tests.
