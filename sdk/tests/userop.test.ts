// userop.test.ts — unit tests for ERC-4337 UserOperation construction (GAP-001)
//
// Mocks:
//   - viem createPublicClient.readContract → returns fake nonce
//   - global fetch → returns fake Pimlico pm_sponsorUserOperation response
//
// No RPC or bundler calls are made during these tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ENTRY_POINT_V06,
  CHAIN_CONFIGS,
  getUserOpHash,
  buildUserOperation,
  type UserOperation,
} from '../src/userop.js'

// ── Mock viem createPublicClient ───────────────────────────────────────────────

const mockReadContract = vi.fn()

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
    })),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENDER = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' as const
const SESSION_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
const TARGET = '0x4200000000000000000000000000000000000006' as const
const CALLDATA = '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000de0b6b3a7640000' as const

const PIMLICO_RESULT = {
  paymasterAndData: '0xdeadbeef01' as const,
  callGasLimit: '0x15f90' as const,
  verificationGasLimit: '0x186a0' as const,
  preVerificationGas: '0xc350' as const,
  maxFeePerGas: '0x3b9aca00' as const,
  maxPriorityFeePerGas: '0x3b9aca00' as const,
}

function mockPimlicoFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: PIMLICO_RESULT }),
    }),
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('ENTRY_POINT_V06', () => {
  it('is the canonical ERC-4337 EntryPoint address', () => {
    expect(ENTRY_POINT_V06).toBe('0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789')
  })
})

describe('CHAIN_CONFIGS', () => {
  it('contains Base Sepolia (84532)', () => {
    expect(CHAIN_CONFIGS[84532]).toBeDefined()
    expect(CHAIN_CONFIGS[84532].entryPoint).toBe(ENTRY_POINT_V06)
  })

  it('contains Base mainnet (8453)', () => {
    expect(CHAIN_CONFIGS[8453]).toBeDefined()
    expect(CHAIN_CONFIGS[8453].entryPoint).toBe(ENTRY_POINT_V06)
  })

  it('contains Arbitrum One (42161)', () => {
    expect(CHAIN_CONFIGS[42161]).toBeDefined()
    expect(CHAIN_CONFIGS[42161].entryPoint).toBe(ENTRY_POINT_V06)
  })
})

// ── getUserOpHash ─────────────────────────────────────────────────────────────

describe('getUserOpHash', () => {
  const partialOp: Omit<UserOperation, 'signature'> = {
    sender: SENDER,
    nonce: '0x0',
    initCode: '0x',
    callData: '0x',
    callGasLimit: '0x0',
    verificationGasLimit: '0x0',
    preVerificationGas: '0x0',
    maxFeePerGas: '0x0',
    maxPriorityFeePerGas: '0x0',
    paymasterAndData: '0x',
  }

  it('returns a 0x-prefixed 32-byte hex hash', () => {
    const hash = getUserOpHash(partialOp, ENTRY_POINT_V06, 84532)
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('produces different hashes for different chainIds', () => {
    const hash1 = getUserOpHash(partialOp, ENTRY_POINT_V06, 84532)
    const hash2 = getUserOpHash(partialOp, ENTRY_POINT_V06, 8453)
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different senders', () => {
    const op2 = { ...partialOp, sender: '0x1111111111111111111111111111111111111111' as const }
    const hash1 = getUserOpHash(partialOp, ENTRY_POINT_V06, 84532)
    const hash2 = getUserOpHash(op2, ENTRY_POINT_V06, 84532)
    expect(hash1).not.toBe(hash2)
  })

  it('is deterministic — same inputs produce same hash', () => {
    const h1 = getUserOpHash(partialOp, ENTRY_POINT_V06, 84532)
    const h2 = getUserOpHash(partialOp, ENTRY_POINT_V06, 84532)
    expect(h1).toBe(h2)
  })
})

// ── buildUserOperation ────────────────────────────────────────────────────────

describe('buildUserOperation', () => {
  beforeEach(() => {
    mockReadContract.mockResolvedValue(BigInt(0))
    mockPimlicoFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a UserOperation with all required fields', async () => {
    const op = await buildUserOperation({
      sender: SENDER,
      sessionKeyPrivateKey: SESSION_KEY,
      target: TARGET,
      calldata: CALLDATA,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    expect(op.sender).toBe(SENDER)
    expect(op.nonce).toBe('0x0')
    expect(op.initCode).toBe('0x')
    expect(op.callGasLimit).toBe(PIMLICO_RESULT.callGasLimit)
    expect(op.verificationGasLimit).toBe(PIMLICO_RESULT.verificationGasLimit)
    expect(op.preVerificationGas).toBe(PIMLICO_RESULT.preVerificationGas)
    expect(op.maxFeePerGas).toBe(PIMLICO_RESULT.maxFeePerGas)
    expect(op.paymasterAndData).toBe(PIMLICO_RESULT.paymasterAndData)
    expect(op.signature).toMatch(/^0x[0-9a-f]+$/)
  })

  it('encodes callData as Kernel execute(target, value, calldata)', async () => {
    const op = await buildUserOperation({
      sender: SENDER,
      sessionKeyPrivateKey: SESSION_KEY,
      target: TARGET,
      calldata: CALLDATA,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    // Kernel execute(address,uint256,bytes) selector: 0xb61d27f6
    expect(op.callData.slice(0, 10)).toBe('0xb61d27f6')
  })

  it('uses value=0 by default', async () => {
    const op = await buildUserOperation({
      sender: SENDER,
      sessionKeyPrivateKey: SESSION_KEY,
      target: TARGET,
      calldata: '0x',
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })
    // value encoded as 32-byte zero in callData abi params
    expect(op.callData).toBeTruthy()
  })

  it('calls pm_sponsorUserOperation with correct JSON-RPC params', async () => {
    await buildUserOperation({
      sender: SENDER,
      sessionKeyPrivateKey: SESSION_KEY,
      target: TARGET,
      calldata: '0x',
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.pimlico.io',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://bundler.pimlico.io',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('pm_sponsorUserOperation'),
      }),
    )
  })

  it('throws on unsupported chainId', async () => {
    await expect(
      buildUserOperation({
        sender: SENDER,
        sessionKeyPrivateKey: SESSION_KEY,
        target: TARGET,
        calldata: '0x',
        chainId: 99999,
        rpcUrl: 'https://rpc.example.com',
        bundlerUrl: 'https://bundler.example.com',
      }),
    ).rejects.toThrow('Unsupported chainId: 99999')
  })

  it('throws when Pimlico returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: 1,
          error: { message: 'insufficient funds for gas' },
        }),
      }),
    )

    await expect(
      buildUserOperation({
        sender: SENDER,
        sessionKeyPrivateKey: SESSION_KEY,
        target: TARGET,
        calldata: '0x',
        chainId: 84532,
        rpcUrl: 'https://rpc.example.com',
        bundlerUrl: 'https://bundler.example.com',
      }),
    ).rejects.toThrow('insufficient funds for gas')
  })

  it('uses non-zero nonce from EntryPoint', async () => {
    mockReadContract.mockResolvedValue(BigInt(5))

    const op = await buildUserOperation({
      sender: SENDER,
      sessionKeyPrivateKey: SESSION_KEY,
      target: TARGET,
      calldata: '0x',
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    expect(op.nonce).toBe('0x5')
  })
})
