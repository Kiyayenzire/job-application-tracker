# Contributing

## Branch and review workflow

1. Create a focused branch from an up-to-date `main`, for example
   `feature/company-filters`, `fix/google-auth`, or `docs/operations-guide`.
2. Keep changes scoped and include tests or documentation when behavior
   changes.
3. Run the relevant checks locally.
4. Open a pull request to `main` with the behavior change, test results, and
   deployment or migration risks.
5. Wait for backend tests, frontend checks, and production image builds to
   pass before merging.

Pushes to `main` trigger production deployment after the CI jobs succeed.
Coordinate schema changes and back up production data before merging.

## Commit messages

Use a concise imperative subject that says what changed. Conventional prefixes
are encouraged, for example:

```text
feat: add company language requirements
fix: rebuild backend with Gunicorn
docs: add production operations guides
```

Add details in the body when the rationale or operational impact is not clear
from the subject.

## Before opening a pull request

Run the smallest relevant checks, then the broader checks for cross-cutting
changes:

```sh
cd jat_backend
pytest
```

```sh
cd jat_frontend
npm run test:unit
npm run test:e2e -- --workers=1
npm run build
```

Review the final diff for accidental `.env` values, generated assets, local
database files, and unrelated changes. Never commit credentials or production
data.

## Documentation

Update the matching `docs/` reference and the
[DigitalOcean deployment guide](../../deploy/digitalocean.md) when deployment
behavior changes. Record whether operational integrations are configured or
only proposed; do not describe an untested backup or recovery path as active.
