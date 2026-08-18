import { useState } from 'react'
import { evaluateIntent, SCENARIOS, type IntentResult, type SessionScope } from '../lib/ghost'

interface Props {
  scope: SessionScope
  keyReady: boolean
}

export default function Chapter5Reveal({ scope, keyReady }: Props) {
  const [result, setResult] = useState<IntentResult | null>(null)

  function trySpend(withinScope: boolean) {
    if (withinScope) {
      setResult(
        evaluateIntent(scope, {
          targetAddress: scope.scenario.targetAddress,
          selector: scope.scenario.selector,
          valueEth: Math.min(scope.maxValueEth, scope.maxValueEth * 0.6),
        }),
      )
    } else {
      // Attempt a call the session key was never scoped for.
      const otherScenario = SCENARIOS.find((s) => s.id !== scope.scenario.id)!
      setResult(
        evaluateIntent(scope, {
          targetAddress: otherScenario.targetAddress,
          selector: otherScenario.selector,
          valueEth: scope.maxValueEth * 3,
        }),
      )
    }
  }

  return (
    <section id="ch-reveal" className="chapter">
      <div className="chapter-inner">
        <div className="eyebrow">Chapter 5</div>
        <h2>Now try to break it</h2>
        <p className="lead">
          Using the session key you just built, try sending a transaction that's within its scope
          — then try one that isn't. This is exactly what the real server checks on every intent.
        </p>

        {!keyReady && <p className="note">Generate a session key in Chapter 4 first.</p>}

        {keyReady && (
          <div className="btn-row">
            <button className="cta" onClick={() => trySpend(true)}>
              Send within scope
            </button>
            <button className="secondary" onClick={() => trySpend(false)}>
              Try to exceed it
            </button>
          </div>
        )}

        {result && (
          <div className={`result-card ${result.ok ? 'ok' : 'blocked'}`}>
            {result.ok ? (
              <>
                <span className="code">confirmed</span>
                tx {result.txHash.slice(0, 18)}… — within scope, executed.
              </>
            ) : (
              <>
                <span className="code">{result.code}</span>
                {result.message}
              </>
            )}
          </div>
        )}

        {result && !result.ok && (
          <p className="note">
            That's the whole point: the rejection didn't happen because someone was watching — it
            happened because the key was never capable of anything more in the first place.
          </p>
        )}
      </div>
    </section>
  )
}
