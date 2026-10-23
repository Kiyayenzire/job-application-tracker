#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    python manage.py migrate --noinput
fi

if [ "$#" -eq 0 ]; then
    set -- gunicorn jat.wsgi:application --bind 0.0.0.0:8007
fi

exec "$@"