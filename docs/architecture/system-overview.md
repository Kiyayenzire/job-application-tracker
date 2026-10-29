# System Overview - Job Application Tracker

## Architecture summary

JAT is a React single-page application backed by a Django REST API and MySQL.
The production Compose stack runs on a DigitalOcean Droplet. Public HTTPS
terminates at the host reverse proxy (documented as Caddy), which forwards
requests to the frontend Nginx container.

## Services

| Service | Role |
| --- | --- |
| `jat_frontend` | Serves the Vite-built React application through Nginx on container port 5177. Nginx serves the SPA and proxies API, admin, and static-file requests to Django. |
| `jat_backend` | Django and Django REST Framework served by Gunicorn on container port 8007. |
| `jat_migration` | One-shot container using the backend image to run Django migrations and collect static files before normal service operation. |
| `jat_db` | MySQL 8.4. The `db_data` named volume persists database files across container replacement. |

Compose places the services on its default private network. The frontend
reaches Django by the Compose service hostname `backend`; Django reaches MySQL
at `db`. MySQL is not published to a host port in the production Compose file.

## Request flow

1. A browser connects to `https://jat.althech.com`.
2. The host TLS proxy forwards the request to `127.0.0.1:5177`.
3. Frontend Nginx serves the SPA for UI routes. It sends `/api/`, the configured
   Django admin path, and `/static/` requests to `backend:8007`.
4. Django authenticates API requests and reads/writes application data in
   MySQL.

The frontend loads `/runtime-config.js` before its application bundle. The
frontend container generates this file at startup from
`GOOGLE_OAUTH_CLIENT_ID`, allowing the Google web client ID to be supplied at
runtime. Django independently uses the same ID to verify Google ID tokens.

## Application data and authentication

Applications, company research, custom fields, profile, and CV data are
associated with the authenticated user. The API uses DRF token authentication
for application requests. Google sign-in validates the Google ID token on the
backend and returns the application's own API token.

Employer assessments are stored per application, so separate roles at one
company can have different scores, evidence, and relocation assessments.
See the [Employer Assessments guide](../reference/employer-assessments.md) for
the criteria and workflow.

## Related references

- [Network topology](./network-topology.md)
- [CI/CD pipeline](../deployment/ci-cd-pipeline.md)
- [Production deployment guide](../../deploy/digitalocean.md)
