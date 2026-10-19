#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    python manage.py migrate --noinput
fi

if [ "${DJANGO_ENV:-}" = "production" ]; then
    python manage.py collectstatic --noinput
fi

exec "$@"
