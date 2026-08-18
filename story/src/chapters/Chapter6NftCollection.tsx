import { useState } from 'react'
import { MOCK_COLLECTION, MALICIOUS_REQUEST } from '../lib/collection'

type Outcome = 'none' | 'drained' | 'blocked'

export default function Chapter6NftCollection() {
  const [outcome, setOutcome] = useState<Outcome>('none')

  return (
    <section id="ch-nft-collection" className="chapter">
      <div className="chapter-inner" style={{ maxWidth: 880 }}>
        <div className="eyebrow">A real scenario</div>
        <h2>Your NFT collection, and a "free mint"</h2>
        <p className="lead">
          This is the single largest source of NFT theft: not a hacked server, a malicious{' '}
          <em>approval</em>. A "connect wallet to claim" site doesn't ask to move one token — it
          asks for permission to move <strong>all of them, forever</strong>. Most wallets show
          that request as one signature popup, same as any other.
        </p>

        <div className="nft-grid">
          {MOCK_COLLECTION.map((nft) => (
            <div
              key={nft.id}
              className={`nft-card ${outcome === 'drained' ? 'nft-drained' : ''}`}
              style={{ ['--hue' as string]: nft.hue }}
            >
              <div className="nft-art" />
              <div className="nft-name">{nft.name}</div>
              {outcome === 'drained' && <div className="nft-gone-stamp">GONE</div>}
            </div>
          ))}
        </div>

        <div className="phishing-card">
          <div className="phishing-badge">🎁 Free Mint — Claim Now</div>
          <p>
            "Connect your wallet to claim your free airdrop before it's gone!" — asks for:
          </p>
          <dl className="permission-slip malicious-slip">
            <dt>target</dt>
            <dd>{MALICIOUS_REQUEST.target}</dd>
            <dt>function</dt>
            <dd>{MALICIOUS_REQUEST.function}</dd>
            <dt>scope</dt>
            <dd>{MALICIOUS_REQUEST.scope}</dd>
            <dt>expires</dt>
            <dd>{MALICIOUS_REQUEST.expires}</dd>
          </dl>
        </div>

        <div className="btn-row">
          <button className="secondary" onClick={() => setOutcome('drained')}>
            Approve with a normal wallet
          </button>
          <button className="cta" onClick={() => setOutcome('blocked')}>
            Approve with a GhostKey session key
          </button>
        </div>

        {outcome === 'drained' && (
          <div className="result-card blocked">
            <span className="code">approved</span>
            One signature. The operator can now move every token above, at any time, forever —
            no further approval ever needed. That's not a bug in the wallet; that's exactly what
            was granted.
          </div>
        )}

        {outcome === 'blocked' && (
          <div className="result-card ok">
            <span className="code">rejected — invalid scope</span>
            A GhostKey session key can't represent "all tokens, forever" — there's no field for
            it. Scope requires a specific target and function; value and time are bounded. The
            request above doesn't fit that shape, so it's rejected before anything is signed.
          </div>
        )}

        <div className="honesty-note">
          <strong>What this doesn't fix:</strong> a scoped key stops a malicious{' '}
          <em>contract call</em> like the one above. It does nothing if you're tricked into
          handing over a password, an email login, or manually sending funds to someone — that's
          social engineering, not a signing problem, and no wallet architecture solves it alone.
        </div>
      </div>
    </section>
  )
}
