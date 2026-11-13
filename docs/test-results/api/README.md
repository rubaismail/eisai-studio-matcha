# API test results — 2026-11-12 (issue #33)

Run on commit `1d14cb5` (Node v24.21.0, macOS 13 arm64). Raw output is saved unedited
except for local folder paths, which are replaced with `<repo>`.

| Suite | Command | What it uses | Result |
| --- | --- | --- | --- |
| [Unit](unit-tests-2026-11-12.txt) | `npm test -w @eisai/api` | Supertest against the app; models, email and S3 mocked | **173 / 173 passed** |
| [Integration](integration-tests-2026-11-12.txt) | `npm run test:integration` | Real app and models on a throwaway local MongoDB 7.0.14 (`eisai_test`); email mocked | **6 / 6 passed** |

The integration suite includes the full course scenario:
**register → verify email → login → admin adds menu item → item appears on the public menu.**
See [apps/api/test/integration/README.md](../../../apps/api/test/integration/README.md)
for how the test database is isolated and how to rerun these.

Stack traces in the unit output come from tests that trigger server errors on
purpose and check that the cause is logged but not sent to the client.

Not covered here: real email delivery and S3 image hosting (checked on staging in #35).
