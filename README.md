# Job Applications Tracker

Tracker for company research and job applications, built with Django, React, MySQL, Git, and Docker.

## Company Research and Applications

After login, users land on the **Applications** page. Company intelligence is
available separately from the **Companies** page so company research does not
get mixed into the application list.

Companies are user-owned records separate from individual vacancies. Record
outside-EU hiring eligibility and its evidence, relocation support, location
requirements, speculative outreach status, priority, a 0-100 stack-fit score,
primary technologies, hiring cycle, next hiring window, language, work
arrangement, and company-level notes once per company. The company list shows
linked application counts. A company can have any number of vacancy/application
records; company research stays attached and is reused across them.

Applications are the primary records and can be saved with a company name
without creating company research first. Optionally add a company research
record and link applications to it by using the matching company name.
Existing application records are linked to a company with the same owner and
name when the company migration runs; the existing company name and country are
retained. Company and application data remain private to the signed-in user.

The tracker records whether an application is for a current vacancy or a
speculative approach. For speculative applications, it captures the employer's
response to candidates from outside the EU and, for a positive or open
response, the hiring pattern (Q4, Q1, or mid-year). The recommended next step
is shown as Apply now, Target, Re-contact later, or Remove for now.

These strategy fields are additions to the existing application record. The
form and table continue to include company, job title, keywords, URL, applied
date, English and German requirements, other job requirements, application
type, status, salary, and notes. The requirements list includes Python, Django,
Django REST Framework, FastAPI, React, JavaScript/TypeScript, SQL databases,
Docker, cloud providers, Kubernetes, and CI/CD tooling; saved custom
requirements remain available when editing an application.

The dashboard lists all of the signed-in user's applications and optional
company research records. Country is recorded on both company and vacancy
records.

## Flexible Tracking Fields

Previously configured custom application fields remain available on application
forms and tables. Users can configure separate custom fields on the Applications
and Companies pages to suit their profession and workflow. Supported field types
are text, tags, single-select, boolean, and number. Values are stored as typed
JSON on the corresponding application or company record, alongside the core
fields.

The signed-in navigation also provides a user profile, a CV editor, and Help &
Support. Profile and CV changes are saved to the account. The CV editor can use
tracked application roles and keywords as a starting point and download the
current CV as Word (`.docx`) or PDF. Help & Support links to
`zoelewis.58@gmail.com`.

The country picker includes the ISO 3166-1 country and territory list. Type
the beginning of a country name to narrow the suggestions (for example, `u`
shows Uganda, Ukraine, and countries beginning with "United").

Field definitions and values remain private to the signed-in account. To apply
the schema on an existing database, run the Django migrations before using the
updated API.

## Stack

- Backend: Django, Django REST Framework
- Frontend: React, Vite, HTML, CSS, JavaScript
- Database: MySQL
- Tests: Django unit/integration tests, Vitest component tests, Playwright end-to-end tests
- Runtime: Docker Compose

## Run Locally

```bash
docker compose up --build
```

For routine development startup on Windows, macOS, or Linux, run the
project-root launcher:

```bash
python start_dev_jat.py
```

It starts Docker Desktop where applicable, waits for the Docker Engine, starts
the development Compose stack, checks that the database/backend/frontend are
running, then opens this project in VS Code and the frontend plus Django admin
in Firefox. Use `python start_dev_jat.py --no-open` to start and check the stack
without opening desktop applications. Timestamped startup and error logs are
written to the ignored `logs/` directory.

The default Compose configuration loads `docker-compose.override.yml` for
development. `.env.dev` contains local-only settings; `.env` supplies the
database credentials used by Compose. MySQL remains private to the Compose
network. For production, run only the base file; it runs the backend with
Gunicorn and serves the frontend production build:

```bash
docker compose -f docker-compose.yml up --build
```

Then open:

- Frontend: http://localhost:5177
- Development API: http://localhost:8007/api/applications/
- Production site: https://jat.althech.com (after DNS and TLS are configured)
- Django admin: `https://jat.althech.com/<DJANGO_ADMIN_URL>/`

Use `.env.dev` for local development and `.env` for production. Both files are
ignored by Git; edit the production `.env` directly on the server. In
production, keep `VITE_API_BASE_URL` empty so browser requests use Nginx's
same-origin `/api/` proxy; local development sets it to
`http://localhost:8007`. Production publishes only the frontend on loopback;
Django and MySQL remain inside the Compose network.

## Testing

The backend tests use pytest configured in
`jat_backend/pytest.ini`. Shared model/data factories live in
`jat_backend/applications/tests/factories.py`. Run pytest from `jat_backend`
when testing outside Docker.

```bash
docker compose -f docker-compose.test.yml run --build --rm backend
```

```bash
cd jat_frontend
npm ci
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm run build
```

For local backend tests:

```bash
cd jat_backend
pytest
```

Backend dependencies are grouped in `jat_backend/requirements/`: `base.txt`
contains runtime dependencies, with `dev.txt`, `prod.txt`, and `test.txt`
extending it for each environment.
Pytest sets `DJANGO_ENV=test` and uses an in-memory SQLite database; both
development and production use MySQL. Production Nginx proxies Django admin
static assets through WhiteNoise.

Backend unit tests cover business rules, model behavior, and serializer
validation without database access. Backend integration tests exercise API
views, persistence, ownership, and authentication. Form rules are isolated from
the React form and tested independently, with component tests covering the UI.
Playwright drives the authenticated tracker flow with deterministic API
responses. Production Nginx serves the frontend on port `5177` and proxies
`/api/` and the configured `DJANGO_ADMIN_URL` path to Django/Gunicorn on port
`8007`. A TLS
terminator in front of this Nginx listener must forward the original
`X-Forwarded-Host` and `X-Forwarded-Proto` headers. The production frontend
binds to `127.0.0.1:5177`; the backend port is not published to the host.

Before production launch:

1. Point the domain's DNS A/AAAA record to the deployment host.
2. Configure HTTPS/TLS termination for `jat.althech.com` and forward requests
   to Nginx on port `5177`, preserving the original forwarded host and protocol.
3. Set strong, unique production Django and MySQL secrets in `.env`; do not use
   the development credentials in `.env.dev`.
4. Confirm the production database is backed up and migrations can be applied.
5. Create a Django superuser and verify login through the custom admin URL.
6. Keep ports `5177`, `8007`, and `3306` closed to public traffic; expose only
   SSH and the TLS terminator's HTTP/HTTPS ports.
7. Configure a Google OAuth Web client with the site's JavaScript origin and
   set its client ID in production `.env` as `GOOGLE_OAUTH_CLIENT_ID`. For
   local sign-in, configure localhost port `5177` and set
   `GOOGLE_OAUTH_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in `.env.dev`. In
   production, the frontend reads `GOOGLE_OAUTH_CLIENT_ID` from its runtime
   environment, so the deploy workflow rebuilds and restarts the frontend
   image after pulling application changes.

## DigitalOcean Deployment

See [deploy/digitalocean.md](deploy/digitalocean.md) for the Droplet, DNS,
TLS, firewall, backup, and update procedure. The
[GitHub Actions workflow](.github/workflows/ci.yml) runs backend and frontend
checks for pull requests to `main` and deploys successful pushes to `main` over
SSH. Configure the required repository secrets before enabling deployment.
