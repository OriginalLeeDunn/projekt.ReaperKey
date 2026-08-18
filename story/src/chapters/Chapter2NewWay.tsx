export default function Chapter2NewWay() {
  return (
    <section id="ch-new-way" className="chapter">
      <div className="chapter-inner">
        <div className="eyebrow">Chapter 2</div>
        <h2>What if the app never held the keys at all?</h2>
        <p className="lead">
          GhostKey replaces "one key, total power" with a <strong>smart account</strong> — a
          contract wallet — plus short-lived <strong>session keys</strong> that are scoped to one
          contract, one function, one spending limit, one expiry. Instead of trusting a signature
          popup, you grant a narrow, temporary permission.
        </p>

        <div className="compare">
          <div className="compare-card bad">
            <h3>Traditional wallet</h3>
            <ul>
              <li>One key controls everything, forever</li>
              <li>Every signature is all-or-nothing trust</li>
              <li>Lose the seed phrase, lose everything</li>
              <li>A compromised app can drain the wallet</li>
            </ul>
          </div>
          <div className="compare-card good">
            <h3>GhostKey smart account</h3>
            <ul>
              <li>Session keys scoped to one contract + function</li>
              <li>Hard limits: max value, time-to-live</li>
              <li>Private key material never leaves your device</li>
              <li>Server stores only a hash — never a working key</li>
            </ul>
          </div>
        </div>

        <p className="note">Next: let's actually build one of these scoped keys.</p>
      </div>
    </section>
  )
}
