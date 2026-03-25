# GhostKey — Test Specifications

**Maintained by:** QA Engineer
**Last Verified:** 2026-03-24
**Chain:** Base (mainnet 8453 / Sepolia 84532 for CI)

These are behavioral specifications — the scenarios that must pass for GhostKey to be correct.
They are written before code exists so engineers build against them.
Actual test code (Rust `#[test]`, `vitest`, `forge test`) implements these specs.

---

## How to Read This Document

Each spec follows:
```
SPEC-NNN: [Name]
  GIVEN:   [system state before the action]
  WHEN:    [the action taken]
  THEN:    [what must be true after]
  ERRORS:  [what bad inputs must produce]
  OWNER:   [which test file implements this]
```

---

## 1. Authentication

### SPEC-001: Successful Login (new user)
```
GIVEN:  no user exists with this identity
WHEN:   POST /auth/login { method: "email", credential: "valid@email.com" }
THEN:   - HTTP 201
        - response contains { user_id, token, expires_at }
        - token is a valid JWT signed with JWT_SECRET
        - user record created in DB
        - token expires_at is ~1 hour from now
OWNER:  server/tests/auth.rs
```

### SPEC-002: Successful Login (returning user)
```
GIVEN:  user exists with this identity
WHEN:   POST /auth/login { method: "email", credential: "valid@email.com" }
THEN:   - HTTP 200
        - response contains { user_id, token, expires_at }
        - same user_id as existing user
        - new token issued (not the same as old token)
OWNER:  server/tests/auth.rs
```

### SPEC-003: Token Refresh
```
GIVEN:  a valid, non-expired token
WHEN:   POST /auth/refresh { token: <valid_token> }
THEN:   - HTTP 200
        - new token issued with fresh expiry
        - old token is invalidated
OWNER:  server/tests/auth.rs
```

### SPEC-004: Expired Token Rejected
```
GIVEN:  a token past its expires_at
WHEN:   POST /auth/refresh { token: <expired_token> }
THEN:   - HTTP 401
        - body: { error: "token_expired" }
OWNER:  server/tests/auth.rs
```

### SPEC-005: Malformed Token Rejected
```
GIVEN:  any endpoint requiring auth
WHEN:   request with Authorization: Bearer <tampered_or_random_string>
THEN:   - HTTP 401
        - body: { error: "invalid_token" }
OWNER:  server/tests/auth.rs
```

### SPEC-006: Rate Limiting on Login
```
GIVEN:  same IP makes 10 login attempts within 60 seconds
WHEN:   11th login attempt
THEN:   - HTTP 429
        - Retry-After header present
        - body: { error: "rate_limited" }
OWNER:  server/tests/auth.rs
```

### SPEC-007: No Private Key in Request or Response
```
GIVEN:  any auth endpoint
WHEN:   any valid or invalid request
THEN:   - no field named: private_key, secret_key, mnemonic, seed_phrase
        - no field matching pattern /0x[0-9a-fA-F]{64}/  (32-byte hex) in response
SECURITY: this spec is also a security gate — fails = merge block
OWNER:  server/tests/auth.rs + security scan
```

---

## 2. Account Management

### SPEC-010: Create Smart Account (first time)
```
GIVEN:  authenticated user (valid token), no existing account on Base
WHEN:   POST /account/create { chain: "base" }
THEN:   - HTTP 201
        - response contains { account_id, address, chain: "base", aa_type: "kernel" }
        - address is a valid EVM address (0x + 40 hex chars)
        - account record created in DB
        - account is NOT yet deployed on-chain (counterfactual address)
OWNER:  server/tests/account.rs
```

### SPEC-011: Fetch Existing Account
```
GIVEN:  account exists in DB for this user
WHEN:   GET /account/:id  (with valid auth token for this user)
THEN:   - HTTP 200
        - response contains { account_id, address, chain, aa_type, created_at }
OWNER:  server/tests/account.rs
```

### SPEC-012: Cannot Fetch Another User's Account
```
GIVEN:  account belongs to user A
WHEN:   GET /account/:id  with auth token for user B
THEN:   - HTTP 403
        - body: { error: "forbidden" }
OWNER:  server/tests/account.rs
```

