# GhostKey — System Health Dashboard

**Maintained by:** Governor Agent
**Last Updated:** 2026-03-26 (post-audit — v0.5.1 hotfix + gap report)
**Next Scheduled Assessment:** 2026-04-02

---

## Current System State

```
OVERALL: HEALTHY — v0.5.1 on main — KNOWN EXECUTION GAPS (see below)
──────────────────────────────────────────────────────────────────────
AGENT CORP:        ✓ 18 agents defined
DOCS CURRENCY:     ✓ All docs updated 2026-03-26 (post-audit)
DRIFT FINDINGS:    3 OPEN (GAP-001, GAP-002, GAP-003 — see Critical Known Gaps)
SECURITY FINDINGS: ✓ 0 open
PHASE PROGRESS:    Phases 1–5 COMPLETE (infra). On-chain execution is v1.0 scope.
REPO:              ✓ Public on GitHub — OriginalLeeDunn/projekt.ReaperKey
BRANCHES:          ✓ main (v0.5.1) + dev (synced)
CI:                ✓ All green — rust + sdk + security + coverage
TESTS PASSING:     ✓ 42 Rust + 39 SDK = 81 total
TESTS IGNORED:     0
COVERAGE:          80%+ Rust (gate: 80%) | 96.83% SDK lines / 80.48% branches
README:            ✓ Updated — npm badge, docs table, SDK install section
CHANGELOG:         ✓ v0.1.0–v0.5.1 published
DEPLOYMENTS LOG:   ✓ Deployments #1 through #8 recorded
RELEASES:          ✓ v0.1.0–v0.5.1 on GitHub | release workflow active
SDK VERSION:       1.0.0 (independent versioning — DECISIONS.md 2026-03-26)
OPEN ISSUES:       3 (GAP-001–003 below → GitHub issues pending)
DOCS:              quickstart.md, security-model.md, api/endpoints.md, sdk/hooks.md, roadmap.md
```

---

## Critical Known Gaps

These gaps were discovered during live demo testing on 2026-03-26. They do NOT affect the v0 infrastructure (auth, DB, API contracts, CI), but they prevent real on-chain intent execution. All three are **v1.0 scope** items.

| ID | Area | Description | Severity | Blocks |
|----|------|-------------|----------|--------|
| GAP-001 | SDK / Intent | `user_operation` is always `{}` — SDK never builds or signs a UserOperation | CRITICAL | Demo, v1.0 |
| GAP-002 | SDK / Account | No ZeroDev Kernel counterfactual address computation — example app accepts any EVM address | CRITICAL | Demo, v1.0 |
| GAP-003 | On-chain | Session keys stored in DB only — not registered in Kernel session key module on-chain | HIGH | v1.0 |

### GAP-001: SDK never builds a UserOperation
- **Code:** `sdk/src/client.ts:179` — `user_operation: intent.userOperation ?? {}`
- **Effect:** Pimlico receives `{}`, rejects with "expected string, received undefined at sender/nonce/callData/..."
- **Root cause:** UserOp construction + session key signing never implemented in v0 scope
- **Fix (v1.0):** SDK must fetch nonce from EntryPoint, ABI-encode `execute(target, value, calldata)`, fetch gas prices, sign with session key private key

### GAP-002: No Kernel counterfactual address computation
- **Code:** `sdk/src/hooks/useAccount.ts` + `example/src/App.tsx:200` — owner address passed manually by user
- **Effect:** Smart account "address" in DB is an arbitrary EVM address, not a deployed Kernel account
- **Fix (v1.0):** Integrate ZeroDev SDK / permissionless.js to derive deterministic Kernel v3 address from owner + salt

### GAP-003: Session keys are off-chain only
- **Code:** `server/src/routes/session_key.rs` — DB insert only, no chain interaction
- **Effect:** Session key enforcement is entirely server-side; Kernel does not know about the session key
- **Fix (v1.0):** After GAP-001+002 are resolved, call Kernel session key module to register key on-chain

