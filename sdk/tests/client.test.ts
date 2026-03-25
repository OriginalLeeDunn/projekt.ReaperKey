import { describe, it, expect, beforeEach } from 'vitest'
import { GhostKeyClient } from '../src/client.js'

describe('GhostKeyClient', () => {
  let client: GhostKeyClient

  beforeEach(() => {
    client = new GhostKeyClient({ apiUrl: 'http://localhost:8080', chainId: 84532 })
  })

  it('initialises unauthenticated', () => {
    expect(client.isAuthenticated()).toBe(false)
  })

  it('setToken marks client as authenticated', () => {
    client.setToken('test-token')
    expect(client.isAuthenticated()).toBe(true)
  })

  it('clearToken marks client as unauthenticated', () => {
    client.setToken('test-token')
    client.clearToken()
    expect(client.isAuthenticated()).toBe(false)
  })
})
