# Disaster Recovery and Automated Backups

This guide describes a daily compressed MySQL backup, an off-site rclone copy,
seven-day local rotation, and a restore procedure for the JAT production
Compose stack.

## Backup configuration and status

The backup script uses the Compose `db` service and reads the database name and
credentials from that container's environment. It does not print or embed the
database password.

The configured off-site destination defaults to `gdrive:jat_backups`. Before
enabling the schedule, verify that rclone is installed for the deployment
account, that its `gdrive` remote points to the intended restricted Google
Drive account, and that a manual upload succeeds. This repository cannot
verify the Droplet's rclone configuration, cron daemon, or remote retention
policy. Do not treat off-site backups as active until the initial upload and a
restore test have succeeded.

The backup covers the MySQL database. Back up the host `media/` directory
separately if it contains uploaded files. Static assets are reproducible from
the application image and Django's `collectstatic`.

## Install the backup script

The repository includes [`scripts/backup.sh`](../../scripts/backup.sh). On the
Droplet, update the checkout, ensure the `scripts` directory is present, and
make the script executable:

```sh
cd /home/deploy/job-application-tracker
chmod 700 scripts/backup.sh
```

By default, backups are written to the repository's ignored `backups/`
directory and uploaded to `gdrive:jat_backups`. The values can be overridden
with `BACKUP_DIR` and `RCLONE_REMOTE` in the invoking environment.

Run one backup manually before scheduling it:

```sh
cd /home/deploy/job-application-tracker
./scripts/backup.sh
```

Confirm that a non-empty `.sql.gz` file exists locally and that the matching
file is visible in the configured remote. The script validates the compressed
archive before upload, retains the local archive if upload fails, and prunes
local database archives older than seven days only after a successful upload.
An exclusive lock prevents overlapping scheduled/manual runs.

## Schedule a daily backup

Edit the deployment account's crontab:

```sh
crontab -e
```

Add the following entry to run at 02:00 in the Droplet's local timezone. It
creates the backup directory before opening the log:

```cron
0 2 * * * mkdir -p /home/deploy/job-application-tracker/backups && /home/deploy/job-application-tracker/scripts/backup.sh >> /home/deploy/job-application-tracker/backups/cron.log 2>&1
```

The script uploads archives; it does not configure rclone or create the cron
entry automatically. Check the crontab, cron service logs, local archive
timestamps, and remote objects regularly. Configure log rotation for
`backups/cron.log` on the host so the log does not grow without bound.

## Restore procedure

Restoring replaces application data and must be treated as a destructive
operation. Schedule maintenance, prevent application writes, confirm the
target host and database, and take a separate current backup before restoring.
Prefer testing the candidate backup in an isolated database/environment first.

Set the archive path to the exact backup to restore. If downloading from
Google Drive, replace the timestamp with the selected archive:

```sh
cd /home/deploy/job-application-tracker
mkdir -p backups
rclone copy \
  "gdrive:jat_backups/jat_db_YYYY-MM-DD_HH-MM-SS.sql.gz" \
  ./backups/
backup_file="./backups/jat_db_YYYY-MM-DD_HH-MM-SS.sql.gz"
gzip -t "$backup_file"
```

Before production restore, stop application writes and ensure an independent
pre-restore backup is safely stored:

```sh
docker compose -f docker-compose.yml stop backend
```

Import the dump into the currently configured application database. This
command streams the archive and obtains the MySQL credentials from the
database container rather than putting a password in command history:

```sh
set -o pipefail
gzip -dc "$backup_file" | docker compose -f docker-compose.yml exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" "$MYSQL_DATABASE"'
```

The import does not drop tables that were created after the selected backup.
For an exact point-in-time replacement, use a separately tested procedure
that restores into a fresh database and switches the application only after
validation; do not drop or recreate production databases without a verified
backup and explicit approval.

Start services and verify the stack:

```sh
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=100 backend frontend db migration
```

Verify login, API reads and writes, and important uploaded media before
returning the site to normal operation. Restore the corresponding `media/`
backup if applicable.

## Recovery checklist

1. Secure the host and recover access to the repository and production
   configuration.
2. Provision a clean host and install Docker and Compose.
3. Restore the production `.env` securely and validate Compose configuration.
4. Deploy the reviewed application revision.
5. Restore MySQL and media from known-good backups.
6. Verify migrations, backend health, frontend/API routing, and authentication.
7. Repoint DNS only after the restored origin is healthy.
8. Record the incident, recovery point, and follow-up actions.
