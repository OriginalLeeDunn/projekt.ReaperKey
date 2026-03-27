// session-registration.ts — GAP-003: on-chain session key registration
//
// Registers a session key with the ZeroDev Kernel v2.4 smart account by
// building and submitting a UserOperation that calls kernel.setExecution().
// After this UserOp is confirmed, the Kernel contract will accept UserOps
// signed by the session key for the scoped targets and selectors.
//
// Agent: SDK Engineer
// Phase: 6 (v1.0) — resolves GAP-003

import {
  encodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type Hex,
} from 'viem'
import { buildUserOperation, type BuildUserOpParams, type UserOperation } from './userop.js'

// ── ZeroDev Kernel v2.4 constants ─────────────────────────────────────────────

// ECDSA validator deployed at the same address on Base, Base Sepolia, Arbitrum
export const KERNEL_ECDSA_VALIDATOR = '0xd9AB5096a832b9ce79914329DAEE236f8Eea0390' as const

// execute(address,uint256,bytes) — the selector we're registering a session for
export const KERNEL_EXECUTE_SELECTOR = '0xb61d27f6' as const

// ── ABIs ──────────────────────────────────────────────────────────────────────

// Kernel v2.4: setExecution(bytes4, address, address, uint48, uint48, bytes)
const KERNEL_SET_EXECUTION_ABI = [
  {
    name: 'setExecution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_disableFlag',  type: 'bytes4'   },
      { name: '_executor',     type: 'address'  },
      { name: '_validator',    type: 'address'  },
      { name: '_validUntil',   type: 'uint48'   },
      { name: '_validAfter',   type: 'uint48'   },
      { name: '_enableData',   type: 'bytes'    },
    ],
    outputs: [],
  },
] as const

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterSessionKeyParams {
  /** Smart account (Kernel) address */
  kernelAddress: Address
  /** EOA address derived from the session key private key */
  sessionKeyAddress: Address
  /** Session key private key — used only to sign the registration UserOp */
  sessionKeyPrivateKey: Hex
  /** Unix timestamp (seconds) after which the session is valid (0 = immediately) */
  validAfter: number
  /** Unix timestamp (seconds) at which the session expires */
  validUntil: number
  /** Chain ID */
  chainId: number
  /** RPC URL for the chain */
  rpcUrl: string
  /** Pimlico bundler URL */
  bundlerUrl: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Encode the enable data for the ECDSA validator: just the 20-byte session key address.
 * The validator reads `address(bytes20(enableData[0:20]))`.
 */
function encodeEnableData(sessionKeyAddress: Address): Hex {
  return encodeAbiParameters(parseAbiParameters('address'), [sessionKeyAddress])
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Build a UserOperation that registers `sessionKeyAddress` as an executor on
 * the Kernel v2.4 smart account via `setExecution`.
 *
 * After this UserOp is confirmed on-chain, the Kernel will accept UserOps
 * for `execute(address,uint256,bytes)` signed by the session key.
 */
export async function buildSessionKeyRegistrationUserOp(
  params: RegisterSessionKeyParams,
): Promise<UserOperation> {
  const {
    kernelAddress,
    sessionKeyAddress,
    sessionKeyPrivateKey,
    validAfter,
    validUntil,
    chainId,
    rpcUrl,
    bundlerUrl,
  } = params

  // Encode setExecution calldata:
  //   _disableFlag  = KERNEL_EXECUTE_SELECTOR (the selector we're scoping)
  //   _executor     = sessionKeyAddress (the EOA allowed to trigger this execution path)
  //   _validator    = KERNEL_ECDSA_VALIDATOR (validates the session key signature)
  //   _validUntil   = expiry unix timestamp
  //   _validAfter   = start unix timestamp
  //   _enableData   = abi.encode(sessionKeyAddress) — validator reads the owner from this
  const calldata = encodeFunctionData({
    abi: KERNEL_SET_EXECUTION_ABI,
    functionName: 'setExecution',
    args: [
      KERNEL_EXECUTE_SELECTOR,
      sessionKeyAddress,
      KERNEL_ECDSA_VALIDATOR,
      validUntil,
      validAfter,
      encodeEnableData(sessionKeyAddress),
    ],
  })

  // The registration is a self-call: the Kernel account calls its own setExecution.
  // We build a UserOp with target = kernelAddress (self) and the calldata above.
  const buildParams: BuildUserOpParams = {
    sender: kernelAddress,
    sessionKeyPrivateKey,
    target: kernelAddress,   // self-call
    calldata,
    value: BigInt(0),
    chainId,
    rpcUrl,
    bundlerUrl,
  }

  return buildUserOperation(buildParams)
}

/**
 * Derive the EOA address from a session key private key.
 * Convenience wrapper — address is computed locally, key never leaves client.
 */
export async function deriveSessionKeyAddress(privateKey: Hex): Promise<Address> {
  const { privateKeyToAccount } = await import('viem/accounts')
  return privateKeyToAccount(privateKey).address
}
