// e2e.bundler.test.ts — Phase 6 gate: real Base Sepolia + live Pimlico
//
// This test is SKIPPED unless the following environment variables are set:
//   PIMLICO_API_KEY        — Pimlico dashboard API key
//   BASE_SEPOLIA_RPC_URL   — Base Sepolia RPC endpoint (Alchemy / Infura / public)
//   E2E_OWNER_PRIVATE_KEY  — Owner EOA private key (HD test wallet, no real funds needed)
//
// The Pimlico verifying paymaster sponsors all gas — the owner EOA needs no ETH.
//
// Flow:
//   1. Derive owner EOA from E2E_OWNER_PRIVATE_KEY
//   2. Compute Kernel v2.4 counterfactual address (no deployment required)
//   3. Generate ephemeral session key
//   4. Build a zero-value UserOp (calldata = 0x, target = self) via Pimlico paymaster
//   5. Submit via eth_sendUserOperation
//   6. Poll Pimlico for UserOp receipt (up to 60s)
//   7. Assert final status is 'success' and receipt contains a txHash
//
// Resolves: issue #101 — Phase 6 gate test (QA hard rule)

import { describe, it, expect, beforeAll } from 'vitest'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { buildUserOperation } from '../src/userop.js'
import { getKernelAddressFromPrivateKey } from '../src/kernel-address.js'

// ── Gate: skip if secrets not available ──────────────────────────────────────

const PIMLICO_API_KEY      = process.env.PIMLICO_API_KEY
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL
const OWNER_PRIVATE_KEY    = process.env.E2E_OWNER_PRIVATE_KEY as `0x${string}` | undefined

const SKIP = !PIMLICO_API_KEY || !BASE_SEPOLIA_RPC_URL || !OWNER_PRIVATE_KEY

const CHAIN_ID = 84532 // Base Sepolia

function pimlicoUrl(apiKey: string): string {
  return `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${apiKey}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pollForReceipt(
  bundlerUrl: string,
  userOpHash: string,
  timeoutMs = 60_000,
): Promise<{ success: boolean; receipt: Record<string, unknown> }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000))

    const res = await fetch(bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash],
      }),
    })

    const json = await res.json()
    if (json.result && json.result !== null) {
      return {
        success: json.result.success === true,
        receipt: json.result,
      }
    }
  }

  throw new Error(`UserOp ${userOpHash} not confirmed within ${timeoutMs}ms`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe.skipIf(SKIP)(
  'E2E: Base Sepolia + live Pimlico paymaster',
  () => {
    let kernelAddress: `0x${string}`
    let sessionKeyPrivateKey: `0x${string}`
    let bundlerUrl: string

    beforeAll(async () => {
      bundlerUrl = pimlicoUrl(PIMLICO_API_KEY!)

      // Compute Kernel counterfactual address for the owner
      kernelAddress = await getKernelAddressFromPrivateKey({
        ownerPrivateKey: OWNER_PRIVATE_KEY!,
        chainId: CHAIN_ID,
        rpcUrl: BASE_SEPOLIA_RPC_URL!,
      })

      // Generate an ephemeral session key for this test run
      sessionKeyPrivateKey = generatePrivateKey()

      console.info(`[E2E] Kernel address:     ${kernelAddress}`)
      console.info(`[E2E] Session key addr:   ${privateKeyToAccount(sessionKeyPrivateKey).address}`)
      console.info(`[E2E] Chain:              Base Sepolia (${CHAIN_ID})`)
    })

    it('builds a sponsored UserOp and receives a userOpHash from Pimlico', async () => {
      const userOp = await buildUserOperation({
        sender: kernelAddress,
        sessionKeyPrivateKey,
        target: kernelAddress,   // self-call, no-op
        calldata: '0x',
        value: BigInt(0),
        chainId: CHAIN_ID,
        rpcUrl: BASE_SEPOLIA_RPC_URL!,
        bundlerUrl,
      })

      expect(userOp.sender).toBe(kernelAddress)
      expect(userOp.signature).toMatch(/^0x[0-9a-f]+$/)
      // Gas fields populated by Pimlico
      expect(BigInt(userOp.callGasLimit)).toBeGreaterThan(0n)
      expect(BigInt(userOp.verificationGasLimit)).toBeGreaterThan(0n)
      expect(userOp.paymasterAndData).not.toBe('0x')
    }, 30_000)

    it('submits UserOp to bundler and polls to confirmed', async () => {
      const userOp = await buildUserOperation({
        sender: kernelAddress,
        sessionKeyPrivateKey,
        target: kernelAddress,
        calldata: '0x',
        value: BigInt(0),
        chainId: CHAIN_ID,
        rpcUrl: BASE_SEPOLIA_RPC_URL!,
        bundlerUrl,
      })

      // Submit
      const sendRes = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'],
        }),
      })
      const sendJson = await sendRes.json()

      if (sendJson.error) {
        // Surface the Pimlico error clearly
        throw new Error(`eth_sendUserOperation failed: ${JSON.stringify(sendJson.error)}`)
      }

      const userOpHash: string = sendJson.result
      expect(userOpHash).toMatch(/^0x[0-9a-f]{64}$/)
      console.info(`[E2E] UserOp hash: ${userOpHash}`)

      // Poll until confirmed
      const { success, receipt } = await pollForReceipt(bundlerUrl, userOpHash, 60_000)

      const txHash = (receipt as Record<string, Record<string, string>>).receipt?.transactionHash
      console.info(`[E2E] Confirmed. txHash: ${txHash}`)

      expect(success).toBe(true)
      expect(txHash).toMatch(/^0x[0-9a-f]{64}$/)
    }, 90_000)
  },
)
