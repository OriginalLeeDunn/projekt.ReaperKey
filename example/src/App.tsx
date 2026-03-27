import React, { useState } from 'react'
import {
  useLogin,
  useAccount,
  useSessionKey,
  useSendIntent,
  generateSessionKey,
} from '@ghostkey/sdk'

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: { maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' } as React.CSSProperties,
  h1: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' } as React.CSSProperties,
  sub: { color: '#888', fontSize: '0.875rem', marginBottom: '2rem' } as React.CSSProperties,
  card: {
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  cardTitle: { fontWeight: 600, marginBottom: '0.75rem', color: '#a0a0a0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties,
  input: {
    flex: 1,
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  btn: (disabled?: boolean, variant?: 'danger' | 'ghost') => ({
    background: disabled ? '#333' : variant === 'danger' ? '#7f1d1d' : variant === 'ghost' ? 'transparent' : '#2563eb',
    border: variant === 'ghost' ? '1px solid #333' : 'none',
    borderRadius: 4,
    color: disabled ? '#666' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    whiteSpace: 'nowrap',
  } as React.CSSProperties),
  badge: (ok: boolean) => ({
    display: 'inline-block',
    background: ok ? '#14532d' : '#1c1c1c',
    border: `1px solid ${ok ? '#166534' : '#333'}`,
    borderRadius: 4,
    color: ok ? '#4ade80' : '#666',
    fontSize: '0.75rem',
    padding: '0.15rem 0.5rem',
    marginLeft: '0.5rem',
  } as React.CSSProperties),
  mono: { fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: '#888' } as React.CSSProperties,
  error: { color: '#f87171', fontSize: '0.8rem', marginTop: '0.5rem' } as React.CSSProperties,
  success: { color: '#4ade80', fontSize: '0.8rem', marginTop: '0.5rem' } as React.CSSProperties,
}

// ── Components ────────────────────────────────────────────────────────────────

function Step({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#166534' : '#222', border: `1px solid ${done ? '#4ade80' : '#333'}`,
        color: done ? '#4ade80' : '#888', fontSize: '0.75rem', fontWeight: 700,
      }}>
        {done ? '✓' : n}
      </span>
      <span style={{ color: done ? '#e0e0e0' : '#666', fontSize: '0.875rem' }}>{title}</span>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth ──
  const { status: authStatus, userId, login, logout, error: loginError } = useLogin()
  const [email, setEmail] = useState('')

  // ── Account ──
  const { account, loading: accLoading, error: accError, createAccount } = useAccount()
  const [ownerAddr, setOwnerAddr] = useState('')

  // ── Session key ──
  const { sessionKey, loading: sessLoading, error: sessError, issueSessionKey } = useSessionKey()
  const [privKey, setPrivKey] = useState<string | null>(null)

  // ── Intent ──
  const { status: intentStatus, txHash, error: intentError, sendIntentWithSessionKey, reset: resetIntent } = useSendIntent()
  const [targetAddr, setTargetAddr] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')

  // Pimlico bundler URL — set VITE_BUNDLER_URL in .env for real submissions
  const bundlerUrl = import.meta.env.VITE_BUNDLER_URL ?? 'https://api.pimlico.io/v2/84532/rpc?apikey=YOUR_KEY'
  const rpcUrl = import.meta.env.VITE_RPC_URL ?? 'https://sepolia.base.org'

  // ── Handlers ──

  async function handleLogin() {
    if (!email) return
    await login('email', email)
  }

  async function handleCreateAccount() {
    if (!ownerAddr) return
    await createAccount(ownerAddr)
  }

  async function handleIssueSessionKey() {
    if (!account) return
    // Generate keypair client-side — private key stays here, only hash goes to server
    const { privateKey, keyHash } = await generateSessionKey()
    setPrivKey(privateKey)
    await issueSessionKey({
      accountId: account.accountId,
      keyHash,
      allowedTargets: [targetAddr],
      allowedSelectors: ['0xa9059cbb'], // ERC-20 transfer
      maxValueWei: '0',
      ttlSeconds: 3600,
    })
  }

  async function handleSendIntent() {
    if (!sessionKey || !account || !privKey) return
    resetIntent()
    // ERC-20 transfer calldata: transfer(address, uint256) with 1 token unit
    const calldata = '0xa9059cbb' +
      targetAddr.replace('0x', '').padStart(64, '0') +
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000'
    await sendIntentWithSessionKey(sessionKey.sessionId, {
      target: targetAddr,
      calldata: '0x' + calldata.slice(2),
      value: '0',
      sessionKeyPrivateKey: privKey as `0x${string}`,
      senderAddress: account.address as `0x${string}`,
      chainId: 84532,
      rpcUrl,
      bundlerUrl,
    })
  }

  // ── Step flags ──
  const step1Done = authStatus === 'authenticated'
  const step2Done = !!account
  const step3Done = !!sessionKey
  const step4Done = intentStatus === 'confirmed'

  return (
    <div style={S.page}>
      <h1 style={S.h1}>GhostKey Reference App</h1>
      <p style={S.sub}>
        Full login → smart account → session key → intent flow on Base Sepolia.
        No private keys sent to the server.
      </p>

      {/* Progress */}
      <div style={S.card}>
        <div style={S.cardTitle as React.CSSProperties}>Progress</div>
        <Step n={1} title="Login with email" done={step1Done} />
        <Step n={2} title="Create smart account" done={step2Done} />
        <Step n={3} title="Issue session key" done={step3Done} />
        <Step n={4} title="Send ERC-20 intent" done={step4Done} />
      </div>

      {/* Step 1: Login */}
      <div style={S.card}>
        <div style={S.cardTitle as React.CSSProperties}>
          1. Login
          <span style={S.badge(step1Done)}>{authStatus}</span>
        </div>
        {!step1Done ? (
          <div style={S.row}>
            <input
              style={S.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button style={S.btn()} onClick={handleLogin}>Login</button>
          </div>
        ) : (
          <div>
            <div style={S.mono}>User ID: {userId}</div>
            <button
              style={{ ...S.btn(false, 'ghost'), marginTop: '0.5rem' }}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        )}
        {loginError && <div style={S.error}>{loginError.code}: {loginError.message}</div>}
      </div>

      {/* Step 2: Create account */}
      <div style={{ ...S.card, opacity: step1Done ? 1 : 0.4 }}>
        <div style={S.cardTitle as React.CSSProperties}>
          2. Smart Account
          <span style={S.badge(step2Done)}>{step2Done ? 'created' : 'none'}</span>
        </div>
        {!step2Done ? (
          <div style={S.row}>
            <input
              style={S.input}
              placeholder="0x owner address"
              value={ownerAddr}
              onChange={(e) => setOwnerAddr(e.target.value)}
            />
            <button
              style={S.btn(!step1Done || accLoading)}
              onClick={handleCreateAccount}
              disabled={!step1Done || accLoading}
            >
              {accLoading ? 'Creating…' : 'Create'}
            </button>
          </div>
        ) : (
          <div style={S.mono}>
            <div>ID: {account.accountId}</div>
            <div>Address: {account.address}</div>
            <div>Chain: {account.chain}</div>
          </div>
        )}
        {accError && <div style={S.error}>{accError.code}: {accError.message}</div>}
      </div>

      {/* Step 3: Session key */}
      <div style={{ ...S.card, opacity: step2Done ? 1 : 0.4 }}>
        <div style={S.cardTitle as React.CSSProperties}>
          3. Session Key
          <span style={S.badge(step3Done)}>{step3Done ? 'issued' : 'none'}</span>
        </div>
        {!step3Done ? (
          <button
            style={S.btn(!step2Done || sessLoading)}
            onClick={handleIssueSessionKey}
            disabled={!step2Done || sessLoading}
          >
            {sessLoading ? 'Issuing…' : 'Generate + Issue Session Key'}
          </button>
        ) : (
          <div style={S.mono}>
            <div>Session ID: {sessionKey.sessionId}</div>
            <div>Key hash: {sessionKey.keyHash}</div>
            <div>Expires: {sessionKey.expiresAt}</div>
            {privKey && (
              <div style={{ marginTop: '0.5rem', color: '#f59e0b' }}>
                ⚠ Private key (memory only — never sent to server):<br />
                {privKey}
              </div>
            )}
          </div>
        )}
        {sessError && <div style={S.error}>{sessError.code}: {sessError.message}</div>}
      </div>

      {/* Step 4: Send intent */}
      <div style={{ ...S.card, opacity: step3Done ? 1 : 0.4 }}>
        <div style={S.cardTitle as React.CSSProperties}>
          4. Send Intent (ERC-20 transfer)
          <span style={S.badge(step4Done)}>{intentStatus ?? 'idle'}</span>
        </div>
        <div style={{ ...S.row, marginBottom: '0.75rem' }}>
          <input
            style={S.input}
            placeholder="Target address"
            value={targetAddr}
            onChange={(e) => setTargetAddr(e.target.value)}
          />
        </div>
        <button
          style={S.btn(!step3Done || intentStatus === 'pending')}
          onClick={handleSendIntent}
          disabled={!step3Done || intentStatus === 'pending'}
        >
          {intentStatus === 'pending' ? 'Submitting…' : 'Send 1 token'}
        </button>
        {txHash && (
          <div style={S.success}>
            ✓ Confirmed — tx: <span style={S.mono}>{txHash}</span>
          </div>
        )}
        {intentError && <div style={S.error}>{intentError.code}: {intentError.message}</div>}
      </div>
    </div>
  )
}