### Why Tests Passed
All 81 tests pass because intent tests use a **wiremock mock bundler** that accepts any JSON. No test exercises a real Pimlico endpoint. This is a process gap — QA agent did not require a real bundler E2E test before Phase 5 sign-off.

### Hotfixes Shipped in v0.5.1
Two server-side bugs discovered during local demo run:
- `server/src/db.rs` — Added `create_if_missing(true)` so SQLite DB is created on first run
- `config.toml.example` — Changed default `host` from `0.0.0.0` to `127.0.0.1` for safe local dev

---

## Agent Roster Status

### Meta Layer
| Agent              | File                             | Status | Last Verified |
|--------------------|----------------------------------|--------|---------------|
| Governor           | `agents/meta/GOVERNOR.md`        | ACTIVE | 2026-03-24    |
| Drift Detector     | `agents/meta/DRIFT_DETECTOR.md`  | ACTIVE | 2026-03-24    |
| Evolution Planner  | `agents/meta/EVOLUTION.md`       | ACTIVE | 2026-03-24    |

### Executive
| Agent              | File                             | Status | Last Verified |
|--------------------|----------------------------------|--------|---------------|
| Orchestrator       | `agents/corp/ORCHESTRATOR.md`    | ACTIVE | 2026-03-24    |
| Architect          | `agents/corp/ARCHITECT.md`       | ACTIVE | 2026-03-24    |

### Engineering Corps
| Agent              | File                                   | Status | Last Verified |
|--------------------|----------------------------------------|--------|---------------|
| Backend Engineer   | `agents/engineering/BACKEND.md`        | ACTIVE | 2026-03-24    |
| SDK Engineer       | `agents/engineering/SDK.md`            | ACTIVE | 2026-03-24    |
| Contract Engineer  | `agents/engineering/CONTRACTS.md`      | ACTIVE | 2026-03-24    |
| QA Engineer        | `agents/engineering/QA.md`             | ACTIVE | 2026-03-24    |

### Security Division
| Agent              | File                                   | Status | Last Verified |
|--------------------|----------------------------------------|--------|---------------|
| Security Lead      | `agents/security/SEC_LEAD.md`          | ACTIVE | 2026-03-24    |
| Contract Auditor   | `agents/security/CTR_AUDITOR.md`       | ACTIVE | 2026-03-24    |
| Dependency Scanner | `agents/security/DEP_SCANNER.md`       | ACTIVE | 2026-03-24    |
| Pentest Agent      | `agents/security/PENTEST.md`           | ACTIVE | 2026-03-24    |

### Audit & Compliance
| Agent              | File                                   | Status | Last Verified |
|--------------------|----------------------------------------|--------|---------------|
| Audit Lead         | `agents/audit/AUDIT_LEAD.md`           | ACTIVE | 2026-03-24    |
| Compliance Officer | `agents/audit/COMPLIANCE.md`           | ACTIVE | 2026-03-24    |

### Operations
| Agent              | File                                   | Status | Last Verified |
|--------------------|----------------------------------------|--------|---------------|
| DevOps Engineer    | `agents/ops/DEVOPS.md`                 | ACTIVE | 2026-03-24    |
| Monitor Agent      | `agents/ops/MONITOR.md`                | ACTIVE | 2026-03-24    |
| Docs Agent         | `agents/ops/DOCS.md`                   | ACTIVE | 2026-03-24    |

**Total active: 18**

---

## Document Freshness

