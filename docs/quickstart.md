# GhostKey Quickstart

Get from zero to a working smart account with session keys in under 5 minutes.

## Prerequisites

- Node.js 18+
- A running GhostKey server (see [deployment.md](./deployment.md)) or the hosted service URL
- A Base Sepolia or Base Mainnet RPC endpoint

---

## 1. Install the SDK

```bash
npm install @ghostkey/sdk@1.0.0
```

The v1.0.0 package is published to npm as `@ghostkey/sdk@1.0.0`. A pre-built server binary is also available on the [GitHub releases page](https://github.com/ghostkey/ghostkey/releases/tag/v1.0.0).

**Server database path:** As of v1.0.0 the SQLite database is created at `./db/ghostkey.db` (previously `./ghostkey.db`). Ensure the `db/` directory exists or is writable when self-hosting. To use PostgreSQL instead, set `DATABASE_URL=postgresql://...` (or `GHOSTKEY__DATABASE__URL=postgresql://...`).

---

## 2. Wrap your app with `GhostKeyProvider`

```tsx
import { GhostKeyProvider } from '@ghostkey/sdk'

export function App() {
  return (
    <GhostKeyProvider
      config={{
        apiUrl: 'https://your-ghostkey-server.example.com',
        chainId: 84532, // Base Sepolia; use 8453 for mainnet
      }}
    >
      <YourApp />
    </GhostKeyProvider>
  )
}
```

---

## 3. Authenticate a user

GhostKey supports email-based login. The token is held in memory only — never written to localStorage or cookies.

```tsx
import { useLogin } from '@ghostkey/sdk'

export function LoginButton() {
  const { login, status, error } = useLogin()

  return (
    <button
      onClick={() => login('email', 'user@example.com')}
      disabled={status === 'loading'}
    >
      {status === 'authenticated' ? 'Logged in' : 'Login'}
    </button>
  )
}
```

---

## 4. Create a smart account

```tsx
import { useAccount } from '@ghostkey/sdk'
import { generateCounterfactualAddress } from '@ghostkey/sdk'

export function CreateAccount() {
  const { createAccount, account, error } = useAccount()

  async function handleCreate() {
    // Address is computed client-side; server validates format only
    const address = await generateCounterfactualAddress()
    await createAccount(address)
  }

  if (account) {
    return <p>Account: {account.address} on {account.chain}</p>
  }

  return <button onClick={handleCreate}>Create Smart Account</button>
}
```

---

## 5. Issue a session key

Session keys scope what on-chain actions are permitted. They are generated client-side; only the key hash is sent to the server.

```tsx
import { useSessionKey } from '@ghostkey/sdk'
import { generateKeyHash } from '@ghostkey/sdk'

export function IssueKey({ accountId }: { accountId: string }) {
  const { issueSessionKey, sessionKey } = useSessionKey()

  async function handleIssue() {
    const keyHash = await generateKeyHash()
    await issueSessionKey({
      accountId,
      keyHash,
      allowedTargets: ['0xTokenContractAddress'],
      allowedSelectors: ['0xa9059cbb'], // ERC-20 transfer
      maxValueWei: '1000000000000000000', // 1 ETH
      ttlSeconds: 3600,
    })
  }

  if (sessionKey) {
    return <p>Session active until {sessionKey.expiresAt}</p>
  }

  return <button onClick={handleIssue}>Issue Session Key</button>
}
```

---

## 6. Send an intent

Use `sendIntentWithSessionKey` (v1.0.0+) to let the SDK build the UserOperation automatically (GAP-001). The older `sendIntent` is still available for cases where you construct the UserOperation manually.

```tsx
import { useSendIntent } from '@ghostkey/sdk'

export function SendTransfer({ sessionId }: { sessionId: string }) {
  const { sendIntentWithSessionKey, status, txHash, error } = useSendIntent()

  async function handleSend() {
    await sendIntentWithSessionKey(sessionId, {
      target: '0xTokenContractAddress',
      calldata: '0xa9059cbb...', // encoded ERC-20 transfer
      value: '0',
    })
  }

  if (status === 'confirmed') return <p>Transaction confirmed: {txHash}</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <button onClick={handleSend} disabled={status === 'pending'}>
      Send
    </button>
  )
}
```

The SDK polls `GET /intent/:id/status` automatically and resolves when the transaction is confirmed or failed.

---

## Complete example

A minimal but fully functional flow in one component:

```tsx
import { useLogin, useAccount, useSessionKey, useSendIntent } from '@ghostkey/sdk'

export function Demo() {
  const { login, status: authStatus } = useLogin()
  const { createAccount, account } = useAccount()
  const { issueSessionKey, sessionKey } = useSessionKey()
  const { sendIntentWithSessionKey, txHash } = useSendIntent()

  // Step 1: login
  if (authStatus !== 'authenticated') {
    return <button onClick={() => login('email', 'demo@example.com')}>Login</button>
  }

  // Step 2: account
  if (!account) {
    return <button onClick={() => createAccount('0xYourAddress')}>Create Account</button>
  }

  // Step 3: session key
  if (!sessionKey) {
    return (
      <button onClick={() => issueSessionKey({
        accountId: account.accountId,
        keyHash: 'your-client-generated-hash',
        allowedTargets: ['0xTokenContract'],
        allowedSelectors: ['0xa9059cbb'],
        maxValueWei: '1000000000000000000',
        ttlSeconds: 3600,
      })}>
        Issue Session Key
      </button>
    )
  }

  // Step 4: send
  if (txHash) return <p>Done! tx: {txHash}</p>

  return (
    <button onClick={() => sendIntentWithSessionKey(sessionKey.sessionId, {
      target: '0xTokenContract',
      calldata: '0xa9059cbb...',
      value: '0',
    })}>
      Send Transfer
    </button>
  )
}
```

---

## What happens under the hood

1. `POST /auth/login` — server issues a short-lived JWT (1 hour)
2. `POST /auth/logout` — invalidates the JWT server-side; the token SHA-256 hash is added to the `token_denylist` table
3. `POST /account/create` — server records the counterfactual address; no key custody
4. `POST /session-key/issue` — server stores only the SHA-256 hash of the key
5. `POST /intent/execute` — server validates scope, builds UserOperation (GAP-001), submits to Pimlico, returns 202
6. `GET /intent/:id/status` — SDK polls until `confirmed` or `failed`

No private keys ever leave the client. The server cannot move funds on your behalf.

---

## Next steps

- [API Reference](./api/endpoints.md)
- [SDK Hook Reference](./sdk/hooks.md)
- [Security Model](./security-model.md)
- [Self-hosting](./deployment.md)
