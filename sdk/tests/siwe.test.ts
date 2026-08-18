import { describe, it, expect } from 'vitest'
import { buildSiweMessage, toPersonalSignHex } from '../src/siwe.js'

describe('buildSiweMessage', () => {
  it('produces the exact EIP-4361 layout the server re-parses', () => {
    const message = buildSiweMessage({
      domain: 'localhost:3000',
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      uri: 'http://localhost:3000',
      chainId: 84532,
      nonce: 'abc123XYZ',
      statement: 'Sign in to GhostKey',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    expect(message).toBe(
      [
        'localhost:3000 wants you to sign in with your Ethereum account:',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '',
        'Sign in to GhostKey',
        '',
        'URI: http://localhost:3000',
        'Version: 1',
        'Chain ID: 84532',
        'Nonce: abc123XYZ',
        'Issued At: 2026-01-01T00:00:00.000Z',
      ].join('\n'),
    )
  })

  it('defaults the statement and issuedAt when omitted', () => {
    const message = buildSiweMessage({
      domain: 'localhost:3000',
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      uri: 'http://localhost:3000',
      chainId: 8453,
      nonce: 'n',
    })

    expect(message).toContain('Sign in to GhostKey')
    expect(message).toMatch(/Issued At: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

describe('toPersonalSignHex', () => {
  it('hex-encodes UTF-8 bytes with a 0x prefix', () => {
    expect(toPersonalSignHex('hi')).toBe('0x6869')
  })
})
