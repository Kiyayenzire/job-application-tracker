# Security Policies

This page documents current application settings and production practices. It
does not replace a deployment security review.

## Secrets and account security

- Keep `.env` and `.env.dev` out of Git and restrict production `.env`
  permissions on the Droplet.
- Use unique production values for `DJANGO_SECRET_KEY`, database passwords,
  and the admin path. Rotate credentials if they were exposed.
- Do not put Django or database secrets in Vite variables, frontend assets, or
  browser logs.
- Google sign-in uses a public OAuth Web client ID and server-side ID-token
  verification. A client secret is not required for this flow.
- The configured admin URL is an obscurity measure only. Django admin still
  requires authenticated, authorized staff accounts.

## Host and network boundaries

- Publicly expose SSH and the TLS reverse proxy only.
- Production frontend and backend host bindings are loopback-only. MySQL is
  private to the Compose network and has no production host port mapping.
- Restrict SSH with keys and a cloud firewall. Docker access is highly
  privileged.
- Preserve the `db_data` volume and maintain off-site backups. Never remove
  production volumes as a troubleshooting shortcut.

See [Network topology](../architecture/network-topology.md).

## Django headers and origins

Django settings enable secure content-type handling, deny framing, use a
same-origin referrer policy, and trust the forwarded HTTPS header configured
for the proxy. Production configuration should:

- Set `DJANGO_ALLOWED_HOSTS` to exact expected hosts, including `backend` for
  internal proxied traffic where required.
- Set `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to only the exact
  browser origins needed. Production settings default these lists to empty.
- Enable `SECURE_SSL_REDIRECT` only when the TLS proxy sends the expected
  `X-Forwarded-Proto: https` value.
- Enable HSTS only after verifying HTTPS and redirects. Include subdomains or
  request preload only when every affected hostname is prepared.

## Vite development host behavior

The current `vite.config.js` sets port `5177` and polling but does not define
Vite's `server.allowedHosts`. Do not assume that the production domain has
been added to a Vite development-server allowlist. Production uses the Nginx
container, not the Vite dev server.

## Browser and OAuth configuration

Configure the Google OAuth client as a **Web application** and allow only
intended JavaScript origins, including the HTTPS production origin. For local
development, explicitly add the local origin if needed. The server verifies
the token audience against `GOOGLE_OAUTH_CLIENT_ID`.

## Backups and audit

The repository contains no active rclone configuration or scheduled backup
job. Configure, restrict, monitor, and test off-site backups before treating
them as a production control. See [Disaster recovery](../deployment/disaster-recovery.md).
