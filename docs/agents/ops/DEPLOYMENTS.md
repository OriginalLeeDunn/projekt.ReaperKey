# ReaperKey — Deployment Registry

**Maintained by:** Monitor Agent + DevOps Agent
**Last Updated:** 2026-03-26 (post-deploy #7)
**Source:** https://github.com/OriginalLeeDunn/projekt.ReaperKey

This is the authoritative record of all deployments to `main`.
Every merge to main must produce an entry here.
Append-only — to record a rollback, add a new entry with type `ROLLBACK`.

---

## Registry

| # | Date | Version | Commit | Type | CI Status | Post-Deploy | Issues |
|---|------|---------|--------|------|-----------|-------------|--------|
| 1 | 2026-03-25 | v0.1.0 | a8c6924 Phase 1: Core Engine | RELEASE | ✓ all green | Health: ok | None |
| 2 | 2026-03-25 | v0.2.0 | efce0e5 Phase 2: SDK — hooks, mappers, intent tests | RELEASE | ✓ all green | Health: ok | #18, #19, #20, #21 |
| 3 | 2026-03-25 | v0.3.0 | 1b23d76 Phase 3: reference app, useRecovery, generateSessionKey, auth bug fix | RELEASE | ✓ all green | Health: ok | #33 |
| 4 | 2026-03-25 | v0.3.1 | 4a5aac1 Pre-Phase 4: validation gap fixes #36–#43 | PATCH | ✓ all green | Health: ok | #33 |
| 5 | 2026-03-26 | v0.4.0 | 1d7c6b7 Phase 4: CORS, security headers, request ID, structured logging, health 503, deployment docs | RELEASE | ✓ all green | Health: ok | #69–#73 |
| 6 | 2026-03-26 | v0.4.1 | fffc660 Phase 4 validation gaps: security headers, request ID, CORS, health 503, internal error isolation tests | PATCH | ✓ all green | Health: ok | None |
| 7 | 2026-03-26 | v0.5.0 | 39e4dd6 Phase 5: open source launch — docs, E2E tests, release workflow, SDK v1.0.0 | RELEASE | ✓ all green | Health: ok | #79–#88 |

---

## Current Production State

```
Environment:   v0.5.0 — merged to main 2026-03-26
Branch:        main (commit 39e4dd6)
Last CI Run:   2026-03-26 — all green
               ✓ rust (fmt + clippy + test + audit)
               ✓ security (SPEC-200, SPEC-201, SPEC-202, SPEC-203 + Phase 4 hardening tests)
               ✓ sdk (vitest 39 passing, coverage 96.83%, eslint clean)
               ✓ coverage — 80%+ Rust (gate: 80%)
Phase:         Phase 5 COMPLETE
Tests passing: 42 Rust (7 auth + 9 security + 4 account + 3 session_key + 2 recovery
                       + 13 intent + 2 health + 2 e2e)
               + 39 SDK (15 client + 20 hook tests + 4 crypto tests)
Tests ignored: 0
Coverage:      80%+ Rust | 96.83% SDK lines, 100% funcs, 80.48% branches
Releases:      v0.1.0–v0.5.0 published on GitHub
SDK:           @ghostkey/sdk v1.0.0 (publishConfig added, release workflow ready)
Open issues:   0
```

---

## Current dev Branch State

| Item | Status | Notes |
|------|--------|-------|
| Rust backend | ✓ Compiles clean | No warnings |
| Auth routes | ✓ All tests green | SPEC-001–007 passing (7 auth tests); Retry-After on 429 |
| Security tests | ✓ Passing | SPEC-200, 201, 202, 203 all passing — 0 ignored |
| Account tests | ✓ 4/4 passing | incl. SPEC-011 all-fields assertion |
| Session key tests | ✓ 3/3 passing | issue, wrong_owner, hash_not_key |
| Recovery tests | ✓ 2/2 passing | /recovery/initiate 202, unknown_address 404 |
| Intent tests | ✓ 12/12 passing | SPEC-022/031/032/033 added; InvalidCalldata error code |
| TypeScript SDK | ✓ 38 tests passing | 15 client + 19 hook + 4 crypto; coverage gate enforced |
| Reference app | ✓ Built | example/ — full 5-step GhostKey flow |
| CI trigger | ✓ Active | PR merges to dev/main; push only on dev/main |
| README.md | ✓ Live | — |
| CHANGELOG.md | ✓ Updated | v0.1.0 + v0.2.0 + v0.3.0 released |

---

## Open Issues

| ID | Severity | Area | Description | Opened | Status |
|----|----------|------|-------------|--------|--------|
| ISS-001 | LOW | SDK | `sdk/package-lock.json` missing — SDK CI job would fail on `npm ci` | RESOLVED | 2026-03-24 | 2026-03-24 |
| ISS-002 | LOW | Rust | Unused import `DbSession` in `server/src/routes/session_key.rs` | RESOLVED | 2026-03-24 | 2026-03-24 |
| ISS-003 | MEDIUM | Tests | Account tests `#[ignore]` — Bearer token auth not wired | RESOLVED | 2026-03-24 | 2026-03-24 |

---

## Deployment Entry Template

```markdown
### Deployment #N — YYYY-MM-DD

**Version:** v0.X.Y
**Commit:** [SHA] [short message]
**Type:** RELEASE | HOTFIX | ROLLBACK
**Merged by:** [who]
**CI:** ✓ all green / ✗ [which job failed]

**Changes:**
- [bullet list from CHANGELOG]

**Post-deploy (15 min):**
- Health: [ok / degraded]
- Auth error rate: [%]
- 5xx rate: [%]
- Intent success rate: [%]
- Anomalies: [none / describe]

**Issues opened:** [none / ISS-XXX]
**Rollback required:** [no / yes — reason]
```
