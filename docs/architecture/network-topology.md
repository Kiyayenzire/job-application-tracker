# Network Topology

## Production traffic

```text
Browser
  |
  | HTTPS :443 (HTTP :80 may redirect to HTTPS)
  v
Cloudflare / DNS
  |
  v
Host TLS reverse proxy (Caddy)
  |
  | 127.0.0.1:5177
  v
Compose network: jat_frontend (Nginx :5177)
  |
  | backend:8007 (/api/, admin, /static/)
  v
jat_backend (Django/Gunicorn :8007)
  |
  | db:3306 (private Compose network)
  v
jat_db (MySQL :3306) --> db_data named volume
```

Cloudflare is shown because it fronts the production domain; the host TLS
proxy and its forwarding headers are part of the deployment design. Verify
actual DNS, Cloudflare, and Caddy settings on the Droplet when troubleshooting.

## Port exposure

| Port | Listener | Production exposure |
| --- | --- | --- |
| 22/tcp | SSH on the Droplet | Permit only from trusted administrator networks where practical. |
| 80/tcp | Host TLS proxy | Public for HTTP-to-HTTPS redirects and certificate validation if required. |
| 443/tcp | Host TLS proxy | Public HTTPS entry point. |
| 5177/tcp | Frontend Nginx | Published only on host loopback as `127.0.0.1:5177`. |
| 8007/tcp | Django/Gunicorn | Published only on host loopback as `127.0.0.1:8007`; also reachable on the private Compose network. |
| 3306/tcp | MySQL | Compose network only; not published to the host by production Compose. |

The development Compose override publishes backend port 8007 on the host and
frontend port 5177 on loopback. MySQL remains internal to the Compose network.
Do not open database or application ports to the public internet.

## Proxy headers

Frontend Nginx forwards the host, client address, forwarded host, and forwarded
protocol to Django for proxied API/admin requests. The host TLS proxy must
preserve the original host and set the forwarded protocol correctly so Django
can identify HTTPS behind the proxy.

## Network checks

On the Droplet, inspect bindings and Compose services without publishing
credentials:

```sh
docker compose ps
sudo ss -ltnp
```

The public firewall should permit only the ports needed for SSH and the TLS
proxy. See [Security policies](../reference/security-policies.md).
