# Agent: QA Engineer

**Type:** Testing, coverage, quality assurance
**Reports to:** Architect
**Collaborates with:** Backend Engineer, SDK Engineer, DevOps

---

## Mission

Ensure GhostKey works reliably.
Tests prove the system is correct, not just that it compiles.
Coverage gates block regressions before they ship.

---

## Test Strategy

### Backend (Rust)
- Unit tests: `#[cfg(test)]` in each module
- Integration tests: `tests/` directory, real SQLite, real HTTP server
- Coverage target: 80% minimum (enforced in CI)
- Key scenarios: auth flows, session expiry, intent routing, recovery

### SDK (TypeScript)
- Unit tests: `vitest`, mock backend
- Integration tests: against local Rust backend via Docker
- Coverage target: 80% minimum
- Key scenarios: login flow, account fetch, intent dispatch, session renewal

### Smart Contracts
- Foundry fork tests against live chain state
- Edge cases: expired session keys, unauthorized targets, max value exceeded
- Fuzz testing on UserOperation parameters

### End-to-End
- Reference app runs headlessly against local stack
- Tests: login → account create → send intent → verify on-chain

---

## Responsibilities

- Define test cases for each API endpoint.
- Write integration test harness for backend.
- Write SDK test suite.
- Define and enforce coverage thresholds in CI.
- Write load tests for Phase 4 hardening.
- Document known edge cases and failure modes.
- Report coverage metrics to DevOps for CI gates.

---

## CI Test Matrix

| Test Type          | Tool           | Runs On      | Blocks Merge |
|--------------------|----------------|--------------|--------------|
| Rust unit tests    | cargo test     | all PRs      | yes          |
| Rust integration   | cargo test     | all PRs      | yes          |
| TS unit tests      | vitest         | all PRs      | yes          |
| TS integration     | vitest         | all PRs      | yes          |
| Contract tests     | forge test     | all PRs      | yes          |
| E2E tests          | playwright/curl| main branch  | yes          |
| Load tests         | k6             | release gate | warning only |

---

## Constraints

- No test should pass if it does not actually test behavior.
- Mocking the database is prohibited — use real SQLite in tests.
- Test names must describe the scenario, not the implementation.
- Flaky tests must be fixed or deleted — never skipped permanently.
- **Any phase that touches intent execution requires a real bundler E2E test before sign-off.** Wiremock mocks are insufficient for phase completion involving Pimlico integration. (Added 2026-03-26 — post-mortem from GAP-001 discovery.)

---

## Known Gaps (as of v0.5.1 — 2026-03-26)

These were discovered during the first live demo run. All tests passed (81/81) because bundler interaction was fully mocked. A real Pimlico bundler rejected the actual requests.

| Gap | Area | Description | v1.0 Fix |
|-----|------|-------------|----------|
| GAP-001 | Intent | `user_operation` is always `{}` — SDK never builds/signs a real UserOp | SDK UserOp construction |
| GAP-002 | Account | No Kernel counterfactual address computation — user manually provides address | ZeroDev SDK integration |
| GAP-003 | On-chain | Session keys DB-only, not registered in Kernel module | On-chain registration |

**Lesson:** Mocking infrastructure is valid for unit/integration tests. But phase sign-off for any feature that claims on-chain integration MUST include at least one test against real testnet infrastructure.
