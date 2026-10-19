# Job Applications Tracker

Excel-like tracker for job applications, built with Django, React, MySQL, Git, and Docker.

The tracker records whether an application is for a current vacancy or a
speculative approach. For speculative applications, it captures the employer's
response to candidates from outside the EU and, for a positive or open
response, the hiring pattern (Q4, Q1, or mid-year). The recommended next step
is shown as Apply now, Target, Re-contact later, or Remove for now.

These strategy fields are additions to the existing application record. The
form and table continue to include company, job title, keywords, URL, applied
date, English and German requirements, other job requirements, application
type, status, salary, and notes. Add and save application details before
searching the list. The list view includes a sidebar for country, company, job
title, keyword, requirements, application dates, status, vacancy and outreach
strategy, salary range, and configured filterable custom fields. Select **Apply
filters** to run a search; editing filter values alone does not change the
results. Country can be entered on an application and used to filter the list.

## Flexible Tracking Fields

Each account can set a profession template and add custom application fields
from **Custom data & profile settings**. Supported field types are text, tags, single-select,
boolean, and number. Single-select fields have account-defined options, and
each field can be enabled or disabled as a filter. Defined fields appear in the
application form and table; filterable fields are also available in the filter
sidebar. Values are stored as typed JSON on each application, alongside relational
core fields such as country, dates, status, and salary range.

The country picker includes the ISO 3166-1 country and territory list. Type
the beginning of a country name to narrow the suggestions (for example, `u`
shows Uganda, Ukraine, and countries beginning with "United").

The template and field definitions are private to the signed-in account. To
apply the new schema on an existing database, run the Django migrations before
using the updated API.

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
- API: http://localhost:8007/api/applications/
- Production site: https://jat.althech.com (after DNS and TLS are configured)
- Django admin: https://jat.althech.com/jatalthech2026/

The root `.env` is the production configuration and is grouped by Django,
MySQL, security/proxy, frontend-origin, and container settings. `.env.dev`
contains safe local-only MySQL credentials and development settings. In the
production `.env`, keep `VITE_API_BASE_URL` empty so browser requests use
Nginx's same-origin `/api/` proxy; local development sets it to
`http://localhost:8007`.

## Testing

The backend tests use pytest configured in
`jat_backend/pytest.ini`. Shared model/data factories live in
`jat_backend/applications/tests/factories.py`. Run pytest from `jat_backend`
when testing outside Docker.

```bash
docker compose -f docker-compose.test.yml run --build --rm backend
docker compose run --rm frontend npm run test:unit
docker compose run --rm frontend npm run test:e2e
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
`/api/` and `/jatalthech2026/` to Django/Gunicorn on port `8007`. A TLS
terminator in front of this Nginx listener must forward the original
`X-Forwarded-Host` and `X-Forwarded-Proto` headers.

Before production launch:

1. Point the domain's DNS A/AAAA record to the deployment host.
2. Configure HTTPS/TLS termination for `jat.althech.com` and forward requests
   to Nginx on port `5177`, preserving the original forwarded host and protocol.
3. Set strong, unique production Django and MySQL secrets in `.env`; do not use
   the development credentials in `.env.dev`.
4. Confirm the production database is backed up and migrations can be applied.
5. Create a Django superuser and verify login through the custom admin URL.
6. Restrict direct public access to Django on port `8007` at the host firewall
   if all public web traffic is intended to go through Nginx.

## DigitalOcean Deployment

See [deploy/digitalocean.md](deploy/digitalocean.md).
