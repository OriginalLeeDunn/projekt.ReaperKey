# GhostKey — Decision Log

Maintained by: Audit Lead Agent
Format: append-only. To reverse a decision, add a `Superseded by:` line.

---

## 2026-03-24 — Orchestrator — Initial Architecture Established

**Phase:** Phase 0 (Alignment)
**Context:** Product defined in v1prd.md. Need to establish technical foundation before building.
**Decision:** Rust backend (single binary, SQLite), TypeScript SDK, ERC-4337 AA standard, client-side key storage.
**Rationale:** Rust for performance and memory safety. SQLite for self-hostability. ERC-4337 is the most adopted AA standard with active bundler ecosystem. Client-side keys enforce non-custodial guarantee at the architecture level.
**Risks:** Rust learning curve for contributors. SQLite limits horizontal scaling (acceptable for v0).
**Reviewed by:** Architect ✓ | Security Lead ✓ | Compliance Officer ✓
**Status:** Accepted

---

## 2026-03-24 — Compliance Officer — Non-Custodial Hard Constraint Established

**Phase:** Phase 0 (Alignment)
**Context:** Legal posture requires GhostKey to remain non-custodial, infrastructure-only.
**Decision:** Server never receives, stores, or handles private keys. Session keys are client-generated and short-lived. Recovery cannot grant server key access.
**Rationale:** Custodial behavior would expose GhostKey to money transmitter and exchange regulations. Non-custodial model avoids this classification entirely.
**Risks:** Recovery UX is harder without server-side key custody. Acceptable trade-off.
**Reviewed by:** Security Lead ✓ | Orchestrator ✓
**Status:** Accepted

---

## 2026-03-24 — Architect — AI Agent Corp Established

**Phase:** Phase 0 (Alignment)
**Context:** GhostKey will be built, secured, audited, and operated by a structured team of AI agents.
**Decision:** Defined 14-agent corp structure across Engineering, Security, Audit/Compliance, and Operations. AGENTS.md is the master orchestration document.
**Rationale:** Structured agent roles prevent scope confusion, enforce security review gates, and allow agents to plug back into the product in operational mode post-launch.
**Risks:** Agent coordination overhead. Mitigated by clear role boundaries and escalation paths.
**Reviewed by:** Orchestrator ✓
**Status:** Accepted

---

## 2026-03-24 — Founder — Initial Chain: Base

**Phase:** Phase 0 (Alignment)
**Context:** PRD requires selecting 1-2 chains for v0. Chain selection unblocks AA factory addresses, bundler config, RPC integration, and contract test setup.
**Decision:** Base (chain ID 8453) is the sole supported chain for v0.
**Rationale:** Base has the most active developer ecosystem for AA/ERC-4337, lowest fees, Coinbase distribution, strong bundler support (Alchemy, Pimlico), and is EVM-equivalent making future chain additions straightforward.
**Risks:** Base is relatively young. Mitigated by using standard ERC-4337 EntryPoint and keeping chain adapter abstracted for easy expansion.
**Reviewed by:** Architect ✓ | Compliance Officer ✓
**Status:** Accepted

### Base Chain Config (locked)
| Parameter         | Value                                        |
|-------------------|----------------------------------------------|
| Chain ID          | 8453                                         |
| Network           | Base Mainnet                                 |
| RPC (default)     | https://mainnet.base.org (env: BASE_RPC_URL) |
| EntryPoint v0.7   | 0x0000000071727De22E5E9d8BAf0edAc6f37da032   |
| AA Framework      | ZeroDev Kernel v3 (session key native)       |
| Bundler           | Pimlico (env: BASE_BUNDLER_URL)              |
| Paymaster         | Pimlico (env: BASE_PAYMASTER_URL)            |
| Block Explorer    | https://basescan.org                         |
| Testnet           | Base Sepolia (chain ID 84532) for dev/CI     |

---

## 2026-03-24 — Backend Engineer — Phase 1 Implementation Decisions

**Phase:** Phase 1 (Core Engine)
**Context:** Implementing all route handlers. Several non-obvious DB and architecture choices were made.
**Decisions:**

1. **SQLite INTEGER timestamps** — all `created_at`/`expires_at` stored as unix epoch integers (i64), not TEXT datetime. Avoids sqlx type-mapping issues with SQLite's flexible typing.

