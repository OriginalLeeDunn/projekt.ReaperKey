# GhostKey API Reference

Base URL: configured via `GHOSTKEY__SERVER__HOST` and `GHOSTKEY__SERVER__PORT` (default `http://localhost:8080`)

All endpoints return JSON. Authenticated endpoints require `Authorization: Bearer <token>`.

---

## Authentication

### POST /auth/login

Authenticate a user and receive a JWT.

**Request**

```json
{
  "method": "email",
  "credential": "user@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | yes | Authentication method. Currently: `"email"` |
| `credential` | string | yes | Email address |

**Response — 201 Created**

```json
{
  "token": "eyJ...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2026-03-26T14:00:00Z"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 400 | `invalid_request` | Missing or malformed fields |
| 429 | `rate_limited` | Rate limit exceeded (10/60s per IP) |

---

### POST /auth/refresh

Refresh a JWT before it expires.

**Headers:** `Authorization: Bearer <token>`

**Response — 200 OK**

```json
{
  "token": "eyJ...",
  "expires_at": "2026-03-26T15:00:00Z"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 401 | `unauthorized` | Missing or invalid JWT |
| 429 | `rate_limited` | Rate limit exceeded |

---

### POST /auth/logout

Invalidate the current JWT. The token's SHA-256 hash is recorded in the `token_denylist` table; any subsequent request bearing the same token is rejected with `401 unauthorized`.

**Headers:** `Authorization: Bearer <token>`

**Response — 200 OK**

```json
{
  "message": "logged out"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 401 | `unauthorized` | Missing or invalid JWT |
| 429 | `rate_limited` | Rate limit exceeded |

---

## Accounts

### POST /account/create

Create a smart account record.

The address is computed client-side (counterfactual). The server validates format only; it does not generate or derive keys.

**Headers:** `Authorization: Bearer <token>`

**Request**

```json
{
  "chain": "base",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chain` | string | yes | Chain identifier. Supported values: `"base"` (default), `"arbitrum"`, `"ethereum"` |
| `address` | string | yes | EIP-55 checksummed address |

**Response — 201 Created**

```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chain": "base",
  "aa_type": "kernel",
  "created_at": "2026-03-26T13:00:00Z"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 400 | `invalid_address` | Address is not a valid EIP-55 checksummed address |
| 400 | `unsupported_chain` | Chain is not supported |
| 401 | `unauthorized` | Missing or invalid JWT |

---

### GET /account/:id

Fetch an account by ID.

**Headers:** `Authorization: Bearer <token>`

**Response — 200 OK**

```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chain": "base",
  "aa_type": "kernel",
  "created_at": "2026-03-26T13:00:00Z"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 401 | `unauthorized` | Missing or invalid JWT |
| 403 | `forbidden` | Account belongs to another user |
| 404 | `not_found` | Account ID does not exist |

---

## Session Keys

### POST /session-key/issue

Issue a session key for a smart account.

Session keys are generated client-side. Only the `key_hash` (SHA-256 of the private key) is sent to the server. The private key never leaves the client.

**Headers:** `Authorization: Bearer <token>`

**Request**

```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "key_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "allowed_targets": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
  "allowed_selectors": ["0xa9059cbb"],
  "max_value_wei": "1000000000000000000",
  "ttl_seconds": 3600
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | UUID string | yes | Account to scope this key to |
| `key_hash` | string (64 hex chars) | yes | SHA-256 of the client-generated session private key |
| `allowed_targets` | string[] | yes | Contract addresses this key may call |
| `allowed_selectors` | string[] | yes | 4-byte function selectors this key may use (e.g. `"0xa9059cbb"`) |
| `max_value_wei` | string | yes | Maximum ETH value per intent (as decimal string) |
| `ttl_seconds` | integer | yes | Session lifetime in seconds |

**Response — 201 Created**

```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "expires_at": "2026-03-26T14:00:00Z"
}
```

Note: The raw session key is **never** returned in the response.

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 400 | `invalid_key_hash` | `key_hash` is not 64 hex characters |
| 401 | `unauthorized` | Missing or invalid JWT |
| 403 | `forbidden` | Account belongs to another user |
| 404 | `not_found` | Account ID does not exist |

---

## Intents

### POST /intent/execute

Submit an intent for on-chain execution.

Returns immediately with `202 Accepted`. The background task sponsors the UserOperation via Pimlico, submits it to the bundler, and polls for the receipt. Poll `GET /intent/:id/status` for the result.

**Headers:** `Authorization: Bearer <token>`

**Request**

```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "target": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "calldata": "0xa9059cbb000000000000000000000000...",
  "value": "0",
  "user_operation": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | UUID string | yes | Active session key ID |
| `target` | string | yes | Contract address to call |
| `calldata` | string | yes | ABI-encoded calldata (hex with `0x` prefix) |
| `value` | string | yes | ETH value in wei (decimal string) |
| `user_operation` | object | yes | Partial UserOperation fields (can be `{}`) |

**Response — 202 Accepted**

```json
{
  "intent_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "pending"
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 400 | `invalid_calldata` | Calldata is not valid hex |
| 401 | `unauthorized` | Missing or invalid JWT |
| 401 | `session_expired` | Session key has expired |
| 403 | `intent_out_of_scope` | Target not in session `allowed_targets` |
| 403 | `intent_out_of_scope` | Selector not in session `allowed_selectors` |
| 403 | `value_exceeds_session_limit` | Value exceeds session `max_value_wei` |
| 404 | `not_found` | Session ID does not exist |
| 429 | `rate_limited` | Rate limit exceeded (10 intents/60s per user) |

---

### GET /intent/:id/status

Poll the status of a submitted intent.

**Headers:** `Authorization: Bearer <token>`

**Response — 200 OK (pending)**

```json
{
  "intent_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "pending",
  "tx_hash": null,
  "block_number": null
}
```

**Response — 200 OK (confirmed)**

```json
{
  "intent_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "confirmed",
  "tx_hash": "0xabcdef...",
  "block_number": 12345
}
```

**Response — 200 OK (failed)**

```json
{
  "intent_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "failed",
  "tx_hash": null,
  "block_number": null,
  "reason": "execution_reverted"
}
```

Possible `status` values: `pending`, `confirmed`, `failed`

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 401 | `unauthorized` | Missing or invalid JWT |
| 403 | `forbidden` | Intent belongs to another user |
| 404 | `not_found` | Intent ID does not exist |

---

## Recovery

### POST /recovery/initiate

Initiate account recovery.

**Headers:** `Authorization: Bearer <token>`

**Request**

```json
{
  "account_address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

**Response — 201 Created**

```json
{
  "recovery_id": "880e8400-e29b-41d4-a716-446655440003",
  "method": "social",
  "status": "initiated",
  "instructions": "Complete recovery using your registered social recovery contacts."
}
```

**Errors**

| Status | `error` | Description |
|--------|---------|-------------|
| 401 | `unauthorized` | Missing or invalid JWT |
| 404 | `not_found` | Account address not found |

---

## Health

### GET /health

Server health check. No authentication required.

**Response — 200 OK (healthy)**

```json
{
  "status": "ok",
  "db": "ok",
  "chains": ["base"],
  "version": "1.0.0"
}
```

**Response — 503 Service Unavailable (degraded)**

```json
{
  "status": "degraded",
  "db": "error",
  "chains": ["base"],
  "version": "1.0.0"
}
```

---

## Common Error Format

All error responses use the same envelope:

```json
{
  "error": "error_code"
}
```

Internal server errors return `{ "error": "internal_error" }` — the cause is logged server-side but never exposed in the API response.
