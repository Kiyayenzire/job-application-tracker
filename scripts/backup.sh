#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "$script_dir/.." && pwd)"
cd "$repo_dir"

backup_dir="${BACKUP_DIR:-"$repo_dir/backups"}"
rclone_remote="${RCLONE_REMOTE:-gdrive:jat_backups}"
timestamp="$(date -u +%Y-%m-%d_%H-%M-%S)"
backup_file="$backup_dir/jat_db_${timestamp}.sql.gz"
temporary_file="${backup_file}.partial"
lock_file="$backup_dir/.backup.lock"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
umask 077

exec 9>"$lock_file"
if ! flock -n 9; then
    printf '%s Another JAT backup is already running; exiting.\n' "$(date -u +%FT%TZ)" >&2
    exit 1
fi

cleanup() {
    rm -f -- "$temporary_file"
}
trap cleanup EXIT

printf '%s Starting JAT database backup.\n' "$(date -u +%FT%TZ)"

docker compose -f docker-compose.yml exec -T db sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --user="$MYSQL_USER" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
    | gzip > "$temporary_file"

test -s "$temporary_file"
gzip -t "$temporary_file"
mv -- "$temporary_file" "$backup_file"
printf '%s Local backup created: %s\n' "$(date -u +%FT%TZ)" "$backup_file"

if ! rclone copy "$backup_file" "$rclone_remote"; then
    printf '%s Upload failed; local backup retained: %s\n' "$(date -u +%FT%TZ)" "$backup_file" >&2
    exit 1
fi

printf '%s Off-site upload completed: %s\n' "$(date -u +%FT%TZ)" "$rclone_remote"
find "$backup_dir" -maxdepth 1 -type f -name 'jat_db_*.sql.gz' -mtime +7 -delete
printf '%s Local backups older than seven days pruned.\n' "$(date -u +%FT%TZ)"
