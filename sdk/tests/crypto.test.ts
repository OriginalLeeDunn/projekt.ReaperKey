import { describe, it, expect } from 'vitest'
import { generateSessionKey } from '../src/crypto.js'

describe('generateSessionKey', () => {
  it('returns privateKey and keyHash as 64-char hex strings', async () => {
    const { privateKey, keyHash } = await generateSessionKey()
    expect(privateKey).toMatch(/^[0-9a-f]{64}$/)
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('keyHash is the SHA-256 of privateKey', async () => {
    const { privateKey, keyHash } = await generateSessionKey()

    // Recompute the hash from the raw key bytes
    const raw = new Uint8Array(
      privateKey.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
    )
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', raw)
    const expected = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    expect(keyHash).toBe(expected)
  })

  it('generates unique keys on each call', async () => {
    const a = await generateSessionKey()
    const b = await generateSessionKey()
    expect(a.privateKey).not.toBe(b.privateKey)
    expect(a.keyHash).not.toBe(b.keyHash)
  })

  it('privateKey and keyHash are different values', async () => {
    const { privateKey, keyHash } = await generateSessionKey()
    expect(privateKey).not.toBe(keyHash)
  })
})
