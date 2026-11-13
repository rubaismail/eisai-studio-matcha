# API integration tests

These tests run the real API (routes, controllers, Mongoose models, password
hashing, JWTs) against a real MongoDB. The unit tests in `apps/api/test/` mock
the models; these don't.

## Run them

From the repo root:

```sh
npm run test:integration
```

No setup, credentials or `.env` changes are needed. The first run downloads a
MongoDB server binary (~75 MB) to `~/.cache/mongodb-binaries`; later runs reuse it.
GitHub Actions runs them on every PR as a separate step after `npm run check`.

## Where the data goes

- [`testDatabase.ts`](testDatabase.ts) starts a temporary MongoDB with
  [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server),
  listening only on `127.0.0.1`, with a database named `eisai_test`.
- It sets `MONGODB_URI` to that server **before** the app config loads, so the
  Atlas URI in `apps/api/.env` is never read. After connecting, it checks the
  host is `127.0.0.1` and the database is `eisai_test` and refuses to run otherwise.
- Every collection is emptied before each test, and the server and its data are
  deleted when the run ends. Nothing reaches `eisai_dev` or production.

## What is still fake

Outgoing email. Mailtrap is replaced so the test can read the verification or
reset link a user would have clicked; no email is sent. S3 image upload is not
exercised here (see `upload.test.ts`). Real delivery is checked on staging (#35).

## What's covered

[`flow.int.test.ts`](flow.int.test.ts):

- Full run: register → verify → login → admin adds item → item appears on `/api/menu`
  (customers get 403 adding items; tokens are stored hashed and work once)
- Hiding an item removes it from the public menu but not the admin list; delete removes it
- The unique email index rejects duplicate accounts (including different case/spacing)
- Password reset: new password works, old password and reused link don't
- Account deletion: login stops working; the last admin can't delete themselves

Admins are promoted directly in the database, the same way as in
[docs/admin-account-setup.md](../../../../docs/admin-account-setup.md).

## MongoDB version

The tests use MongoDB 7.0.14 by default because MongoDB 8 macOS builds need
macOS 14+. To match Atlas exactly on a newer Mac or in CI:

```sh
MONGOMS_VERSION=8.0.15 npm run test:integration
```
