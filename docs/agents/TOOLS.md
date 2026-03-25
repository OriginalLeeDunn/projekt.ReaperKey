# GhostKey — Agent Tooling Reference

**Maintained by:** DevOps Agent + Governor
**Last Verified:** 2026-03-24

Every agent in the corp uses tools from this reference.
When an agent says "run the linter" or "audit deps" — the exact command is here.
All commands assume you are at the repo root.

---

## Repo Structure (target — Phase 1)

```
ghostkey/
├── server/          ← Rust backend (Cargo workspace member)
│   ├── src/
│   ├── tests/
│   └── Cargo.toml
├── sdk/             ← TypeScript SDK
│   ├── src/
│   ├── tests/
│   └── package.json
├── contracts/       ← Foundry project (if custom contracts needed)
│   ├── src/
│   ├── test/
│   └── foundry.toml
├── app/             ← Reference demo app
├── docs/            ← Source of truth (this directory)
├── Cargo.toml       ← Workspace root
├── Makefile         ← Common dev commands
└── config.toml.example
```

---

## Makefile Targets (canonical dev commands)

| Command            | What it does                                      | Who uses it        |
|--------------------|---------------------------------------------------|--------------------|
| `make dev`         | Start full local stack (server + app, hot reload) | All engineers      |
| `make build`       | Build Rust release binary                         | DevOps, Backend    |
| `make test`        | Run all tests (Rust + TS + contracts)             | QA, DevOps         |
| `make test-rust`   | Rust unit + integration tests only                | Backend Engineer   |
| `make test-sdk`    | TypeScript tests only                             | SDK Engineer       |
| `make test-contracts` | Foundry tests only                             | Contract Engineer  |
| `make lint`        | Rust clippy + fmt check + TS eslint + tsc         | All engineers      |
| `make audit`       | cargo audit + npm audit                           | Dep Scanner        |
| `make coverage`    | Generate coverage report (Rust + TS)              | QA Engineer        |
| `make migrate`     | Run SQLite migrations                             | Backend Engineer   |
| `make release`     | Build + sign + package release binaries           | DevOps             |

---

## Backend Tools (Rust)

### Build & Run
```bash
cargo build                          # debug build
cargo build --release                # release binary → target/release/ghostkey-server
cargo run -- --config config.toml   # run server locally
```

### Testing
```bash
cargo test                           # all unit + integration tests
cargo test --test integration        # integration tests only
cargo test auth::                    # tests matching pattern
cargo test -- --nocapture            # show println output
```

### Coverage
```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage/
# threshold: 80% — anything below blocks CI
```

### Linting
```bash
cargo fmt --check           # format check (CI gate)
cargo fmt                   # auto-format
cargo clippy -- -D warnings # lint (CI gate — warnings are errors)
```

### Dependency Audit
```bash
cargo install cargo-audit
cargo audit                 # check Cargo.lock for CVEs
cargo audit --deny warnings # CI gate — any advisory fails build
```

### Outdated Deps
```bash
cargo install cargo-outdated
cargo outdated              # list outdated crates (informational, not a gate)
```

---

## SDK Tools (TypeScript)

### Build
```bash
cd sdk/
npm install
npm run build        # tsup — produces dist/
npm run typecheck    # tsc --noEmit (CI gate)
```

### Testing
```bash
npm test             # vitest run
npm run test:watch   # vitest watch mode (dev)
npm run test:coverage # vitest --coverage (CI gate — 80%)
```

### Linting
```bash
npm run lint         # eslint (CI gate)
npm run lint:fix     # eslint --fix
```

### Dependency Audit
```bash
npm audit                    # check for CVEs
npm audit --audit-level high # CI gate — HIGH+ fails build
```

---

## Contract Tools (Foundry)

### Setup
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Build & Test
```bash
cd contracts/
forge build
forge test                              # all tests
forge test -vvv                         # verbose (shows traces)
forge test --match-test testSessionKey  # specific test
forge test --fork-url $BASE_RPC_URL     # fork mainnet Base
forge test --fork-url $BASE_SEPOLIA_RPC_URL  # fork testnet
```

### Fuzz Testing
```bash
forge test --fuzz-runs 10000   # increase fuzz iterations for security-critical code
```

### Static Analysis
```bash
pip install slither-analyzer
slither contracts/src/         # static analysis
slither contracts/src/ --json slither-report.json  # for audit reports
```

### Local Chain (dev)
```bash
anvil                                  # local EVM (default port 8545)
anvil --fork-url $BASE_RPC_URL         # fork Base mainnet locally
cast send --rpc-url http://localhost:8545 ...  # interact with local chain
```

---

## Chain Interaction (cast)

```bash
# Check EntryPoint on Base
cast call 0x0000000071727De22E5E9d8BAf0edAc6f37da032 \
  "getNonce(address,uint192)" \
  <account_address> 0 \
  --rpc-url $BASE_RPC_URL

# Check account balance
cast balance <address> --rpc-url $BASE_RPC_URL --ether

# Get latest block
cast block-number --rpc-url $BASE_RPC_URL
```

---

## Environment Variables

All secrets via env vars. Never in config files committed to git.

| Variable               | Required | Used By        | Description                       |
|------------------------|----------|----------------|-----------------------------------|
| `BASE_RPC_URL`         | yes      | Backend, Tests | Base mainnet RPC endpoint         |
| `BASE_SEPOLIA_RPC_URL` | dev/CI   | Tests          | Base Sepolia testnet RPC          |
| `BASE_BUNDLER_URL`     | yes      | Backend        | Pimlico bundler endpoint          |
| `BASE_PAYMASTER_URL`   | yes      | Backend        | Pimlico paymaster endpoint        |
| `JWT_SECRET`           | yes      | Backend        | Auth token signing secret (≥32 chars)|
| `DATABASE_URL`         | no       | Backend        | SQLite path (default: ./ghostkey.db)|

### .env.example (committed to repo)
```bash
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_BUNDLER_URL=https://api.pimlico.io/v2/8453/rpc?apikey=YOUR_KEY
BASE_PAYMASTER_URL=https://api.pimlico.io/v2/8453/rpc?apikey=YOUR_KEY
JWT_SECRET=change-me-to-a-32-char-minimum-secret
DATABASE_URL=./ghostkey.db
```

---

## CI Tool Matrix (GitHub Actions)

| Step               | Tool            | Trigger       | Fails Build On          |
|--------------------|-----------------|---------------|-------------------------|
| Rust format check  | cargo fmt       | all PRs       | any format diff         |
| Rust lint          | cargo clippy    | all PRs       | any warning             |
| Rust tests         | cargo test      | all PRs       | any test failure        |
| Rust coverage      | cargo tarpaulin | all PRs       | below 80%               |
| Rust audit         | cargo audit     | all PRs       | any advisory            |
| TS typecheck       | tsc             | all PRs       | any type error          |
| TS lint            | eslint          | all PRs       | any lint error          |
| TS tests           | vitest          | all PRs       | any test failure        |
| TS coverage        | vitest coverage | all PRs       | below 80%               |
| TS audit           | npm audit       | all PRs       | HIGH or CRITICAL CVE    |
| Contract build     | forge build     | all PRs       | any compile error       |
| Contract tests     | forge test      | all PRs       | any test failure        |
| Contract analysis  | slither         | security PRs  | HIGH or CRITICAL finding|
| E2E tests          | curl/playwright | merge to main | any scenario failure    |