2. **Primitive-typed DB row structs** — `DbUser`, `DbAccount`, etc. use `String`/`i64` only. No UUID or DateTime in row structs. Conversion happens in `.into_response()` methods. Prevents sqlx compile-time macro dependency on `DATABASE_URL`.

3. **Client-side session key + counterfactual address** — session keys are generated client-side; server receives only `key_hash` (SHA-256). Account addresses are pre-computed client-side and sent to server with `POST /account/create`. Server validates format only. Enforces non-custodial constraint at the API boundary.

4. **Intent execution pipeline — 202 + async bundler** — `POST /intent/execute` returns 202 immediately after scope validation. A `tokio::spawn` background task handles Pimlico sponsor → send → receipt polling (30×2s). Status is polled via `GET /intent/:id/status`. Prevents HTTP timeout on slow bundler responses.

5. **DashMap rate limiter** — in-memory sliding window keyed by IP or user_id. Acceptable for v0 single-instance. If horizontal scaling needed, replace with Redis-backed solution (log in DECISIONS.md at that time).

**Reviewed by:** Architect ✓ | Security Lead ✓
**Status:** Accepted

---

## 2026-03-24 — DevOps Agent — Branch Strategy Established

**Phase:** Phase 1 (Core Engine)
**Context:** Repo pushed to GitHub. Branch workflow needs to be formally defined.
**Decision:** `dev` is active development. `main` is stable. CI must be fully green before any PR from dev → main is merged. No direct pushes to main.
**Rationale:** Prevents broken code reaching the stable branch. CI gates enforce quality automatically.
**Risks:** Slightly slower iteration if CI is slow. Mitigated by fast Rust test suite (< 30s).
**Reviewed by:** Orchestrator ✓
**Status:** Accepted

---

## 2026-03-26 — Founder — Stateless JWT: No Token Denylist for v0

