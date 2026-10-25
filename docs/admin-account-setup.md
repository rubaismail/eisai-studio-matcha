# Admin Account Setup

## Purpose

Eisai Studio administrators manage menu items through the admin dashboard. Administrator access must not be available through public registration.

## Creating an Admin Account

1. Register an account through the normal registration endpoint.
2. Complete email verification.
3. Have an authorized database administrator verify the account owner's identity.
4. Promote the verified account to the `admin` role using a restricted, audited administrative process.
5. Log in through `POST /api/auth/login`.

## Security Requirements

- Public registration must always assign `role: customer`.
- Client-provided role fields must be ignored.
- Passwords must be stored as bcrypt hashes, never plaintext.
- Never store passwords, JWT secrets, or database credentials in GitHub.
- Admin routes must use both `requireAuth` and `requireAdmin`.
- The JWT signing secret must be configured securely for each environment.
- Admin-role changes must only be performed by authorized personnel.

## Integration Notes

Registration and email verification are implemented separately under Issue #16. Verify that public registration cannot create administrator accounts before production deployment.

The restricted admin-provisioning process must be approved and established before granting production administrator access.