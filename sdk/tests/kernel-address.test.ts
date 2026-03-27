// kernel-address.test.ts — GAP-002 counterfactual Kernel address computation
//
// Mocks permissionless toEcdsaKernelSmartAccount and viem createPublicClient
// so no RPC calls are made.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  KERNEL_V2_4,
  KERNEL_V3_1,
  getKernelAddressFromPrivateKey,
  getKernelAddressFromOwner,
} from '../src/kernel-address.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const FAKE_KERNEL_ADDRESS = '0xCafeBabe0000000000000000000000000000BEEF' as const

const mockToEcdsaKernelSmartAccount = vi.fn().mockResolvedValue({
  address: FAKE_KERNEL_ADDRESS,
})

vi.mock('permissionless/accounts', () => ({
  toEcdsaKernelSmartAccount: (...args: unknown[]) => mockToEcdsaKernelSmartAccount(...args),
}))

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ readContract: vi.fn() })),
  }
})

// ── Test data ─────────────────────────────────────────────────────────────────

const OWNER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const
const OWNER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

// ── Constants ─────────────────────────────────────────────────────────────────

describe('KERNEL_V2_4 / KERNEL_V3_1', () => {
  it('exports correct version strings', () => {
    expect(KERNEL_V2_4).toBe('0.2.4')
    expect(KERNEL_V3_1).toBe('0.3.1')
  })
})

// ── getKernelAddressFromPrivateKey ────────────────────────────────────────────

describe('getKernelAddressFromPrivateKey', () => {
  beforeEach(() => {
    mockToEcdsaKernelSmartAccount.mockResolvedValue({ address: FAKE_KERNEL_ADDRESS })
  })

  afterEach(() => { vi.clearAllMocks() })

  it('returns the address from toEcdsaKernelSmartAccount', async () => {
    const addr = await getKernelAddressFromPrivateKey({
      ownerPrivateKey: OWNER_PRIVATE_KEY,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
    })
    expect(addr).toBe(FAKE_KERNEL_ADDRESS)
  })

  it('throws on unsupported chainId', async () => {
    await expect(
      getKernelAddressFromPrivateKey({
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        chainId: 99999,
        rpcUrl: 'https://rpc.example.com',
      }),
    ).rejects.toThrow('Unsupported chainId: 99999')
  })

  it('passes index=0n by default', async () => {
    await getKernelAddressFromPrivateKey({
      ownerPrivateKey: OWNER_PRIVATE_KEY,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
    })
    expect(mockToEcdsaKernelSmartAccount).toHaveBeenCalledWith(
      expect.objectContaining({ index: BigInt(0) }),
    )
  })

  it('forwards custom index', async () => {
    await getKernelAddressFromPrivateKey({
      ownerPrivateKey: OWNER_PRIVATE_KEY,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
      index: BigInt(3),
    })
    expect(mockToEcdsaKernelSmartAccount).toHaveBeenCalledWith(
      expect.objectContaining({ index: BigInt(3) }),
    )
  })
})

// ── getKernelAddressFromOwner ─────────────────────────────────────────────────

describe('getKernelAddressFromOwner', () => {
  beforeEach(() => {
    mockToEcdsaKernelSmartAccount.mockResolvedValue({ address: FAKE_KERNEL_ADDRESS })
  })

  afterEach(() => { vi.clearAllMocks() })

  it('returns the address from toEcdsaKernelSmartAccount', async () => {
    const addr = await getKernelAddressFromOwner({
      ownerAddress: OWNER_ADDRESS,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
    })
    expect(addr).toBe(FAKE_KERNEL_ADDRESS)
  })

  it('throws on unsupported chainId', async () => {
    await expect(
      getKernelAddressFromOwner({
        ownerAddress: OWNER_ADDRESS,
        chainId: 99999,
        rpcUrl: 'https://rpc.example.com',
      }),
    ).rejects.toThrow('Unsupported chainId: 99999')
  })

  it('uses EntryPoint v0.6', async () => {
    await getKernelAddressFromOwner({
      ownerAddress: OWNER_ADDRESS,
      chainId: 84532,
      rpcUrl: 'https://rpc.example.com',
    })
    expect(mockToEcdsaKernelSmartAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        entryPoint: expect.objectContaining({ version: '0.6' }),
        version: KERNEL_V2_4,
      }),
    )
  })
})
