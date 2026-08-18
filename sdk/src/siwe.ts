// siwe.ts — EIP-4361 (Sign-In with Ethereum) message construction.
//
// Builds the exact message text the server's `siwe` crate (spruceid/siwe-rs)
// re-parses on verification. The layout below is not a loose paraphrase of
// the spec — it matches that crate's `Display for Message` impl line for
// line, since the server round-trips this text through its own parser.

export interface BuildSiweMessageParams {
  /** Frontend origin the wallet is signing in to — e.g. `window.location.host`. */
  domain: string
  /** EIP-55 checksummed address (viem's `getAddress()` already returns this). */
  address: `0x${string}`
  /** Frontend origin as a full URI — e.g. `window.location.origin`. */
  uri: string
  /** Chain ID the session is bound to (84532 = Base Sepolia, 8453 = Base, 42161 = Arbitrum, 1 = Ethereum). */
  chainId: number
  /** Single-use nonce from `GET /auth/wallet/nonce`. */
  nonce: string
  /** Human-readable line shown in the wallet's signing prompt. */
  statement?: string
  /** Defaults to now. */
  issuedAt?: Date
}

export function buildSiweMessage(params: BuildSiweMessageParams): string {
  const {
    domain,
    address,
    uri,
    chainId,
    nonce,
    statement = 'Sign in to GhostKey',
    issuedAt = new Date(),
  } = params

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
  ].join('\n')
}

/** Hex-encodes a UTF-8 string for `personal_sign`'s message parameter (EIP-1193). */
export function toPersonalSignHex(message: string): `0x${string}` {
  const bytes = new TextEncoder().encode(message)
  let hex = '0x'
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex as `0x${string}`
}
