# Local Development Setup

## Prerequisites

- Docker Engine/Desktop with the Docker Compose plugin.
- Python 3 for the optional project launcher.
- Node.js 22 and npm for running frontend checks directly on the host.

## Start the development stack

The repository includes `docker-compose.override.yml`, which Compose loads
automatically alongside the base `docker-compose.yml`. It configures Django
development mode, a Vite development server, local source mounts, and
development-only database credentials.

Start the stack from the repository root:

```sh
docker compose up --build
```

Alternatively, the project launcher starts and checks the stack:

```sh
python start_dev_jat.py
```

Use `python start_dev_jat.py --no-open` to avoid opening desktop applications.
Launcher logs are written to the ignored `logs/` directory.

Open:

- Frontend: `http://localhost:5177`
- Backend API: `http://localhost:8007/api/`
- Django admin: `http://localhost:8007/<DJANGO_ADMIN_URL>/`

The development override publishes the backend on port 8007 and frontend on
loopback port 5177. MySQL stays on the private Compose network at `db:3306`.
Google sign-in in development requires valid localhost origins in the Google
OAuth Web client and suitable local environment settings.

## Run tests

Backend tests:

```sh
docker compose -f docker-compose.test.yml run --build --rm backend
```

Or, in an environment with test dependencies installed:

```sh
cd jat_backend
pytest
```

Frontend:

```sh
cd jat_frontend
npm ci
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm run build
```

## Production is different

Do not use the development override for production. On the Droplet, the
workflow builds production backend dependencies (`requirements/prod.txt`) and
the static Vite frontend, then runs the base production Compose file. See the
[deployment guide](../../deploy/digitalocean.md).

Do not reuse local database passwords or development Django secrets in
production. Never commit `.env` or `.env.dev`.
