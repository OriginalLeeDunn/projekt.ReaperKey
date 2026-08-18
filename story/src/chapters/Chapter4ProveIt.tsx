import { useState } from 'react'
import { randomHex, sha256Hex } from '../lib/ghost'

interface Props {
  onKeyGenerated: (keyHex: string, hashHex: string) => void
}

export default function Chapter4ProveIt({ onKeyGenerated }: Props) {
  const [keyHex, setKeyHex] = useState<string | null>(null)
  const [hashHex, setHashHex] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function generate() {
    setGenerating(true)
    const key = randomHex(32)
    const hash = await sha256Hex(key)
    setKeyHex(key)
    setHashHex(hash)
    setGenerating(false)
    onKeyGenerated(key, hash)
  }

  return (
    <section id="ch-prove-it" className="chapter">
      <div className="chapter-inner">
        <div className="eyebrow">Chapter 4</div>
        <h2>Watch the key never leave</h2>
        <p className="lead">
          Click below and your browser will generate a real session key and hash it with real{' '}
          <code>SubtleCrypto</code> SHA-256 — right here, client-side. Nothing is sent anywhere.
          This is exactly what the SDK does before talking to a GhostKey server.
        </p>

        {!keyHex && (
          <div className="btn-row">
            <button className="cta" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate a session key'}
            </button>
          </div>
        )}

        {keyHex && hashHex && (
          <>
            <div className="key-panels">
              <div className="key-panel device">
                <div className="label">Stays on your device</div>
                <div className="value">{keyHex}</div>
              </div>
              <div className="key-panel server">
                <div className="label">The only thing a GhostKey server ever sees</div>
                <div className="value">{hashHex}</div>
              </div>
            </div>
            <p className="note">
              SHA-256 is one-way — that hash can't be reversed back into the key. Even a fully
              compromised server never had anything capable of signing a transaction.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