| Document                   | Last Verified | Threshold | Status    | Next Check  |
|----------------------------|---------------|-----------|-----------|-------------|
| `docs/agents/GOVERNANCE.md`| 2026-03-24    | 30 days   | ✓ FRESH   | 2026-04-23  |
| `docs/agents/AGENTS.md`    | 2026-03-24    | 30 days   | ✓ FRESH   | 2026-04-23  |
| `docs/agents/STACK.md`     | 2026-03-24    | 14 days   | ✓ FRESH   | 2026-04-07  |
| `docs/agents/TOOLS.md`     | 2026-03-24    | 30 days   | ✓ FRESH   | 2026-04-23  |
| `docs/agents/TEST_SPECS.md`| 2026-03-24    | 14 days   | ✓ FRESH   | 2026-04-07  |
| `docs/agents/SECURITY.md`  | 2026-03-24    | 7 days    | ✓ FRESH   | 2026-03-31  |
| `docs/agents/DECISIONS.md` | 2026-03-24    | N/A       | ✓ CURRENT | On change   |
| `docs/agents/v1prd.md`     | 2026-03-24    | N/A       | ✓ SOURCE  | On PRD change|

---

## Phase Progress

| Phase                        | Status       | Lead Agent    | Blocking Issues |
|------------------------------|--------------|---------------|-----------------|
| Phase 0: Alignment           | ✓ COMPLETE   | Orchestrator  | None            |
| Phase 1: Core Engine         | ✓ COMPLETE   | Backend Eng   | None — all ISS resolved |
| Phase 2: SDK                 | ✓ COMPLETE   | SDK Eng       | None — merged 2026-03-25 |
| Phase 3: Reference App       | ✓ COMPLETE   | SDK Eng       | None — merged 2026-03-25 |
| Phase 4: Hardening           | ✓ COMPLETE   | Security Lead | None |
| Phase 5: Open Source Launch  | ✓ COMPLETE   | Orchestrator  | None |
| Phase 6: On-Chain Execution  | NOT STARTED  | Architect     | GAP-001, GAP-002, GAP-003 must be resolved |

### Phase 0 Completion Record
- [x] Scope locked
- [x] Non-custodial rules defined (`docs/agents/audit/COMPLIANCE.md`)
- [x] Initial chain selected: **Base** (chain ID 8453, Base Sepolia 84532 for CI)
- [x] AA framework selected: **ZeroDev Kernel v3**
- [x] Bundler/Paymaster selected: **Pimlico**
- [x] API endpoints drafted (`docs/agents/STACK.md`)
- [x] SDK interface drafted (`docs/agents/engineering/SDK.md`)
- [x] Agent tooling reference created (`docs/agents/TOOLS.md`)
- [x] Test specifications written (`docs/agents/TEST_SPECS.md` — 40+ specs)
- [x] Repo skeleton — built and pushed to GitHub
- [x] Phase 1 route handlers implemented (auth, account, session_key, intent, recovery)
- [x] Auth test suite passing (SPEC-001, 002, 003, 005, 007)
- [x] Security test suite passing (SPEC-200, 201, 203)
- [x] Account tests passing (3/3) — Bearer auth wired
- [x] Session key tests passing (3/3) — SPEC-020 through SPEC-023
- [x] Recovery tests passing (2/2) — SPEC-040
- [x] TypeScript SDK tests passing (3 client smoke tests)
- [x] Coverage gate: 72.6% ≥ 70% threshold
- [x] CI pipeline live on dev + main (all green)
- [x] README.md, CHANGELOG.md, DEPLOYMENTS.md created
- [x] v0.1.0 tagged and merged to main (commit a8c6924)
- [x] Deployment #1 recorded in DEPLOYMENTS.md

### Phase 2 Completion Record
- [x] `client.ts` response mappers — snake_case → camelCase (was silently returning `undefined`)
- [x] `useSessionKey` hook — issue, clear, error handling
- [x] `useSendIntent` hook — execute + poll status, reset
- [x] `useAccount` hook extended — `fetchAccount()`, `address` param on `createAccount`
- [x] `GhostKeyProvider._client` injection for test isolation
- [x] 15 React hook tests using `@testing-library/react` (jsdom)
- [x] 9 intent integration tests (SPEC-030–SPEC-035) with wiremock mock bundler
- [x] Coverage gate raised to 80%, passing at 87.18%
- [x] CI push trigger narrowed — feat/fix/ops branches no longer fire push CI (PR-only)
- [x] Merge strategy switched to merge commits — no more dev/main divergence
- [x] v0.2.0 merged to main — Deployment #2 recorded

