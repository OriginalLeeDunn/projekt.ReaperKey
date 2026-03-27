import React, { useState, useEffect, useCallback } from 'react'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

function MarkdownView({ content, maxHeight = 500 }: { content: string; maxHeight?: number }) {
  return (
    <div
      className="md-body"
      style={{ overflow: 'auto', maxHeight, lineHeight: 1.65, fontSize: '0.82rem', color: '#ccc' }}
      dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
    />
  )
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const S = {
  page: { background: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
  header: { background: '#111', borderBottom: '1px solid #222', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
  headerTitle: { fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' } as React.CSSProperties,
  headerSub: { fontSize: '0.7rem', color: '#555' } as React.CSSProperties,
  tabBar: { background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: 0, padding: '0 1.5rem' } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '0.65rem 1.1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: active ? '#60a5fa' : '#555',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid' as const,
    borderBottomColor: active ? '#2563eb' : 'transparent',
    letterSpacing: '0.04em',
    userSelect: 'none' as const,
  }),
  body: { padding: '1rem 1.5rem', maxWidth: 1400, margin: '0 auto' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '320px 1fr 1fr', gap: '1rem' } as React.CSSProperties,
  col: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: '1rem' } as React.CSSProperties,
  cardTitle: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#555', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.62rem', fontWeight: 700,
    background: color === 'green' ? '#14532d' : color === 'red' ? '#7f1d1d' : color === 'yellow' ? '#713f12' : color === 'blue' ? '#1e3a5f' : '#1c1c1c',
    color: color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : color === 'yellow' ? '#fbbf24' : color === 'blue' ? '#60a5fa' : '#888',
    border: `1px solid ${color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'yellow' ? '#92400e' : color === 'blue' ? '#1d4ed8' : '#333'}`,
  }) as React.CSSProperties,
  mono: { fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', wordBreak: 'break-all' as const } as React.CSSProperties,
  pre: { fontFamily: 'monospace', fontSize: '0.72rem', color: '#aaa', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 4, padding: '0.75rem', overflow: 'auto', maxHeight: 440, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const } as React.CSSProperties,
  input: { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', boxSizing: 'border-box' as const, marginBottom: '0.5rem' } as React.CSSProperties,
  textarea: { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', resize: 'vertical' as const, minHeight: 90, boxSizing: 'border-box' as const, marginBottom: '0.5rem' } as React.CSSProperties,
  select: { background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', marginBottom: '0.5rem' } as React.CSSProperties,
  btn: (disabled?: boolean) => ({ background: disabled ? '#1a1a1a' : '#2563eb', border: '1px solid ' + (disabled ? '#222' : '#1d4ed8'), borderRadius: 4, color: disabled ? '#444' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.78rem', padding: '0.45rem 1rem', fontWeight: 600 }) as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' } as React.CSSProperties,
  divider: { borderTop: '1px solid #1a1a1a', margin: '0.65rem 0' } as React.CSSProperties,
  sectionLabel: { fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.4rem' } as React.CSSProperties,
  mdBody: { overflow: 'auto', maxHeight: 600, lineHeight: 1.65, fontSize: '0.82rem', color: '#ccc' } as React.CSSProperties,
  phaseRow: (done: boolean, active: boolean) => ({
    display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.5rem 0.6rem',
    borderRadius: 5, marginBottom: '0.3rem',
    background: active ? '#1a2a1a' : done ? '#111' : '#0f0f0f',
    border: `1px solid ${active ? '#166534' : done ? '#1e1e1e' : '#181818'}`,
  }) as React.CSSProperties,
}

// ── Health Panel ──────────────────────────────────────────────────────────────
function HealthPanel() {
  const [health, setHealth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/file?path=docs/agents/HEALTH.md')
      .then(r => r.json())
      .then(d => { setHealth(d.content || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const overall = health?.match(/OVERALL: (.+)/)?.[1] ?? 'UNKNOWN'
  const hasGaps = overall.includes('GAPS') || overall.includes('CRITICAL')
  const isHealthy = overall.includes('HEALTHY') && !hasGaps
  const openIssues = health?.match(/OPEN ISSUES:\s+(.+)/)?.[1] ?? '?'
  const stats = [
    health?.match(/TESTS PASSING:\s+(.+)/)?.[1],
    health?.match(/COVERAGE:\s+(.+)/)?.[1],
    health?.match(/PHASE PROGRESS:\s+(.+)/)?.[1],
    health?.match(/SDK VERSION:\s+(.+)/)?.[1],
  ].filter(Boolean)

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        System Health
        <span style={S.badge(loading ? 'grey' : hasGaps ? 'yellow' : isHealthy ? 'green' : 'red')}>
          {loading ? 'LOADING' : hasGaps ? 'GAPS' : isHealthy ? 'HEALTHY' : 'UNKNOWN'}
        </span>
        {health && (
          <button onClick={() => setExpanded(e => !e)}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', borderRadius: 3, color: '#555', fontSize: '0.62rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>
            {expanded ? 'collapse' : 'full report'}
          </button>
        )}
      </div>
      {loading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div> : (
        <>
          <div style={{ ...S.mono, color: hasGaps ? '#fbbf24' : '#4ade80', marginBottom: '0.4rem', fontSize: '0.68rem' }}>{overall}</div>
          {!expanded && (
            <>
              <div style={S.divider} />
              {stats.map((l, i) => <div key={i} style={{ ...S.mono, marginBottom: '0.2rem' }}>{l}</div>)}
              <div style={S.divider} />
              <div style={{ fontSize: '0.72rem', color: '#666' }}>
                Open issues: <span style={{ color: openIssues !== '0' ? '#fbbf24' : '#4ade80' }}>{openIssues}</span>
              </div>
            </>
          )}
          {expanded && health && <MarkdownView content={health} maxHeight={520} />}
        </>
      )}
    </div>
  )
}

// ── CI Panel ──────────────────────────────────────────────────────────────────
interface WorkflowRun { id: number; name: string; conclusion: string | null; status: string; html_url: string; created_at: string; head_branch: string }

function CIPanel() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/github/runs')
      .then(r => r.json())
      .then(d => { setRuns(d.workflow_runs ? d.workflow_runs.slice(0, 10) : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const runColor = (run: WorkflowRun) => {
    if (run.status === 'in_progress' || run.status === 'queued') return 'yellow'
    if (run.conclusion === 'success') return 'green'
    if (run.conclusion === 'failure') return 'red'
    return 'grey'
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>CI / GitHub Actions</div>
      {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
      {runs.map(run => (
        <div key={run.id} style={S.row}>
          <span style={S.badge(runColor(run))}>{run.conclusion || run.status}</span>
          <a href={run.html_url} target="_blank" rel="noreferrer"
            style={{ color: '#888', fontSize: '0.72rem', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {run.name} · {run.head_branch}
          </a>
        </div>
      ))}
      {!loading && runs.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>No CI runs found</div>}
    </div>
  )
}

// ── Issues Panel ──────────────────────────────────────────────────────────────
interface GHIssue { number: number; title: string; html_url: string; labels: { name: string }[]; created_at: string }

function IssuesPanel() {
  const [issues, setIssues] = useState<GHIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/github/issues')
      .then(r => r.json())
      .then(d => { setIssues(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setError('GitHub API error'); setLoading(false) })
  }, [])

  const labelColor = (name: string) => {
    if (name === 'critical' || name === 'bug') return 'red'
    if (name.startsWith('v1') || name === 'on-chain') return 'yellow'
    if (name === 'sdk') return 'blue'
    return 'grey'
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Open Issues <span style={S.badge(issues.length > 0 ? 'yellow' : 'green')}>{issues.length}</span></div>
      {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
      {error && <div style={{ color: '#f87171', fontSize: '0.75rem' }}>{error}</div>}
      {!loading && !error && issues.length === 0 && <div style={{ color: '#4ade80', fontSize: '0.8rem' }}>No open issues</div>}
      {issues.map(issue => (
        <div key={issue.number} style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
            <a href={issue.html_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              #{issue.number} {issue.title}
            </a>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' as const }}>
            {issue.labels.map(l => <span key={l.name} style={{ ...S.badge(labelColor(l.name)), fontSize: '0.58rem' }}>{l.name}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Roster Panel ──────────────────────────────────────────────────────────────
const ROSTER = [
  { name: 'Governor', layer: 'Meta', file: 'agents/meta/GOVERNOR.md' },
  { name: 'Drift Detector', layer: 'Meta', file: 'agents/meta/DRIFT_DETECTOR.md' },
  { name: 'Evolution Planner', layer: 'Meta', file: 'agents/meta/EVOLUTION.md' },
  { name: 'Inbox Agent', layer: 'Meta', file: 'agents/meta/INBOX.md' },
  { name: 'Dashboard Agent', layer: 'Meta', file: 'agents/meta/DASHBOARD.md' },
  { name: 'Orchestrator', layer: 'Exec', file: 'agents/corp/ORCHESTRATOR.md' },
  { name: 'Architect', layer: 'Exec', file: 'agents/corp/ARCHITECT.md' },
  { name: 'Backend Engineer', layer: 'Eng', file: 'agents/engineering/BACKEND.md' },
  { name: 'SDK Engineer', layer: 'Eng', file: 'agents/engineering/SDK.md' },
  { name: 'Contract Engineer', layer: 'Eng', file: 'agents/engineering/CONTRACTS.md' },
  { name: 'QA Engineer', layer: 'Eng', file: 'agents/engineering/QA.md' },
  { name: 'Security Lead', layer: 'Sec', file: 'agents/security/SEC_LEAD.md' },
  { name: 'Contract Auditor', layer: 'Sec', file: 'agents/security/CTR_AUDITOR.md' },
  { name: 'Dep Scanner', layer: 'Sec', file: 'agents/security/DEP_SCANNER.md' },
  { name: 'Pentest Agent', layer: 'Sec', file: 'agents/security/PENTEST.md' },
  { name: 'Audit Lead', layer: 'Audit', file: 'agents/audit/AUDIT_LEAD.md' },
  { name: 'Compliance Officer', layer: 'Audit', file: 'agents/audit/COMPLIANCE.md' },
  { name: 'DevOps Agent', layer: 'Ops', file: 'agents/ops/DEVOPS.md' },
  { name: 'Monitor Agent', layer: 'Ops', file: 'agents/ops/MONITOR.md' },
  { name: 'Docs Agent', layer: 'Ops', file: 'agents/ops/DOCS.md' },
  { name: 'Release Manager', layer: 'Ops', file: 'agents/ops/RELEASE.md' },
  { name: 'PR Manager', layer: 'Ops', file: 'agents/ops/PR_MANAGER.md' },
]

const LAYER_COLOR: Record<string, string> = {
  Meta: '#7c3aed', Exec: '#2563eb', Eng: '#059669',
  Sec: '#dc2626', Audit: '#d97706', Ops: '#0891b2',
}

function RosterPanel() {
  const [selected, setSelected] = useState<string | null>(null)
  const [agentDoc, setAgentDoc] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const selectAgent = useCallback((agent: typeof ROSTER[0]) => {
    if (selected === agent.name) { setSelected(null); setAgentDoc(null); return }
    setSelected(agent.name)
    setLoadingDoc(true)
    fetch(`/api/file?path=docs/${agent.file}`)
      .then(r => r.json())
      .then(d => { setAgentDoc(d.content ?? 'No doc found'); setLoadingDoc(false) })
      .catch(() => { setAgentDoc('Could not load agent file'); setLoadingDoc(false) })
  }, [selected])

  const layers = [...new Set(ROSTER.map(a => a.layer))]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem' }}>
      <div style={S.card}>
        <div style={S.cardTitle}>Agent Roster <span style={S.badge('green')}>{ROSTER.length}</span></div>
        {layers.map(layer => (
          <div key={layer} style={{ marginBottom: '0.7rem' }}>
            <div style={{ fontSize: '0.6rem', color: LAYER_COLOR[layer], fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{layer}</div>
            {ROSTER.filter(a => a.layer === layer).map(a => (
              <button key={a.name} onClick={() => selectAgent(a)}
                style={{ display: 'block', width: '100%', textAlign: 'left' as const, background: selected === a.name ? '#1a2030' : 'none', border: `1px solid ${selected === a.name ? '#1d4ed8' : 'transparent'}`, borderRadius: 4, padding: '0.2rem 0.4rem', fontSize: '0.72rem', color: selected === a.name ? '#93c5fd' : '#888', cursor: 'pointer', marginBottom: '0.15rem' }}>
                {a.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>{selected ?? 'Select an agent'}</div>
        {!selected && <div style={{ color: '#555', fontSize: '0.82rem' }}>Click an agent to view its role file.</div>}
        {loadingDoc && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
        {agentDoc && !loadingDoc && <MarkdownView content={agentDoc} maxHeight={580} />}
      </div>
    </div>
  )
}

// ── Phases Panel ──────────────────────────────────────────────────────────────
interface Phase { name: string; done: boolean; active: boolean; items: { text: string; done: boolean }[] }

function PhasesPanel() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/phases')
      .then(r => r.json())
      .then(({ content }) => {
        if (!content) { setLoading(false); return }
        // Parse Phase Checklist section
        const parsed: Phase[] = []
        const lines = content.split('\n')
        let inChecklist = false
        let current: Phase | null = null

        for (const line of lines) {
          if (line.includes('## Phase Checklist')) { inChecklist = true; continue }
          if (inChecklist && line.startsWith('##')) { inChecklist = false }
          if (!inChecklist) continue

          // Phase header: "- [x] Phase N: ..." or "- [ ] Phase N: ..."
          const phaseMatch = line.match(/^- \[([ x])\] (Phase \d+[^:]*(?::.+)?)$/)
          if (phaseMatch) {
            if (current) parsed.push(current)
            const done = phaseMatch[1] === 'x'
            current = { name: phaseMatch[2], done, active: false, items: [] }
            continue
          }
          // Sub-item: "  - [x] ..."
          const itemMatch = line.match(/^\s+- \[([ x])\] (.+)$/)
          if (itemMatch && current) {
            current.items.push({ text: itemMatch[2], done: itemMatch[1] === 'x' })
          }
        }
        if (current) parsed.push(current)

        // Mark the first incomplete phase as active
        const firstOpen = parsed.findIndex(p => !p.done)
        if (firstOpen !== -1) parsed[firstOpen].active = true

        setPhases(parsed)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const [expanded, setExpanded] = useState<string | null>(null)
  const totalItems = phases.reduce((s, p) => s + p.items.length, 0)
  const doneItems = phases.reduce((s, p) => s + p.items.filter(i => i.done).length, 0)
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        Phase Progress
        <span style={S.badge(pct === 100 ? 'green' : pct > 50 ? 'blue' : 'yellow')}>{pct}%</span>
        <span style={{ ...S.mono, fontSize: '0.65rem', marginLeft: 'auto' }}>{doneItems}/{totalItems} items</span>
      </div>
      {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
      {/* Progress bar */}
      {!loading && phases.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}
      {phases.map(phase => (
        <div key={phase.name} style={S.phaseRow(phase.done, phase.active)}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1, marginTop: 2 }}>
            {phase.done ? '✓' : phase.active ? '▶' : '○'}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: '0.78rem', color: phase.done ? '#4ade80' : phase.active ? '#e0e0e0' : '#666', fontWeight: phase.active ? 700 : 400, cursor: phase.items.length > 0 ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => phase.items.length > 0 && setExpanded(expanded === phase.name ? null : phase.name)}
            >
              <span>{phase.name}</span>
              {phase.items.length > 0 && (
                <span style={{ ...S.mono, fontSize: '0.62rem', color: '#444' }}>
                  {phase.items.filter(i => i.done).length}/{phase.items.length} {expanded === phase.name ? '▲' : '▼'}
                </span>
              )}
            </div>
            {expanded === phase.name && phase.items.length > 0 && (
              <div style={{ marginTop: '0.4rem' }}>
                {phase.items.map((item, i) => (
                  <div key={i} style={{ ...S.mono, fontSize: '0.68rem', color: item.done ? '#4ade80' : '#555', marginBottom: '0.15rem' }}>
                    {item.done ? '✓' : '○'} {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {!loading && phases.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>Could not parse phase data.</div>}
    </div>
  )
}

// ── Memo Center ───────────────────────────────────────────────────────────────
const AGENT_LIST = [
  'Orchestrator', 'Backend Engineer', 'SDK Engineer', 'QA Engineer',
  'DevOps Agent', 'Docs Agent', 'Security Lead', 'Architect',
  'Release Manager', 'PR Manager', 'Governor', 'Monitor Agent',
  'Contract Engineer', 'Dep Scanner', 'Audit Lead', 'Compliance Officer',
]

function MemoCenterPanel() {
  const [to, setTo] = useState('Orchestrator')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [lastId, setLastId] = useState('')
  const [inbox, setInbox] = useState('')
  const [outbox, setOutbox] = useState('')
  const [inboxLoading, setInboxLoading] = useState(true)
  const [outboxLoading, setOutboxLoading] = useState(true)
  const [activeView, setActiveView] = useState<'inbox' | 'outbox'>('inbox')

  const loadInbox = useCallback(() => {
    setInboxLoading(true)
    fetch('/api/inbox').then(r => r.json()).then(d => { setInbox(d.content); setInboxLoading(false) }).catch(() => setInboxLoading(false))
  }, [])
  const loadOutbox = useCallback(() => {
    setOutboxLoading(true)
    fetch('/api/outbox').then(r => r.json()).then(d => { setOutbox(d.content); setOutboxLoading(false) }).catch(() => setOutboxLoading(false))
  }, [])

  useEffect(() => { loadInbox(); loadOutbox() }, [loadInbox, loadOutbox])

  async function handleSend() {
    if (!subject || !body) return
    setSendStatus('sending')
    try {
      const r = await fetch('/api/memo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body, priority, from: 'Founder' }) })
      const d = await r.json()
      if (d.ok) { setLastId(d.memoId); setSendStatus('sent'); setSubject(''); setBody(''); loadInbox(); setTimeout(() => setSendStatus('idle'), 3000) }
      else setSendStatus('error')
    } catch { setSendStatus('error') }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem' }}>
      {/* Compose */}
      <div style={S.card}>
        <div style={S.cardTitle}>Compose Memo</div>
        <div style={{ ...S.sectionLabel, marginBottom: '0.3rem' }}>To</div>
        <select style={{ ...S.select, width: '100%', marginBottom: '0.5rem' }} value={to} onChange={e => setTo(e.target.value)}>
          {AGENT_LIST.map(a => <option key={a}>{a}</option>)}
        </select>
        <div style={{ ...S.sectionLabel, marginBottom: '0.3rem' }}>Priority</div>
        <select style={{ ...S.select, width: '100%', marginBottom: '0.5rem' }} value={priority} onChange={e => setPriority(e.target.value)}>
          <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
        </select>
        <div style={{ ...S.sectionLabel, marginBottom: '0.3rem' }}>Subject</div>
        <input style={S.input} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <div style={{ ...S.sectionLabel, marginBottom: '0.3rem' }}>Message</div>
        <textarea style={{ ...S.textarea, minHeight: 120 }} placeholder="Memo body..." value={body} onChange={e => setBody(e.target.value)} />
        <button style={S.btn(sendStatus === 'sending' || !subject || !body)} onClick={handleSend} disabled={sendStatus === 'sending' || !subject || !body}>
          {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? `Sent (${lastId})` : 'Send Memo'}
        </button>
        {sendStatus === 'error' && <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '0.3rem' }}>Failed — is the API server running?</div>}
        <div style={{ ...S.mono, marginTop: '0.75rem', fontSize: '0.65rem', color: '#333', lineHeight: 1.4 }}>
          Memos append to docs/agents/INBOX.md.<br />Claude reads INBOX.md at session start.
        </div>
      </div>

      {/* Inbox / Outbox viewer */}
      <div style={S.card}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => setActiveView('inbox')} style={S.tab(activeView === 'inbox')}>INBOX</button>
          <button onClick={() => setActiveView('outbox')} style={S.tab(activeView === 'outbox')}>OUTBOX</button>
          <button style={{ ...S.btn(), marginLeft: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
            onClick={() => { activeView === 'inbox' ? loadInbox() : loadOutbox() }}>Refresh</button>
        </div>
        {activeView === 'inbox' && (
          inboxLoading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>
            : <MarkdownView content={inbox} maxHeight={520} />
        )}
        {activeView === 'outbox' && (
          outboxLoading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>
            : <MarkdownView content={outbox} maxHeight={520} />
        )}
      </div>
    </div>
  )
}

// ── Decisions Panel ───────────────────────────────────────────────────────────
function DecisionsPanel() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/decisions').then(r => r.json()).then(d => { setContent(d.content); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Extract decision entries (### DEC-NNN sections)
  const entries = content.split(/(?=^### DEC-)/m).filter(s => s.startsWith('### DEC-'))
  const filtered = filter ? entries.filter(e => e.toLowerCase().includes(filter.toLowerCase())) : entries

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
      <div style={S.card}>
        <div style={S.cardTitle}>Decision Log <span style={S.badge('blue')}>{entries.length} decisions</span></div>
        <input style={{ ...S.input, marginBottom: '0.75rem' }} placeholder="Filter decisions..." value={filter} onChange={e => setFilter(e.target.value)} />
        {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
        {!loading && filtered.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>No decisions found.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 600, overflow: 'auto' }}>
          {[...filtered].reverse().map((entry, i) => {
            const titleLine = entry.split('\n')[0].replace('### ', '')
            const rest = entry.split('\n').slice(1).join('\n').trim()
            return (
              <div key={i} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600, marginBottom: '0.3rem' }}>{titleLine}</div>
                <MarkdownView content={rest} maxHeight={180} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Deployments Panel ─────────────────────────────────────────────────────────
function DeploymentsPanel() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/deployments').then(r => r.json()).then(d => { setContent(d.content); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Deployment History</div>
      {loading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>
        : <MarkdownView content={content} maxHeight={600} />}
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = 'overview' | 'phases' | 'agents' | 'memos' | 'decisions' | 'deployments'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'phases', label: 'Phases' },
  { id: 'agents', label: 'Agents' },
  { id: 'memos', label: 'Memo Center' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'deployments', label: 'Deployments' },
]

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const now = new Date().toLocaleString()

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>GhostKey — Agent Dashboard</div>
          <div style={S.headerSub}>Agent Bus · Memo Center · System Health · Phase Tracker</div>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#333' }}>{now}</div>
      </div>

      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {activeTab === 'overview' && (
          <div style={S.grid3}>
            <div style={S.col}>
              <HealthPanel />
              <CIPanel />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <IssuesPanel />
            </div>
          </div>
        )}

        {activeTab === 'phases' && <PhasesPanel />}

        {activeTab === 'agents' && <RosterPanel />}

        {activeTab === 'memos' && <MemoCenterPanel />}

        {activeTab === 'decisions' && <DecisionsPanel />}

        {activeTab === 'deployments' && <DeploymentsPanel />}
      </div>
    </div>
  )
}
