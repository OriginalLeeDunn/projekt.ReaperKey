# ReaperKey — Deployment Registry

**Maintained by:** Monitor Agent + DevOps Agent
**Last Updated:** 2026-03-24
**Source:** https://github.com/OriginalLeeDunn/projekt.ReaperKey

This is the authoritative record of all deployments to `main`.
Every merge to main must produce an entry here.
Append-only — to record a rollback, add a new entry with type `ROLLBACK`.

---

## Registry

| # | Date | Version | Commit | Type | CI Status | Post-Deploy | Issues |
|---|------|---------|--------|------|-----------|-------------|--------|
| — | — | — | — | — | — | — | No deployments yet |

---

## Current Production State

```
Environment:   Not yet deployed to production
Branch:        dev (active development)
Last CI Run:   2026-03-24 — all tests passing
               ✓ rust (fmt + clippy + test + audit)
               ✓ security (SPEC-200, SPEC-201, SPEC-203)
               — sdk (not yet runnable, missing package-lock.json)
Phase:         Phase 1 IN PROGRESS
Tests passing: 8 / 8 active (5 auth + 3 security)
Tests ignored: 4 (account tests — pending auth wiring)
Coverage:      Partial — tarpaulin not yet run in CI
```

---

## Current dev Branch State

| Item | Status | Notes |
|------|--------|-------|
| Rust backend | ✓ Compiles clean | 1 unused import warning (DbSession in session_key) |
| Auth routes | ✓ All tests green | SPEC-001, 002, 003, 005, 007 passing |
| Security tests | ✓ Passing | SPEC-200, 201, 203 passing; SPEC-202 ignored |
| Account tests | ✓ 3/3 passing | ISS-003 resolved — Bearer auth wired |
| Session key tests | Not written | Phase 1 in progress |
| Intent tests | Not written | Phase 1 in progress |
| TypeScript SDK | Skeleton only | No tests running yet |
| CI trigger | ✓ Fixed | Now runs on dev + feat/* pushes |
| README.md | ✓ Created | Was missing at initial push |
| CHANGELOG.md | ✓ Created | Was missing at initial push |

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
