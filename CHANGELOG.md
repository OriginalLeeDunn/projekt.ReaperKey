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
