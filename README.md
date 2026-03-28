# ReaperKey (GhostKey)

> Non-custodial Web3 wallet abstraction SDK. Rust backend · TypeScript SDK · ERC-4337 smart accounts on Base, Arbitrum, and Ethereum.

[![CI](https://github.com/OriginalLeeDunn/projekt.ReaperKey/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/OriginalLeeDunn/projekt.ReaperKey/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ghostkey/sdk)](https://www.npmjs.com/package/@ghostkey/sdk)

---

## What It Does

ReaperKey lets apps give users smart contract wallets (ERC-4337) without ever touching a private key server-side. The server handles auth, session scoping, and intent routing. Keys and signing stay on the client.

- **Non-custodial** — server never sees private keys. Ever.
- **Session keys** — scoped, time-limited permissions for dApp interactions
- **Intent routing** — client builds + signs UserOperations via `sendIntentWithSessionKey`; server validates scope and submits to Pimlico
- **Multi-chain** — Base (default), Arbitrum, and Ethereum; add chains via config with zero code changes
- **PostgreSQL or SQLite** — SQLite for local dev, Postgres for production
- **Self-hostable** — single Rust binary, no managed infra required

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Client / dApp                                       │
│  @reaperkey/sdk (TypeScript)                         │
│  - Generates session keys locally                    │
│  - Builds + signs UserOperations                     │
│  - Sends key_hash (not key) to server                │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────────┐
│  ReaperKey Server (Rust / Axum)                      │
│  - Auth (email / wallet, JWT)                        │
│  - Session key registry (stores key_hash only)       │
│  - Intent validation + scope enforcement             │
│  - Submits UserOps to Pimlico bundler                │
└─────────────────┬───────────────────────────────────┘
                  │ JSON-RPC
┌─────────────────▼───────────────────────────────────┐
│  Base / Arbitrum / Ethereum (ERC-4337)               │
│  EntryPoint v0.7 · ZeroDev Kernel v3 · Pimlico       │
└─────────────────────────────────────────────────────┘
```

---

## Install the SDK

```bash
npm install @ghostkey/sdk
```

See the [quickstart guide](docs/quickstart.md) for a step-by-step integration walkthrough.

---

## Getting Started

### Prerequisites

- Rust stable (`rustup update stable`)
- Node 20+
- A Pimlico API key (free tier works for dev)

### Run locally

```bash
# Clone
git clone https://github.com/OriginalLeeDunn/projekt.ReaperKey.git
cd projekt.ReaperKey

# Copy config template and fill in your values
cp config.toml.example config.toml
# Required: set jwt_secret (min 32 chars) and Pimlico API key in config.toml
# Or export as env vars: JWT_SECRET=... BASE_BUNDLER_URL=... BASE_PAYMASTER_URL=...

# Run DB migrations (creates db/ghostkey.db)
make migrate

# Start server
make dev
```

### Run with Docker

```bash
cp .env.example .env
# Fill in JWT_SECRET, BASE_BUNDLER_URL, BASE_PAYMASTER_URL in .env

docker compose up -d
curl http://localhost:8080/health
```

See [`docs/deployment.md`](docs/deployment.md) for the full production deployment guide.

### Run tests

```bash
make test        # Rust backend tests
make lint        # cargo fmt + clippy + tsc + eslint
make audit       # cargo audit + npm audit
make ci          # everything (same as CI pipeline)
```

---

## Project Structure

```
├── server/          # Rust backend (Axum + SQLite/Postgres + sqlx)
│   ├── src/
│   │   ├── routes/      # auth, account, session_key, intent, recovery
│   │   ├── models/      # DB row types + request/response types
│   │   ├── middleware/  # JWT auth extractor + rate limiter
│   │   └── chain.rs     # Pimlico bundler adapter (multi-chain)
│   ├── migrations/      # SQLite schema
│   ├── migrations_pg/   # PostgreSQL-compatible migrations
│   └── tests/           # Integration tests (auth, account, security, e2e)
├── sdk/             # TypeScript SDK (@ghostkey/sdk)
│   └── src/
│       ├── client.ts       # API client
│       ├── hooks/          # useLogin, useAccount, useSessionKey, useSendIntent
│       ├── userop.ts       # buildUserOperation (GAP-001)
│       └── provider.tsx    # React context provider
├── db/              # SQLite database directory (db/.gitkeep tracked; *.db gitignored)
├── example/         # Reference React app (full 4-step flow)
├── dashboard/       # Agent operations dashboard
├── docs/agents/     # AI agent governance system
│   ├── AGENTS.md    # Master orchestration doc (read first)
│   └── ...
└── .github/workflows/ci.yml
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login / register (email) |
| POST | `/auth/refresh` | JWT | Refresh JWT token |
| POST | `/auth/logout` | JWT | Logout — invalidates token via denylist |
| POST | `/account/create` | JWT | Create ERC-4337 smart account |
| GET | `/account/:id` | JWT | Fetch account details |
| POST | `/session-key/issue` | JWT | Issue scoped session key |
| POST | `/intent/execute` | JWT | Submit intent for on-chain execution |
| GET | `/intent/:id/status` | JWT | Poll intent status |
| POST | `/recovery/initiate` | JWT | Initiate account recovery |
| GET | `/health` | — | Health check |

Full reference: [`docs/api/endpoints.md`](docs/api/endpoints.md)

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Quickstart](docs/quickstart.md) | 5-minute integration guide |
| [API Reference](docs/api/endpoints.md) | All endpoints, request/response shapes, error codes |
| [SDK Hooks](docs/sdk/hooks.md) | `useLogin`, `useAccount`, `useSessionKey`, `useSendIntent` |
| [Security Model](docs/security-model.md) | Threat model, OWASP coverage, non-custodial guarantees |
| [Deployment](docs/deployment.md) | Production checklist, Docker, reverse proxy |
| [Roadmap](docs/roadmap.md) | v1 and beyond |

---

## Contributing

All development happens on the `dev` branch. PRs into `main` require CI to be fully green.

See [`docs/agents/AGENTS.md`](docs/agents/AGENTS.md) for the full agent governance system.

---

## Security

Server never handles, receives, or stores private keys. See [`docs/security-model.md`](docs/security-model.md) for the full threat model and OWASP coverage.

To report a security vulnerability, open a GitHub issue marked `[SECURITY]` before public disclosure.

---

## License

MIT
