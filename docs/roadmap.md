# GhostKey Roadmap

## Current: v0.5 — Storage + Routing Infrastructure

The v0 series delivers a self-hostable, non-custodial **storage and routing layer** — the server-side infrastructure that manages users, smart account records, session key metadata, and intent routing. On-chain execution is the v1.0 milestone.

**Shipped in v0.x (confirmed working as of 2026-03-26 live demo):**
- User authentication (email, JWT, rate limiting, refresh, recovery initiation)
- Smart account registration (EVM address validation, DB record, chain metadata)
- Session key issuance (DB storage, scope enforcement: target/selector/value/TTL, key hash — never raw key)
- Intent pipeline (scope validation, DB persistence, bundler submission routing)
- Security hardening: rate limiting (sliding window), config-driven CORS, security headers, structured logging
- TypeScript SDK with React hooks (`useLogin`, `useAccount`, `useSessionKey`, `useSendIntent`, `useRecovery`)
- Full integration test suite (42 Rust tests, 39 SDK tests, 81 total)
- Self-hostable via single binary + SQLite
- Multi-platform binary releases (x86_64/aarch64 Linux + macOS) via GitHub Actions
- `@ghostkey/sdk@1.0.0` published to npm

**Known v0 limitations (fixed in v1.0):**
- SDK does not build or sign ERC-4337 UserOperations — intent submission reaches Pimlico but is rejected (empty UserOp)
- No ZeroDev Kernel counterfactual address computation — users provide owner address manually
- Session keys are off-chain only — Kernel smart contract does not know about the session key
- All bundler tests use wiremock mocks — no real testnet E2E test exists yet

---

## v1.0 — On-Chain Execution + Multi-Chain

**Theme:** Complete the on-chain execution layer, then expand chain support.

### On-chain execution (primary milestone)
- SDK builds ERC-4337 UserOperations (fetch nonce from EntryPoint, ABI-encode `execute`, fetch gas)
- Session key signs UserOperations client-side (private key never leaves browser)
- ZeroDev Kernel v3 counterfactual address computation in SDK (deterministic from owner + salt)
- On-chain session key registration via Kernel session key plugin
- Real E2E test against Base Sepolia + live Pimlico in CI

### Chain support
- Add Ethereum mainnet
- Add Arbitrum One
- Chain-agnostic SDK (`chainId` routing)
- Per-chain EntryPoint + bundler + paymaster config

### Auth
- Wallet-based login (EIP-4361 Sign-In with Ethereum)
- Token denylist for immediate JWT invalidation on logout (revisit DECISIONS.md 2026-03-26)
- OAuth2 provider support (Google, GitHub)

### Session keys
- On-chain session key registration (ZeroDev Kernel v3 session key plugin)
- Session key revocation endpoint

### Developer experience
- OpenAPI spec auto-generated from Rust handlers (utoipa)
- SDK v2.0 with breaking changes signaled by major bump
- React Native SDK
- Python SDK (server-side integration)

### Infrastructure
- PostgreSQL support alongside SQLite (horizontal scaling path)
- Redis-backed rate limiter (replaces in-memory DashMap)
- Docker-based E2E CI job (smoke test Dockerfile path)
- Multi-platform binary releases (aarch64-linux, x86_64-linux, x86_64-macos)

---

## v1.x — Enterprise + Compliance

**Theme:** Meet enterprise requirements without compromising the non-custodial model.

- Admin dashboard (account + intent audit log)
- Webhook notifications on intent status changes
- Compliance export (CSV/JSON intent log per account)
- Role-based access: admin vs. developer API keys
- Self-hosted key management integration (HSM / KMS backed signing for relayer)
- SSO / SAML for developer team auth

---

## v2.0 — Chain Abstraction

**Theme:** Make chain selection invisible to users and apps.

- Automatic chain routing (best fee, fastest confirmation)
- Cross-chain intent execution (bridge + execute in one intent)
- Chain-agnostic account addresses
- Unified intent format across chains

---

## Not planned

The following are explicitly out of scope for GhostKey:

- Token issuance or DeFi primitives
- Custody of user funds
- Fiat on/off ramps
- NFT marketplace features
- DAO governance tooling
- Acting as a broker, exchange, or payment processor

GhostKey is infrastructure. Financial product features belong in the applications built on top of it.

---

## How releases work

- `main` branch is stable (requires green CI)
- `dev` branch is active development
- Versions follow semver independently for server and SDK (see DECISIONS.md)
- GitHub Releases are tagged on `main` after each phase completes
- The SDK publishes to npm as `@ghostkey/sdk`
