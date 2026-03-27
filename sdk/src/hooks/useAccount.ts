// useAccount — fetches or creates the user's smart account
// v1.0: adds computeKernelAddress for counterfactual address (GAP-002)
import { useState } from 'react'
import type { GhostKeyAccount, GhostKeyError } from '../types.js'
import { useGhostKey } from '../provider.js'
import { getKernelAddressFromOwner, getKernelAddressFromPrivateKey } from '../kernel-address.js'
import type { Address } from 'viem'

export interface UseAccountReturn {
  account: GhostKeyAccount | null
  loading: boolean
  error: GhostKeyError | null
  /** Legacy: caller provides the address manually */
  createAccount: (address: string) => Promise<void>
  fetchAccount: (accountId: string) => Promise<void>
  /**
   * v1.0: Compute the Kernel counterfactual address from an owner EOA address,
   * then register it. No manual address entry required.
   */
  createAccountFromOwner: (params: {
    ownerAddress: Address
    chainId: number
    rpcUrl: string
    index?: bigint
  }) => Promise<void>
  /**
   * Just compute the address without registering — useful for display / preview.
   */
  computeKernelAddress: (params: {
    ownerPrivateKey: `0x${string}`
    chainId: number
    rpcUrl: string
    index?: bigint
  }) => Promise<Address | null>
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

  async function createAccountFromOwner(params: {
    ownerAddress: Address
    chainId: number
    rpcUrl: string
    index?: bigint
  }): Promise<void> {
    if (!client.isAuthenticated()) {
      setError({ code: 'not_authenticated', message: 'Login required' })
      return
    }

    setLoading(true)
    setError(null)

    let address: Address
    try {
      address = await getKernelAddressFromOwner(params)
    } catch (e) {
      setLoading(false)
      setError({ code: 'unknown', message: `Kernel address computation failed: ${String(e)}` })
      return
    }

    const result = await client.createAccount(address)
    setLoading(false)

    if (result.error) { setError(result.error); return }
    setAccount(result.data)
  }

  async function computeKernelAddress(params: {
    ownerPrivateKey: `0x${string}`
    chainId: number
    rpcUrl: string
    index?: bigint
  }): Promise<Address | null> {
    try {
      return await getKernelAddressFromPrivateKey(params)
    } catch (e) {
      setError({ code: 'unknown', message: `Kernel address computation failed: ${String(e)}` })
      return null
    }
  }

  return { account, loading, error, createAccount, fetchAccount, createAccountFromOwner, computeKernelAddress }
}
