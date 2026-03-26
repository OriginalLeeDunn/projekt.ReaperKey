# GhostKey SDK — Hook Reference

All hooks must be used inside a `<GhostKeyProvider>`. See the [quickstart](../quickstart.md) for setup.

---

## GhostKeyProvider

Wrap your application root. All hooks share state within a single provider.

```tsx
import { GhostKeyProvider } from '@ghostkey/sdk'

<GhostKeyProvider
  config={{
    apiUrl: 'https://your-server.example.com', // required
    chainId: 84532,                             // required; 8453 = Base Mainnet, 84532 = Base Sepolia
  }}
>
  {children}
</GhostKeyProvider>
```

---

## useLogin

**SPEC-100** — Manages authentication state. The JWT is held in memory only; it is never written to localStorage, sessionStorage, or cookies.

```tsx
const {
  login,      // (method: string, credential: string) => Promise<void>
  logout,     // () => void
  status,     // 'idle' | 'loading' | 'authenticated' | 'error'
  userId,     // string | null
  expiresAt,  // string | null  (ISO 8601)
  error,      // { code: string; message: string } | null
} = useLogin()
```

### `login(method, credential)`

Calls `POST /auth/login`. On success sets `status = 'authenticated'` and stores the token in the client's in-memory store.

```tsx
await login('email', 'user@example.com')
```

### `logout()`

Clears the token from memory. Sets `status = 'idle'`.

```tsx
logout()
```

### Status values

| `status` | Meaning |
|----------|---------|
| `'idle'` | Not authenticated |
| `'loading'` | Login in progress |
| `'authenticated'` | Logged in; `userId` is set |
| `'error'` | Login failed; `error` is set |

---

## useAccount

**SPEC-101** — Create and fetch smart account state.

```tsx
const {
  createAccount,  // (address: string) => Promise<void>
  fetchAccount,   // (accountId: string) => Promise<void>
  account,        // Account | null
  loading,        // boolean
  error,          // { code: string; message: string } | null
} = useAccount()
```

### Account type

```ts
interface Account {
  accountId: string
  address: string
  chain: string
  aaType: string
  createdAt: string
}
```

### `createAccount(address)`

Calls `POST /account/create`. The `address` must be a pre-computed counterfactual address (EIP-55 checksummed). Use `generateCounterfactualAddress()` from the SDK to compute it.

```tsx
const address = await generateCounterfactualAddress()
await createAccount(address)
```

Requires the user to be authenticated. Returns `not_authenticated` error if not.

### `fetchAccount(accountId)`

Calls `GET /account/:id`.

```tsx
await fetchAccount('550e8400-e29b-41d4-a716-446655440000')
```

---

## useSessionKey

**SPEC-102** — Issue and manage session keys. The private key material is generated and stored client-side only.

```tsx
const {
  issueSessionKey,  // (req: SessionKeyRequest) => Promise<void>
  clearSessionKey,  // () => void
  sessionKey,       // SessionKey | null
  loading,          // boolean
  error,            // { code: string; message: string } | null
} = useSessionKey()
```

### SessionKeyRequest type

```ts
interface SessionKeyRequest {
  accountId: string
  keyHash: string          // SHA-256 of the client-generated private key (64 hex chars)
  allowedTargets: string[] // Contract addresses this key may call
  allowedSelectors: string[] // 4-byte selectors (e.g. '0xa9059cbb')
  maxValueWei: string      // Maximum ETH value per intent (decimal string)
  ttlSeconds: number       // Session lifetime in seconds
}
```

### SessionKey type (returned)

```ts
interface SessionKey {
  sessionId: string
  keyHash: string
  expiresAt: string  // ISO 8601
}
```

Note: The private key is **never** in the response. It remains client-side only.

### `issueSessionKey(req)`

Calls `POST /session-key/issue`. Requires authentication.

```tsx
import { generateKeyHash } from '@ghostkey/sdk'

const keyHash = await generateKeyHash() // generates key, returns hash
await issueSessionKey({
  accountId: account.accountId,
  keyHash,
  allowedTargets: ['0xTokenContract'],
  allowedSelectors: ['0xa9059cbb'],
  maxValueWei: '1000000000000000000',
  ttlSeconds: 3600,
})
```

### `clearSessionKey()`

Clears session key from state. Useful on logout or after session expiry.

---

## useSendIntent

**SPEC-103** — Execute on-chain intents and poll for confirmation.

```tsx
const {
  sendIntent,  // (sessionId: string, intent: IntentRequest) => Promise<IntentStatus>
  reset,       // () => void
  intentId,    // string | null
  status,      // 'pending' | 'confirmed' | 'failed' | null
  txHash,      // string | null
  blockNumber, // number | null
  loading,     // boolean
  error,       // { code: string; message: string } | null
} = useSendIntent()
```

### IntentRequest type

```ts
interface IntentRequest {
  target: string    // Contract address to call
  calldata: string  // ABI-encoded calldata (hex with 0x prefix)
  value: string     // ETH value in wei (decimal string), usually '0'
}
```

### `sendIntent(sessionId, intent)`

Calls `POST /intent/execute`, then polls `GET /intent/:id/status` until the intent reaches `confirmed` or `failed`. Returns the final `IntentStatus`.

```tsx
const result = await sendIntent(sessionKey.sessionId, {
  target: '0xTokenContract',
  calldata: encodedTransferCalldata,
  value: '0',
})

if (result.status === 'confirmed') {
  console.log('tx:', result.txHash)
}
```

### IntentStatus type

```ts
interface IntentStatus {
  intentId: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash: string | null
  blockNumber: number | null
  reason?: string  // present when status === 'failed'
}
```

### `reset()`

Clears all intent state (intentId, status, txHash, blockNumber, error).

---

## useRecovery

Initiate smart account recovery.

```tsx
const {
  initiateRecovery,  // (accountAddress: string) => Promise<void>
  reset,             // () => void
  result,            // RecoveryResult | null
  loading,           // boolean
  error,             // { code: string; message: string } | null
} = useRecovery()
```

### RecoveryResult type

```ts
interface RecoveryResult {
  recoveryId: string
  method: string
  status: string
  instructions: string
}
```

### `initiateRecovery(accountAddress)`

Calls `POST /recovery/initiate`.

```tsx
await initiateRecovery('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
```

---

## Error codes

| Code | Source | Description |
|------|--------|-------------|
| `not_authenticated` | hooks | User is not logged in |
| `invalid_token` | useLogin | Login credentials invalid |
| `session_expired` | useSendIntent | Session key has expired |
| `intent_out_of_scope` | useSendIntent | Target or selector not allowed |
| `value_exceeds_session_limit` | useSendIntent | Value exceeds max |
| `rate_limited` | any | Too many requests |
| `network_error` | any | HTTP or network failure |
| `not_found` | any | Resource not found |
| `forbidden` | any | Resource belongs to another user |