### SPEC-013: Duplicate Account Creation Idempotent
```
GIVEN:  account already exists for user on Base
WHEN:   POST /account/create { chain: "base" }
THEN:   - HTTP 200 (not 201)
        - returns existing account — same address, same account_id
        - no duplicate record created in DB
OWNER:  server/tests/account.rs
```

---

## 3. Session Keys

### SPEC-020: Issue Session Key
```
GIVEN:  authenticated user with a smart account
WHEN:   POST /session-key/issue {
          account_id,
          allowed_targets: ["0x..."],
          allowed_selectors: ["0xabcd1234"],
          max_value_wei: "1000000000000000",
          ttl_seconds: 3600
        }
THEN:   - HTTP 201
        - response contains { session_id, key_hash, expires_at }
        - key_hash is SHA256 of the session key (NOT the key itself)
        - session record created in DB
        - expires_at = now + ttl_seconds
SECURITY: response must NOT contain the raw session key — only the hash
OWNER:  server/tests/session_key.rs
```

### SPEC-021: Session Key Scope Enforced (server-side validation)
```
GIVEN:  session key issued with allowed_targets: ["0xAAAA..."]
WHEN:   intent submitted targeting "0xBBBB..."
THEN:   - HTTP 403
        - body: { error: "intent_out_of_scope" }
OWNER:  server/tests/session_key.rs
```

### SPEC-022: Expired Session Key Rejected
```
GIVEN:  session key with expires_at in the past
WHEN:   POST /intent/execute using this session
THEN:   - HTTP 401
        - body: { error: "session_expired" }
OWNER:  server/tests/session_key.rs
```

### SPEC-023: Session Key Max Value Enforced
```
GIVEN:  session key with max_value_wei: "1000000000000000" (0.001 ETH)
WHEN:   intent submitted with value: "2000000000000000" (0.002 ETH)
THEN:   - HTTP 403
        - body: { error: "value_exceeds_session_limit" }
OWNER:  server/tests/session_key.rs
```

---

## 4. Intent Execution

### SPEC-030: Submit Valid Intent
```
GIVEN:  authenticated user, valid session key, target in allowed_targets
WHEN:   POST /intent/execute {
          session_id,
          target: "0x...",
          calldata: "0x...",
          value: "0"
        }
THEN:   - HTTP 202 (accepted, not yet confirmed)
        - response contains { intent_id, status: "pending" }
        - intent record created in DB with status "pending"
OWNER:  server/tests/intent.rs
```

### SPEC-031: Poll Intent Status — Pending
```
GIVEN:  intent submitted, not yet confirmed on-chain
WHEN:   GET /intent/:id/status
THEN:   - HTTP 200
        - body: { intent_id, status: "pending", tx_hash: null }
OWNER:  server/tests/intent.rs
```

### SPEC-032: Poll Intent Status — Confirmed
```
GIVEN:  intent confirmed on Base
WHEN:   GET /intent/:id/status
THEN:   - HTTP 200
        - body: { intent_id, status: "confirmed", tx_hash: "0x...", block_number: N }
OWNER:  server/tests/intent.rs (integration, requires Base Sepolia)
```

### SPEC-033: Poll Intent Status — Failed
```
GIVEN:  intent submitted but reverted on-chain
WHEN:   GET /intent/:id/status
THEN:   - HTTP 200
        - body: { intent_id, status: "failed", reason: "execution_reverted" }
OWNER:  server/tests/intent.rs
```

### SPEC-034: Intent with Malformed Calldata Rejected
```
GIVEN:  valid session, but calldata is not valid hex
WHEN:   POST /intent/execute { calldata: "not_hex_data" }
THEN:   - HTTP 400
        - body: { error: "invalid_calldata" }
OWNER:  server/tests/intent.rs
```

### SPEC-035: Intent Rate Limiting
```
GIVEN:  same account submits 10 intents within 60 seconds (limit: 10/60s per user)
WHEN:   11th intent submission
THEN:   - HTTP 429
        - body: { error: "rate_limited" }
        - Retry-After: 60 header present
OWNER:  server/tests/intent.rs
```

---

## 5. Recovery

### SPEC-040: Initiate Recovery Flow
```
GIVEN:  user cannot authenticate (lost credentials)
WHEN:   POST /recovery/initiate { account_address: "0x..." }
THEN:   - HTTP 202
        - response contains { recovery_id, method, instructions }
        - recovery record created with status "initiated"
        - recovery does NOT grant server key access
OWNER:  server/tests/recovery.rs
```

