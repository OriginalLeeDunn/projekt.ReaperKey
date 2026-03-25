# ReaperKey — Deployment Registry

**Maintained by:** Monitor Agent + DevOps Agent
**Last Updated:** 2026-03-25 (post-deploy #2)
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

---

## Current Production State

```
Environment:   v0.2.0 — merged to main 2026-03-25
Branch:        main (commit efce0e5)
Last CI Run:   2026-03-25 — all green
               ✓ rust (fmt + clippy + test + audit)
               ✓ security (SPEC-200, SPEC-202, SPEC-203)
               ✓ sdk (vitest 18 passing, eslint clean)
               ✓ coverage — 87.18% (gate: 80%)
Phase:         Phase 2 COMPLETE
Tests passing: 25 Rust (5 auth + 2 security + 3 account + 3 session_key + 2 recovery
                       + 9 intent + 1 health check)
               + 18 SDK (3 client smoke + 15 hook tests)
Tests ignored: 1 (SPEC-201 sql_injection_in_credential_is_safe — GH #19)
Coverage:      87.18% Rust (tarpaulin, excludes main.rs + chain.rs)
```

---

## Current dev Branch State

| Item | Status | Notes |
|------|--------|-------|
| Rust backend | ✓ Compiles clean | No warnings |
| Auth routes | ✓ All tests green | SPEC-001, 002, 003, 005, 007 passing; SPEC-004/006 pending GH #18 |
| Security tests | ✓ Passing | SPEC-200, 202, 203 passing; SPEC-201 ignored (#19) |
| Account tests | ✓ 3/3 passing | Bearer auth wired (ISS-003 resolved) |
| Session key tests | ✓ 3/3 passing | issue, wrong_owner, hash_not_key |
| Recovery tests | ✓ 2/2 passing | initiate 202, unknown_address 404 |
| Intent tests | ✓ 9/9 passing | SPEC-030–SPEC-035 with wiremock mock bundler |
| TypeScript SDK | ✓ 18 tests passing | 3 client smoke + 15 hook tests; ESLint clean |
| CI trigger | ✓ Active | PR merges to dev/main; push only on dev/main |
| README.md | ✓ Live | — |
| CHANGELOG.md | ✓ Updated | v0.1.0 + v0.2.0 released |

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
