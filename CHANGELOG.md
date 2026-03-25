# Changelog

All notable changes to ReaperKey are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

Maintained by: Docs Agent + DevOps Agent
Updated on every merge to `main`.

---

## [Unreleased] — dev branch

_Nothing unreleased yet._

---

## [0.3.1] — 2026-03-25

### Fixed
- `Retry-After: 60` header on all 429 responses — SPEC-006 and SPEC-035 compliance (closes #36)
- Route renamed `/recovery/init` → `/recovery/initiate` to match spec contract; SDK client updated (closes #37)
- `AppError::InvalidCalldata` — calldata validation returns HTTP 400 + `"invalid_calldata"` (closes #38)
- `GhostKeyClient.createAccount(address)` — single param; chain derived from `config.chainId` via `chainName()` (closes #40)
- Rate limiter replaced with true sliding window (`VecDeque<Instant>`) — eliminates boundary burst (closes #43)

### Added
- `ApiResult<T>` exported from `@ghostkey/sdk` package root (closes #42)
- SDK `vitest.config.ts` — `coverage.thresholds` (80%) enforced; `index.ts` excluded from coverage (closes #39)
- 12 new `GhostKeyClient` HTTP method tests — all methods, mappers, error paths, auth header, chainName fallback

### Tests
- SPEC-011, SPEC-022, SPEC-031, SPEC-032, SPEC-033 — all previously missing tests added (closes #41)
- **Total: 70 tests (32 Rust + 38 SDK), 0 ignored**
- SDK coverage: 96.83% lines, 100% functions, 80.48% branches

---

## [0.3.0] — 2026-03-25

### Added
- `useRecovery` React hook — wraps `POST /recovery/initiate`; `result`, `loading`, `error`, `reset` (closes #21)
- `generateSessionKey()` WebCrypto utility — generates 32-byte random key, SHA-256 `keyHash`; private key never leaves client (closes #21)
- `SessionKey` type exported from `@ghostkey/sdk`
- Reference app (`example/`) — full 5-step GhostKey flow: login → create account → session key → send intent → poll status (closes #22)
- `example/src/vite-env.d.ts` — vite client types for `import.meta.env`
- `tsup.config.ts` — SDK build entry point (fixed `npm run build` "No input files" error)

### Changed
- `sdk/vitest.config.ts` — added `setupFiles: ['./tests/setup.crypto.ts']` for WebCrypto polyfill
- `config.toml.example` — full inline documentation, env-var override reference, Base Sepolia defaults

### Fixed
- `AppError::Unauthorized` `IntoResponse` was hardcoded to emit `"invalid_token"` regardless of inner code; fixed to use `*code` — SPEC-004 (`token_expired`) now passes (closes #18)
- SPEC-201 SQL injection test unignored — parameterized queries + SHA-256 hashing confirmed safe (closes #19)
- `globalThis.crypto.subtle` undefined in vitest vm-sandboxed environment — `tests/setup.crypto.ts` polyfill added

### Tests
- Auth: +2 (SPEC-004 expired token → 401 `token_expired`; SPEC-006 11th login → 429 `rate_limited`)
- SDK: +4 crypto tests, +4 `useRecovery` tests; total **27 Rust + 26 SDK = 53 passing, 0 ignored**
- `config.toml.example` added — `make dev` no longer fails for new contributors (closes #20)

### Security
- SHA-256 session key hash: private key stays in browser memory, `keyHash` only is sent to server
- SQL injection confirmed impossible via parameterized SQLx queries

---

## [0.2.0] — 2026-03-25

### Added
- `useSessionKey` React hook — `issueSessionKey`, `clearSessionKey`, error + loading state
- `useSendIntent` React hook — `sendIntent` with intent status polling, `reset`
- `useAccount` hook extended — `fetchAccount(id)`, `address` param on `createAccount`
- `GhostKeyProvider._client` injection prop for test isolation
- 15 React hook tests via `@testing-library/react` (jsdom): `useLogin`×4, `useAccount`×4, `useSessionKey`×3, `useSendIntent`×4
- 9 intent integration tests (SPEC-030–SPEC-035) with wiremock mock bundler
- `sdk/package-lock.json` — SDK CI `npm ci` no longer fails (ISS-001)

### Changed
- Coverage gate raised 70% → 80% (actual: 87.18%)
- CI push trigger narrowed — `feat/*`, `fix/*`, `ops/*` branches no longer trigger push CI (PR-only)
- Merge strategy → merge commits to prevent dev/main divergence

### Fixed
- `client.ts` snake_case → camelCase mappers — all fields were silently `undefined` before explicit mapper functions
- Unused import `DbSession` in `session_key.rs` removed (ISS-002)
- Account tests unignored — Bearer token auth wired (ISS-003)

### Tests
- 25 Rust + 18 SDK = 43 total passing; 1 ignored (SPEC-201 GH #19)
- Coverage: 87.18% Rust (gate: 80%)

---

## [0.1.0] — 2026-03-25

### Added
- Full Phase 1 Core Engine implementation
  - `POST /auth/login` — email/wallet login, 201 new user / 200 returning user (SPEC-001, SPEC-002)
  - `POST /auth/refresh` — JWT token refresh (SPEC-003)
  - `POST /account/create` — ERC-4337 smart account registration (SPEC-010, SPEC-013)
  - `GET /account/:id` — account fetch with ownership enforcement (SPEC-012)
  - `POST /session-key/issue` — scoped session key issuance, key_hash only stored (SPEC-020 through SPEC-023)
  - `POST /intent/execute` — UserOperation validation + async Pimlico submission (SPEC-030 through SPEC-035)
  - `GET /intent/:id/status` — intent status polling
  - `POST /recovery/initiate` — account recovery initiation (SPEC-040)
  - `GET /health` — health check endpoint
- Rate limiting middleware (DashMap sliding window, per-IP and per-user)
- JWT auth extractor middleware (`AuthUser` via `FromRequestParts`)
- Pimlico bundler/paymaster chain adapter (`chain.rs`)
- SQLite schema with full migrations (`0001_init.sql`)
- Integration test suite: auth (5 tests), security (3 tests) — all passing
- TypeScript SDK skeleton: `GhostKeyClient`, React hooks (`useLogin`, `useAccount`, `useSendIntent`), `GhostKeyProvider`
- 18-agent AI governance system (`docs/agents/`)
- GitHub Actions CI pipeline (Rust + SDK + Security jobs)
- `Makefile` with `dev`, `test`, `lint`, `audit`, `coverage`, `ci` targets
- Branch strategy: `dev` → `main` via PR, CI must be green

### Security
- No private keys ever stored or handled server-side (non-custodial hard constraint)
- SHA-256 credential hashing before storage
- Tampered/expired JWT returns 401 `invalid_token` / `token_expired`
- No 32-byte hex key pattern in any auth response (SPEC-007)
- Oversized payload returns 413 (SPEC-201)
- Security test suite runs in CI on every push

---

<!-- Links -->
[Unreleased]: https://github.com/OriginalLeeDunn/projekt.ReaperKey/compare/main...dev
