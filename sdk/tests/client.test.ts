import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GhostKeyClient } from '../src/client.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(data: unknown, ok = true, statusText = 'OK') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      statusText,
      json: async () => data,
    }),
  )
}

// ── Auth state ────────────────────────────────────────────────────────────────

describe('GhostKeyClient', () => {
  let client: GhostKeyClient

  beforeEach(() => {
    client = new GhostKeyClient({ apiUrl: 'http://localhost:8080', chainId: 84532 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initialises unauthenticated', () => {
    expect(client.isAuthenticated()).toBe(false)
  })

  it('setToken marks client as authenticated', () => {
    client.setToken('test-token')
    expect(client.isAuthenticated()).toBe(true)
  })

  it('clearToken marks client as unauthenticated', () => {
    client.setToken('test-token')
    client.clearToken()
    expect(client.isAuthenticated()).toBe(false)
  })

  // ── HTTP methods — happy paths ─────────────────────────────────────────────

  it('login maps snake_case response to camelCase AuthResponse', async () => {
    mockFetch({ user_id: 'u1', token: 'tok', expires_at: '2099-01-01' })
    const result = await client.login('email', 'test@example.com')
    expect(result.error).toBeNull()
    expect(result.data?.userId).toBe('u1')
    expect(result.data?.token).toBe('tok')
    expect(result.data?.expiresAt).toBe('2099-01-01')
  })

  it('refresh maps response', async () => {
    mockFetch({ user_id: 'u1', token: 'new-tok', expires_at: '2099-01-01' })
    const result = await client.refresh('old-tok')
    expect(result.data?.token).toBe('new-tok')
  })

  it('createAccount maps response and derives chain from chainId', async () => {
    mockFetch({
      account_id: 'a1',
      address: '0xabc',
      chain: 'base-sepolia',
      aa_type: 'kernel-v3',
      created_at: '2026-01-01',
    })
    const result = await client.createAccount('0xabc')
    expect(result.error).toBeNull()
    expect(result.data?.accountId).toBe('a1')
    expect(result.data?.chain).toBe('base-sepolia')
    expect(result.data?.aaType).toBe('kernel-v3')
  })

  it('createAccount falls back for unknown chainId', async () => {
    const c = new GhostKeyClient({ apiUrl: 'http://localhost', chainId: 99999 })
    mockFetch({
      account_id: 'a2',
      address: '0xdef',
      chain: 'chain-99999',
      aa_type: 'kernel',
      created_at: '2026-01-01',
    })
    const body = await c.createAccount('0xdef')
    expect(body.data?.chain).toBe('chain-99999')
    const called = vi.mocked(fetch).mock.calls[0]
    const reqBody = JSON.parse((called[1] as RequestInit).body as string)
    expect(reqBody.chain).toBe('chain-99999')
  })

  it('getAccount maps response', async () => {
    mockFetch({
      account_id: 'a1',
      address: '0xabc',
      chain: 'base-sepolia',
      aa_type: 'kernel-v3',
      created_at: '2026-01-01',
    })
    const result = await client.getAccount('a1')
    expect(result.data?.accountId).toBe('a1')
    expect(result.data?.createdAt).toBe('2026-01-01')
  })

  it('issueSessionKey maps response', async () => {
    mockFetch({ session_id: 's1', key_hash: 'a'.repeat(64), expires_at: '2099-01-01' })
    const result = await client.issueSessionKey({
      accountId: 'a1',
      keyHash: 'a'.repeat(64),
      allowedTargets: ['0xabc'],
      allowedSelectors: ['0xa9059cbb'],
      maxValueWei: '1000000000000000000',
      ttlSeconds: 3600,
    })
    expect(result.data?.sessionId).toBe('s1')
    expect(result.data?.keyHash).toBe('a'.repeat(64))
  })

  it('executeIntent maps response', async () => {
    mockFetch({ intent_id: 'i1', status: 'pending', tx_hash: null, block_number: null })
    const result = await client.executeIntent('s1', { target: '0xabc', calldata: '0x' })
    expect(result.data?.intentId).toBe('i1')
    expect(result.data?.status).toBe('pending')
    expect(result.data?.txHash).toBeNull()
  })

  it('getIntentStatus maps confirmed response', async () => {
    mockFetch({ intent_id: 'i1', status: 'confirmed', tx_hash: '0xdeadbeef', block_number: 42 })
    const result = await client.getIntentStatus('i1')
    expect(result.data?.status).toBe('confirmed')
    expect(result.data?.txHash).toBe('0xdeadbeef')
    expect(result.data?.blockNumber).toBe(42)
  })

  it('initiateRecovery maps response', async () => {
    mockFetch({
      recovery_id: 'r1',
      method: 'social',
      status: 'initiated',
      instructions: 'Contact your guardians.',
    })
    const result = await client.initiateRecovery('0xabc')
    expect(result.data?.recoveryId).toBe('r1')
    expect(result.data?.instructions).toBe('Contact your guardians.')
  })

  // ── HTTP methods — error paths ─────────────────────────────────────────────

  it('returns API error code on non-ok response', async () => {
    mockFetch({ error: 'invalid_token' }, false, 'Unauthorized')
    const result = await client.login('email', 'bad@example.com')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('invalid_token')
  })

  it('returns network_error when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))
    const result = await client.login('email', 'test@example.com')
    expect(result.error?.code).toBe('network_error')
    expect(result.data).toBeNull()
  })

  it('sends Authorization header when token is set', async () => {
    client.setToken('my-token')
    mockFetch({ user_id: 'u1', token: 'tok', expires_at: '2099' })
    await client.login('email', 'test@example.com')
    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-token')
  })
})
