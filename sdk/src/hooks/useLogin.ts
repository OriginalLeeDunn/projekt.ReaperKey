// useLogin — SPEC-100, SPEC-101
import { useState } from 'react'
import type { AuthMethod, GhostKeyError } from '../types.js'
import { useGhostKey } from '../provider.js'

export type LoginStatus = 'idle' | 'loading' | 'authenticated' | 'error'

export interface UseLoginReturn {
  login: (method: AuthMethod, credential: string) => Promise<void>
  logout: () => void
  status: LoginStatus
  userId: string | null
  error: GhostKeyError | null
}

export function useLogin(): UseLoginReturn {
  const { client } = useGhostKey()
  const [status, setStatus] = useState<LoginStatus>('idle')
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function login(method: AuthMethod, credential: string): Promise<void> {
    setStatus('loading')
    setError(null)

    // SPEC-100: private key must never be sent to any network request
    // Credential here is email/wallet address — not a private key
    const result = await client.login(method, credential)

    if (result.error) {
      setStatus('error')
      setError(result.error)
      return
    }

    // Store token in memory only — not localStorage (SPEC-100)
    client.setToken(result.data.token)
    setUserId(result.data.userId)
    setStatus('authenticated')
  }

  function logout(): void {
    client.clearToken()
    setUserId(null)
    setStatus('idle')
    setError(null)
  }

  return { login, logout, status, userId, error }
}
