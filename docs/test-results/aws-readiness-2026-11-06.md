# Eisai AWS deployment readiness — November 6, 2026

Status: AWS read access and local build verified; production deployment is pending email configuration and DNS setup. No AWS resources were created or modified.

## Verified

- Local profile `eisai` selects `us-east-2`; the user confirmed this Region. AWS MCP caller identity matched the project's configured role/session.
- AWS plan: FREE, ACTIVE, $100 remaining credits, expiration reported as April 26, 2027. Lightsail is included in the new experience Free plan. This does not make ongoing resource usage free. Check AWS Settings > Billing for current spend status.
- In `us-east-2`, Lightsail instances, container services, static IPs, relational databases and Secrets Manager secrets were empty. S3 bucket and Route 53 hosted-zone listings were empty. This is a scoped readiness inspection, not an exhaustive AWS inventory or proof of create permissions.
- Ubuntu 24.04 and 22.04 Lightsail blueprints are available. Current IPv4 Linux bundles include 2 GB RAM / 60 GB disk at $12/month and 4 GB RAM / 80 GB disk at $24/month, excluding snapshots, other services and applicable overages.
- `eisaistudio.com` uses `ns49.domaincontrol.com` and `ns50.domaincontrol.com`; user confirmed GoDaddy. Apex A records were `15.197.148.33` and `3.33.130.190`. No A record was returned for `api.eisaistudio.com`. No DNS was changed.
- Node 24.21.0, lockfile installation and `npm run check` succeeded: lint, both workspaces' type checks, tests (158 API tests), and both production builds. Tests required local loopback access outside the restricted sandbox. These are local checks, not Linux deployment or live integration acceptance.
- Updated both API/deployment environment examples and the deployment runbook to use `us-east-2`.

## Remaining setup

The existing runbook uses one Lightsail VM with Nginx, Node and authenticated MongoDB. For production, use a separate `eisai_production` database and fresh restricted database credentials and JWT secret. Keep MongoDB and Node bound to loopback, expose HTTPS through Nginx, and configure tested off-host database backups. A single VM has no failover; production acceptance still requires restore, reboot, TLS renewal and live application tests.

Proposed public URLs: `https://eisaistudio.com` for the website and `https://api.eisaistudio.com` for the API. Separate hostnames require corresponding Nginx server blocks and certificates; the existing example assumes one shared origin. GoDaddy DNS records can only be finalized after an actual static IP is allocated.

Production email is blocking application startup: the local API environment has no Mailtrap sending token or verified sender. Ask Zaim about the team's Mailtrap access and whether it is only a sandbox. Commit `099c2fd` introduced the email service and token/sender settings; later Zaim commits implemented password reset. Commit authorship does not prove possession of production credentials. Mailtrap production sending requires domain verification and appropriate sending credentials, supplied securely, not committed or pasted in reports.

Image storage, upload permissions, backup storage, monitoring and production secrets must also be provisioned. Do not reuse the development MongoDB connection or seed production automatically. No production database or backend endpoint exists from this work yet.

## References

- https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html
- https://docs.mailtrap.io/email-api-smtp/setup/sending-domain
- https://docs.mailtrap.io/email-api-smtp/setup/api-tokens
