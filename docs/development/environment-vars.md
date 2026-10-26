# Environment Variables

Keep environment files out of source control. The root `.env` and `.env.dev`
are ignored by Git. Put production values only in the server-side `.env`, and
do not paste secrets into issues, logs, or documentation.

## Django and application settings

| Variable | Purpose |
| --- | --- |
| `DJANGO_ENV` | Selects `development`, `test`, or `production`. Production must be explicit in the production environment. |
| `DJANGO_DEBUG` | Django debug mode. Settings force it off outside development. |
| `DJANGO_SECRET_KEY` | Required, unique Django secret in production. `SECRET_KEY` is accepted as a legacy fallback; prefer `DJANGO_SECRET_KEY`. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated Django host allowlist, for example the public hostname and the Compose `backend` hostname. |
| `DJANGO_ADMIN_URL` | Non-empty URL path segment used by Django and the frontend Nginx proxy. Use no leading/trailing slash. This is not a substitute for authentication. |
| `DJANGO_LOG_LEVEL` | Console log level; defaults to `DEBUG` in debug mode and `INFO` otherwise. |
| `BASE_URL` | Base application URL used by Django; production should use the HTTPS site URL. |
| `RUN_MIGRATIONS` | When set to `true`, the backend entrypoint applies migrations before starting its command. The migration service also runs migrations and collects static files. |

## Database and Compose

| Variable | Purpose |
| --- | --- |
| `DB_NAME` | MySQL database name; required by Compose. |
| `DB_USER` | MySQL application account; required by Compose. |
| `DB_PASSWORD` | MySQL application password; required by Compose. |
| `MYSQL_ROOT_PASSWORD` | MySQL root password; Compose falls back to `DB_PASSWORD` if omitted. Prefer a separate strong value. |
| `DB_HOST` | Django database hostname; defaults to `db` in Compose. |
| `DB_PORT` | MySQL port; defaults to `3306`. |
| `DB_CHARSET` | Database character set; defaults to `utf8mb4`. |
| `DB_CONN_MAX_AGE` | Django persistent database connection lifetime; defaults to `60` seconds. |
| `IMAGE_TAG` | Optional Compose image tag; defaults to `latest`. |

## Browser origins and frontend

| Variable | Purpose |
| --- | --- |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins for Django CORS. |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins for Django CSRF checks. Include scheme, such as `https://jat.althech.com`. |
| `SECURE_SSL_REDIRECT` | Redirects Django requests to HTTPS when proxy headers are configured correctly. |
| `SECURE_HSTS_SECONDS` | HSTS lifetime in seconds. Keep disabled until HTTPS is verified end-to-end. |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | Whether HSTS covers subdomains. Enable only if all subdomains support HTTPS. |
| `SECURE_HSTS_PRELOAD` | HSTS preload directive. Do not enable without understanding its long-lived impact. |
| `VITE_API_BASE_URL` | Vite build/dev-time API base. Keep empty in production for the same-origin Nginx `/api/` proxy; development may use `http://localhost:8007`. |
| `VITE_GOOGLE_CLIENT_ID` | Optional Vite build-time fallback for development. Production runtime configuration uses `GOOGLE_OAUTH_CLIENT_ID`. |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth Web client ID. Used by Django to verify ID tokens and by the frontend container to generate runtime config. A Google client secret is not required for this ID-token flow. |

## Development and production loading

The Compose development override reads `.env.dev` and sets development
overrides. The base production Compose file reads `.env` for its services.
Django also reads the root environment file based on `DJANGO_ENV`; do not rely
on local fallback behavior for production.

Vite variables are embedded/consumed at development or frontend build time.
Changing a Vite variable does not update a built frontend image. The production
Google client ID is the exception: the frontend container reads
`GOOGLE_OAUTH_CLIENT_ID` at startup and writes `/runtime-config.js`.

Never use real secrets in frontend variables or static assets. Google client
IDs are public identifiers; Django secrets and database passwords are not.
