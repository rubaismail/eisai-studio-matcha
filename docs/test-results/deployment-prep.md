# Backend deployment preparation validation

Preparation for #22, based on main after PR #71 merged. No AWS resources were provisioned.

- Node 24: `npm ci` and `npm run check` (lint, typecheck, 158 API tests, 2 web tests, web/API builds).
- Production configuration tests cover missing settings, HTTPS origins, malformed ports/limits, disabled throttling, sandbox mail, incomplete AWS keys and development compatibility.
- Disposable MongoDB 7.0.14 with compiled API: production preflight succeeded; read-only smoke script verified health 200, menu 200 and anonymous admin 401. Disabled throttling failed startup before database connection. An occupied port exited with status 1. SIGTERM exited cleanly with status 0 and disconnected MongoDB.
- `git diff --check` passed.

This was a macOS preparation environment. Nginx syntax/HTTPS and systemd behavior must be validated on the target Linux server (`nginx -t`, service startup/reboot). AWS database authentication/storage, real email delivery, S3 upload/public retrieval, backup scheduling/restore and rollback are pending live acceptance. The website reset form is tracked by #50. These local results do not close deployment issue #22.