**Phase:** Post-Phase 3 (Validation)
**Context:** SPEC-003 specified that refreshing a token must invalidate the old token. Validation (issue #54) surfaced that current implementation uses stateless JWTs — old tokens remain valid until their `exp` claim expires (1-hour TTL). Implementing invalidation would require a token denylist (DB or Redis lookup on every authenticated request).
**Decision:** Accept stateless JWT behavior for v0. Do not implement a token denylist. SPEC-003 updated to remove the old-token-invalidation requirement.
**Rationale:**
- 1-hour TTL limits blast radius of a leaked JWT to 60 minutes
- Non-custodial architecture provides a second security layer: even with a valid JWT, an attacker cannot move funds they don't control; session keys are separately scoped per-target/selector/value
- Token denylist adds per-request DB overhead, infrastructure complexity, and a new failure mode (denylist unavailable → auth broken)
- Stateless JWT is standard practice for short-lived tokens in non-custodial systems
**Risks:** If a JWT is stolen, attacker has up to 1 hour of API access. Mitigated by: short TTL, session key scope enforcement, rate limiting, non-custodial key model.
**Future:** Revisit for v1 if compliance requirements (e.g., immediate revocation on logout) demand it. Adding a denylist is backwards-compatible — no API changes required.
**Reviewed by:** Security Lead ✓ | Founder ✓
**Status:** Accepted
**Supersedes:** SPEC-003 old-token-invalidation requirement (issue #54)

---

## 2026-03-26 — Architect — Phase 5 E2E Test Implementation Strategy

**Phase:** Phase 5 (Open Source Launch)
**Context:** DEVOPS.md specifies `e2e: docker-compose up → e2e suite → docker-compose down` on merge to main. E2E-001 and E2E-002 have no implementation. Two options: shell/curl scripts (matches spec literally) or Rust integration tests using `axum_test` + wiremock.
**Decision:** Implement E2E-001 and E2E-002 as Rust integration tests in `server/tests/e2e.rs` using `axum_test` + wiremock. Defer the Docker-based `e2e` CI job to a future ops hardening sprint.
**Rationale:** Rust tests use the same proven infrastructure as the existing 40-test suite. No Docker daemon dependency in CI. Portable across all runners. Shell scripts are fragile, harder to assert precisely, and require managing process lifecycle. The Rust tests cover the full behavioral contract of E2E-001/E2E-002 without sacrificing reliability.
**Risks:** Does not exercise the Docker packaging path. Accepted for v0 — the Dockerfile is tested manually. A Docker-based smoke test can be added in a future ops sprint.
**Reviewed by:** DevOps Agent ✓ | QA Engineer ✓
**Status:** Accepted

---

## 2026-03-26 — Founder — SDK Independent Versioning

**Phase:** Phase 5 (Open Source Launch)
**Context:** Server is at v0.4.1. SDK `package.json` is at `0.1.0`. Options: (a) align SDK version to server (v0.4.1), (b) bump independently to v1.0.0 to signal stable public API.
**Decision:** SDK follows independent versioning. First npm publish will be `v1.0.0`.
**Rationale:** Server and SDK evolve at different rates. Aligning would cause confusing jumps (0.1.0 → 0.4.1) with no intervening changes visible to npm consumers. `v1.0.0` signals that the hooks API is stable and intentionally designed. Server uses semver independently (currently v0.x, pre-stable).
**Risks:** Server at v0.x while SDK is at v1.x could create mixed signals. Documented here to prevent confusion.
**Future:** If the SDK undergoes breaking hook API changes, bump major (v2.0.0). Server version changes do not automatically require an SDK bump.
**Reviewed by:** SDK Engineer ✓ | Docs Agent ✓
**Status:** Accepted

---

## 2026-03-26 — Architect — Defer OpenAPI Auto-Generation to v1

**Phase:** Phase 5 (Open Source Launch)
**Context:** Docs Agent role specifies auto-generating OpenAPI spec from Rust handlers via `utoipa`. No utoipa annotations exist in the codebase. Annotating all handlers is significant work and adds a new dependency.
**Decision:** Defer utoipa/OpenAPI auto-generation to v1. Phase 5 docs will use a manually maintained `docs/api/endpoints.md`.
**Rationale:** Manual docs are faster to produce for launch. The API surface is small (8 endpoints). Adding utoipa annotations to all handlers mid-Phase 5 would delay launch with minimal user benefit. The API is stable enough that manual docs won't drift significantly before v1.
**Risks:** Manual docs can drift from implementation. Mitigated by: API is frozen for v0, validation tests enforce contract.
**Future:** Add utoipa in v1 when the API surface grows and manual maintenance becomes impractical.
**Reviewed by:** Docs Agent ✓
**Status:** Accepted

---

## 2026-03-26 — Founder/Governor — v0 Scope Boundary: Storage+Routing Layer

**Phase:** Post-Phase 5 audit (triggered by first live demo run)
**Context:** Live demo against real Pimlico bundler revealed that `user_operation` is always `{}` in the SDK. Pimlico rejected with validation errors. Further audit found no Kernel counterfactual address computation and no on-chain session key registration.
**Decision:** v0.x (Phases 1–5) is formally defined as a **storage and routing layer**. It correctly manages users, smart account records, session key metadata, and intent routing. It does NOT perform on-chain execution. On-chain execution (UserOp construction, Kernel address computation, on-chain session key registration) is formally v1.0 scope.
**Rationale:** These gaps were always implied by the roadmap ("on-chain session key registration" listed under v1.0) but were never made explicit at the v0 boundary. The live demo made this concrete. The v0 infrastructure is solid — the gaps are not bugs in the v0 feature set, they are v0 non-goals that were not clearly documented.
**Risks:** Users/contributors who read v0 docs may expect real on-chain execution. Mitigated by: roadmap.md updated with "Known v0 limitations" section, HEALTH.md updated with "Critical Known Gaps".
**Process change:** QA agent now requires a real bundler E2E test before any phase sign-off touching intent execution.
**Reviewed by:** QA Agent ✓ | Architect ✓
**Status:** Accepted

---

## 2026-03-26 — Backend Engineer — db.rs create_if_missing Hotfix (v0.5.1)

**Phase:** v0.5.1 hotfix
**Context:** On first run with no existing `ghostkey.db` file, `SqlitePoolOptions::connect()` failed with "unable to open database file". The connection string uses `sqlite:./ghostkey.db` which does not auto-create the file.
**Decision:** Use `SqliteConnectOptions::from_str(url)?.create_if_missing(true)` + `connect_with(opts)` instead of `connect()` directly. This is the correct SQLx API for auto-creating SQLite databases.
**Rationale:** Necessary for any fresh install. The bug was masked in CI because the test DB was always created fresh by the test harness.
**Reviewed by:** DevOps Agent ✓
**Status:** Accepted
