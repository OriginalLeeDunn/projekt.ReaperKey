import { useState } from 'react'
import ScrollChrome from './components/ScrollChrome'
import Chapter1OldWay from './chapters/Chapter1OldWay'
import Chapter2NewWay from './chapters/Chapter2NewWay'
import Chapter3ScopedKey from './chapters/Chapter3ScopedKey'
import Chapter4ProveIt from './chapters/Chapter4ProveIt'
import Chapter5Reveal from './chapters/Chapter5Reveal'
import { SCENARIOS, type SessionScope } from './lib/ghost'

const CHAPTER_IDS = ['ch-hero', 'ch-old-way', 'ch-new-way', 'ch-scoped-key', 'ch-prove-it', 'ch-reveal', 'ch-outro']

export default function App() {
  const [scope, setScope] = useState<SessionScope>({
    scenario: SCENARIOS[0],
    maxValueEth: 0.05,
    ttlMinutes: 30,
  })
  const [keyReady, setKeyReady] = useState(false)

  return (
    <>
      <ScrollChrome chapterIds={CHAPTER_IDS} />

      <section id="ch-hero" className="chapter hero">
        <div className="chapter-inner">
          <div className="ghost-mark">👻🔑</div>
          <div className="eyebrow">An interactive story</div>
          <h1>Why GhostKey exists</h1>
          <p className="sub">
            Every crypto hack you've heard about usually traces back to one thing: a key that
            could do everything, forever. This walks through why GhostKey builds it differently —
            and lets you build and break a real scoped key yourself.
          </p>
          <div className="scroll-cue">scroll ↓</div>
        </div>
      </section>

      <Chapter1OldWay />
      <Chapter2NewWay />
      <Chapter3ScopedKey scope={scope} onChange={setScope} />
      <Chapter4ProveIt onKeyGenerated={() => setKeyReady(true)} />
      <Chapter5Reveal scope={scope} keyReady={keyReady} />

      <section id="ch-outro" className="chapter footer-cta">
        <div className="chapter-inner">
          <div className="eyebrow">That's the pitch</div>
          <h2>Non-custodial doesn't have to mean inconvenient.</h2>
          <p className="lead">
            Scoped, short-lived, server-never-sees-the-key session keys — built on ERC-4337 smart
            accounts. This is a real, working SDK, not a concept.
          </p>
          <div className="footer-links">
            <a href="https://www.npmjs.com/package/@ghostkey/sdk" target="_blank" rel="noreferrer">
              npm install @ghostkey/sdk
            </a>
            <a href="https://github.com/OriginalLeeDunn/projekt.ReaperKey" target="_blank" rel="noreferrer">
              Source on GitHub
            </a>
            <a href="https://github.com/OriginalLeeDunn/projekt.ReaperKey/blob/main/docs/quickstart.md" target="_blank" rel="noreferrer">
              Read the quickstart
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
