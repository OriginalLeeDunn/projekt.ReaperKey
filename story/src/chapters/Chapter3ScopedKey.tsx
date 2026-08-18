import { SCENARIOS, type SessionScope } from '../lib/ghost'

interface Props {
  scope: SessionScope
  onChange: (scope: SessionScope) => void
}

export default function Chapter3ScopedKey({ scope, onChange }: Props) {
  return (
    <section id="ch-scoped-key" className="chapter">
      <div className="chapter-inner" style={{ maxWidth: 880 }}>
        <div className="eyebrow">Chapter 3</div>
        <h2>Build a session key</h2>
        <p className="lead">
          This is what you'd grant a dApp instead of your master key. Adjust it — the permission
          slip on the right updates live. Notice what's <em>not</em> in it: no private key, no
          unlimited approval, no "forever."
        </p>

        <div className="builder">
          <div>
            <div className="control-group">
              <label>Which app gets a session key</label>
              <select
                value={scope.scenario.id}
                onChange={(e) => {
                  const scenario = SCENARIOS.find((s) => s.id === e.target.value)!
                  onChange({ ...scope, scenario })
                }}
              >
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Max value this key can move</label>
              <input
                type="range"
                min={0.001}
                max={1}
                step={0.001}
                value={scope.maxValueEth}
                onChange={(e) => onChange({ ...scope, maxValueEth: Number(e.target.value) })}
              />
              <div className="range-value">{scope.maxValueEth.toFixed(3)} ETH</div>
            </div>

            <div className="control-group">
              <label>Expires in</label>
              <input
                type="range"
                min={1}
                max={120}
                step={1}
                value={scope.ttlMinutes}
                onChange={(e) => onChange({ ...scope, ttlMinutes: Number(e.target.value) })}
              />
              <div className="range-value">{scope.ttlMinutes} minutes</div>
            </div>
          </div>

          <div className="permission-slip">
            <div className="title">◆ session_key.scope</div>
            <dl>
              <dt>target</dt>
              <dd>{scope.scenario.targetLabel}</dd>
              <dt>address</dt>
              <dd title={scope.scenario.targetAddress}>
                {scope.scenario.targetAddress.slice(0, 8)}…{scope.scenario.targetAddress.slice(-6)}
              </dd>
              <dt>selector</dt>
              <dd>{scope.scenario.selector}</dd>
              <dt>function</dt>
              <dd>{scope.scenario.functionLabel}</dd>
              <dt>max_value</dt>
              <dd>{scope.maxValueEth.toFixed(3)} ETH</dd>
              <dt>ttl</dt>
              <dd>{scope.ttlMinutes} min</dd>
            </dl>
          </div>
        </div>

        <p className="note">
          This is the exact shape of a real GhostKey <code>SessionKeyRequest</code> — same fields,
          same limits. Nothing here is simplified for the demo.
        </p>
      </div>
    </section>
  )
}
