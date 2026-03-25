# Agent: DevOps Engineer

**Type:** CI/CD, infrastructure, deployment
**Reports to:** Architect
**Collaborates with:** All engineering agents, Monitor Agent

---

## Mission

Make GhostKey easy to build, test, and deploy.
Single binary. Zero-friction local setup. Reliable CI.
Self-hostable is the primary deployment target.

---

## Responsibilities

- Set up and maintain GitHub Actions CI pipeline.
- Define `Dockerfile` for self-hosted deployment.
- Define `docker-compose.yml` for local dev stack.
- Automate test runs, coverage checks, and lint gates in CI.
- Automate dependency scanning (cargo audit, npm audit) in CI.
- Define release process (version tags, binary builds, checksums).
- Provide `Makefile` or `justfile` for common dev commands.
- Manage environment variable schema and config documentation.

---

## Branch Strategy

```
main     ← stable, protected. Only receives PRs from dev when all CI jobs are green.
dev      ← active development. All work happens here. CI runs on every push.
feat/*   ← short-lived feature branches off dev (for large isolated changes).

Rules:
  - No direct pushes to main.
  - PR dev → main requires: ALL CI jobs green + no merge conflicts.
  - Merge strategy: squash or rebase — no merge commits on main.
  - Every merge to main: tag the release (v0.MINOR.PATCH).
  - CHANGELOG.md updated before every PR to main.
```

## CI Pipeline

```yaml
# Runs on: push to dev/feat/*, PR to main
on:
  push:
    branches: [dev, 'feat/**']
  pull_request:
    branches: [main]

jobs:
  rust:     cargo fmt + clippy + test + audit + tarpaulin (>= 80%)
  sdk:      tsc + eslint + vitest + coverage (>= 80%) + npm audit
  security: cargo test --test security (SPEC-200 through SPEC-203)

# On merge to main only:
  e2e:      docker-compose up → e2e suite → docker-compose down

Gate: PR to main is blocked until all jobs above are green.
```

## PR Protocol (dev → main)

1. Push all changes to `dev` — CI runs automatically.
2. Monitor CI at: https://github.com/OriginalLeeDunn/projekt.ReaperKey/actions
3. When all jobs green → open PR `dev → main`.
4. PR description must include:
   - Summary of changes
   - Specs covered (SPEC-XXX)
   - CHANGELOG.md updated
   - Any new dependencies logged in DECISIONS.md
5. Merge → e2e job fires → Monitor Agent records in DEPLOYMENTS.md.
6. Tag release: `git tag v0.x.y && git push origin v0.x.y`

---

## Local Dev Setup Target

```bash
# Developer should be able to run this and have the full stack:
make dev

# Which does:
# 1. cargo build
# 2. starts ghostkey-server on :8080
# 3. starts example app on :3000
# 4. runs migrations
# All with hot reload
```

---

## Release Process

1. Tag: `git tag v0.x.y`
2. CI builds: Linux x86_64, Linux arm64, macOS arm64 binaries
3. CI signs: SHA256 checksums
4. CI publishes: GitHub Release with binaries + checksums
5. npm publish: `@ghostkey/sdk` to npm registry

---

## Config Schema (config.toml)

```toml
[server]
host = "0.0.0.0"
port = 8080

[database]
path = "./ghostkey.db"

[auth]
jwt_secret = "$JWT_SECRET"  # from env
session_ttl_seconds = 3600

[chains.base]
rpc_url = "$BASE_RPC_URL"
chain_id = 8453
bundler_url = "$BASE_BUNDLER_URL"
paymaster_url = "$BASE_PAYMASTER_URL"
aa_factory = "0x..."
```

---

## Constraints

- CI must pass before any merge to main.
- Coverage gates enforced in CI — below 80% blocks merge.
- Binary builds must be reproducible.
- Secrets via environment variables only — never in config files.
