# Troubleshooting and Operations Runbook

Start with read-only checks, capture relevant logs, and avoid deleting
containers, volumes, or data while diagnosing.

## API returns 502 Bad Gateway

A 502 from Cloudflare or the frontend proxy means the origin path did not
produce a valid backend response. Check service state and recent logs:

```sh
cd /home/deploy/job-application-tracker
docker compose ps -a
docker compose logs --tail=100 backend frontend migration db
```

Confirm the backend is `Up`, then check the API from the Droplet:

```sh
curl -i http://127.0.0.1:5177/api/countries/
curl -i http://127.0.0.1:8007/api/countries/
```

If port 8007 is unreachable, inspect backend logs and container state. An
error such as `exec: gunicorn: not found` means the backend image was built
without production dependencies. Rebuild it with the production requirements
before restarting the stack:

```sh
backend_image=$(docker compose -f docker-compose.yml config --images | grep 'jat_backend' | head -n 1)
docker build --build-arg REQUIREMENTS_FILE=requirements/prod.txt --tag "$backend_image" ./jat_backend
docker compose -f docker-compose.yml up -d --remove-orphans
```

Do not edit the production Compose file as a first response to an application
502. Check the API endpoint and logs after deployment.

## Google sign-in reports missing configuration

The frontend runtime config is generated from `GOOGLE_OAUTH_CLIENT_ID` when
the frontend container starts. Check whether the key is present without
printing its value:

```sh
docker compose exec frontend sh -c \
  'test -n "$GOOGLE_OAUTH_CLIENT_ID" && echo client-id-present || echo client-id-missing'
curl -fsS https://jat.althech.com/runtime-config.js \
  | grep -q 'googleClientId: "[^"]\+"' \
  && echo runtime-client-id-present
```

The check confirms that a non-empty public client ID is being served without
printing it. If the variable was changed, recreate the frontend container so
its startup script regenerates the file. Also verify that the Google Console
client allows the exact HTTPS origin.

If the Google button appears but token exchange fails, check
`/api/auth/google/` availability and backend logs. The server must have the
same client ID configured to verify the ID token.

## Database connection or migration failures

```sh
docker compose ps -a
docker compose logs --tail=100 db migration backend
docker compose exec db mysqladmin ping -h localhost
```

Confirm database health, Compose service host `db`, credentials, and that the
migration service completed successfully. Never paste `.env` values into logs
or support messages. Do not run `docker compose down -v`.

## Port 8007 is already in use

Inspect the listener before stopping or restarting services:

```sh
sudo ss -ltnp | grep ':8007'
docker compose ps -a
docker ps --filter publish=8007
```

Identify the process/container that owns the binding. Stop only the confirmed
stale or conflicting service, then retry Compose. The repository does not
provide evidence that a Docker daemon socket-lock race is a routine cause.
Restarting Docker can interrupt every container on the host; use it only after
investigation and with an operator-approved maintenance window.

## Frontend displays stale configuration

The Google runtime config response is served with a no-store cache header.
Check it directly and force-refresh the browser if necessary. If the response
does not reflect the current environment, verify the running frontend
container's environment and recreate it. Production config is generated at
container startup, not when a Vite build is run.

## Host service refresh

The repository does not define a `dc-refresh` shell alias. Do not assume it
exists on the Droplet. If Docker itself must be restarted, first schedule an
outage window and confirm that restarting Docker is appropriate. The command
below interrupts all Docker services and should not be used as a generic
recovery action:

```sh
sudo systemctl restart docker
cd /home/deploy/job-application-tracker
docker compose -f docker-compose.yml up -d
```

After recovery, check `docker compose ps`, service logs, and the public
frontend/API routes.
