#!/bin/sh
set -eu

google_client_id="${GOOGLE_OAUTH_CLIENT_ID:-}"
case "$google_client_id" in
    *[!A-Za-z0-9._-]*)
        echo "GOOGLE_OAUTH_CLIENT_ID contains unsupported characters." >&2
        exit 1
        ;;
esac

printf 'window.__JAT_CONFIG__ = { googleClientId: "%s" };\n' \
    "$google_client_id" > /usr/share/nginx/html/runtime-config.js
