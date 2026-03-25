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
  /** Test-only: inject a mock client instead of constructing one. */
  _client?: GhostKeyClient
}

export function GhostKeyProvider({ config, children, _client }: GhostKeyProviderProps) {
  const client = useMemo(
    () => _client ?? new GhostKeyClient(config),
    [_client, config.apiUrl, config.chainId],
  )
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
