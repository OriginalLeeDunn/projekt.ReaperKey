# Deployment Guide

## Overview

GhostKey server is a single Rust binary backed by SQLite. It can be deployed:

- **Docker (recommended for production)** — multi-stage image, non-root user, health check
- **Binary** — compile and run directly on the host
- **docker-compose** — for single-host production or staging

---

## Quick Start (Docker)

```bash
# 1. Copy env template
cp .env.example .env
# 2. Fill in JWT_SECRET, BASE_BUNDLER_URL, BASE_PAYMASTER_URL

# 3. Start
docker compose up -d

# 4. Check health
curl http://localhost:8080/health
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **yes** | — | Min 32 chars. `openssl rand -hex 32` |
| `BASE_BUNDLER_URL` | **yes** | — | Pimlico bundler RPC endpoint |
| `BASE_PAYMASTER_URL` | **yes** | — | Pimlico paymaster RPC endpoint |
| `BASE_RPC_URL` | no | `https://sepolia.base.org` | Base RPC |
| `CHAIN_ID` | no | `84532` (Sepolia) | Set `8453` for mainnet |
| `CORS_ORIGINS` | no | `["http://localhost:3000"]` | Allowed CORS origins (JSON array string) |
| `GHOSTKEY__SERVER__LOG_FORMAT` | no | `pretty` | `json` for structured logging |
| `GHOSTKEY__DATABASE__URL` | no | `sqlite:///data/ghostkey.db` | SQLite path |

Full config override syntax uses `GHOSTKEY__` prefix with `__` as separator:
```
GHOSTKEY__AUTH__SESSION_TTL_SECONDS=7200
GHOSTKEY__SERVER__PORT=9090
```

---

## Building the Docker Image

```bash
docker build -t ghostkey-server:latest .
```

The image uses a two-stage build:
- **Builder**: `rust:1.82-bookworm` — compiles release binary
- **Runtime**: `debian:bookworm-slim` — minimal image with ca-certs + libssl3

The server runs as non-root user `ghostkey` (UID 1001).

---

## Production Checklist

- [ ] Set a strong `JWT_SECRET` (≥ 32 chars, random)
- [ ] Set `CORS_ORIGINS` to your actual frontend domain(s)
- [ ] Set `GHOSTKEY__SERVER__LOG_FORMAT=json` for log aggregation
- [ ] Mount `/data` volume to a persistent disk
- [ ] Put a TLS-terminating reverse proxy (nginx / Caddy) in front
- [ ] Set `CHAIN_ID=8453` and mainnet `BASE_*` URLs for production
- [ ] Run `GET /health` in your load balancer health check — returns 503 if DB is down

---

## Data Persistence

SQLite database is stored at `/data/ghostkey.db` inside the container. Mount a persistent volume:

```yaml
volumes:
  - /host/path/ghostkey-data:/data
```

Migrations run automatically at startup via `sqlx migrate run`.

---

## Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name api.yourapp.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

The server reads `X-Forwarded-For` for rate limiting. Set `proxy_set_header X-Forwarded-For $remote_addr` (or `$proxy_add_x_forwarded_for` if you trust upstream proxies).

---

## Health Check

```
GET /health
```

Returns `200 OK` when healthy:
```json
{
  "status": "ok",
  "db": "ok",
  "chains": { "base": "configured" },
  "version": "0.1.0"
}
```

Returns `503 Service Unavailable` when degraded (DB unreachable):
```json
{
  "status": "degraded",
  "db": "error",
  "chains": { "base": "configured" },
  "version": "0.1.0"
}
```

---

## Logging

Set `GHOSTKEY__SERVER__LOG_FORMAT=json` for structured JSON logs:

```json
{"timestamp":"2026-03-25T12:00:00Z","level":"INFO","fields":{"message":"intent.submitted","intent_id":"...","target":"0x..."},...}
```

Use `RUST_LOG` to control verbosity:
```
RUST_LOG=ghostkey=info,tower_http=warn
```
