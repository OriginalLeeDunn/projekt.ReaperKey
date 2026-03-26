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
