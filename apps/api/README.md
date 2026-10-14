# Eisai Studio API

The Express API accepts JSON requests and returns JSON responses. It connects to MongoDB Atlas through Mongoose. Website and Flutter clients call this API; they do not connect directly to the database. Endpoint paths and JSON field names are case sensitive.

**Local base URL:** `http://localhost:4000/api`

Start the API and website from the repository root with `npm run dev`. Set `MONGODB_URI` in `apps/api/.env` to the Atlas development connection string. Docker is not required. See the [project setup guide](../../README.md).

## Quick navigation

- [Request requirements](#request-requirements)
- [Response contract and status codes](#response-contract)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Scope](#scope)
- [Where your code goes](#where-your-code-goes)
- [Team workflow](../../docs/team-guide.md)

## Request requirements

- Use the HTTP method shown for each endpoint.
- Send `Content-Type: application/json` and a JSON object for JSON request bodies.
- Send no request body for GET or DELETE requests.
- Photo uploads use `multipart/form-data` with one file field named `image`. Let the browser or HTTP client set the multipart boundary.
- Protected endpoints require `Authorization: Bearer <token>` with the JWT returned by login.
- Do not send a user ID or role to select your permissions. The API determines access from the authenticated user. Public registration creates customers only.
- Replace `:id` with the menu item's MongoDB `_id`.

## Response contract

Successful responses use endpoint-specific JSON objects: `{ "items": [...] }` for lists, `{ "item": {...} }` for a saved menu item, and `{ "message": "..." }` for account actions or deletion. Login and upload responses are shown below. Empty lists return `{ "items": [] }`.

Errors use a consistent JSON object:

```json
{
  "error": "Useful error message"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `200` | Request completed successfully |
| `201` | Account, menu item or uploaded image created |
| `400` | Missing or invalid input, malformed ID, or invalid/expired/used action token |
| `401` | Missing, invalid or expired login JWT, or incorrect login credentials |
| `403` | Email verification required or user lacks admin access |
| `404` | Menu item or route not found |
| `409` | Email address already registered |
| `413` | Uploaded image exceeds the size limit |
| `415` | Unsupported upload file type |
| `500` | Unexpected server or database error |
| `503` | Health check reports a disconnected database |

## Authentication

Register, verify the email address, then log in. Login returns a JWT and a user object. Send the JWT in the `Authorization` header on every admin request:

```http
Authorization: Bearer <token>
```

Unverified users cannot log in. A customer JWT does not grant admin access. The client's admin account is provisioned separately; registering with `"role": "admin"` never grants that role.

Logout clears the JWT and authenticated state on the client. There is no logout endpoint in this API; clearing a token does not revoke another copy before it expires. Flutter stores its JWT in secure storage.

Verification and password-reset tokens are expiring, single-use action tokens, separate from login JWTs. Email links open the website's verification or reset page, which calls the corresponding API endpoint. Mobile users complete that browser flow and then return to the app to log in.

## Endpoints

There are **14 endpoints**: six account endpoints, six menu endpoints, one upload endpoint and one health endpoint. Each HTTP method/path combination counts as one endpoint.

### 1. POST /api/auth/register

Creates a customer account and sends a verification email. No authentication required.

```json
{
  "email": "jane@example.com",
  "password": "example-password"
}
```

Returns HTTP `201`:

```json
{
  "message": "Account created. Check your email to verify your account."
}
```

Passwords are hashed before storage. A duplicate email returns `409`; invalid input returns `400`.

### 2. GET /api/auth/verify?token=<verification-token>

Verifies the email address associated with the action token. No authentication or request body required.

Returns HTTP `200`:

```json
{
  "message": "Email verified. You can now log in."
}
```

A missing, expired, invalid or previously used token returns `400`.

### 3. POST /api/auth/resend-verification

Requests another verification email. No authentication required.

```json
{
  "email": "jane@example.com"
}
```

Returns HTTP `200` with a neutral response that does not disclose whether an eligible account exists:

```json
{
  "message": "If this account needs verification, a verification email has been sent."
}
```

### 4. POST /api/auth/login

Authenticates a verified user. No existing JWT required.

```json
{
  "email": "jane@example.com",
  "password": "example-password"
}
```

Returns HTTP `200`:

```json
{
  "token": "<jwt>",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "jane@example.com",
    "role": "customer"
  }
}
```

Incorrect credentials return `401`; an unverified account returns `403`. Password hashes and action tokens are never included in the user response.

### 5. POST /api/auth/forgot-password

Requests a password-reset email. No authentication required.

```json
{
  "email": "jane@example.com"
}
```

Returns HTTP `200` with the same response whether or not the email is registered:

```json
{
  "message": "If an account exists for this email, a password-reset link has been sent."
}
```

### 6. POST /api/auth/reset-password

Sets a new password using the token from the reset email. No login JWT required.

```json
{
  "token": "<password-reset-token>",
  "password": "new-example-password"
}
```

Returns HTTP `200`:

```json
{
  "message": "Password reset. Log in with your new password."
}
```

The new password is hashed and the reset token is consumed. Invalid input and expired, invalid or reused tokens return `400`.

### 7. GET /api/menu

Lists available menu items, sorted by name. No authentication or request body required. Items with `isAvailable: false` are excluded.

Returns HTTP `200`:

```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Matcha Latte",
      "description": "Matcha with your choice of milk.",
      "price": 6.5,
      "category": "Drinks",
      "imageUrl": "https://example.com/images/matcha-latte.webp",
      "isSeasonal": false,
      "isAvailable": true,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

Prices are numbers in dollars. Image URLs in these examples are illustrative.

### 8. GET /api/menu/seasonal

Lists available seasonal items for the home-page highlight. No authentication or request body required. Returns HTTP `200` with the same `{ "items": [...] }` shape as the public menu, filtered to `isSeasonal: true` and `isAvailable: true`.

### 9. GET /api/admin/menu

Lists all menu items, including hidden items, for the admin dashboard. Requires an admin JWT. No request body required.

Returns HTTP `200` with the same `{ "items": [...] }` shape as the public menu. Hidden items remain visible here so the admin can edit or unhide them.

### 10. POST /api/menu

Creates a menu item. Requires an admin JWT.

```json
{
  "name": "Matcha Latte",
  "description": "Matcha with your choice of milk.",
  "price": 6.5,
  "category": "Drinks",
  "imageUrl": "https://example.com/images/matcha-latte.webp",
  "isSeasonal": false,
  "isAvailable": true
}
```

`name` and `price` are required; the name must not be blank and price must be nonnegative. Optional defaults are an empty description and image URL, category `Drinks`, `isSeasonal: false`, and `isAvailable: true`.

Returns HTTP `201` with `{ "item": {...} }`, containing the saved item in the shape shown above, including its `_id` and timestamps.

### 11. PUT /api/menu/:id

Updates an existing item. Requires an admin JWT. Send the editable fields to change; omitted fields retain their existing values. `_id` and timestamps cannot be set by the client.

```json
{
  "name": "Seasonal Matcha Latte",
  "price": 7,
  "isSeasonal": true
}
```

Returns HTTP `200` with `{ "item": {...} }`, containing the updated item. Invalid data returns `400`; a valid but nonexistent ID returns `404`.

Hide an item without deleting it:

```json
{
  "isAvailable": false
}
```

Unhide it by sending `"isAvailable": true`. Hiding removes it from public and seasonal reads but keeps it in the admin list. Hide and unhide use this endpoint; they are not additional endpoints.

### 12. DELETE /api/menu/:id

Permanently deletes a menu item. Requires an admin JWT. No request body required. The client asks for confirmation before sending this request.

Returns HTTP `200`:

```json
{
  "message": "Menu item deleted."
}
```

A valid but nonexistent ID returns `404`. Use the update endpoint's availability flag when an item should only be hidden.

### 13. POST /api/uploads

Uploads one menu photo to AWS S3 and returns its URL. Requires an admin JWT. Use multipart field `image`; accepted formats are JPEG, PNG and WebP, with a maximum size of 5 MiB (5,242,880 bytes).

```sh
curl -X POST http://localhost:4000/api/uploads \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/matcha.webp"
```

Returns HTTP `201`:

```json
{
  "imageUrl": "https://example.com/images/uploaded-matcha.webp"
}
```

The admin form sends this URL as `imageUrl` when creating or updating the menu item. Uploading an image does not itself create or update a menu record. Images are stored in S3, not on the API server's disk.

### 14. GET /api/health

Reports API/database readiness. No authentication or request body required.

Returns HTTP `200` when connected to Atlas:

```json
{
  "status": "ok"
}
```

Returns HTTP `503` when disconnected:

```json
{
  "status": "database disconnected"
}
```

## Scope

Web and Flutter share these endpoints. Favorites, checkout, order queues and loyalty synchronization are outside this baseline. A GrubHub ordering link is a frontend link, not an API endpoint. There are no separate logout, hide, unhide or single-item detail endpoints.

## Where your code goes

| Folder             | Put this here                                                             | Example                 |
| ------------------ | ------------------------------------------------------------------------- | ----------------------- |
| `src/routes/`      | Which URL calls which function. Register new files in `routes/index.ts`.  | `auth.routes.ts`        |
| `src/controllers/` | What happens when a URL is hit: read the request, use a model, send JSON. | `auth.controller.ts`    |
| `src/models/`      | Mongoose schemas — the shape of each MongoDB collection.                  | `User.ts`               |
| `src/middleware/`  | Code that runs before controllers (e.g. "is this user an admin?").        | `requireAdmin.ts`       |
| `src/services/`    | Talking to outside services. Create it when you need it.                  | `email.ts`, `upload.ts` |
| `src/config/`      | Environment variables and the database connection. Rarely changes.        |                         |
| `src/scripts/`     | One-off commands like `npm run seed`.                                     |                         |
| `test/`            | Tests, named after what they test.                                        | `auth.test.ts`          |

**Adding an endpoint, step by step** (e.g. `POST /api/auth/register`):

1. Model (if new data): `src/models/User.ts`
2. Controller function: `src/controllers/auth.controller.ts`
3. Route: `src/routes/auth.routes.ts`, then add `router.use('/auth', authRoutes)` in `src/routes/index.ts`
4. Test: `test/auth.test.ts`
5. Update the SwaggerHub spec so web and mobile know the request/response shape.
