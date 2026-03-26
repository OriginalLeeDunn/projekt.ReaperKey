# ReaperKey (GhostKey)

> Non-custodial Web3 wallet abstraction SDK. Rust backend · TypeScript SDK · ERC-4337 smart accounts on Base.

[![CI](https://github.com/OriginalLeeDunn/projekt.ReaperKey/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/OriginalLeeDunn/projekt.ReaperKey/actions/workflows/ci.yml)

---

## What It Does

ReaperKey lets apps give users smart contract wallets (ERC-4337) without ever touching a private key server-side. The server handles auth, session scoping, and intent routing. Keys and signing stay on the client.

- **Non-custodial** — server never sees private keys. Ever.
- **Session keys** — scoped, time-limited permissions for dApp interactions
- **Intent routing** — client builds + signs UserOperations, server validates scope and submits to Pimlico
- **Base chain** — ERC-4337 via ZeroDev Kernel v3, bundled by Pimlico
- **Self-hostable** — single Rust binary + SQLite

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
│  Base Chain (ERC-4337)                               │
│  EntryPoint v0.7 · ZeroDev Kernel v3 · Pimlico       │
└─────────────────────────────────────────────────────┘
```

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
├── server/          # Rust backend (Axum + SQLite + sqlx)
│   ├── src/
│   │   ├── routes/  # auth, account, session_key, intent, recovery
│   │   ├── models/  # DB row types + request/response types
│   │   ├── middleware/  # JWT auth extractor + rate limiter
│   │   └── chain.rs    # Pimlico bundler adapter
│   ├── migrations/  # SQLite schema
│   └── tests/       # Integration tests (auth, account, security)
├── sdk/             # TypeScript SDK
│   └── src/
│       ├── client.ts       # API client
│       ├── hooks/          # useLogin, useAccount, useSendIntent
│       └── provider.tsx    # React context provider
├── docs/agents/     # AI agent governance system
│   ├── AGENTS.md    # Master orchestration doc (read first)
│   ├── STACK.md     # Full stack diagram
│   └── ...
└── .github/workflows/ci.yml
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login / register (email or wallet) |
| POST | `/auth/refresh` | — | Refresh JWT token |
| POST | `/account/create` | JWT | Create ERC-4337 smart account |
| GET | `/account/:id` | JWT | Fetch account details |
| POST | `/session-key/issue` | JWT | Issue scoped session key |
| POST | `/intent/execute` | — | Submit signed UserOperation |
| GET | `/intent/:id/status` | — | Poll intent status |
| POST | `/recovery/initiate` | — | Initiate account recovery |
| GET | `/health` | — | Health check |

---

## Contributing

All development happens on the `dev` branch. PRs into `main` require CI to be fully green.

See [`docs/agents/AGENTS.md`](docs/agents/AGENTS.md) for the full agent governance system.

---

## Security

Server never handles, receives, or stores private keys. See [`docs/agents/audit/COMPLIANCE.md`](docs/agents/audit/COMPLIANCE.md) for the full non-custodial constraint specification.

To report a security issue, open a GitHub issue marked `[SECURITY]`.

---

## License

MIT
