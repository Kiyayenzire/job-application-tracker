# DigitalOcean deployment

This guide deploys the production Docker Compose stack on a Droplet. GitHub
Actions runs the backend and frontend tests for pull requests to `main`. After
those checks pass for a push to `main`, it connects to the Droplet over SSH,
updates the checkout at `/opt/job-application-tracker`, builds the images, and
recreates the Compose services. Images are built on the Droplet; GHCR is not
used.

## 1. Create and secure the Droplet

1. Create a supported Ubuntu LTS Droplet with enough disk for MySQL data and
   Docker images.
2. Add an SSH key and create a non-root deployment user with Docker access.
3. Configure the DigitalOcean Cloud Firewall to allow SSH (22), HTTP (80), and
   HTTPS (443) only. Do not expose MySQL (3306), Django (8007), or the app's
   internal frontend listener (5177).
4. Point the domain's A record to the Droplet. Add an AAAA record only if IPv6
   is configured and firewalled too.
5. Install Docker Engine and the Docker Compose plugin, plus Caddy on the host
   for automatic HTTPS.
6. Clone this repository to `/opt/job-application-tracker`, check out `main`,
   and ensure the deployment user can run Docker and access the checkout.
   Create the production `.env` in this directory on the server.

## Configure GitHub Actions

In the repository's **Settings → Secrets and variables → Actions**, add these
repository secrets:

- `DEPLOY_HOST`: Droplet IP address or SSH hostname.
- `DEPLOY_USER`: non-root deployment user with Docker access.
- `DEPLOY_SSH_KEY`: private SSH key authorized for that user.
- `DEPLOY_HOST_FINGERPRINT`: SSH host key fingerprint in `SHA256:...` format.

The deployment workflow is `.github/workflows/ci.yml`. It runs checks on pull
requests to `main`, and deploys only after checks pass on a push to `main`.
Configure branch protection to require both CI jobs before merging. Optionally
add required reviewers to the GitHub `production` environment to gate
deployments.

The production `.env` remains on the Droplet and is not copied to GitHub
Actions. The workflow automatically starts the app after a successful push;
review migrations and take a database backup before merging changes that may
alter the schema. Startup runs migrations automatically, and this workflow
does not create database backups or perform automated rollback.

## 2. Configure the production environment

Edit the production `.env` directly on the server. Generate a unique Django
key, database password, and non-obvious admin URL; do not reuse development
values or commit `.env`. Set `DJANGO_ALLOWED_HOSTS` to the public domain and
`backend`, set `BASE_URL=https://jat.althech.com`, and keep
`VITE_API_BASE_URL` empty so the browser uses the same-origin API proxy.
`DJANGO_ADMIN_URL` configures both the Django route and the frontend Nginx
proxy path; it must be a path segment with no leading or trailing slash.
Set `GOOGLE_OAUTH_CLIENT_ID` in the server's `.env` to the Google OAuth Web
client ID. Production Compose passes it to Django for server-side ID-token
verification and to the frontend build as `VITE_GOOGLE_CLIENT_ID`. The frontend
is a static bundle, so setting a container runtime variable alone is not enough:
the frontend image must be rebuilt after changing the client ID. This client ID
is public; a Google client secret is not needed for this sign-in flow.

```dotenv
GOOGLE_OAUTH_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

In Google Cloud Console, configure an OAuth client of type **Web application**
and add the deployment site's HTTPS origin under **Authorized JavaScript
origins**. For local testing, also add `http://localhost:5177`. Set the matching
ID as `GOOGLE_OAUTH_CLIENT_ID` in the server `.env`, and set both
`GOOGLE_OAUTH_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in the development
`.env.dev`. The production deployment builds images from this checkout, and
Compose supplies the server client ID to the frontend build. The Google button
is available on both login and account creation; if the client ID is missing,
clicking it reports the missing configuration while username/password
authentication remains available.

Keep HSTS disabled initially. After HTTPS and redirects have been verified
end-to-end, set `SECURE_HSTS_SECONDS=31536000`. Enable
`SECURE_HSTS_INCLUDE_SUBDOMAINS` only if every subdomain is HTTPS-ready. Do not
enable preload without understanding its long-lived browser impact.

## 3. Configure TLS termination

The frontend container listens on host loopback at `127.0.0.1:5177`. Configure
Caddy on the host with a site block like:

```caddyfile
jat.althech.com {
    reverse_proxy 127.0.0.1:5177
}
```

Caddy obtains and renews TLS certificates and forwards the original host and
HTTPS protocol. The frontend's Nginx proxies `/api/`, Django admin, and static
assets to the backend container. Keep the host proxy headers enabled; Django
uses `X-Forwarded-Proto` to recognize HTTPS behind Nginx.

## 4. Start and verify

From the repository directory:

```sh
docker compose -f docker-compose.yml config --quiet
docker compose -f docker-compose.yml up --build -d
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=100 backend frontend db
```

The backend entrypoint applies migrations and collects Django static files
before starting Gunicorn. Confirm the public site, `/api/countries/`, login,
application and company CRUD, profile/CV pages, and custom Django admin URL
over HTTPS. Create the first administrator with:

```sh
docker compose -f docker-compose.yml exec backend python manage.py createsuperuser
```

Run Django's deployment checks in the production container before launch:

```sh
docker compose -f docker-compose.yml run --rm --no-deps \
  --entrypoint python backend manage.py check --deploy
```

Resolve all deployment warnings. HSTS warnings are expected until HSTS is
enabled after HTTPS verification.

## 5. Backups and updates

Back up the MySQL database and the Droplet before applying updates. Store
database backups outside the Droplet and periodically test restoring one.
Protect the Compose `db_data` volume; recreating containers is safe, deleting
that volume is not.

For a source-based update, fetch the reviewed revision and rebuild:

```sh
git pull --ff-only
docker compose -f docker-compose.yml up --build -d
docker compose -f docker-compose.yml logs --tail=100 backend
```

Review migrations before applying them, take a fresh backup, and verify the
application after the backend has completed its startup migration.

## Remaining release work

- Decide whether to keep MySQL on the Droplet or move to a managed database,
  and establish automated off-site backups and restore drills.
- Configure monitoring, alerting, log retention, and a tested rollback plan.
- Run the production deployment check with the final environment and ensure
  the TLS and HSTS settings match the chosen domain setup.
