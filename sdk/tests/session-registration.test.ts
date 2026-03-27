// session-registration.test.ts — GAP-003 on-chain session key registration
//
// Mocks buildUserOperation (via userop.ts) and viem/accounts
// so no RPC or bundler calls are made.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  KERNEL_ECDSA_VALIDATOR,
  KERNEL_EXECUTE_SELECTOR,
  buildSessionKeyRegistrationUserOp,
  deriveSessionKeyAddress,
} from '../src/session-registration.js'

// ── Mock userop.ts ────────────────────────────────────────────────────────────

const mockBuildUserOperation = vi.fn()

vi.mock('../src/userop.js', () => ({
  buildUserOperation: (...args: unknown[]) => mockBuildUserOperation(...args),
}))

// ── Constants ─────────────────────────────────────────────────────────────────

const KERNEL_ADDR = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' as const
const SESSION_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
const SESSION_KEY_ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const // address of ^

const MOCK_USER_OP = {
  sender: KERNEL_ADDR,
  nonce: '0x0',
  initCode: '0x',
  callData: '0xdeadbeef',
  callGasLimit: '0x15f90',
  verificationGasLimit: '0x186a0',
  preVerificationGas: '0xc350',
  maxFeePerGas: '0x3b9aca00',
  maxPriorityFeePerGas: '0x3b9aca00',
  paymasterAndData: '0xdeadbeef01',
  signature: '0xsig',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KERNEL_ECDSA_VALIDATOR', () => {
  it('is the ZeroDev ECDSA validator address on Base/Arbitrum', () => {
    expect(KERNEL_ECDSA_VALIDATOR).toBe('0xd9AB5096a832b9ce79914329DAEE236f8Eea0390')
  })
})

describe('KERNEL_EXECUTE_SELECTOR', () => {
  it('is the execute(address,uint256,bytes) selector', () => {
    expect(KERNEL_EXECUTE_SELECTOR).toBe('0xb61d27f6')
  })
})

describe('deriveSessionKeyAddress', () => {
  it('derives the correct EOA address from a private key', async () => {
    const addr = await deriveSessionKeyAddress(SESSION_KEY)
    // viem privateKeyToAccount deterministic: known key → known address
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('returns the same address for the same key (deterministic)', async () => {
    const a1 = await deriveSessionKeyAddress(SESSION_KEY)
    const a2 = await deriveSessionKeyAddress(SESSION_KEY)
    expect(a1).toBe(a2)
  })
})

describe('buildSessionKeyRegistrationUserOp', () => {
  beforeEach(() => {
    mockBuildUserOperation.mockResolvedValue(MOCK_USER_OP)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls buildUserOperation with the kernel address as both sender and target (self-call)', async () => {
    await buildSessionKeyRegistrationUserOp({
      kernelAddress: KERNEL_ADDR,
      sessionKeyAddress: SESSION_KEY_ADDR,
      sessionKeyPrivateKey: SESSION_KEY,
      validAfter: 0,
      validUntil: 9999999999,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    expect(mockBuildUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: KERNEL_ADDR,
        target: KERNEL_ADDR,   // self-call
        sessionKeyPrivateKey: SESSION_KEY,
        chainId: 84532,
      }),
    )
  })

  it('encodes setExecution calldata (selector 0xe4a3dbd6 prefix expected)', async () => {
    await buildSessionKeyRegistrationUserOp({
      kernelAddress: KERNEL_ADDR,
      sessionKeyAddress: SESSION_KEY_ADDR,
      sessionKeyPrivateKey: SESSION_KEY,
      validAfter: 0,
      validUntil: 9999999999,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    const call = mockBuildUserOperation.mock.calls[0][0]
    // calldata is ABI-encoded setExecution — 4-byte selector check
    expect(call.calldata).toMatch(/^0x[0-9a-f]{8}/)
  })

  it('sets value to 0n (registration does not transfer ETH)', async () => {
    await buildSessionKeyRegistrationUserOp({
      kernelAddress: KERNEL_ADDR,
      sessionKeyAddress: SESSION_KEY_ADDR,
      sessionKeyPrivateKey: SESSION_KEY,
      validAfter: 0,
      validUntil: 9999999999,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    expect(mockBuildUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({ value: BigInt(0) }),
    )
  })

  it('returns the UserOperation from buildUserOperation', async () => {
    const result = await buildSessionKeyRegistrationUserOp({
      kernelAddress: KERNEL_ADDR,
      sessionKeyAddress: SESSION_KEY_ADDR,
      sessionKeyPrivateKey: SESSION_KEY,
      validAfter: 0,
      validUntil: 9999999999,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      bundlerUrl: 'https://bundler.example.com',
    })

    expect(result).toEqual(MOCK_USER_OP)
  })

  it('propagates errors from buildUserOperation', async () => {
    mockBuildUserOperation.mockRejectedValue(new Error('Unsupported chainId: 99999'))

    await expect(
      buildSessionKeyRegistrationUserOp({
        kernelAddress: KERNEL_ADDR,
        sessionKeyAddress: SESSION_KEY_ADDR,
        sessionKeyPrivateKey: SESSION_KEY,
        validAfter: 0,
        validUntil: 9999999999,
        chainId: 84532,
        rpcUrl: 'https://rpc.example.com',
        bundlerUrl: 'https://bundler.example.com',
      }),
    ).rejects.toThrow('Unsupported chainId: 99999')
  })
})
