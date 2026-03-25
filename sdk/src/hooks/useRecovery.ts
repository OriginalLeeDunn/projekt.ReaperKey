// useRecovery — initiates account recovery flow (SPEC-040)
// Recovery is user-controlled. The server NEVER receives or stores private keys.
import { useState } from 'react'
import type { GhostKeyError, RecoveryResult } from '../types.js'
import { useGhostKey } from '../provider.js'

export interface UseRecoveryReturn {
  result: RecoveryResult | null
  loading: boolean
  error: GhostKeyError | null
  initiateRecovery: (accountAddress: string) => Promise<RecoveryResult | null>
  reset: () => void
}

export function useRecovery(): UseRecoveryReturn {
  const { client } = useGhostKey()
  const [result, setResult] = useState<RecoveryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function initiateRecovery(accountAddress: string): Promise<RecoveryResult | null> {
    setLoading(true)
    setError(null)

    const apiResult = await client.initiateRecovery(accountAddress)

    setLoading(false)

    if (apiResult.error) {
      setError(apiResult.error)
      return null
    }

    setResult(apiResult.data)
    return apiResult.data
  }

  function reset(): void {
    setResult(null)
    setError(null)
  }

  return { result, loading, error, initiateRecovery, reset }
}
