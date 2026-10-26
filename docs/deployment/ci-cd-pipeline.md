# CI/CD Pipeline

The workflow is [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
It runs for pull requests targeting `main` and pushes to `main`.

## Checks

The workflow runs three jobs:

1. **Backend tests** install `jat_backend/requirements/test.txt` on Python 3.12
   and run `pytest`.
2. **Frontend checks** install from the lockfile, run Vitest unit tests, install
   Playwright Chromium, and run end-to-end tests.
3. **Production images** builds the backend using
   `requirements/prod.txt` and builds the frontend production image.

Deployment waits for all three jobs and only runs for a push to `main`.

## Production deployment

The SSH deployment step connects to the Droplet, fast-forwards the checkout at
`/home/deploy/job-application-tracker`, validates the production Compose
configuration, builds production backend and frontend images locally using the
image tags selected by Compose, then recreates the stack.

The backend build explicitly uses:

```sh
docker build \
  --build-arg REQUIREMENTS_FILE=requirements/prod.txt \
  --tag "$backend_image" \
  ./jat_backend
```

That production dependency file includes Gunicorn, which the backend entrypoint
uses to run Django. The frontend is built from `./jat_frontend`; its container
generates the public Google client runtime configuration on startup.

The production `.env` stays on the Droplet and is not sent to GitHub Actions.
The workflow does not back up the database or automatically roll back a
release. Review schema changes, back up data, and verify deployment health.

## Required GitHub configuration

The workflow references these GitHub repository or environment secrets:

- `DROPLET_IP`
- `DROPLET_USER`
- `DROPLET_SSH_KEY`

Configure them under the repository's Actions secrets and the `production`
environment as appropriate. Restrict the SSH account to the required
deployment access. The deployment user needs Git access to the repository and
permission to run Docker Compose and build images.

## Deployment verification

After a successful workflow, verify the frontend, runtime config, and API.
On the Droplet:

```sh
cd /home/deploy/job-application-tracker
docker compose ps
docker compose logs --tail=100 backend frontend db migration
```

See [Troubleshooting](../reference/troubleshooting.md) and the
[DigitalOcean deployment guide](../../deploy/digitalocean.md).
