// useSessionKey — issues scoped session keys for intent execution
// v1.0 (GAP-003): adds registerSessionKeyOnChain() to register the key
//                 with the Kernel smart account via a UserOperation.
// Private keys are generated and stored client-side only (SPEC-100).
import { useState } from 'react'
import type { GhostKeyError, SessionKeyRequest, SessionKeyResponse } from '../types.js'
import { useGhostKey } from '../provider.js'
import {
  buildSessionKeyRegistrationUserOp,
  deriveSessionKeyAddress,
} from '../session-registration.js'
import type { Address, Hex } from 'viem'

export interface RegisterOnChainParams {
  /** Kernel (smart account) address */
  kernelAddress: Address
  /** Session key private key — stays in browser, used only for signing */
  sessionKeyPrivateKey: Hex
  /** Unix timestamp session becomes valid (0 = immediately) */
  validAfter: number
  /** Unix timestamp session expires */
  validUntil: number
  /** Chain ID */
  chainId: number
  /** RPC URL */
  rpcUrl: string
  /** Pimlico bundler URL */
  bundlerUrl: string
}

export interface UseSessionKeyReturn {
  sessionKey: SessionKeyResponse | null
  loading: boolean
  error: GhostKeyError | null
  issueSessionKey: (req: SessionKeyRequest) => Promise<SessionKeyResponse | null>
  clearSessionKey: () => void
  /**
   * GAP-003: Build the on-chain registration UserOp for the current session key,
   * submit it to the bundler, and return the UserOp hash.
   * Must be called after issueSessionKey() has stored a session key.
   */
  registerSessionKeyOnChain: (params: RegisterOnChainParams) => Promise<Hex | null>
}

// Bundler eth_sendUserOperation
async function sendUserOpToBundler(
  op: Record<string, unknown>,
  bundlerUrl: string,
  entryPoint: string,
): Promise<Hex> {
  const res = await fetch(bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendUserOperation',
      params: [op, entryPoint],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`bundler error: ${json.error.message}`)
  return json.result as Hex
}

// EntryPoint v0.6 — same on all chains
const ENTRY_POINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

export function useSessionKey(): UseSessionKeyReturn {
  const { client } = useGhostKey()
  const [sessionKey, setSessionKey] = useState<SessionKeyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function issueSessionKey(req: SessionKeyRequest): Promise<SessionKeyResponse | null> {
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return null
    }

    setLoading(true)
    setError(null)

    const result = await client.issueSessionKey(req)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return null
    }

    setSessionKey(result.data)
    return result.data
  }

  function clearSessionKey(): void {
    setSessionKey(null)
    setError(null)
  }

  async function registerSessionKeyOnChain(params: RegisterOnChainParams): Promise<Hex | null> {
    const {
      kernelAddress,
      sessionKeyPrivateKey,
      validAfter,
      validUntil,
      chainId,
      rpcUrl,
      bundlerUrl,
    } = params

    setLoading(true)
    setError(null)

    try {
      // Derive EOA address from the private key (stays client-side)
      const sessionKeyAddress = await deriveSessionKeyAddress(sessionKeyPrivateKey)

      // Build registration UserOp
      const userOp = await buildSessionKeyRegistrationUserOp({
        kernelAddress,
        sessionKeyAddress,
        sessionKeyPrivateKey,
        validAfter,
        validUntil,
        chainId,
        rpcUrl,
        bundlerUrl,
      })

      // Submit to bundler
      const userOpHash = await sendUserOpToBundler(
        userOp as unknown as Record<string, unknown>,
        bundlerUrl,
        ENTRY_POINT_V06,
      )

      setLoading(false)
      return userOpHash
    } catch (e) {
      setLoading(false)
      setError({ code: 'unknown', message: `Session key registration failed: ${String(e)}` })
      return null
    }
  }

  return { sessionKey, loading, error, issueSessionKey, clearSessionKey, registerSessionKeyOnChain }
}
