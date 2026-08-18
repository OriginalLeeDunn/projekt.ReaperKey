// useWalletLogin — SIWE (Sign-In with Ethereum) login via an injected wallet
// (MetaMask or any EIP-1193 provider). Composes useLogin rather than
// duplicating its state: the SIWE-specific part is only getting a nonce,
// building the message, and asking the wallet to sign it — the actual
// login/session handling is identical to email login from here on.
import { useState } from 'react'
import type { GhostKeyError } from '../types.js'
import { useGhostKey } from '../provider.js'
import { useLogin, type LoginStatus } from './useLogin.js'
import { buildSiweMessage, toPersonalSignHex } from '../siwe.js'

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getEthereumProvider(): EthereumProvider | null {
  const eth = (globalThis as { ethereum?: EthereumProvider }).ethereum
  return eth ?? null
}

export interface UseWalletLoginReturn {
  /** Prompts the wallet for accounts, requests a nonce, and signs a SIWE message. */
  connect: () => Promise<void>
  status: LoginStatus
  userId: string | null
  /** The connecting wallet's address, set as soon as the wallet returns it. */
  address: string | null
  error: GhostKeyError | null
}

export function useWalletLogin(): UseWalletLoginReturn {
  const { client, config } = useGhostKey()
  const { login, status, userId, error: loginError } = useLogin()
  const [address, setAddress] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<GhostKeyError | null>(null)

  async function connect(): Promise<void> {
    setConnectError(null)

    const eth = getEthereumProvider()
    if (!eth) {
      setConnectError({ code: 'wallet_not_found', message: 'No injected wallet (e.g. MetaMask) found' })
      return
    }

    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      const walletAddress = accounts[0]
      if (!walletAddress) {
        setConnectError({ code: 'wallet_not_found', message: 'Wallet returned no accounts' })
        return
      }
      setAddress(walletAddress)

      const nonceResult = await client.fetchWalletNonce()
      if (nonceResult.error) {
        setConnectError(nonceResult.error)
        return
      }

      // SPEC-100: no private key or key material is ever touched here —
      // the wallet extension holds the key; we only ask it to sign text.
      const message = buildSiweMessage({
        domain: window.location.host,
        address: walletAddress as `0x${string}`,
        uri: window.location.origin,
        chainId: config.chainId,
        nonce: nonceResult.data,
      })

      const signature = (await eth.request({
        method: 'personal_sign',
        params: [toPersonalSignHex(message), walletAddress],
      })) as string

      await login('wallet', message, signature)
    } catch {
      setConnectError({ code: 'wallet_not_found', message: 'Wallet connection was rejected or failed' })
    }
  }

  return { connect, status, userId, address, error: connectError ?? loginError }
}
