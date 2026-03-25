# ReaperKey — Deployment Registry

**Maintained by:** Monitor Agent + DevOps Agent
**Last Updated:** 2026-03-25 (post-deploy #1)
**Source:** https://github.com/OriginalLeeDunn/projekt.ReaperKey

This is the authoritative record of all deployments to `main`.
Every merge to main must produce an entry here.
Append-only — to record a rollback, add a new entry with type `ROLLBACK`.

---

## Registry

| # | Date | Version | Commit | Type | CI Status | Post-Deploy | Issues |
|---|------|---------|--------|------|-----------|-------------|--------|
| 1 | 2026-03-25 | v0.1.0 | a8c6924 Phase 1: Core Engine | RELEASE | ✓ all green | Health: ok | None |

---

## Current Production State

```
Environment:   v0.1.0 — merged to main 2026-03-25
Branch:        main (commit a8c6924)
Last CI Run:   2026-03-25 — all green
               ✓ rust (fmt + clippy + test + audit)
               ✓ security (SPEC-200, SPEC-201, SPEC-203)
               ✓ sdk (vitest 3 passing, eslint clean)
               ✓ coverage — 72.6% (gate: 70%)
Phase:         Phase 1 COMPLETE
Tests passing: 16 Rust (5 auth + 3 security + 3 account + 3 session_key + 2 recovery)
               + 3 SDK (client smoke tests)
Tests ignored: 0
Coverage:      72.6% Rust (tarpaulin, excludes main.rs + chain.rs)
```

---

## Current dev Branch State

| Item | Status | Notes |
|------|--------|-------|
| Rust backend | ✓ Compiles clean | No warnings |
| Auth routes | ✓ All tests green | SPEC-001, 002, 003, 005, 007 passing |
| Security tests | ✓ Passing | SPEC-200, 201, 203 passing |
| Account tests | ✓ 3/3 passing | Bearer auth wired (ISS-003 resolved) |
| Session key tests | ✓ 3/3 passing | issue, wrong_owner, hash_not_key |
| Recovery tests | ✓ 2/2 passing | initiate 202, unknown_address 404 |
| Intent tests | Not written | GH Issue #8 — requires mock chain adapter |
| TypeScript SDK | ✓ 3 tests passing | client smoke tests; ESLint clean |
| CI trigger | ✓ Active | dev + feat/* + PRs to main |
| README.md | ✓ Created | — |
| CHANGELOG.md | ✓ Updated | v0.1.0 released |

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
