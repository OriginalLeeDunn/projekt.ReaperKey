// useAccount — fetches or creates the user's smart account
import { useState, useEffect } from 'react'
import type { GhostKeyAccount, GhostKeyError } from '../types.js'
import { useGhostKey } from '../provider.js'

export interface UseAccountReturn {
  account: GhostKeyAccount | null
  loading: boolean
  error: GhostKeyError | null
  createAccount: (chain?: string) => Promise<void>
}

export function useAccount(): UseAccountReturn {
  const { client, config } = useGhostKey()
  const [account, setAccount] = useState<GhostKeyAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GhostKeyError | null>(null)

  async function createAccount(chain?: string): Promise<void> {
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return
    }

    setLoading(true)
    setError(null)

    const targetChain = chain ?? chainIdToName(config.chainId)
    const result = await client.createAccount(targetChain)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setAccount(result.data)
  }

  return { account, loading, error, createAccount }
}

function chainIdToName(chainId: number): string {
  const map: Record<number, string> = {
    8453: 'base',
    84532: 'base-sepolia',
  }
  return map[chainId] ?? 'base'
}
