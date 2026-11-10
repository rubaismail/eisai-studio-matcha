# Shared API contract

[openapi.yaml](openapi.yaml) is the reviewable source of truth for endpoint paths, request and response schemas, validation, status codes and access rules. [apiREADME](../../apps/api/apiREADME.md) explains the same API with walkthroughs. This formalizes that existing outline so API, React and Flutter developers can build together and import the contract into SwaggerHub or client/mock tools.


This is the **target contract**, not a claim that all routes exist. At this revision, registration, email verification, password reset, login, public menu reads, seasonal menu reads, admin menu management, image uploads, and health checks are implemented.

Each operation has an `x-implementation-status` marker indicating its implementation status. Update these markers as routes are implemented or changed. Schema validation alone does not prove server conformance.

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


## Inspiration and accessible photo descriptions

The existing menu create/update endpoints accept `inspiredBy` and `imageAlt`; all menu responses (including seasonal and admin aliases) return both strings. Both default to `""` on new items and on reads of legacy records without the fields. No data migration is required.

| UI label | API field |
| --- | --- |
| Inspired by | `inspiredBy` |
| Describe the photo | `imageAlt` |
| What’s in it | `description` |
| Recommended | `isRecommended` |
| Feature on home | `isFeatured` |

`inspiredBy` and `imageAlt` must be strings: null, numbers, booleans, arrays and objects return HTTP 400 without saving other supplied changes. Leading/trailing whitespace is trimmed; internal whitespace and text are preserved. Omitted fields remain unchanged on PUT; `""` (or whitespace-only text) explicitly clears a value. Unknown fields still return 400. All writes remain admin-only.

