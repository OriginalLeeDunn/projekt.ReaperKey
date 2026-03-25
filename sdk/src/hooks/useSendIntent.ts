// useSendIntent — SPEC-102, SPEC-103
import { useState } from 'react'
import type { GhostKeyError, Intent, IntentResult, IntentStatus } from '../types.js'
import { useGhostKey } from '../provider.js'

export interface UseSendIntentReturn {
  sendIntent: (sessionId: string, intent: Intent) => Promise<IntentResult | null>
  status: IntentStatus | null
  txHash: string | null
  error: GhostKeyError | null
  reset: () => void
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 60000

export function useSendIntent(): UseSendIntentReturn {
  const { client } = useGhostKey()
  const [status, setStatus] = useState<IntentStatus | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function sendIntent(sessionId: string, intent: Intent): Promise<IntentResult | null> {
    // SPEC-102: require authentication
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return null
    }

    setError(null)
    setStatus('pending')
    setTxHash(null)

    const submitResult = await client.executeIntent(sessionId, intent)

    if (submitResult.error) {
      setStatus(null)
      setError(submitResult.error)
      return null
    }

    const intentId = submitResult.data.intentId
    setStatus(submitResult.data.status)

    // Poll until confirmed or failed (SPEC-103)
    return await pollUntilSettled(intentId)
  }

  async function pollUntilSettled(intentId: string): Promise<IntentResult | null> {
    const deadline = Date.now() + POLL_TIMEOUT_MS

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS)

      const result = await client.getIntentStatus(intentId)
      if (result.error) {
        setError(result.error)
        setStatus(null)
        return null
      }

      const { status: s, txHash: hash } = result.data
      setStatus(s)
      if (hash) setTxHash(hash)

      if (s === 'confirmed' || s === 'failed') {
        return result.data
      }
    }

    setError({ code: 'unknown', message: 'Intent polling timed out' })
    return null
  }

  function reset(): void {
    setStatus(null)
    setTxHash(null)
    setError(null)
  }

  return { sendIntent, status, txHash, error, reset }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