---

## 6. SDK Behavioral Specs (TypeScript)

### SPEC-100: useLogin — Happy Path
```
GIVEN:  GhostKeyProvider configured with valid apiUrl
WHEN:   login({ method: "email", credential: "user@email.com" }) called
THEN:   - POST /auth/login called with correct body
        - token stored in memory (not localStorage by default)
        - hook state: { status: "authenticated", userId: "..." }
        - private key never sent to any network request
OWNER:  sdk/tests/useLogin.test.ts
```

### SPEC-101: useLogin — Network Error
```
GIVEN:  backend unreachable
WHEN:   login() called
THEN:   - hook state: { status: "error", error: { code: "network_error" } }
        - no unhandled promise rejection
OWNER:  sdk/tests/useLogin.test.ts
```

### SPEC-102: useSendIntent — Requires Auth
```
GIVEN:  user not authenticated
WHEN:   sendIntent({ target, calldata }) called
THEN:   - returns { error: { code: "not_authenticated" } }
        - no network request made
OWNER:  sdk/tests/useSendIntent.test.ts
```

### SPEC-103: useSendIntent — Full Flow
```
GIVEN:  authenticated user, valid session key
WHEN:   sendIntent({ target: "0x...", calldata: "0x..." }) called
THEN:   - POST /intent/execute called
        - polls GET /intent/:id/status until confirmed or failed
        - returns { txHash, status: "confirmed" } on success
        - private key never in any outbound request
OWNER:  sdk/tests/useSendIntent.test.ts
```

---

## 7. Security Specs (cross-cutting)

These run against every endpoint, every release.

### SPEC-200: No Private Key Leakage (all endpoints)
```
GIVEN:  any endpoint
WHEN:   any request/response cycle
THEN:   no value matching /0x[0-9a-fA-F]{64}/ in any response body
        no field named private_key, secret, mnemonic, seed in any response
OWNER:  server/tests/security.rs (parameterized over all routes)
```

### SPEC-201: SQL Injection — All String Inputs
```
GIVEN:  any endpoint accepting string input
WHEN:   input is: "'; DROP TABLE users; --"
THEN:   - HTTP 400 or graceful rejection
        - database unaffected
        - no SQL error message in response body
OWNER:  server/tests/security.rs
```

### SPEC-202: Oversized Payload Rejected
```
GIVEN:  any endpoint
WHEN:   request body > 1MB
THEN:   - HTTP 413
        - body: { error: "payload_too_large" }
OWNER:  server/tests/security.rs
```

### SPEC-203: Unexpected HTTP Method Rejected
```
GIVEN:  POST /auth/login is the valid method
WHEN:   PUT /auth/login or DELETE /auth/login
THEN:   - HTTP 405
        - Allow header present with valid methods
OWNER:  server/tests/security.rs
```

---

## 8. End-to-End Scenarios

### E2E-001: Full Developer Integration Flow
```
GIVEN:  fresh ghostkey-server instance (empty DB), Base Sepolia configured
WHEN:   developer follows quickstart:
        1. POST /auth/login
        2. POST /account/create
        3. POST /session-key/issue
        4. POST /intent/execute (simple ETH transfer on Sepolia)
        5. GET /intent/:id/status (poll until confirmed)
THEN:   - all steps return success
        - transaction confirmed on Base Sepolia
        - total flow completes in < 60 seconds
OWNER:  tests/e2e/full_flow.sh (or playwright)
```

### E2E-002: Session Expiry and Renewal
```
GIVEN:  authenticated user, session key with 5 second TTL
WHEN:   wait 6 seconds, then attempt intent execution
THEN:   - intent rejected with session_expired
        - user can issue new session key and retry successfully
OWNER:  tests/e2e/session_expiry.sh
```

---

## Coverage Requirements

| Layer          | Tool             | Minimum | Gate    |
|----------------|------------------|---------|---------|
| Rust backend   | cargo-tarpaulin  | 80%     | CI fail |
| TypeScript SDK | vitest coverage  | 80%     | CI fail |
| Contracts      | forge coverage   | 90%     | CI fail |
| E2E scenarios  | all specs above  | 100%    | CI fail |
