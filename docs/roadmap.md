# GhostKey Roadmap

## Current: v0.4 — Hardened Foundation

The v0 series delivers a self-hostable, non-custodial smart account infrastructure layer with a developer-friendly TypeScript SDK.

**Shipped in v0.x:**
- User authentication (email, JWT)
- Smart account creation (ZeroDev Kernel v3 on Base)
- Session key issuance with per-key scope enforcement (target, selector, value, TTL)
- Intent execution via Pimlico bundler + paymaster (ERC-4337)
- Account recovery initiation
- Security hardening: rate limiting, config-driven CORS, security headers, structured logging
- TypeScript SDK with React hooks (`useLogin`, `useAccount`, `useSessionKey`, `useSendIntent`, `useRecovery`)
- Full integration test suite (40+ Rust tests, 39 SDK tests)
- Self-hostable via single binary + SQLite + Docker

---

## v1.0 — Multi-Chain + Production Hardening

**Theme:** Expand chain support, replace v0 compromises with production-grade solutions.

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
