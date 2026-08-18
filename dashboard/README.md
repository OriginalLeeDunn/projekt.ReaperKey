# GhostKey Dashboard

Internal ops dashboard — activity feed, agent stats, GitHub PR/CI status, governance docs, deployments. Reads live from the repo it's run against (`docs/agents/*.md`, `db/ghostkey.db`) via file watching, so it always reflects current state.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

Opens on `http://localhost:3002` (frontend) with the API on `:3003`.

## Run as a container

Keeps it running persistently instead of starting it by hand each time:

```bash
docker compose -f dashboard/docker-compose.yml up -d
```

Same ports as local dev. The container bind-mounts the whole repo (so it sees live edits to `docs/agents/*.md` and the DB) while keeping its own `node_modules` (native bindings for `better-sqlite3` need to match the container's platform, which your host's `node_modules` may not).

**First time**: Docker Desktop needs this repo's path added under Settings → Resources → File Sharing, or the bind mount will fail with "not shared from the host."

**GitHub panels** (releases, PR/CI status) need a token:

```bash
GITHUB_TOKEN=$(gh auth token) docker compose -f dashboard/docker-compose.yml up -d
```

Stop it with:

```bash
docker compose -f dashboard/docker-compose.yml down
```