Handoff for [#51](https://github.com/rubaismail/eisai-studio-matcha/issues/51) and [#27](https://github.com/rubaismail/eisai-studio-matcha/issues/27):

- The staff form should collect meaningful photo alt text when a photo is supplied. These fields remain optional at the API boundary for existing clients and legacy items.
- Public web/mobile clients should use nonempty `imageAlt` as the image’s accessible description, falling back to the item’s `name` for legacy items. If there is no image, do not expose stale alt text as a photo description. Hide an empty inspiration label.
- Treat both strings as plain text, never HTML. Use normal escaped text rendering and an `alt` attribute or the platform’s accessibility label; never inject them as markup.
- Replacing a photo: submit the new `imageUrl` and reviewed `imageAlt` together. Removing a photo: send `{ "imageUrl": "", "imageAlt": "" }`. The API deliberately preserves omitted alt text even when the URL changes; it does not infer whether a replacement depicts the same drink. Changing a photo never changes `inspiredBy`.
- Uploading a file only returns its URL; save its description in the subsequent menu create/update. This change implements the API contract, not the frontend controls.

Example partial update:

```json
{
  "inspiredBy": "Banana bread",
  "imageUrl": "https://example.com/images/golden-hour.webp",
  "imageAlt": "Green matcha layered over banana milk in a clear cup"
}
```

## Menu metadata and homepage display

The menu API supports additional metadata for drink filtering and homepage display across the React website and Flutter mobile application.

| Field | Type | Purpose | Default |
| --- | --- | --- | --- |
| `teaBases` | `string[]` | Identifies whether a drink supports Matcha, Hojicha, or both | `[]` |
| `isRecommended` | `boolean` | Controls inclusion in the Recommended filter and badge | `false` |
| `isFeatured` | `boolean` | Controls inclusion in the homepage spinning carousel | `false` |
| `isSeasonal` | `boolean` | Identifies seasonal menu offerings | `false` |
| `isAvailable` | `boolean` | Controls public menu visibility | `true` |

### Tea base filtering

The `teaBases` array accepts `matcha`, `hojicha`, or both. Duplicate values and unsupported tea bases are rejected.

A drink containing both values appears in both Matcha and Hojicha filters. The existing `category` field remains available for compatibility and is not used to determine tea-base filtering.

### Featured and seasonal drinks

`isFeatured` and `isSeasonal` are independent admin-controlled fields.

- `isFeatured: true` identifies a drink for the homepage spinning carousel.
- `isSeasonal: true` identifies a seasonal menu offering.
- A drink may be featured, seasonal, both, or neither.
- Only available items are eligible for public display.

This allows the business to feature regular menu drinks even when no seasonal drinks are available.

If no available drinks have `isFeatured: true`, the frontend should hide the homepage carousel and collapse the unused space.

The existing `GET /api/menu/seasonal` endpoint continues to return available seasonal items independently of the featured carousel.

### Dynamic menu behavior

The website and Flutter app should generate menu cards, filtering results, and counts dynamically from API responses rather than hardcoding example drinks.

Recommended items are identified by `isRecommended: true`. Public clients exclude unavailable items.

### API creation and updates

The menu create and update operations accept the new metadata fields.

When omitted during creation, the defaults are:

- `teaBases: []`
- `isRecommended: false`
- `isFeatured: false`

Partial updates preserve omitted fields.

The backend rejects unsupported tea bases, duplicate values, incorrect boolean types, unknown properties, and explicit null values.

Existing database records may require metadata updates to populate their tea bases and display settings.

These fields are supported by the backend API; corresponding web admin controls and Flutter integration are separate implementation tasks.

## Tokens and client behavior

Register → verify in browser → log in. Login issues an expiring JWT; protected operations require `Authorization: Bearer <token>` **and** server-verified admin access. Credentials must be checked before an unverified-account `403` is returned. Do not accept a client-supplied role as authorization.

The website keeps its token in memory for this baseline (reload requires login); Flutter uses secure storage. Both clear token/user state on logout or a protected request's `401` and prompt for login. A `403` does not mean token expiration: show verification-required or access-denied guidance. No refresh or logout API exists; clearing a token does not revoke other copies, and password reset does not promise revocation of existing JWTs.

Verification/reset tokens are separate, expiring and single-use. Website pages extract the email-link token and call the appropriate endpoint. The verification token is sent as the `token` query parameter to `GET /api/auth/verify`. The reset token is also sent as the `token` query parameter to `POST /api/auth/reset-password` — not in the JSON body; the body contains only `password`. Mobile users finish that browser flow then return to login. Successful reset consumes the token and requires a fresh login.

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


### Account email configuration

For local development, set `MAILTRAP_USE_SANDBOX=true`, a sandbox API token in
`MAILTRAP_TOKEN`, a positive `MAILTRAP_INBOX_ID`, and a valid `EMAIL_FROM` address.
Sandbox messages appear in Mailtrap; they are not delivered to customer inboxes.

For production, use `MAILTRAP_USE_SANDBOX=false`, sending credentials and a verified
sender/domain. Configuration is loaded at startup; restart the API after changing it.
Never commit real credentials.

Both account emails link to website pages on `WEB_ORIGIN` (locally `http://localhost:5173`),
never straight to the API. Set `WEB_ORIGIN` to the public website origin in production,
even when the API uses a separate host:

- Verification: `WEB_ORIGIN/verify-email?token=<raw-token>`. The website page reads the
  token and calls `GET /api/auth/verify?token=...`.
- Password reset: `WEB_ORIGIN/reset-password?token=<raw-token>`. The website form submits
  `{ "password": "..." }` to `POST /api/auth/reset-password?token=...`; the email must not
  link directly to that POST-only API endpoint. The reset form is tracked in #50.

A missing or invalid email or `WEB_ORIGIN` configuration is rejected before registration
creates an account, resend replaces a verification token or forgot-password stores a reset
token. Because the links open the website, deploy the website before an API release that
sends them, or customers cannot verify or reset.

Registration defaults to 20 requests per IP and 3 per normalized email per 15 minutes;
resend defaults to 10 per IP and 2 per email. Their counters are separate from login.
Configure `AUTH_RATE_WINDOW_MS`, `REGISTER_IP_LIMIT`, `REGISTER_EMAIL_LIMIT`,
`RESEND_IP_LIMIT`, and `RESEND_EMAIL_LIMIT` using positive integer values. Excess requests
return 429 with `Retry-After`; clients should wait before retrying. Resend also enforces
an atomic 60-second account cooldown and returns a neutral message for ineligible accounts.

Automated tests use isolated database/delivery mocks. Real inbox delivery and the deployed
registration → verification → login flow remain deployment smoke tests.
