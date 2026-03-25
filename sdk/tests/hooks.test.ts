import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { GhostKeyProvider } from '../src/provider.js'
import { useLogin } from '../src/hooks/useLogin.js'
import { useAccount } from '../src/hooks/useAccount.js'
import { useSessionKey } from '../src/hooks/useSessionKey.js'
import { useSendIntent } from '../src/hooks/useSendIntent.js'
import { useRecovery } from '../src/hooks/useRecovery.js'
import type { GhostKeyClient } from '../src/client.js'

// ── Mock client factory ───────────────────────────────────────────────────────

function mockClient(overrides: Partial<GhostKeyClient> = {}): GhostKeyClient {
  return {
    isAuthenticated: vi.fn(() => false),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    createAccount: vi.fn(),
    getAccount: vi.fn(),
    issueSessionKey: vi.fn(),
    executeIntent: vi.fn(),
    getIntentStatus: vi.fn(),
    initiateRecovery: vi.fn(),
    ...overrides,
  } as unknown as GhostKeyClient
}

function wrapper(client: GhostKeyClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(GhostKeyProvider, {
      config: { apiUrl: 'http://localhost:8080', chainId: 84532 },
      _client: client,
      children,
    })
}

// ── useLogin ──────────────────────────────────────────────────────────────────

describe('useLogin', () => {
  it('starts idle and unauthenticated', () => {
    const client = mockClient()
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })
    expect(result.current.status).toBe('idle')
    expect(result.current.userId).toBeNull()
  })

  it('sets authenticated on successful login', async () => {
    const client = mockClient({
      login: vi.fn().mockResolvedValue({
        data: { userId: 'user-1', token: 'tok', expiresAt: '2099-01-01' },
        error: null,
      }),
    })
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })

    await act(async () => {
      await result.current.login('email', 'test@example.com')
    })

    expect(result.current.status).toBe('authenticated')
    expect(result.current.userId).toBe('user-1')
    expect(client.setToken).toHaveBeenCalledWith('tok')
  })

  it('sets error status on failed login', async () => {
    const client = mockClient({
      login: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'invalid_token', message: 'bad creds' },
      }),
    })
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })

    await act(async () => {
      await result.current.login('email', 'bad@example.com')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('invalid_token')
  })

  it('logout clears token and resets to idle', async () => {
    const client = mockClient({
      login: vi.fn().mockResolvedValue({
        data: { userId: 'user-1', token: 'tok', expiresAt: '2099-01-01' },
        error: null,
      }),
    })
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.login('email', 'test@example.com') })
    act(() => { result.current.logout() })

    expect(result.current.status).toBe('idle')
    expect(result.current.userId).toBeNull()
    expect(client.clearToken).toHaveBeenCalled()
  })
})

// ── useAccount ────────────────────────────────────────────────────────────────

describe('useAccount', () => {
  const mockAccount = {
    accountId: 'acc-1',
    address: '0xabc',
    chain: 'base',
    aaType: 'kernel-v3',
    createdAt: '2026-01-01',
  }

  it('rejects createAccount when not authenticated', async () => {
    const client = mockClient({ isAuthenticated: vi.fn(() => false) })
    const { result } = renderHook(() => useAccount(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.createAccount('0xabc') })

    expect(result.current.error?.code).toBe('not_authenticated')
    expect(result.current.account).toBeNull()
  })

  it('sets account on successful createAccount', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      createAccount: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
    })
    const { result } = renderHook(() => useAccount(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.createAccount('0xabc') })

    expect(result.current.account).toEqual(mockAccount)
    expect(result.current.error).toBeNull()
  })

  it('sets account on successful fetchAccount', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      getAccount: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
    })
    const { result } = renderHook(() => useAccount(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.fetchAccount('acc-1') })

    expect(result.current.account).toEqual(mockAccount)
  })

  it('sets error on failed createAccount', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      createAccount: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'network_error', message: 'fail' },
      }),
    })
    const { result } = renderHook(() => useAccount(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.createAccount('0xabc') })

    expect(result.current.error?.code).toBe('network_error')
    expect(result.current.loading).toBe(false)
  })
})

// ── useSessionKey ─────────────────────────────────────────────────────────────

