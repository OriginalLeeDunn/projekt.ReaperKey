# GhostKey — Full Stack Diagram

Live topology, data flows, and component ownership.
Updated by: Architect Agent + DevOps Agent

---

## Full Stack Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         CONSUMER LAYER                                  ║
║                                                                          ║
║   Web App / Game / SaaS                                                  ║
║   └── TypeScript SDK (npm: @ghostkey/sdk)                               ║
║        ├── useLogin()          → session auth flow                       ║
║        ├── useAccount()        → smart account fetch/create              ║
║        ├── useSendIntent()     → intent dispatch                         ║
║        └── <GhostKeyProvider> → context wrapper                         ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║ HTTPS / WebSocket
╔══════════════════════════════╩═══════════════════════════════════════════╗
║                         API GATEWAY LAYER                               ║
║                                                                          ║
║  Rust HTTP Service (single binary)                                       ║
║  ├── POST /auth/login            → session creation                      ║
║  ├── POST /auth/refresh          → session renewal                       ║
║  ├── GET  /account/:id           → account fetch                         ║
║  ├── POST /account/create        → smart account provisioning            ║
║  ├── POST /session-key/issue     → session key generation               ║
║  ├── POST /intent/execute        → intent submission + routing           ║
║  ├── GET  /intent/:id/status     → execution status                      ║
║  └── POST /recovery/init         → recovery flow initiation              ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║
         ┌─────────────────────┼──────────────────────┐
         ▼                     ▼                       ▼
╔════════════════╗  ╔══════════════════╗  ╔═══════════════════════╗
║  SESSION &     ║  ║  INTENT ENGINE   ║  ║  SMART ACCOUNT        ║
║  AUTH MODULE   ║  ║                  ║  ║  ABSTRACTION          ║
║                ║  ║ - parse intent   ║  ║                       ║
║ - short-lived  ║  ║ - route to chain ║  ║ - ERC-4337 accounts   ║
║   JWT tokens   ║  ║ - gas estimate   ║  ║ - session key mgmt    ║
║ - session key  ║  ║ - submit UserOp  ║  ║ - key client-side     ║
║   issuance     ║  ║ - status poll    ║  ║ - recovery metadata   ║
╚════════════════╝  ╚══════════════════╝  ╚═══════════════════════╝
         │                     │                       │
         └─────────────────────┼───────────────────────┘
                               ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         DATA LAYER                                       ║
║                                                                          ║
║  SQLite (self-hosted default)                                            ║
║  ├── users          { id, auth_method, created_at }                     ║
║  ├── accounts       { id, user_id, chain, address, aa_type }            ║
║  ├── sessions       { id, account_id, key_hash, expires_at }            ║
║  ├── intents        { id, session_id, chain, calldata, status }         ║
║  ├── chains         { id, name, rpc_url, aa_factory, paymaster }        ║
║  └── recovery       { id, account_id, method, metadata }                ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║
         │
         ▼
╔══════════════════════════════════════════════════════════════════╗
║  BASE MAINNET (v0 — sole supported chain)                        ║
║                                                                  ║
║  Chain ID:       8453                                            ║
║  RPC:            https://mainnet.base.org  (BASE_RPC_URL)        ║
║  EntryPoint:     0x0000000071727De22E5E9d8BAf0edAc6f37da032     ║
║  AA Framework:   ZeroDev Kernel v3  (session key native)         ║
║  Bundler:        Pimlico             (BASE_BUNDLER_URL)           ║
║  Paymaster:      Pimlico             (BASE_PAYMASTER_URL)         ║
║  Explorer:       https://basescan.org                            ║
║                                                                  ║
║  DEV / CI:                                                       ║
║  Base Sepolia    Chain ID 84532      (BASE_SEPOLIA_RPC_URL)      ║
╚══════════════════════════════════════════════════════════════════╝

  Additional chains: config-driven. Add a new [chains.X] block in
  config.toml — no code changes required.
```

---

## AI Agent Overlay (Operational Mode)

```
GhostKey Runtime
│
├── [Monitor Agent]      watches → API logs, error rates, intent failures
│                        alerts → latency spikes, auth anomalies
│
├── [Security Agent]     scans  → every PR for OWASP top 10, key leaks
│                        blocks → merges that violate non-custodial rules
│
├── [Audit Agent]        logs   → all decisions to DECISIONS.md
│                        verifies → non-custodial constraints post-deploy
│
├── [Dependency Agent]   watches → Cargo.lock, package-lock.json
│                        flags  → CVEs in deps, outdated crates
│
└── [Docs Agent]         syncs  → API changes → docs/
                         generates → quickstart, changelog
```

---

## Security Boundaries

```
CLIENT                    SERVER                    CHAIN
  │                          │                        │
  │── private key (NEVER ──►│                        │
  │   leaves client)         │                        │
  │                          │                        │
  │◄─ session key ──────────│                        │
  │   (short-lived, scoped)  │                        │
  │                          │                        │
  │── signed UserOp ────────►│── bundler submission ─►│
  │                          │   (no key held here)   │
  │                          │                        │
  │◄─ tx hash / status ─────│◄── confirmation ───────│
```

**Key rule:** The server routes and manages sessions. It never holds private keys.

---

## Deployment Topology

```
SELF-HOSTED (default)
┌──────────────────────────┐
│  Developer Machine /     │
│  VPS / Container         │
│                          │
│  ghostkey-server binary  │
│  └── ./config.toml       │
│  └── ghostkey.db         │
│  └── PORT 8080           │
└──────────────────────────┘

HOSTED (optional SaaS)
┌──────────────────────────┐
│  ghostkey.cloud          │
│                          │
│  Load balancer           │
│  └── Rust service fleet  │
│       └── Postgres (prod)│
│  └── Monitoring stack    │
└──────────────────────────┘
```

---

## Pertinent Data at a Glance

| Signal                  | Source               | Owner Agent    | Alert Threshold       |
|-------------------------|----------------------|----------------|-----------------------|
| Intent success rate     | intent logs          | Monitor Agent  | < 95%                 |
| Session expiry rate     | session table        | Monitor Agent  | > 10% early expiry    |
| Auth failure rate       | auth logs            | Security Agent | > 5% in 5min window   |
| RPC error rate          | chain adapter logs   | Monitor Agent  | > 2% per chain        |
| Dep CVE count           | Cargo.lock/lockfile  | Dep Scanner    | Any CRITICAL/HIGH     |
| Non-custodial violations| code scan            | Security Agent | Any (block merge)     |
| Test coverage           | CI output            | QA Agent       | < 80%                 |
| Build time              | CI metrics           | DevOps Agent   | > 5min (flag)         |
