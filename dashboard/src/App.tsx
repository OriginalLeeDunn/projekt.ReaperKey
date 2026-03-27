import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  page: { background: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' } as React.CSSProperties,
  header: { background: '#111', borderBottom: '1px solid #222', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
  headerTitle: { fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' } as React.CSSProperties,
  headerSub: { fontSize: '0.7rem', color: '#555' } as React.CSSProperties,
  tabBar: { background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: 0, padding: '0 1.5rem', overflowX: 'auto' as const } as React.CSSProperties,
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
    whiteSpace: 'nowrap' as const,
  }),
  body: { padding: '1rem 1.5rem', maxWidth: 1600, margin: '0 auto', overflow: 'hidden', boxSizing: 'border-box' as const, width: '100%' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '320px minmax(0,1fr) minmax(0,1fr)', gap: '1rem' } as React.CSSProperties,
  grid4: { display: 'grid', gridTemplateColumns: '260px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem' } as React.CSSProperties,
  col: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: '1rem' } as React.CSSProperties,
  cardTitle: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#555', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.62rem', fontWeight: 700,
    background: color === 'green' ? '#14532d' : color === 'red' ? '#7f1d1d' : color === 'yellow' ? '#713f12' : color === 'blue' ? '#1e3a5f' : color === 'purple' ? '#3b0764' : '#1c1c1c',
    color: color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : color === 'yellow' ? '#fbbf24' : color === 'blue' ? '#60a5fa' : color === 'purple' ? '#c084fc' : '#888',
    border: `1px solid ${color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'yellow' ? '#92400e' : color === 'blue' ? '#1d4ed8' : color === 'purple' ? '#6b21a8' : '#333'}`,
  }) as React.CSSProperties,
  mono: { fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', wordBreak: 'break-all' as const } as React.CSSProperties,
  pre: { fontFamily: 'monospace', fontSize: '0.72rem', color: '#aaa', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 4, padding: '0.75rem', overflow: 'auto', maxHeight: 440, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const } as React.CSSProperties,
  input: { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', boxSizing: 'border-box' as const, marginBottom: '0.5rem' } as React.CSSProperties,
  textarea: { width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', resize: 'vertical' as const, minHeight: 90, boxSizing: 'border-box' as const, marginBottom: '0.5rem' } as React.CSSProperties,
  select: { background: '#1e1e1e', border: '1px solid #333', borderRadius: 4, color: '#e0e0e0', padding: '0.5rem 0.75rem', fontSize: '0.8rem', marginBottom: '0.5rem' } as React.CSSProperties,
  btn: (disabled?: boolean, variant?: 'danger' | 'ghost' | 'success') => ({
    background: disabled ? '#1a1a1a' : variant === 'danger' ? '#7f1d1d' : variant === 'ghost' ? 'transparent' : variant === 'success' ? '#14532d' : '#2563eb',
    border: `1px solid ${disabled ? '#222' : variant === 'danger' ? '#991b1b' : variant === 'ghost' ? '#333' : variant === 'success' ? '#166534' : '#1d4ed8'}`,
    borderRadius: 4, color: disabled ? '#444' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.78rem', padding: '0.45rem 1rem', fontWeight: 600,
  }) as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' } as React.CSSProperties,
  divider: { borderTop: '1px solid #1a1a1a', margin: '0.65rem 0' } as React.CSSProperties,
  sectionLabel: { fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.4rem' } as React.CSSProperties,
  phaseRow: (done: boolean, active: boolean) => ({
    display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.5rem 0.6rem',
    borderRadius: 5, marginBottom: '0.3rem',
    background: active ? '#1a2a1a' : done ? '#111' : '#0f0f0f',
    border: `1px solid ${active ? '#166534' : done ? '#1e1e1e' : '#181818'}`,
  }) as React.CSSProperties,
  tableCell: { padding: '0.35rem 0.6rem', fontSize: '0.72rem', fontFamily: 'monospace', borderBottom: '1px solid #1a1a1a', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as React.CSSProperties,
  tableHead: { padding: '0.35rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#555', borderBottom: '1px solid #2a2a2a', background: '#0f0f0f', whiteSpace: 'nowrap' as const } as React.CSSProperties,
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

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/github/runs')
      .then(r => r.json())
      .then(d => { setRuns(d.workflow_runs ? d.workflow_runs.slice(0, 10) : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const runColor = (run: WorkflowRun) => {
    if (run.status === 'in_progress' || run.status === 'queued') return 'yellow'
    if (run.conclusion === 'success') return 'green'
    if (run.conclusion === 'failure') return 'red'
    return 'grey'
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        CI / GitHub Actions
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', borderRadius: 3, color: '#555', fontSize: '0.62rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>↻</button>
      </div>
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

// ── PRs Panel ─────────────────────────────────────────────────────────────────
interface GHPr { number: number; title: string; html_url: string; head: { ref: string }; base: { ref: string }; labels: { name: string }[]; created_at: string; draft: boolean }

function PRPanel() {
  const [prs, setPrs] = useState<GHPr[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/github/prs')
      .then(r => r.json())
      .then(d => { setPrs(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        Open Pull Requests
        <span style={S.badge(prs.length > 0 ? 'blue' : 'green')}>{prs.length}</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', borderRadius: 3, color: '#555', fontSize: '0.62rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>↻</button>
      </div>
      {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
      {!loading && prs.length === 0 && <div style={{ color: '#4ade80', fontSize: '0.8rem' }}>No open PRs</div>}
      {prs.map(pr => (
        <div key={pr.number} style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
            {pr.draft && <span style={S.badge('grey')}>draft</span>}
            <a href={pr.html_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.78rem' }}>
              #{pr.number} {pr.title}
            </a>
          </div>
          <div style={{ ...S.mono, fontSize: '0.65rem', color: '#444' }}>
            {pr.head.ref} → {pr.base.ref}
          </div>
        </div>
      ))}
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
        const parsed: Phase[] = []
        const lines = content.split('\n')
        let inChecklist = false
        let current: Phase | null = null

        for (const line of lines) {
          if (line.includes('## Phase Checklist')) { inChecklist = true; continue }
          if (inChecklist && line.startsWith('##')) { inChecklist = false }
          if (!inChecklist) continue
          const phaseMatch = line.match(/^- \[([ x])\] (Phase \d+[^:]*(?::.+)?)$/)
          if (phaseMatch) {
            if (current) parsed.push(current)
            current = { name: phaseMatch[2], done: phaseMatch[1] === 'x', active: false, items: [] }
            continue
          }
          const itemMatch = line.match(/^\s+- \[([ x])\] (.+)$/)
          if (itemMatch && current) current.items.push({ text: itemMatch[2], done: itemMatch[1] === 'x' })
        }
        if (current) parsed.push(current)
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
            {expanded === phase.name && (
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
      <div style={S.card}>
        <div style={S.cardTitle}>Compose Memo</div>
        <div style={S.sectionLabel}>To</div>
        <select style={{ ...S.select, width: '100%' }} value={to} onChange={e => setTo(e.target.value)}>
          {AGENT_LIST.map(a => <option key={a}>{a}</option>)}
        </select>
        <div style={S.sectionLabel}>Priority</div>
        <select style={{ ...S.select, width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
          <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
        </select>
        <div style={S.sectionLabel}>Subject</div>
        <input style={S.input} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <div style={S.sectionLabel}>Message</div>
        <textarea style={{ ...S.textarea, minHeight: 120 }} placeholder="Memo body..." value={body} onChange={e => setBody(e.target.value)} />
        <button style={S.btn(sendStatus === 'sending' || !subject || !body)} onClick={handleSend} disabled={sendStatus === 'sending' || !subject || !body}>
          {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? `Sent (${lastId})` : 'Send Memo'}
        </button>
        {sendStatus === 'error' && <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '0.3rem' }}>Failed — is the API server running?</div>}
        <div style={{ ...S.mono, marginTop: '0.75rem', fontSize: '0.65rem', color: '#333', lineHeight: 1.4 }}>
          Memos append to docs/agents/INBOX.md.<br />Claude reads INBOX.md at session start.
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => setActiveView('inbox')} style={S.tab(activeView === 'inbox')}>INBOX</button>
          <button onClick={() => setActiveView('outbox')} style={S.tab(activeView === 'outbox')}>OUTBOX</button>
          <button style={{ ...S.btn(), marginLeft: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
            onClick={() => { activeView === 'inbox' ? loadInbox() : loadOutbox() }}>Refresh</button>
        </div>
        {activeView === 'inbox' && (inboxLoading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div> : <MarkdownView content={inbox} maxHeight={520} />)}
        {activeView === 'outbox' && (outboxLoading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div> : <MarkdownView content={outbox} maxHeight={520} />)}
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

  const entries = content.split(/(?=^### DEC-)/m).filter(s => s.startsWith('### DEC-'))
  const filtered = filter ? entries.filter(e => e.toLowerCase().includes(filter.toLowerCase())) : entries

  return (
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
      {loading ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div> : <MarkdownView content={content} maxHeight={600} />}
    </div>
  )
}

// ── Database Panel ────────────────────────────────────────────────────────────
interface DbTable { name: string; rows: number | null }
interface DbTableData { rows: Record<string, unknown>[]; columns: string[]; total: number; page: number; limit: number; error?: string }

function DatabasePanel() {
  const [dbStatus, setDbStatus] = useState<{ available: boolean; reason?: string } | null>(null)
  const [tables, setTables] = useState<DbTable[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<DbTableData | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [queryMode, setQueryMode] = useState(false)
  const [sql, setSql] = useState('SELECT * FROM users LIMIT 20')
  const [queryResult, setQueryResult] = useState<{ rows: Record<string, unknown>[]; columns: string[]; error?: string } | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  useEffect(() => {
    fetch('/api/db/status').then(r => r.json()).then(s => {
      setDbStatus(s)
      if (s.available) {
        fetch('/api/db/tables').then(r => r.json()).then(setTables).catch(() => {})
      }
    }).catch(() => setDbStatus({ available: false, reason: 'API server not running' }))
  }, [])

  const loadTable = useCallback((name: string, p = 0) => {
    setTableLoading(true)
    setQueryMode(false)
    fetch(`/api/db/table/${name}?page=${p}`)
      .then(r => r.json())
      .then(d => { setTableData(d); setTableLoading(false) })
      .catch(() => setTableLoading(false))
  }, [])

  function selectTable(name: string) {
    setSelectedTable(name)
    setPage(0)
    loadTable(name, 0)
  }

  async function runQuery() {
    setQueryLoading(true)
    setQueryMode(true)
    try {
      const r = await fetch('/api/db/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) })
      const d = await r.json()
      setQueryResult(d)
    } catch { setQueryResult({ rows: [], columns: [], error: 'Request failed' }) }
    setQueryLoading(false)
  }

  const displayData = queryMode ? queryResult : tableData
  const totalPages = tableData && !queryMode ? Math.ceil(tableData.total / tableData.limit) : 0

  if (!dbStatus) return <div style={S.card}><div style={{ color: '#444', fontSize: '0.8rem' }}>Connecting to database...</div></div>
  if (!dbStatus.available) return (
    <div style={S.card}>
      <div style={S.cardTitle}>Database <span style={S.badge('red')}>unavailable</span></div>
      <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{dbStatus.reason}</div>
      <div style={{ ...S.mono, marginTop: '0.5rem', fontSize: '0.68rem', color: '#444' }}>Start the server with <code>make dev</code> to create db/ghostkey.db</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
      {/* Table list */}
      <div style={S.card}>
        <div style={S.cardTitle}>Tables <span style={S.badge('blue')}>{tables.length}</span></div>
        {tables.map(t => (
          <button key={t.name} onClick={() => selectTable(t.name)}
            style={{ display: 'block', width: '100%', textAlign: 'left' as const, background: selectedTable === t.name && !queryMode ? '#1a2030' : 'none', border: `1px solid ${selectedTable === t.name && !queryMode ? '#1d4ed8' : 'transparent'}`, borderRadius: 4, padding: '0.25rem 0.5rem', marginBottom: '0.15rem', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.75rem', color: selectedTable === t.name && !queryMode ? '#93c5fd' : '#aaa' }}>{t.name}</div>
            <div style={{ fontSize: '0.62rem', color: '#444' }}>{t.rows?.toLocaleString() ?? '?'} rows</div>
          </button>
        ))}
        <div style={S.divider} />
        <button onClick={() => { setQueryMode(true); setSelectedTable(null) }}
          style={{ ...S.btn(false, queryMode ? 'success' : undefined), width: '100%', marginTop: '0.25rem', fontSize: '0.72rem' }}>
          SQL Query
        </button>
      </div>

      {/* Table viewer / Query box */}
      <div style={S.card}>
        {!queryMode && !selectedTable && (
          <div style={{ color: '#555', fontSize: '0.82rem', paddingTop: '0.5rem' }}>Select a table or run a custom SQL query.</div>
        )}

        {/* SQL Query mode */}
        {queryMode && (
          <>
            <div style={S.cardTitle}>SQL Query <span style={S.badge('yellow')}>SELECT only</span></div>
            <textarea
              style={{ ...S.textarea, minHeight: 80, fontFamily: 'monospace', fontSize: '0.78rem' }}
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery() }}
              placeholder="SELECT * FROM users LIMIT 10"
            />
            <button style={{ ...S.btn(queryLoading), marginBottom: '0.75rem' }} onClick={runQuery} disabled={queryLoading}>
              {queryLoading ? 'Running...' : 'Run Query (Ctrl+Enter)'}
            </button>
          </>
        )}

        {/* Table header */}
        {!queryMode && selectedTable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={S.cardTitle}>{selectedTable}</div>
            <span style={{ ...S.mono, fontSize: '0.65rem', color: '#555' }}>{tableData?.total?.toLocaleString()} rows</span>
            <button onClick={() => loadTable(selectedTable, page)}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', borderRadius: 3, color: '#555', fontSize: '0.62rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>↻</button>
          </div>
        )}

        {/* Data table */}
        {(tableLoading || queryLoading) && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
        {displayData?.error && <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{displayData.error}</div>}
        {displayData && !tableLoading && !queryLoading && displayData.columns.length > 0 && (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {displayData.columns.map(col => (
                    <th key={col} style={S.tableHead}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.rows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#111' : '#141414' }}>
                    {displayData.columns.map(col => (
                      <td key={col} style={{ ...S.tableCell, color: row[col] === null ? '#444' : '#ccc' }}
                        title={String(row[col] ?? 'NULL')}>
                        {row[col] === null ? 'NULL' : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {displayData && displayData.rows.length === 0 && !tableLoading && !queryLoading && (
          <div style={{ color: '#444', fontSize: '0.8rem', marginTop: '0.5rem' }}>No rows</div>
        )}

        {/* Pagination */}
        {!queryMode && tableData && totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
            <button style={S.btn(page === 0)} disabled={page === 0}
              onClick={() => { const p = page - 1; setPage(p); loadTable(selectedTable!, p) }}>← Prev</button>
            <span style={{ ...S.mono, fontSize: '0.68rem' }}>Page {page + 1} / {totalPages}</span>
            <button style={S.btn(page >= totalPages - 1)} disabled={page >= totalPages - 1}
              onClick={() => { const p = page + 1; setPage(p); loadTable(selectedTable!, p) }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Governance Panel ──────────────────────────────────────────────────────────
function GovernancePanel() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/governance').then(r => r.json()).then(d => { setContent(d.content); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const sections = content.split(/(?=^## )/m).filter(s => s.trim())
  const filtered = filter ? sections.filter(s => s.toLowerCase().includes(filter.toLowerCase())) : sections

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div style={S.card}>
        <div style={S.cardTitle}>
          Governance Rules
          <span style={S.badge('purple')}>ACTIVE</span>
        </div>
        <input style={{ ...S.input, marginBottom: '0.75rem' }} placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
        {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
        <div style={{ maxHeight: 600, overflow: 'auto' }}>
          {filtered.map((section, i) => {
            const title = section.split('\n')[0].replace(/^#+\s*/, '')
            const body = section.split('\n').slice(1).join('\n').trim()
            return (
              <div key={i} style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 6 }}>
                <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600, marginBottom: '0.4rem' }}>{title}</div>
                <MarkdownView content={body} maxHeight={200} />
              </div>
            )
          })}
        </div>
      </div>

      {/* CI discipline checklist */}
      <div style={S.col}>
        <div style={S.card}>
          <div style={S.cardTitle}>CI Gate Checklist</div>
          {[
            { label: 'feat branch CI green before PR', rule: true },
            { label: 'PR CI green before merge to dev', rule: true },
            { label: 'dev CI green before PR to main', rule: true },
            { label: 'user confirmation before main merge', rule: true },
            { label: 'one branch at a time through full cycle', rule: true },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={S.badge('green')}>✓</span>
              <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Branch Strategy</div>
          {[
            { branch: 'feat/*', desc: 'Feature work — CI required before PR' },
            { branch: 'fix/*', desc: 'Bug fixes — CI required before PR' },
            { branch: 'docs/*', desc: 'Docs only — CI required before PR' },
            { branch: 'ops/*', desc: 'Infra/config — CI required before PR' },
            { branch: 'dev', desc: 'Integration branch — always green' },
            { branch: 'main', desc: 'Production — only from green dev, user confirmed' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
              <code style={{ ...S.mono, color: '#60a5fa', background: '#1e3a5f', padding: '0.1rem 0.35rem', borderRadius: 3, fontSize: '0.68rem' }}>{b.branch}</code>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{b.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Activity Log Panel ────────────────────────────────────────────────────────
interface ActivityEntry { ts: string; agent: string; action: string; detail: string; status: string }

// Agent color palette (stable by index in known list)
const AGENT_COLORS: Record<string, string> = {
  Claude: '#818cf8',
  Orchestrator: '#38bdf8',
  'Backend Engineer': '#34d399',
  'SDK Engineer': '#a78bfa',
  'QA Engineer': '#fb923c',
  'DevOps Agent': '#f472b6',
  'Docs Agent': '#facc15',
  'Security Lead': '#f87171',
  Architect: '#60a5fa',
  'Release Manager': '#4ade80',
  'PR Manager': '#c084fc',
  Governor: '#e879f9',
  'Monitor Agent': '#22d3ee',
  'Contract Engineer': '#fbbf24',
  'Dep Scanner': '#a3e635',
  'Audit Lead': '#ff6b6b',
  'Compliance Officer': '#94a3b8',
  Founder: '#f59e0b',
}
function agentColor(agent: string) { return AGENT_COLORS[agent] ?? '#6b7280' }

// Detail modal
function ActivityModal({ entry, onClose }: { entry: ActivityEntry; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  const statusColor = (s: string) => s === 'ok' || s === 'success' ? 'green' : s === 'error' || s === 'failed' ? 'red' : 'yellow'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#141414', border: '1px solid #333', borderRadius: 10, padding: '1.5rem', maxWidth: 560, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: agentColor(entry.agent) }}>{entry.agent}</span>
            <span style={{ ...S.badge(statusColor(entry.status)), marginLeft: '0.5rem' }}>{entry.status}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#e0e0e0', fontWeight: 600, marginBottom: '0.5rem' }}>{entry.action}</div>
        {entry.detail && (
          <div style={{ ...S.pre, fontSize: '0.75rem', marginBottom: '0.75rem', maxHeight: 220 }}>{entry.detail}</div>
        )}
        <div style={{ ...S.mono, fontSize: '0.65rem', color: '#444' }}>{new Date(entry.ts).toLocaleString()} UTC</div>
      </div>
    </div>
  )
}

// Feed sub-view
function FeedView({ entries, loading, agentFilter, agents, onFilterChange, onRefresh, liveConnected }: {
  entries: ActivityEntry[]; loading: boolean; agentFilter: string; agents: string[];
  onFilterChange: (v: string) => void; onRefresh: () => void; liveConnected: boolean
}) {
  const [modal, setModal] = useState<ActivityEntry | null>(null)
  const statusColor = (s: string) => s === 'ok' || s === 'success' ? 'green' : s === 'error' || s === 'failed' ? 'red' : 'yellow'
  const filtered = agentFilter === 'All' ? entries : entries.filter(e => e.agent === agentFilter)

  return (
    <>
      {modal && <ActivityModal entry={modal} onClose={() => setModal(null)} />}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' as const }}>
        <span style={{ ...S.badge(liveConnected ? 'green' : 'grey'), fontSize: '0.65rem' }}>
          {liveConnected ? '● LIVE' : '○ offline'}
        </span>
        <select style={{ ...S.select, marginBottom: 0, fontSize: '0.72rem' }} value={agentFilter} onChange={e => onFilterChange(e.target.value)}>
          {agents.map(a => <option key={a}>{a}</option>)}
        </select>
        <button onClick={onRefresh} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', borderRadius: 3, color: '#555', fontSize: '0.62rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>↻</button>
      </div>
      {loading && <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading...</div>}
      {!loading && filtered.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>No activity yet.</div>}
      <div style={{ overflowY: 'auto' as const, flex: 1 }}>
        {filtered.map((e, i) => (
          <div key={i} onClick={() => setModal(e)}
            style={{ display: 'flex', gap: '0.6rem', padding: '0.45rem 0.4rem', borderBottom: '1px solid #1a1a1a', alignItems: 'flex-start', cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }}
            onMouseEnter={el => (el.currentTarget.style.background = '#1a1a1a')}
            onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
            <span style={S.badge(statusColor(e.status))}>{e.status}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: '0.72rem', color: agentColor(e.agent), fontWeight: 700 }}>{e.agent}</span>
                <span style={{ fontSize: '0.75rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 400 }}>{e.action}</span>
              </div>
              {e.detail && <div style={{ ...S.mono, fontSize: '0.65rem', marginTop: '0.1rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.detail}</div>}
              <div style={{ ...S.mono, fontSize: '0.6rem', color: '#2a2a2a', marginTop: '0.1rem' }}>{new Date(e.ts).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// Stats sub-view
interface AgentStats { agent: string; count: number; lastSeen: string; topAction: string; errorCount: number }
function StatsView({ entries }: { entries: ActivityEntry[] }) {
  const agentMap = new Map<string, AgentStats>()
  for (const e of entries) {
    const s = agentMap.get(e.agent) ?? { agent: e.agent, count: 0, lastSeen: e.ts, topAction: e.action, errorCount: 0 }
    s.count++
    if (e.ts > s.lastSeen) { s.lastSeen = e.ts; s.topAction = e.action }
    if (e.status === 'error' || e.status === 'failed') s.errorCount++
    agentMap.set(e.agent, s)
  }
  const stats = Array.from(agentMap.values()).sort((a, b) => b.count - a.count)
  const total = entries.length
  const errors = entries.filter(e => e.status === 'error' || e.status === 'failed').length
  const agents_active = stats.length
  const last24h = entries.filter(e => Date.now() - new Date(e.ts).getTime() < 86400000).length

  return (
    <div style={{ overflowY: 'auto' as const, flex: 1 }}>
      {/* Global totals bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Events', value: total, color: '#60a5fa' },
          { label: 'Active Agents', value: agents_active, color: '#34d399' },
          { label: 'Last 24h', value: last24h, color: '#a78bfa' },
          { label: 'Errors', value: errors, color: errors > 0 ? '#f87171' : '#444' },
        ].map(item => (
          <div key={item.label} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 6, padding: '0.75rem', textAlign: 'center' as const }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
            <div style={{ fontSize: '0.62rem', color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '0.2rem' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Per-agent cards */}
      {stats.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>No activity logged yet.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {stats.map(s => (
          <div key={s.agent} style={{ background: '#0f0f0f', border: `1px solid ${agentColor(s.agent)}33`, borderRadius: 8, padding: '0.85rem', position: 'relative' as const }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: agentColor(s.agent) }}>{s.agent}</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: '#e0e0e0' }}>{s.count}</span>
            </div>
            <div style={{ ...S.mono, fontSize: '0.65rem', color: '#555', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              Last: {s.topAction}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...S.mono, fontSize: '0.6rem', color: '#333' }}>{new Date(s.lastSeen).toLocaleString()}</div>
              {s.errorCount > 0 && <span style={S.badge('red')}>{s.errorCount} err</span>}
            </div>
            {/* activity bar */}
            <div style={{ marginTop: '0.5rem', height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (s.count / Math.max(1, total)) * 100 * 5)}%`, background: agentColor(s.agent), borderRadius: 2, opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Graph sub-view — SVG circular layout
function GraphView({ entries, onNodeClick, nodeFilter }: { entries: ActivityEntry[]; onNodeClick: (agent: string) => void; nodeFilter: string }) {
  const now = Date.now()
  // count activity per agent
  const counts = new Map<string, number>()
  const lastSeen = new Map<string, number>()
  for (const e of entries) {
    counts.set(e.agent, (counts.get(e.agent) ?? 0) + 1)
    const t = new Date(e.ts).getTime()
    if (!lastSeen.has(e.agent) || t > lastSeen.get(e.agent)!) lastSeen.set(e.agent, t)
  }

  const allAgents = Array.from(new Set(['Claude', ...entries.map(e => e.agent)])).filter(a => a !== 'Claude')
  const cx = 380, cy = 230, r = 165

  // pulse opacity based on recency (last 60s = 1.0, last 10min = 0.3, older = 0.1)
  function pulseOpacity(agent: string) {
    const t = lastSeen.get(agent)
    if (!t) return 0.1
    const age = now - t
    if (age < 60000) return 1.0
    if (age < 600000) return 0.3 + 0.7 * (1 - age / 600000)
    return 0.1
  }

  const claudeActive = pulseOpacity('Claude') > 0.3

  return (
    <div style={{ overflowY: 'auto' as const, flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <svg width="760" height="460" viewBox="0 0 760 460" style={{ maxWidth: '100%', display: 'block' }}>
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={r + 20} fill="none" stroke="#1a1a1a" strokeWidth={1} strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={1} />

          {/* Edges from Claude to active agents */}
          {allAgents.map((agent, i) => {
            const angle = (i / allAgents.length) * Math.PI * 2 - Math.PI / 2
            const ax = cx + r * Math.cos(angle)
            const ay = cy + r * Math.sin(angle)
            const op = pulseOpacity(agent)
            if (op < 0.15) return null
            return (
              <line key={agent}
                x1={cx} y1={cy} x2={ax} y2={ay}
                stroke={agentColor(agent)}
                strokeOpacity={op * 0.5}
                strokeWidth={op > 0.5 ? 1.5 : 0.75}
                strokeDasharray={op > 0.8 ? undefined : '3 5'}
              />
            )
          })}

          {/* Claude center node */}
          <circle cx={cx} cy={cy} r={30} fill="#1a1a2e" stroke={claudeActive ? '#818cf8' : '#2a2a3e'} strokeWidth={claudeActive ? 2 : 1} />
          {claudeActive && <circle cx={cx} cy={cy} r={38} fill="none" stroke="#818cf8" strokeWidth={0.5} strokeOpacity={0.4} />}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#818cf8" fontSize={11} fontWeight="700" fontFamily="system-ui">Claude</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#4a4a6a" fontSize={8} fontFamily="monospace">{counts.get('Claude') ?? 0} ops</text>

          {/* Agent nodes */}
          {allAgents.map((agent, i) => {
            const angle = (i / allAgents.length) * Math.PI * 2 - Math.PI / 2
            const ax = cx + r * Math.cos(angle)
            const ay = cy + r * Math.sin(angle)
            const op = pulseOpacity(agent)
            const isFiltered = nodeFilter !== 'All' && nodeFilter !== agent
            const col = agentColor(agent)
            const cnt = counts.get(agent) ?? 0

            return (
              <g key={agent} style={{ cursor: 'pointer' }} onClick={() => onNodeClick(nodeFilter === agent ? 'All' : agent)}>
                {op > 0.5 && <circle cx={ax} cy={ay} r={20} fill="none" stroke={col} strokeWidth={0.5} strokeOpacity={0.3} />}
                <circle cx={ax} cy={ay} r={14}
                  fill={isFiltered ? '#0f0f0f' : `${col}22`}
                  stroke={col}
                  strokeWidth={nodeFilter === agent ? 2.5 : 1}
                  strokeOpacity={isFiltered ? 0.2 : op}
                />
                <text x={ax} y={ay + 4} textAnchor="middle" fill={col} fontSize={9} fontWeight="600" fontFamily="monospace" fillOpacity={isFiltered ? 0.3 : 1}>
                  {cnt}
                </text>
                {/* label */}
                {(() => {
                  const labelY = ay + (ay > cy ? 28 : -20)
                  const shortName = agent.split(' ').map((w: string) => w[0]).join('').slice(0, 4)
                  return (
                    <text x={ax} y={labelY} textAnchor="middle" fill={col} fontSize={7.5} fontFamily="system-ui" fillOpacity={isFiltered ? 0.2 : 0.85}>
                      {agent.length > 12 ? shortName : agent}
                    </text>
                  )
                })()}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.4rem' }}>
        {allAgents.filter(a => (counts.get(a) ?? 0) > 0).map(agent => (
          <button key={agent} onClick={() => onNodeClick(nodeFilter === agent ? 'All' : agent)}
            style={{ background: nodeFilter === agent ? `${agentColor(agent)}22` : '#0f0f0f', border: `1px solid ${agentColor(agent)}${nodeFilter === agent ? 'aa' : '44'}`, borderRadius: 4, color: agentColor(agent), fontSize: '0.65rem', padding: '0.15rem 0.5rem', cursor: 'pointer', fontWeight: nodeFilter === agent ? 700 : 400 }}>
            {agent} <span style={{ opacity: 0.6 }}>{counts.get(agent)}</span>
          </button>
        ))}
      </div>

      {/* Recent activity for selected agent */}
      {nodeFilter !== 'All' && (
        <div style={{ ...S.card, padding: '0.75rem' }}>
          <div style={{ ...S.cardTitle, color: agentColor(nodeFilter) }}>{nodeFilter} — Recent</div>
          {entries.filter(e => e.agent === nodeFilter).slice(0, 8).map((e, i) => (
            <div key={i} style={{ ...S.mono, fontSize: '0.68rem', color: '#666', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              <span style={{ color: '#333' }}>{new Date(e.ts).toLocaleTimeString()} </span>{e.action}
              {e.detail && <span style={{ color: '#444' }}> · {e.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityPanel() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState('All')
  const [logAgent, setLogAgent] = useState('Founder')
  const [logAction, setLogAction] = useState('')
  const [logDetail, setLogDetail] = useState('')
  const [logStatus, setLogStatus] = useState('ok')
  const [posting, setPosting] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const [view, setView] = useState<'feed' | 'stats' | 'graph'>('feed')
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/activity').then(r => r.json()).then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // SSE with auto-reconnect backoff
  const connectSSE = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    const es = new EventSource('/api/stream/activity')
    esRef.current = es
    es.onopen = () => { setLiveConnected(true); reconnectDelay.current = 1000 }
    es.onerror = () => {
      setLiveConnected(false)
      es.close()
      esRef.current = null
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
        connectSSE()
      }, reconnectDelay.current)
    }
    es.onmessage = (e) => {
      try {
        const entry: ActivityEntry = JSON.parse(e.data)
        setEntries(prev => [entry, ...prev].slice(0, 200))
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    load()
    connectSSE()
    return () => {
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [load, connectSSE])

  const agents = ['All', ...Array.from(new Set(entries.map(e => e.agent)))]

  async function postEntry() {
    if (!logAction) return
    setPosting(true)
    await fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: logAgent, action: logAction, detail: logDetail, status: logStatus }) })
    setLogAction(''); setLogDetail('')
    await load()
    setPosting(false)
  }

  const viewBtnStyle = (v: string) => ({
    background: view === v ? '#1e3a5f' : 'none',
    border: `1px solid ${view === v ? '#2563eb' : '#222'}`,
    borderRadius: 4, color: view === v ? '#60a5fa' : '#444',
    fontSize: '0.72rem', padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: view === v ? 700 : 400,
  }) as React.CSSProperties

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', minHeight: 0 }}>
      {/* Sidebar: composer + view switcher */}
      <div style={{ ...S.col, minWidth: 0 }}>
        {/* View switcher */}
        <div style={S.card}>
          <div style={S.cardTitle}>View</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
            <button style={viewBtnStyle('feed')} onClick={() => setView('feed')}>Feed</button>
            <button style={viewBtnStyle('stats')} onClick={() => setView('stats')}>Stats</button>
            <button style={viewBtnStyle('graph')} onClick={() => setView('graph')}>Graph</button>
          </div>
        </div>
        {/* Log entry composer */}
        <div style={S.card}>
          <div style={S.cardTitle}>Log Activity</div>
          <div style={S.sectionLabel}>Agent</div>
          <select style={{ ...S.select, width: '100%' }} value={logAgent} onChange={e => setLogAgent(e.target.value)}>
            {['Founder', ...AGENT_LIST].map(a => <option key={a}>{a}</option>)}
          </select>
          <div style={S.sectionLabel}>Action</div>
          <input style={S.input} placeholder="e.g. merged PR #115" value={logAction} onChange={e => setLogAction(e.target.value)} />
          <div style={S.sectionLabel}>Detail</div>
          <input style={S.input} placeholder="optional" value={logDetail} onChange={e => setLogDetail(e.target.value)} />
          <div style={S.sectionLabel}>Status</div>
          <select style={{ ...S.select, width: '100%' }} value={logStatus} onChange={e => setLogStatus(e.target.value)}>
            <option value="ok">ok</option>
            <option value="success">success</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
            <option value="failed">failed</option>
          </select>
          <button style={S.btn(posting || !logAction)} onClick={postEntry} disabled={posting || !logAction}>
            {posting ? 'Logging...' : 'Log Entry'}
          </button>
        </div>
      </div>

      {/* Main view area */}
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column' as const, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.65rem', flexWrap: 'wrap' as const }}>
          <div style={S.cardTitle}>
            Activity
            <span style={{ ...S.badge(liveConnected ? 'green' : 'grey'), fontSize: '0.6rem' }}>
              {liveConnected ? '● LIVE' : '○ offline'}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#444' }}>{entries.length} entries</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' as const, overflowY: 'auto' as const, maxHeight: 'calc(100vh - 280px)' }}>
          {view === 'feed' && (
            <FeedView
              entries={entries}
              loading={loading}
              agentFilter={agentFilter}
              agents={agents}
              onFilterChange={setAgentFilter}
              onRefresh={load}
              liveConnected={liveConnected}
            />
          )}
          {view === 'stats' && <StatsView entries={entries} />}
          {view === 'graph' && <GraphView entries={entries} onNodeClick={setAgentFilter} nodeFilter={agentFilter} />}
        </div>
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = 'overview' | 'database' | 'phases' | 'agents' | 'governance' | 'activity' | 'memos' | 'decisions' | 'deployments'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'database', label: 'Database' },
  { id: 'governance', label: 'Governance' },
  { id: 'activity', label: 'Activity' },
  { id: 'phases', label: 'Phases' },
  { id: 'agents', label: 'Agents' },
  { id: 'memos', label: 'Memo Center' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'deployments', label: 'Deployments' },
]

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [now, setNow] = useState(new Date())
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => { ref.current = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(ref.current!) }, [])
  return <span>{now.toLocaleString()}</span>
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>GhostKey — Agent Operations Dashboard</div>
          <div style={S.headerSub}>DB Viewer · Governance · Activity · Memo Center · CI · Phase Tracker</div>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#333' }}><Clock /></div>
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
          <div style={S.col}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
              <HealthPanel />
              <CIPanel />
              <PRPanel />
            </div>
            <IssuesPanel />
          </div>
        )}

        {activeTab === 'database' && <DatabasePanel />}

        {activeTab === 'governance' && <GovernancePanel />}

        {activeTab === 'activity' && <ActivityPanel />}

        {activeTab === 'phases' && <PhasesPanel />}

        {activeTab === 'agents' && <RosterPanel />}

        {activeTab === 'memos' && <MemoCenterPanel />}

        {activeTab === 'decisions' && <DecisionsPanel />}

        {activeTab === 'deployments' && <DeploymentsPanel />}
      </div>
    </div>
  )
}
