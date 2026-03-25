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
  - Merge strategy: merge commits (--merge). Preserves full history and keeps dev in sync with main without divergence.
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

## Phase Completion Workflow

Every time a phase merges to main, the following must happen **before** Phase N+1 begins:

### Step 1 — Validation Pass
Run a validation agent per phase to check code against specs:
```
For each completed phase:
  - Read all SPEC-XXX tests for that phase
  - Read the actual implementation files
  - Compare: any spec not tested? Any test not passing? Any API mismatch?
  - File a GitHub issue for each gap found (label: agent-fix, qa)
```
Gate: **All validation gaps must be filed as issues and resolved before proceeding.**

### Step 2 — Fix Issues
For each issue filed:
1. Create `fix/<slug>` branch off `dev`
2. Fix, commit with `closes #N` in message
3. PR → dev → CI green → merge
4. Repeat until zero open issues (except Phase N+1 scope items)

### Step 3 — Post-Deploy Documentation
After all fixes are merged to main, create a documentation update:

```bash
# 1. Create ops branch off dev
git checkout dev && git pull
git checkout -b ops/vX.Y.Z-post-deploy

# 2. Update these files:
#    - CHANGELOG.md         → add [X.Y.Z] section with all changes
#    - docs/agents/HEALTH.md     → update system state block, test counts, open issues
#    - docs/agents/ops/DEPLOYMENTS.md → append registry row + update production state

# 3. Commit, push, open PR → dev
git add CHANGELOG.md docs/agents/HEALTH.md docs/agents/ops/DEPLOYMENTS.md
git commit -m "docs(ops): vX.Y.Z post-deploy — update HEALTH, DEPLOYMENTS, CHANGELOG"
git push -u origin ops/vX.Y.Z-post-deploy
gh pr create --base dev --title "docs(ops): vX.Y.Z post-deploy documentation update"

# 4. CI green → merge to dev → open PR dev → main → CI green → merge
```

### Step 4 — Git Tags + GitHub Releases

After the docs PR merges to main:

```bash
# Tag against the correct commit (use merge commit SHA from main)
git tag vX.Y.Z <commit-sha>
git push origin vX.Y.Z

# Create GitHub release
gh release create vX.Y.Z \
  --title "vX.Y.Z — Phase N: <short description>" \
  --notes "$(cat <<'EOF'
## What's new
<paste CHANGELOG section>

## Test coverage
- N Rust tests + N SDK tests = N total
- Coverage: N% Rust | N% SDK
EOF
)"
```

**Important:** `gh release create` uses the tag name as the positional argument — do NOT use `--target <SHA>` (GitHub rejects short SHAs for that flag; use the tag itself).

### Step 5 — Issue Cleanup

GitHub only auto-closes issues via "closes #N" in commit messages when merged to the default branch directly. If any issues don't auto-close:

```bash
# Manually close with a resolution comment
gh issue close <N> --comment "Resolved in vX.Y.Z (commit <SHA>). <one-line description of fix>."
```

Check after every PR merge to main:
```bash
gh issue list --state open
# Should only show Phase N+1 scope items
```

---

## Validation Protocol (Before Phase N+1)

This is a required gate. Phase N+1 does not start until:

- [ ] All Phase N specs have a passing test
- [ ] All validation gap issues are CLOSED
- [ ] `CHANGELOG.md` has a `[vX.Y.Z]` entry
- [ ] `HEALTH.md` system state block reflects current test counts + coverage
- [ ] `DEPLOYMENTS.md` has the new deployment row
- [ ] Git tag `vX.Y.Z` exists and GitHub release is published
- [ ] Zero open issues except Phase N+1 scope

Run this check:
```bash
gh issue list --state open          # should be Phase N+1 scope only
gh release list --limit 5           # vX.Y.Z should appear
git tag --list | sort -V | tail -5  # tag should exist
```

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