### Phase 3 Completion Record
- [x] `AppError::Unauthorized` bug fixed — `IntoResponse` now emits inner `*code` (was hardcoded `"invalid_token"`)
- [x] SPEC-004 — expired token returns 401 `token_expired` (closes GH #18)
- [x] SPEC-006 — 11th login returns 429 `rate_limited` (closes GH #18)
- [x] SPEC-201 SQL injection test unignored — confirmed safe via parameterized queries (closes GH #19)
- [x] `config.toml.example` with full inline docs — `make dev` no longer fails for new contributors (closes GH #20)
- [x] `generateSessionKey()` WebCrypto utility — 32-byte key + SHA-256 `keyHash`; private key never leaves client (closes GH #21)
- [x] `useRecovery` hook — `initiateRecovery`, `result`, `loading`, `error`, `reset` (closes GH #21)
- [x] 4 crypto tests + 4 `useRecovery` hook tests passing
- [x] `tests/setup.crypto.ts` polyfill — `globalThis.crypto.subtle` available in vitest jsdom
- [x] `tsup.config.ts` — fixed `npm run build` "No input files" error
- [x] `example/` reference app — 5-step GhostKey flow in React (closes GH #22)
- [x] `example/src/vite-env.d.ts` — vite client types; `import.meta.env` TypeScript clean
- [x] `example/node_modules/` + `example/dist/` added to `.gitignore`
- [x] v0.3.0 merged to main — Deployment #3 recorded
- [x] All GH issues #18–#22 closed

---

## Drift Findings

| ID | Severity | Area | Description | Status | Opened | Resolved |
|----|----------|------|-------------|--------|--------|----------|
| ISS-001 | LOW | SDK | `sdk/package-lock.json` missing — SDK CI would fail on `npm ci` | RESOLVED | 2026-03-24 | 2026-03-24 |
| ISS-002 | LOW | Rust | Unused import `DbSession` in session_key.rs | RESOLVED | 2026-03-24 | 2026-03-24 |
| ISS-003 | MEDIUM | Tests | Account tests `#[ignore]` — Bearer token not wired | RESOLVED | 2026-03-24 | 2026-03-24 |
| GAP-001 | CRITICAL | SDK | `user_operation` is always `{}` — SDK never builds/signs UserOp — real bundler rejects | OPEN | 2026-03-26 | — |
| GAP-002 | CRITICAL | SDK | No Kernel counterfactual address computation — example app accepts any EVM address | OPEN | 2026-03-26 | — |
| GAP-003 | HIGH | On-chain | Session keys not registered in Kernel module — off-chain enforcement only | OPEN | 2026-03-26 | — |

---

## Security Findings

_No open findings. RUSTSEC-2023-0071 (rsa Marvin Attack) documented and ignored in `.cargo/audit.toml` — unreachable via SQLite-only usage. See DECISIONS.md._

---

## Self-Assessment Log

### 2026-03-24 — Governor — Phase 0 Completion Assessment

**Triggered by:** Chain selection + TOOLS.md + TEST_SPECS.md completion

**Phase 0 status:** COMPLETE (all decisions locked, repo skeleton deferred to Phase 1).
**Agent roster:** 18 agents, all ACTIVE, all docs fresh.
**New docs since last assessment:** TOOLS.md (tooling reference), TEST_SPECS.md (40+ behavioral specs), GOVERNANCE.md, HEALTH.md.
**Drift:** None — no code exists yet to drift against.
**Chain locked:** Base (8453). EntryPoint, bundler, paymaster all specified in DECISIONS.md and STACK.md.
**Security:** No findings. Security gates in SECURITY.md are Phase 1 targets.

**Readiness for Phase 1:**
- Backend Engineer has: role file, tools (cargo commands), test specs (SPEC-001 through SPEC-040), API contract (STACK.md), data model (STACK.md).
- DevOps Engineer first task: create repo skeleton + Makefile + CI scaffold.
- QA Engineer first task: confirm test specs cover all STACK.md endpoints (they do).

**Overall: READY TO BEGIN PHASE 1.**

---

### 2026-03-25 — Monitor Agent — Phase 1 Completion / Post-Deploy Assessment

**Triggered by:** PR #9 merge to main, v0.1.0 tag + push.

**Phase 1 status:** COMPLETE. All routes implemented and tested. All CI jobs green.
**Deployment #1:** a8c6924 — 19 tests passing (16 Rust + 3 SDK). Coverage 72.6% (gate 70%).
**All prior issues resolved:** ISS-001 (package-lock.json), ISS-002 (unused import), ISS-003 (Bearer auth wiring).
**Open GH Issues:** #8 (path to 80% coverage — intent tests require mock chain adapter, Phase 2 work).
**Security:** RUSTSEC-2023-0071 documented ignore — unreachable via SQLite-only usage.
**Agent system:** Hard Rules #10/#11 active. ci-issue.yml live — auto-opens GH Issues on CI failure.
**Lessons encoded:** cargo fmt Hard Rule, GitHub Issues as single source of truth both in AGENTS.md + TOOLS.md.

**Readiness for Phase 2:**
- SDK Engineer: TypeScript SDK skeleton exists, 3 client tests passing, ESLint clean.
- Phase 2 scope: full SDK implementation, React hooks tested, reference app.
- Blocking: none. Dev branch ready for Phase 2 feature work.

**Overall: PHASE 1 COMPLETE. HEALTHY. READY FOR PHASE 2.**

---

### 2026-03-25 — Monitor Agent — Phase 2 Completion / Post-Deploy Assessment

**Triggered by:** Phase 2 SDK merge to main.

**Phase 2 status:** COMPLETE. SDK hooks fully implemented and tested. All CI jobs green.
**Deployment #2:** efce0e5 — 43 tests passing (25 Rust + 18 SDK). Coverage 87.18% (gate 80%).
**SDK coverage:** 15 React hook tests (useLogin×4, useAccount×4, useSessionKey×3, useSendIntent×4).
**Rust coverage:** 9 new intent integration tests with wiremock mock bundler (SPEC-030 through SPEC-035).
**Silent bug fixed:** `client.ts` was casting snake_case JSON directly to camelCase TypeScript types — all fields were `undefined`. Explicit mapper functions added.
**CI governance fixes:** push trigger narrowed (feat/fix/ops branches no longer trigger push CI); merge strategy switched to merge commits to prevent dev/main divergence.
**Hard Rules:** #12 added — no direct commits to main, ever.
**Open GH Issues:** #18 (SPEC-004 + SPEC-006), #19 (SPEC-201 SQL injection — unignore), #20 (config.toml.example), #21 (useRecovery hook), #22 (Phase 3 reference app).

**Readiness for Phase 3:**
- Phase 3 scope: `example/` reference app demonstrating full GhostKey flow.
- Blocked by: #21 (useRecovery + generateSessionKey) must land first.
- CI green. Dev in sync with main.

**Overall: PHASE 2 COMPLETE. HEALTHY. READY FOR PHASE 3.**

---

### 2026-03-25 — Monitor Agent — Phase 3 Completion / Post-Deploy Assessment

**Triggered by:** PR #32 merge to main (Phase 3 reference app + all supporting issues #18–#22).

**Phase 3 status:** COMPLETE. All GH issues #18–#22 resolved and merged. CI all green.
**Deployment #3:** 1b23d76 — 53 tests passing (27 Rust + 26 SDK). TESTS_IGNORED = 0.
**New SDK tests:** 4 crypto tests (`generateSessionKey` — uniqueness, SHA-256 correctness, hex format) + 4 `useRecovery` tests (idle state, success, error, reset).
**New Rust tests:** SPEC-004 (expired token → 401 `token_expired`) + SPEC-006 (11th login → 429 `rate_limited`) — total auth tests now 7.
**Critical bug fixed:** `AppError::Unauthorized` `IntoResponse` was always emitting `"invalid_token"` — inner `&'static str` was ignored. SPEC-004 was failing because of this; fixed in `error.rs` with `*code` dereference.
**TESTS_IGNORED reduced 1 → 0:** SPEC-201 SQL injection test unignored — SQLx parameterized queries + SHA-256 credential hashing confirmed safe.
**Reference app:** `example/` demonstrates full non-custodial flow — private key displayed in amber to prove it never leaves the client.
**WebCrypto polyfill:** vitest jsdom environment doesn't expose `globalThis.crypto.subtle` — fixed via `tests/setup.crypto.ts` + `setupFiles` in `vitest.config.ts`.
**Build fix:** `tsup.config.ts` created — `npm run build` was failing "No input files" without it.
**GH Issue #33 opened:** `AppError::Internal` swallows error cause in logs — Phase 4 work item for production ops observability.
**Open Phase 4 issues:** #33 (error cause logging). Additional Phase 4 issues (#34+) to be filed.

**Readiness for Phase 4:**
- Security Lead: rate limiting gaps, CORS tightening, OWASP review, PII audit in logs.
- DevOps Agent: deployment docs, dependency audit, structured logging.
- Blocked by: none. Dev in sync with main. CI green.

**Overall: PHASE 3 COMPLETE. HEALTHY. READY FOR PHASE 4.**

---

### 2026-03-25 — Monitor Agent — v0.3.1 Post-Deploy Assessment

**Triggered by:** PR #46 merge to main (pre-Phase 4 validation gap fixes, issues #36–#43).

**v0.3.1 changes:**
- `Retry-After: 60` header on all 429 responses (closes #36)
- Route `/recovery/init` → `/recovery/initiate` (closes #37)
- `AppError::InvalidCalldata` → HTTP 400 + `"invalid_calldata"` (closes #38)
- SDK `coverage.thresholds` enforced at 80% in vitest.config.ts (closes #39)
- `GhostKeyClient.createAccount(address)` single param + `chainName()` helper (closes #40)
- SPEC-011, SPEC-022, SPEC-031, SPEC-032, SPEC-033 tests added (closes #41)
- `ApiResult<T>` exported from `@ghostkey/sdk` (closes #42)
- Rate limiter replaced with true sliding window `VecDeque<Instant>` (closes #43)
- 12 new client HTTP method tests; `index.ts` excluded from coverage

**Test counts:** 32 Rust + 38 SDK = **70 total**, 0 ignored.
**SDK coverage:** 96.83% lines, 100% functions, 80.48% branches.
**GitHub releases:** v0.1.0, v0.2.0, v0.3.0, v0.3.1 all published.
**All GH issues #36–#43 closed.** Only open issue: #33 (Phase 4 scope).

**Readiness for Phase 4:** CI green, 0 ignored tests, 0 open pre-Phase-4 issues. All validation gaps resolved.

**Overall: v0.3.1 DEPLOYED. HEALTHY. READY FOR PHASE 4.**

---

### 2026-03-26 — Governor — Post-Demo Audit Assessment (v0.5.1)

**Triggered by:** Live demo run — first time full flow was exercised against real Pimlico bundler.

**Findings:** 3 critical gaps discovered (GAP-001/002/003). All 81 tests passed but all bundler tests used wiremock mocks. Real Pimlico rejected the empty UserOperation with validation errors. Two local runtime bugs also found and fixed (db.rs create_if_missing, config.toml.example host).

**Root cause of gap:** QA agent signed off on Phase 5 without requiring a real bundler E2E test. Intent tests used wiremock which accepts any JSON. The gap between "tests pass against mock" and "works against real infrastructure" was never closed.

**What is truly working (v0.5.1):**
- Auth (login/register/JWT/rate-limit/refresh/recovery) — fully functional
- Account registration (DB record + EVM address validation) — functional
- Session key issuance (DB storage, scope metadata, TTL, key hash) — functional
- Intent pipeline (scope validation, DB persistence, bundler submission attempt) — functional
- All CI gates, release workflow, npm publish, multi-platform binaries — functional

**What is NOT working (v1.0 scope):**
- SDK does not build or sign UserOperations (GAP-001)
- No Kernel counterfactual address computation (GAP-002)
- Session keys not registered on-chain (GAP-003)

**Decision:** v0.5.x is correctly described as a "storage and routing layer." It is not an "execution layer." The roadmap already positions on-chain execution as v1.0. Docs have been updated to make this boundary explicit.

**v0.5.1 hotfixes shipped:**
- `server/src/db.rs` — `create_if_missing(true)` — SQLite DB was not created on first run
- `config.toml.example` — default host changed to `127.0.0.1` — was `0.0.0.0` (unsafe for local dev)

**Process improvement:** QA agent rules updated — real bundler E2E test required before any future phase sign-off that touches intent execution.

**Readiness for Phase 6 (v1.0):** Not yet. Must resolve GAP-001 and GAP-002 first (UserOp construction + Kernel address computation). GAP-003 (on-chain session key registration) follows naturally once the account is real.

**Overall: v0.5.1 DEPLOYED. HEALTHY WITH KNOWN GAPS. PHASE 6 PLANNING READY.**

---

## Governance Change Log

| Date       | Change                                         | By              |
|------------|------------------------------------------------|-----------------|
| 2026-03-24 | Governance system initialized, 18-agent corp   | Governor        |
| 2026-03-24 | Base chain selected, DECISIONS.md updated      | Architect       |
| 2026-03-24 | STACK.md updated with Base chain specifics     | Architect       |
| 2026-03-24 | TOOLS.md created — full tooling reference      | DevOps Agent    |
| 2026-03-24 | TEST_SPECS.md created — 40+ behavioral specs   | QA Agent        |
| 2026-03-24 | Phase 0 marked complete                        | Orchestrator    |
| 2026-03-24 | Phase 1 implementation complete (routes + tests)| Backend Eng    |
| 2026-03-24 | Repo pushed public to GitHub (projekt.ReaperKey)| DevOps Agent   |
| 2026-03-24 | dev/main branches established, CI updated       | DevOps Agent    |
| 2026-03-24 | README, CHANGELOG, DEPLOYMENTS.md created       | Docs Agent      |
| 2026-03-24 | CI trigger fixed (now fires on dev push)        | DevOps Agent    |
| 2026-03-24 | 3 drift findings logged (ISS-001 through 003)   | Monitor Agent   |
| 2026-03-24 | ISS-001/002/003 resolved same session           | Backend/DevOps  |
| 2026-03-24 | Session key + recovery tests written            | QA Agent        |
| 2026-03-24 | Coverage gate set to 70% (tarpaulin.toml)       | DevOps Agent    |
| 2026-03-24 | cargo audit ignore RUSTSEC-2023-0071 documented | Dep Scanner     |
| 2026-03-24 | Pre-commit hook + Hard Rules #10/#11 added      | DevOps Agent    |
| 2026-03-24 | ci-issue.yml — auto GitHub Issues on CI failure | Monitor Agent   |
| 2026-03-25 | PR #9 merged — Phase 1 COMPLETE on main         | Orchestrator    |
| 2026-03-25 | v0.1.0 tagged (commit a8c6924)                  | DevOps Agent    |
| 2026-03-25 | Deployment #1 recorded in DEPLOYMENTS.md        | Monitor Agent   |
| 2026-03-25 | Phase 2 SDK work merged — hooks, tests, mappers | SDK Eng         |
| 2026-03-25 | wiremock mock bundler — 9 intent tests added     | QA Agent        |
| 2026-03-25 | Coverage gate raised 70% → 80% (87.18% actual)  | DevOps Agent    |
| 2026-03-25 | CI push trigger narrowed — feat/fix/ops excluded | DevOps Agent    |
| 2026-03-25 | Merge strategy → merge commits (no divergence)   | DevOps Agent    |
| 2026-03-25 | Hard Rule #12 added — no direct commits to main  | Governor        |
| 2026-03-25 | Deployment #2 recorded in DEPLOYMENTS.md         | Monitor Agent   |
| 2026-03-25 | Phase 2 marked COMPLETE                          | Orchestrator    |
| 2026-03-25 | SPEC-004 + SPEC-006 auth tests added (closes #18) | QA Agent       |
| 2026-03-25 | SPEC-201 SQL injection unignored (closes #19)    | QA Agent        |
| 2026-03-25 | config.toml.example added (closes #20)           | DevOps Agent    |
| 2026-03-25 | AppError::Unauthorized bug fixed — *code dereference | Backend Eng  |
| 2026-03-25 | generateSessionKey() + useRecovery added (closes #21) | SDK Eng     |
| 2026-03-25 | WebCrypto polyfill setup.crypto.ts for vitest     | SDK Eng         |
| 2026-03-25 | tsup.config.ts added — SDK build fixed           | SDK Eng         |
| 2026-03-25 | example/ reference app (closes #22)              | SDK Eng         |
| 2026-03-25 | GH Issue #33 opened — error cause logging Phase 4 | Monitor Agent  |
| 2026-03-25 | Deployment #3 recorded in DEPLOYMENTS.md         | Monitor Agent   |
| 2026-03-25 | Phase 3 marked COMPLETE                          | Orchestrator    |
| 2026-03-25 | GH Issues #36–#43 filed — validation gap backlog | QA Agent        |
| 2026-03-25 | Retry-After header on 429 (closes #36)           | Backend Eng     |
| 2026-03-25 | /recovery/initiate route rename (closes #37)     | Backend Eng     |
| 2026-03-25 | AppError::InvalidCalldata added (closes #38)     | Backend Eng     |
| 2026-03-25 | SDK coverage gate enforced (closes #39)          | SDK Eng         |
| 2026-03-25 | createAccount(address) signature fix (closes #40) | SDK Eng        |
| 2026-03-25 | SPEC-011/022/031/032/033 tests added (closes #41) | QA Agent       |
| 2026-03-25 | ApiResult<T> exported from SDK (closes #42)      | SDK Eng         |
| 2026-03-25 | Sliding window rate limiter (closes #43)         | Backend Eng     |
| 2026-03-25 | v0.2.0 + v0.3.0 + v0.3.1 tags + releases pushed | DevOps Agent    |
| 2026-03-25 | Deployment #4 recorded in DEPLOYMENTS.md         | Monitor Agent   |
| 2026-03-25 | v0.3.1 post-deploy assessment complete           | Monitor Agent   |
| 2026-03-26 | Phase 4 (v0.4.0–v0.4.1) + Phase 5 (v0.5.0) complete | Orchestrator |
| 2026-03-26 | Release workflow live — multi-platform binaries + npm publish | DevOps |
| 2026-03-26 | @ghostkey/sdk@1.0.0 published to npm             | SDK Eng         |
| 2026-03-26 | Deployments #5 through #7 recorded               | Monitor Agent   |
| 2026-03-26 | Live demo run — GAP-001/002/003 discovered       | QA / Founder    |
| 2026-03-26 | db.rs create_if_missing bug fixed (v0.5.1 hotfix) | Backend Eng    |
| 2026-03-26 | config.toml.example host 0.0.0.0→127.0.0.1 fixed | DevOps Agent   |
| 2026-03-26 | All docs + agent files updated for post-audit state | Docs Agent    |
| 2026-03-26 | GAP-001/002/003 logged — v1.0 scope confirmed    | Governor        |
| 2026-03-26 | Deployment #8 recorded — v0.5.1 hotfix           | Monitor Agent   |
