# GhostKey Quickstart

Get from zero to a working smart account with session keys in under 5 minutes.

## Prerequisites

- Node.js 18+
- A running GhostKey server (see [deployment.md](./deployment.md)) or the hosted service URL
- A Base Sepolia or Base Mainnet RPC endpoint

---

## 1. Install the SDK

```bash
npm install @ghostkey/sdk
```

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

```tsx
import { useSendIntent } from '@ghostkey/sdk'

export function SendTransfer({ sessionId }: { sessionId: string }) {
  const { sendIntent, status, txHash, error } = useSendIntent()

  async function handleSend() {
    await sendIntent(sessionId, {
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
  const { sendIntent, txHash } = useSendIntent()

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
    <button onClick={() => sendIntent(sessionKey.sessionId, {
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
2. `POST /account/create` — server records the counterfactual address; no key custody
3. `POST /session-key/issue` — server stores only the SHA-256 hash of the key
4. `POST /intent/execute` — server validates scope, submits to Pimlico, returns 202
5. `GET /intent/:id/status` — SDK polls until `confirmed` or `failed`

No private keys ever leave the client. The server cannot move funds on your behalf.

---

## Next steps

- [API Reference](./api/endpoints.md)
- [SDK Hook Reference](./sdk/hooks.md)
- [Security Model](./security-model.md)
- [Self-hosting](./deployment.md)
