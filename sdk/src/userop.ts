// userop.ts — ERC-4337 UserOperation construction (GAP-001)
//
// Builds and signs a UserOperation for ZeroDev Kernel v3 smart accounts.
// The session key private key NEVER leaves the browser — all signing is done here.
//
// Agent: SDK Engineer
// Phase: 6 (v1.0) — resolves GAP-001

import {
  createPublicClient,
  encodeFunctionData,
  http,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
  type Chain,
  type Hex,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, base, arbitrum } from 'viem/chains'

// ── ERC-4337 constants ────────────────────────────────────────────────────────

// EntryPoint v0.6 — deployed at same address on all EVM chains
export const ENTRY_POINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const

// Chain configs — extend as we add chains in Phase 6
export const CHAIN_CONFIGS: Record<number, { chain: Chain; entryPoint: Address }> = {
  84532: { chain: baseSepolia, entryPoint: ENTRY_POINT_V06 },   // Base Sepolia (testnet)
  8453:  { chain: base,        entryPoint: ENTRY_POINT_V06 },   // Base mainnet
  42161: { chain: arbitrum,    entryPoint: ENTRY_POINT_V06 },   // Arbitrum One
}

// ── ABIs ──────────────────────────────────────────────────────────────────────

const ENTRY_POINT_ABI = [
  {
    name: 'getNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'key', type: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256' }],
  },
] as const

// ZeroDev Kernel v3 execute(address,uint256,bytes) selector
const KERNEL_EXECUTE_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserOperation {
  sender: Address
  nonce: Hex
  initCode: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
  paymasterAndData: Hex
  signature: Hex
}

export interface BuildUserOpParams {
  /** Smart account address (the Kernel account) */
  sender: Address
  /** Session key private key — never sent to server */
  sessionKeyPrivateKey: Hex
  /** Call target */
  target: Address
  /** ABI-encoded calldata for the target */
  calldata: Hex
  /** Value in wei (default 0) */
  value?: bigint
  /** Chain ID */
  chainId: number
  /** RPC URL for the chain */
  rpcUrl: string
  /** Pimlico bundler/paymaster URL (e.g. https://api.pimlico.io/v1/base-sepolia/rpc?apikey=...) */
  bundlerUrl: string
}

// ── Nonce fetch ───────────────────────────────────────────────────────────────

async function fetchNonce(
  sender: Address,
  entryPoint: Address,
  rpcUrl: string,
  chainId: number,
): Promise<bigint> {
  const chainConfig = CHAIN_CONFIGS[chainId]
  if (!chainConfig) throw new Error(`Unsupported chainId: ${chainId}`)

  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  })

  return await client.readContract({
    address: entryPoint,
    abi: ENTRY_POINT_ABI,
    functionName: 'getNonce',
    args: [sender, BigInt(0)],
  })
}

// ── Gas estimation via Pimlico ────────────────────────────────────────────────

interface PimlicoSponsoredResult {
  paymasterAndData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
}

async function sponsorUserOperation(
  partialOp: Omit<UserOperation, 'signature'>,
  bundlerUrl: string,
  entryPoint: Address,
): Promise<PimlicoSponsoredResult> {
  const response = await fetch(bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [partialOp, entryPoint],
    }),
  })

  const json = await response.json()
  if (json.error) {
    throw new Error(`Pimlico pm_sponsorUserOperation error: ${json.error.message}`)
  }

  return json.result as PimlicoSponsoredResult
}

// ── UserOp hash (ERC-4337 spec) ───────────────────────────────────────────────

function packUserOp(op: Omit<UserOperation, 'signature'>): Hex {
  return encodeAbiParameters(
    parseAbiParameters(
      'address,uint256,bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,bytes32',
    ),
    [
      op.sender,
      BigInt(op.nonce),
      keccak256(op.initCode),
      keccak256(op.callData),
      BigInt(op.callGasLimit),
      BigInt(op.verificationGasLimit),
      BigInt(op.preVerificationGas),
      BigInt(op.maxFeePerGas),
      BigInt(op.maxPriorityFeePerGas),
      keccak256(op.paymasterAndData),
    ],
  )
}

export function getUserOpHash(
  op: Omit<UserOperation, 'signature'>,
  entryPoint: Address,
  chainId: number,
): Hex {
  const packed = packUserOp(op)
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('bytes32,address,uint256'),
      [keccak256(packed), entryPoint, BigInt(chainId)],
    ),
  )
}

// ── Main: build + sign UserOperation ─────────────────────────────────────────

export async function buildUserOperation(params: BuildUserOpParams): Promise<UserOperation> {
  const {
    sender,
    sessionKeyPrivateKey,
    target,
    calldata,
    value = BigInt(0),
    chainId,
    rpcUrl,
    bundlerUrl,
  } = params

  const chainConfig = CHAIN_CONFIGS[chainId]
  if (!chainConfig) throw new Error(`Unsupported chainId: ${chainId}`)

  const { entryPoint } = chainConfig

  // 1. Fetch nonce from EntryPoint
  const nonce = await fetchNonce(sender, entryPoint, rpcUrl, chainId)

  // 2. ABI-encode Kernel execute(target, value, calldata)
  const callData = encodeFunctionData({
    abi: KERNEL_EXECUTE_ABI,
    functionName: 'execute',
    args: [target, value, calldata],
  })

  // 3. Build partial UserOp (no gas fields yet — Pimlico fills these)
  const partialOp: Omit<UserOperation, 'signature'> = {
    sender,
    nonce: toHex(nonce),
    initCode: '0x',           // account already deployed; initCode used only on first tx
    callData,
    callGasLimit: '0x0',
    verificationGasLimit: '0x0',
    preVerificationGas: '0x0',
    maxFeePerGas: '0x0',
    maxPriorityFeePerGas: '0x0',
    paymasterAndData: '0x',
  }

  // 4. Get gas estimates + paymaster signature from Pimlico
  const sponsored = await sponsorUserOperation(partialOp, bundlerUrl, entryPoint)

  // 5. Assemble sponsored op
  const sponsoredOp: Omit<UserOperation, 'signature'> = {
    ...partialOp,
    callGasLimit: sponsored.callGasLimit,
    verificationGasLimit: sponsored.verificationGasLimit,
    preVerificationGas: sponsored.preVerificationGas,
    maxFeePerGas: sponsored.maxFeePerGas,
    maxPriorityFeePerGas: sponsored.maxPriorityFeePerGas,
    paymasterAndData: sponsored.paymasterAndData,
  }

  // 6. Compute UserOp hash and sign with session key (stays in browser)
  const userOpHash = getUserOpHash(sponsoredOp, entryPoint, chainId)
  const sessionAccount = privateKeyToAccount(sessionKeyPrivateKey)
  const signature = await sessionAccount.signMessage({ message: { raw: userOpHash } })

  return { ...sponsoredOp, signature }
}
