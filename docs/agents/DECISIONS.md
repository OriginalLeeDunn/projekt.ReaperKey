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
