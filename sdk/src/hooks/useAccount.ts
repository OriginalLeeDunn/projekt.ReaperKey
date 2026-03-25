// useAccount — fetches or creates the user's smart account
import { useState } from 'react'
import type { GhostKeyAccount, GhostKeyError } from '../types.js'
import { useGhostKey } from '../provider.js'

export interface UseAccountReturn {
  account: GhostKeyAccount | null
  loading: boolean
  error: GhostKeyError | null
  createAccount: (address: string) => Promise<void>
  fetchAccount: (accountId: string) => Promise<void>
}

export function useAccount(): UseAccountReturn {
  const { client } = useGhostKey()
  const [account, setAccount] = useState<GhostKeyAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function createAccount(address: string): Promise<void> {
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return
    }

    setLoading(true)
    setError(null)

    const result = await client.createAccount(address)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setAccount(result.data)
  }

  async function fetchAccount(accountId: string): Promise<void> {
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return
    }

    setLoading(true)
    setError(null)

    const result = await client.getAccount(accountId)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setAccount(result.data)
  }

  return { account, loading, error, createAccount, fetchAccount }
}
