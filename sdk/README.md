# @ghostkey/sdk

[![npm](https://img.shields.io/npm/v/@ghostkey/sdk)](https://www.npmjs.com/package/@ghostkey/sdk)

GhostKey wallet abstraction SDK — React hooks for non-custodial ERC-4337 smart accounts with server-scoped session keys. Private keys and session-key material never leave the client; the server never has custody of funds.

## Install

```bash
npm install @ghostkey/sdk
```

Requires a running GhostKey server. See [deployment.md](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/deployment.md) to self-host, or point `apiUrl` at a hosted instance.

## Quick start

```tsx
import { GhostKeyProvider, useLogin, useAccount, useSessionKey, useSendIntent } from '@ghostkey/sdk'

function App() {
  return (
    <GhostKeyProvider config={{ apiUrl: 'https://your-ghostkey-server.example.com', chainId: 84532 }}>
      <Demo />
    </GhostKeyProvider>
  )
}

function Demo() {
  const { login, status: authStatus } = useLogin()
  const { createAccount, account } = useAccount()
  const { issueSessionKey, sessionKey } = useSessionKey()
  const { sendIntentWithSessionKey, txHash } = useSendIntent()

  if (authStatus !== 'authenticated') {
    return <button onClick={() => login('email', 'demo@example.com')}>Login</button>
  }
  if (!account) {
    return <button onClick={() => createAccount('0xYourAddress')}>Create Account</button>
  }
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

## Hooks

| Hook | Purpose |
|------|---------|
| `useLogin` | Email-based auth; JWT held in memory only, never persisted |
| `useAccount` | Create/fetch a counterfactual smart account |
| `useSessionKey` | Issue scoped session keys (target/selector/value/TTL limits); private key stays client-side |
| `useSendIntent` | Submit an on-chain intent and poll until confirmed/failed |
| `useRecovery` | Initiate smart account recovery |

Supported chains: Base Mainnet (`8453`), Base Sepolia (`84532`), Arbitrum One (`42161`), Ethereum Mainnet (`1`).

Full hook reference (types, error codes, options): [docs/sdk/hooks.md](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/sdk/hooks.md)

## Docs

- [Quickstart](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/quickstart.md)
- [Hook reference](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/sdk/hooks.md)
- [API reference](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/api/endpoints.md)
- [Security model](https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/security-model.md)

## License

MIT © GhostKey
