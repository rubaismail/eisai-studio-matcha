# API proxy configuration for AWS

For the planned single Lightsail or EC2 server, run one Node API process behind Nginx on the same host. Keep MongoDB on AWS; these settings do not depend on Atlas. This document covers proxy trust and login throttling, not the complete deployment procedure.

## API environment

Set `TRUST_PROXY=loopback` in the deployed API environment when Nginx connects locally. Leave it empty (or `false`) when accessing the API directly during development. Restart the API after changing it.

The API also accepts a comma-separated list of exact proxy IP addresses or CIDR ranges if the infrastructure changes. Trust only the actual proxies. Boolean `true`, numeric hop counts, universal `/0` ranges and invalid settings cause startup to fail rather than silently trust all clients.

## Nginx on the same server

Inside the HTTPS server block, forward `/api/` to the local API and overwrite forwarding headers with values from Nginx's connection:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

The upstream URL deliberately has no trailing slash, preserving `/api/` in the request path. Restrict port 4000 using the server firewall and AWS network rules; public visitors must reach Nginx on HTTPS rather than connect directly to the API. Configure HTTPS certificates and the HTTP-to-HTTPS redirect as part of deployment.

This example assumes Nginx receives visitors directly. If a load balancer, CDN or container network is introduced, revise both the trusted addresses and forwarding-header configuration for that topology. Do not solve a forwarding problem by enabling unrestricted proxy trust. See the [Express proxy guide](https://expressjs.com/en/guide/behind-proxies/).

## Login limits and deployment checks

Login currently allows 20 attempts per client IP and 5 per normalized email in a 15-minute window. All attempts count, including successful and invalid requests; the IP limiter runs first. A blocked request returns `429` with `{ "error": "Too many login attempts. Try again later." }` and a `Retry-After` header in seconds. Clients should display a retry message and wait rather than retry immediately.

Counters are held in one Node process and reset on restart. This suits the initial single-process deployment. Before using multiple workers or servers, use a shared rate-limit store so limits remain consistent across instances.

After deployment, verify that repeated attempts from one client are blocked while another client with a different public IP can still attempt login. Use distinct test emails when testing the IP limit, because the email limit is intentionally shared across client IPs. Also verify that changing a client-supplied `X-Forwarded-For` header cannot bypass the limit. Automated regression tests cover these cases in `apps/api/test/login.proxy.test.ts`.
