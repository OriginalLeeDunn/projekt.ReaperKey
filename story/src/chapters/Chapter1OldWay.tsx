import { useEffect, useState } from 'react'

const ROWS = [
  { label: 'Signed: "Approve" on unfamiliar_contract.eth', delta: '' },
  { label: 'Token approval granted: unlimited', delta: '' },
  { label: 'Transfer out — 2.40 ETH', delta: '-2.40 ETH' },
  { label: 'Transfer out — all remaining USDC', delta: '-1,800 USDC' },
  { label: 'Transfer out — 3 NFTs', delta: '-3 items' },
]

export default function Chapter1OldWay() {
  const [visibleRows, setVisibleRows] = useState(0)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.getElementById('ch-old-way')
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    if (visibleRows >= ROWS.length) return
    const t = setTimeout(() => setVisibleRows((n) => n + 1), 550)
    return () => clearTimeout(t)
  }, [inView, visibleRows])

  return (
    <section id="ch-old-way" className="chapter">
      <div className="chapter-inner">
        <div className="eyebrow">Chapter 1</div>
        <h2>One key. One click. Everything, gone.</h2>
        <p className="lead">
          A normal wallet gives you a single private key — usually as a 12-word seed phrase — that
          controls every asset you'll ever hold with it. It can't say "just this much" or "just this
          contract." It can only say yes to everything, or nothing.
        </p>
        <p className="lead">
          So when someone signs one bad transaction — a fake mint, a malicious "approve" —
          they've usually just handed over full control.
        </p>

        <div className="seed-phrase">
          witch collapse practice feed shame open despair creek road again ice least
        </div>

        <div className="drain-card">
          {ROWS.slice(0, visibleRows).map((row, i) => (
            <div className={`drain-row ${i === ROWS.length - 1 ? '' : ''}`} key={row.label}>
              <span>{row.label}</span>
              <span>{row.delta}</span>
            </div>
          ))}
          {visibleRows >= ROWS.length && (
            <div className="drain-row balance">
              <span>Wallet balance</span>
              <span>$0.00</span>
            </div>
          )}
        </div>

        <p className="note">
          This isn't rare. It's the single most common way crypto gets stolen — not broken math,
          just a key with no concept of "how much" or "how long."
        </p>
      </div>
    </section>
  )
}