describe('useSessionKey', () => {
  const mockSessionReq = {
    accountId: 'acc-1',
    keyHash: 'a'.repeat(64),
    allowedTargets: ['0xabc'],
    allowedSelectors: ['0xa9059cbb'],
    maxValueWei: '1000000000000000000',
    ttlSeconds: 3600,
  }
  const mockSessionResp = {
    sessionId: 'sess-1',
    keyHash: 'a'.repeat(64),
    expiresAt: '2099-01-01',
  }

  it('rejects when not authenticated', async () => {
    const client = mockClient({ isAuthenticated: vi.fn(() => false) })
    const { result } = renderHook(() => useSessionKey(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.issueSessionKey(mockSessionReq) })

    expect(result.current.error?.code).toBe('not_authenticated')
  })

  it('stores session key on success', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      issueSessionKey: vi.fn().mockResolvedValue({ data: mockSessionResp, error: null }),
    })
    const { result } = renderHook(() => useSessionKey(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.issueSessionKey(mockSessionReq) })

    expect(result.current.sessionKey).toEqual(mockSessionResp)
    expect(result.current.error).toBeNull()
  })

  it('clearSessionKey resets state', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      issueSessionKey: vi.fn().mockResolvedValue({ data: mockSessionResp, error: null }),
    })
    const { result } = renderHook(() => useSessionKey(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.issueSessionKey(mockSessionReq) })
    act(() => { result.current.clearSessionKey() })

    expect(result.current.sessionKey).toBeNull()
  })
})

// ── useSendIntent ─────────────────────────────────────────────────────────────

describe('useSendIntent', () => {
  const intent = { target: '0xabc', calldata: '0x', value: '0' }

  it('rejects when not authenticated', async () => {
    const client = mockClient({ isAuthenticated: vi.fn(() => false) })
    const { result } = renderHook(() => useSendIntent(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.sendIntent('sess-1', intent) })

    expect(result.current.error?.code).toBe('not_authenticated')
  })

  it('returns pending then confirmed on happy path', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      executeIntent: vi.fn().mockResolvedValue({
        data: { intentId: 'int-1', status: 'pending', txHash: null, blockNumber: null },
        error: null,
      }),
      getIntentStatus: vi.fn().mockResolvedValue({
        data: { intentId: 'int-1', status: 'confirmed', txHash: '0xdeadbeef', blockNumber: 42 },
        error: null,
      }),
    })
    const { result } = renderHook(() => useSendIntent(), { wrapper: wrapper(client) })

    let finalResult: Awaited<ReturnType<typeof result.current.sendIntent>>
    await act(async () => {
      finalResult = await result.current.sendIntent('sess-1', intent)
    })

    expect(finalResult!.status).toBe('confirmed')
    expect(finalResult!.txHash).toBe('0xdeadbeef')
    expect(result.current.txHash).toBe('0xdeadbeef')
  })

  it('returns error on executeIntent failure', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      executeIntent: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'intent_out_of_scope', message: 'scope violation' },
      }),
    })
    const { result } = renderHook(() => useSendIntent(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.sendIntent('sess-1', intent) })

    expect(result.current.error?.code).toBe('intent_out_of_scope')
    expect(result.current.status).toBeNull()
  })

  it('reset clears all state', async () => {
    const client = mockClient({
      isAuthenticated: vi.fn(() => true),
      executeIntent: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'unknown', message: 'fail' },
      }),
    })
    const { result } = renderHook(() => useSendIntent(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.sendIntent('sess-1', intent) })
    act(() => { result.current.reset() })

    expect(result.current.error).toBeNull()
    expect(result.current.status).toBeNull()
    expect(result.current.txHash).toBeNull()
  })
})

// ── useRecovery ───────────────────────────────────────────────────────────────

describe('useRecovery', () => {
  const mockRecovery = {
    recoveryId: 'rec-1',
    method: 'social',
    status: 'initiated',
    instructions: 'Complete recovery using your registered social recovery contacts.',
  }

  it('starts with null result and no error', () => {
    const client = mockClient()
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapper(client) })
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets result on successful initiateRecovery', async () => {
    const client = mockClient({
      initiateRecovery: vi.fn().mockResolvedValue({ data: mockRecovery, error: null }),
    })
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.initiateRecovery('0xabc') })

    expect(result.current.result).toEqual(mockRecovery)
    expect(result.current.error).toBeNull()
    expect(client.initiateRecovery).toHaveBeenCalledWith('0xabc')
  })

  it('sets error on failed initiateRecovery', async () => {
    const client = mockClient({
      initiateRecovery: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'not_found', message: 'account not found' },
      }),
    })
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.initiateRecovery('0xbad') })

    expect(result.current.result).toBeNull()
    expect(result.current.error?.code).toBe('not_found')
  })

  it('reset clears all state', async () => {
    const client = mockClient({
      initiateRecovery: vi.fn().mockResolvedValue({ data: mockRecovery, error: null }),
    })
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapper(client) })

    await act(async () => { await result.current.initiateRecovery('0xabc') })
    act(() => { result.current.reset() })

    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
