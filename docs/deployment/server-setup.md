# Production Server Setup

This document describes the production host prerequisites. Follow the
[DigitalOcean deployment guide](../../deploy/digitalocean.md) for the full
deployment procedure.

## Host and access

- Use a supported Ubuntu LTS Droplet with enough disk for images, MySQL data,
  media, and backups.
- Create a non-root deployment account with SSH key access and only the Docker
  permissions required for deployment.
- Keep the host and Docker Engine patched. Restrict inbound traffic with the
  cloud firewall and host firewall.
- Point the production DNS record to the Droplet. Configure Cloudflare and TLS
  consistently with the origin proxy.

## Install Docker and Compose

Install Docker Engine and its Compose plugin using Docker's official
instructions for the chosen Ubuntu release. Verify the tools and service:

```sh
docker --version
docker compose version
sudo systemctl is-active docker
```

Granting a user Docker access is effectively granting root-equivalent access on
the host. Treat membership in the `docker` group as privileged and limit it to
trusted operators.

## Application checkout

The deployment workflow expects the repository checkout at:

```text
/home/deploy/job-application-tracker
```

The deployment account must be able to fast-forward the `main` branch and read
the production `.env` stored in that directory. The `.env` file must not be
committed or copied into CI logs. See [Environment variables](../development/environment-vars.md).

## Firewall and reverse proxy

Expose SSH and the host TLS proxy's HTTP/HTTPS ports only. Production Compose
publishes frontend port 5177 and backend port 8007 to loopback; MySQL 3306 is
private to the Compose network. Do not expose any of those application/database
ports publicly.

Configure the host reverse proxy to send HTTPS traffic to
`127.0.0.1:5177`, preserving the host and forwarding the original HTTPS
protocol. The current deployment guide uses Caddy.

## Persistent data and operations

Preserve the `db_data` named volume. The Compose stack also uses host-mounted
`staticfiles` and `media` directories. Back up database data and user-uploaded
media before risky changes. A container rebuild or recreation should not be
treated as a backup.

Do not use `docker compose down -v` on production: removing named volumes can
delete the database. For backups and restore practices, see
[Disaster recovery](./disaster-recovery.md).
