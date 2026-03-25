import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { GhostKeyClient } from './client.js'
import type { GhostKeyConfig } from './types.js'

interface GhostKeyContextValue {
  client: GhostKeyClient
  config: GhostKeyConfig
}

const GhostKeyContext = createContext<GhostKeyContextValue | null>(null)

export interface GhostKeyProviderProps {
  config: GhostKeyConfig
  children: ReactNode
}

export function GhostKeyProvider({ config, children }: GhostKeyProviderProps) {
  const client = useMemo(() => new GhostKeyClient(config), [config.apiUrl, config.chainId])
  return (
    <GhostKeyContext.Provider value={{ client, config }}>
      {children}
    </GhostKeyContext.Provider>
  )
}

export function useGhostKey(): GhostKeyContextValue {
  const ctx = useContext(GhostKeyContext)
  if (!ctx) {
    throw new Error('useGhostKey must be used inside <GhostKeyProvider>')
  }
  return ctx
}
