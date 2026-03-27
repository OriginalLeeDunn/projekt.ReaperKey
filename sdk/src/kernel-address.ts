// kernel-address.ts — ZeroDev Kernel counterfactual address computation (GAP-002)
//
// Computes the Kernel smart account address deterministically from an owner address
// without deploying the contract on-chain. Uses permissionless.js toEcdsaKernelSmartAccount.
//
// Non-custodial: private key never required here — only the owner *address* is needed
// for counterfactual computation. The owner public key (address) is sufficient.
//
// Agent: SDK Engineer
// Phase: 6 (v1.0) — resolves GAP-002

import { createPublicClient, http, type Address, type Chain } from 'viem'
import { privateKeyToAccount, toAccount } from 'viem/accounts'
import { baseSepolia, base, arbitrum } from 'viem/chains'
import { toEcdsaKernelSmartAccount } from 'permissionless/accounts'

// EntryPoint v0.6 — same address on all EVM chains
const ENTRY_POINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const

const CHAIN_MAP: Record<number, Chain> = {
  84532: baseSepolia,
  8453:  base,
  42161: arbitrum,
}

// ── Kernel version constants ──────────────────────────────────────────────────

// Kernel v2.4 — EntryPoint v0.6, most widely deployed (Base Sepolia production)
export const KERNEL_V2_4 = '0.2.4' as const
// Kernel v3.1 — EntryPoint v0.7 (future upgrade path)
export const KERNEL_V3_1 = '0.3.1' as const

// ── Parameters ────────────────────────────────────────────────────────────────

export interface GetKernelAddressParams {
  /** Owner EOA address (from connected wallet or generated key) */
  ownerAddress: Address
  /** Chain ID */
  chainId: number
  /** RPC URL for on-chain queries (factory address resolution) */
  rpcUrl: string
  /** Account index — use 0 for the primary account (default: 0) */
  index?: bigint
}

export interface GetKernelAddressFromKeyParams {
  /** Owner private key — used to derive address, never sent anywhere */
  ownerPrivateKey: `0x${string}`
  chainId: number
  rpcUrl: string
  index?: bigint
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Compute the ZeroDev Kernel v2.4 counterfactual address from an owner private key.
 * The private key is used only locally to construct a LocalAccount signer —
 * it is never serialised or transmitted.
 *
 * Returns the deterministic smart account address for the given owner + index.
 */
export async function getKernelAddressFromPrivateKey(
  params: GetKernelAddressFromKeyParams,
): Promise<Address> {
  const { ownerPrivateKey, chainId, rpcUrl, index = BigInt(0) } = params

  const chainConfig = CHAIN_MAP[chainId]
  if (!chainConfig) throw new Error(`Unsupported chainId: ${chainId}`)

  const publicClient = createPublicClient({
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  const owner = privateKeyToAccount(ownerPrivateKey)

  const account = await toEcdsaKernelSmartAccount({
    client: publicClient,
    entryPoint: {
      address: ENTRY_POINT_V06,
      version: '0.6',
    },
    owners: [owner],
    index,
    version: KERNEL_V2_4,
  })

  return account.address
}

/**
 * Compute the ZeroDev Kernel v2.4 counterfactual address from an owner EOA address.
 *
 * Uses a read-only dummy signer — no private key required. The address computation
 * is deterministic and only depends on the owner address + index, not any secret.
 *
 * This is the preferred call when the caller only has the wallet address
 * (e.g. MetaMask connected wallet, public key).
 */
export async function getKernelAddressFromOwner(
  params: GetKernelAddressParams,
): Promise<Address> {
  const { ownerAddress, chainId, rpcUrl, index = BigInt(0) } = params

  const chainConfig = CHAIN_MAP[chainId]
  if (!chainConfig) throw new Error(`Unsupported chainId: ${chainId}`)

  const publicClient = createPublicClient({
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  // Read-only account — sign methods unused during address computation
  const owner = toAccount({
    address: ownerAddress,
    async signMessage() { return '0x' as `0x${string}` },
    async signTransaction() { return '0x' as `0x${string}` },
    async signTypedData() { return '0x' as `0x${string}` },
  })

  const account = await toEcdsaKernelSmartAccount({
    client: publicClient,
    entryPoint: {
      address: ENTRY_POINT_V06,
      version: '0.6',
    },
    owners: [owner],
    index,
    version: KERNEL_V2_4,
  })

  return account.address
}
