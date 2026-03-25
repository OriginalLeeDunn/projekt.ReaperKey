// GhostKey client-side cryptography utilities
// Uses the WebCrypto API (window.crypto.subtle) — no external dependencies.
// The raw private key NEVER leaves the client. Only the SHA-256 hash is sent
// to the server when issuing a session key (SPEC-100 non-custodial constraint).

export interface SessionKey {
  /** 32-byte random private key, hex-encoded. NEVER send this to the server. */
  privateKey: string
  /** SHA-256(privateKey), hex-encoded. Safe to send to the server. */
  keyHash: string
}

/**
 * Generate a new session key for use with `useSessionKey.issueSessionKey()`.
 *
 * Returns both the raw private key (keep in memory, never send) and the
 * SHA-256 hash (send as `keyHash` in `SessionKeyRequest`).
 *
 * @example
 * const { privateKey, keyHash } = await generateSessionKey()
 * await issueSessionKey({ ..., keyHash })
 * // Sign intents locally using privateKey, then call sendIntent()
 */
export async function generateSessionKey(): Promise<SessionKey> {
  const subtle = globalThis.crypto.subtle
  const raw = new Uint8Array(32)
  globalThis.crypto.getRandomValues(raw)

  const hashBuffer = await subtle.digest('SHA-256', raw)
  const hashArray = new Uint8Array(hashBuffer)

  return {
    privateKey: toHex(raw),
    keyHash: toHex(hashArray),
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
