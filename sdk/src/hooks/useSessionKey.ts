// useSessionKey — issues scoped session keys for intent execution
// Private keys are generated and stored client-side only (SPEC-100).
import { useState } from 'react'
import type { GhostKeyError, SessionKeyRequest, SessionKeyResponse } from '../types.js'
import { useGhostKey } from '../provider.js'

export interface UseSessionKeyReturn {
  sessionKey: SessionKeyResponse | null
  loading: boolean
  error: GhostKeyError | null
  issueSessionKey: (req: SessionKeyRequest) => Promise<SessionKeyResponse | null>
  clearSessionKey: () => void
}

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

  return { sessionKey, loading, error, issueSessionKey, clearSessionKey }
}
