import React, { useState, useEffect } from 'react'

// Styles - dark theme matching the GhostKey example app
const S = {
  page: {
    background: '#0a0a0a',
    minHeight: '100vh',
    color: '#e0e0e0',
    fontFamily: 'system-ui, sans-serif',
    padding: '0'
  } as React.CSSProperties,
  header: {
    background: '#111',
    borderBottom: '1px solid #222',
    padding: '0.875rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  headerTitle: { fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' } as React.CSSProperties,
  headerSub: { fontSize: '0.75rem', color: '#666' } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '1rem',
    padding: '1rem',
    maxWidth: 1400,
    margin: '0 auto'
  } as React.CSSProperties,
  col: { display: 'flex', flexDirection: 'column', gap: '1rem' } as React.CSSProperties,
  card: {
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 8,
    padding: '1rem',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#555',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.1rem 0.4rem',
    borderRadius: 3,
    fontSize: '0.65rem',
    fontWeight: 700,
    background: color === 'green' ? '#14532d' : color === 'red' ? '#7f1d1d' : color === 'yellow' ? '#713f12' : '#1c1c1c',
    color: color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : color === 'yellow' ? '#fbbf24' : '#888',
    border: `1px solid ${color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'yellow' ? '#92400e' : '#333'}`,
  }) as React.CSSProperties,
  mono: { fontFamily: 'monospace', fontSize: '0.75rem', color: '#888', wordBreak: 'break-all' as const } as React.CSSProperties,
  input: {
    width: '100%',
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    boxSizing: 'border-box' as const,
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    resize: 'vertical' as const,
    minHeight: 80,
    boxSizing: 'border-box' as const,
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  select: {
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  btn: (disabled?: boolean) => ({
    background: disabled ? '#222' : '#2563eb',
    border: 'none',
    borderRadius: 4,
    color: disabled ? '#555' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8rem',
    padding: '0.5rem 1rem',
    fontWeight: 600,
  }) as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' } as React.CSSProperties,
  divider: { borderTop: '1px solid #1e1e1e', margin: '0.75rem 0' } as React.CSSProperties,
}

// ── Health Panel ──────────────────────────────────────────────────────────────
function HealthPanel() {
  const [health, setHealth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/file?path=docs/agents/HEALTH.md')
      .then(r => r.json())
      .then(d => { setHealth(d.content || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Parse status block from HEALTH.md
  const overall = health?.match(/OVERALL: (.+)/)?.[1] ?? 'UNKNOWN'
  const isHealthy = overall.includes('HEALTHY') && !overall.includes('GAPS')
  const hasGaps = overall.includes('GAPS') || overall.includes('CRITICAL')
  const openIssuesMatch = health?.match(/OPEN ISSUES:\s+(\d+|\d+ \(.+?\))/)?.[1] ?? '?'

  const lines = [
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
      </div>
      {loading ? (
        <div style={{ color: '#555', fontSize: '0.8rem' }}>Loading...</div>
      ) : (
        <>
          <div style={{ ...S.mono, color: hasGaps ? '#fbbf24' : '#4ade80', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
            {overall}
          </div>
          <div style={S.divider} />
          {lines.map((l, i) => (
            <div key={i} style={{ ...S.mono, marginBottom: '0.25rem', fontSize: '0.72rem' }}>{l}</div>
          ))}
          <div style={S.divider} />
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            Open issues: <span style={{ color: openIssuesMatch !== '0' ? '#fbbf24' : '#4ade80' }}>{openIssuesMatch}</span>
          </div>
        </>
      )}
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
    if (name === 'v1.0') return 'yellow'
    return 'grey'
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        Open Issues
        <span style={S.badge(issues.length > 0 ? 'yellow' : 'green')}>{issues.length}</span>
      </div>
      {loading && <div style={{ color: '#555', fontSize: '0.8rem' }}>Loading...</div>}
      {error && <div style={{ color: '#f87171', fontSize: '0.75rem' }}>{error}</div>}
      {!loading && !error && issues.length === 0 && (
        <div style={{ color: '#4ade80', fontSize: '0.8rem' }}>No open issues</div>
      )}
      {issues.map(issue => (
        <div key={issue.number} style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <a href={issue.html_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              #{issue.number} {issue.title}
            </a>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' as const }}>
            {issue.labels.map(l => (
              <span key={l.name} style={{ ...S.badge(labelColor(l.name)), fontSize: '0.6rem' }}>{l.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CI Status Panel ───────────────────────────────────────────────────────────
interface WorkflowRun { id: number; name: string; conclusion: string | null; status: string; html_url: string; created_at: string; head_branch: string }

function CIPanel() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/github/runs')
      .then(r => r.json())
      .then(d => { setRuns(d.workflow_runs ? d.workflow_runs.slice(0, 8) : []); setLoading(false) })
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
      <div style={S.cardTitle}>CI Status</div>
      {loading && <div style={{ color: '#555', fontSize: '0.8rem' }}>Loading...</div>}
      {runs.map(run => (
        <div key={run.id} style={S.row}>
          <span style={S.badge(runColor(run))}>{run.conclusion || run.status}</span>
          <a href={run.html_url} target="_blank" rel="noreferrer"
            style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {run.name} · {run.head_branch}
          </a>
        </div>
      ))}
      {!loading && runs.length === 0 && (
        <div style={{ color: '#555', fontSize: '0.8rem' }}>No CI runs found</div>
      )}
    </div>
  )
}

// ── Memo Composer ─────────────────────────────────────────────────────────────
const AGENTS = [
  'Orchestrator', 'Backend Engineer', 'SDK Engineer', 'QA Engineer',
  'DevOps Agent', 'Docs Agent', 'Security Lead', 'Architect',
  'Release Manager', 'PR Manager', 'Governor', 'Monitor Agent',
]

function MemoComposer() {
  const [to, setTo] = useState('Orchestrator')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [lastId, setLastId] = useState('')

  async function handleSend() {
    if (!subject || !body) return
    setStatus('sending')
    try {
      const r = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, priority, from: 'Founder' })
      })
      const d = await r.json()
      if (d.ok) {
        setLastId(d.memoId)
        setStatus('sent')
        setSubject('')
        setBody('')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Send Memo to Agents</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select style={{ ...S.select, flex: 1, marginBottom: 0 }} value={to} onChange={e => setTo(e.target.value)}>
          {AGENTS.map(a => <option key={a}>{a}</option>)}
        </select>
        <select style={{ ...S.select, marginBottom: 0 }} value={priority} onChange={e => setPriority(e.target.value)}>
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
          <option>CRITICAL</option>
        </select>
      </div>
      <input style={S.input} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
      <textarea style={S.textarea} placeholder="Memo body..." value={body} onChange={e => setBody(e.target.value)} />
      <button style={S.btn(status === 'sending' || !subject || !body)} onClick={handleSend} disabled={status === 'sending' || !subject || !body}>
        {status === 'sending' ? 'Sending...' : status === 'sent' ? `Sent (${lastId})` : 'Send Memo'}
      </button>
      {status === 'error' && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>Failed to send — is the API server running?</div>}
      <div style={{ ...S.mono, marginTop: '0.5rem', fontSize: '0.7rem', color: '#444' }}>
        Memos are written to docs/agents/INBOX.md and read by Claude at session start.
      </div>
    </div>
  )
}

// ── Agent Roster ──────────────────────────────────────────────────────────────
const ROSTER = [
  { name: 'Governor', layer: 'Meta' },
  { name: 'Drift Detector', layer: 'Meta' },
  { name: 'Evolution Planner', layer: 'Meta' },
  { name: 'Inbox Agent', layer: 'Meta' },
  { name: 'Dashboard Agent', layer: 'Meta' },
  { name: 'Orchestrator', layer: 'Exec' },
  { name: 'Architect', layer: 'Exec' },
  { name: 'Backend Engineer', layer: 'Eng' },
  { name: 'SDK Engineer', layer: 'Eng' },
  { name: 'Contract Engineer', layer: 'Eng' },
  { name: 'QA Engineer', layer: 'Eng' },
  { name: 'Security Lead', layer: 'Sec' },
  { name: 'Contract Auditor', layer: 'Sec' },
  { name: 'Dep Scanner', layer: 'Sec' },
  { name: 'Pentest Agent', layer: 'Sec' },
  { name: 'Audit Lead', layer: 'Audit' },
  { name: 'Compliance Officer', layer: 'Audit' },
  { name: 'DevOps Agent', layer: 'Ops' },
  { name: 'Monitor Agent', layer: 'Ops' },
  { name: 'Docs Agent', layer: 'Ops' },
  { name: 'Release Manager', layer: 'Ops' },
  { name: 'PR Manager', layer: 'Ops' },
]

const LAYER_COLOR: Record<string, string> = {
  Meta: '#7c3aed', Exec: '#2563eb', Eng: '#059669',
  Sec: '#dc2626', Audit: '#d97706', Ops: '#0891b2',
}

function RosterPanel() {
  const layers = [...new Set(ROSTER.map(a => a.layer))]
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Agent Roster <span style={S.badge('green')}>{ROSTER.length} active</span></div>
      {layers.map(layer => (
        <div key={layer} style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.65rem', color: LAYER_COLOR[layer] || '#888', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{layer}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.3rem' }}>
            {ROSTER.filter(a => a.layer === layer).map(a => (
              <span key={a.name} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 3, padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: '#aaa' }}>
                {a.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date().toLocaleString()
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>GhostKey — Agent Dashboard</div>
          <div style={S.headerSub}>Agent Bus · Memo Composer · System Health</div>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#444' }}>{now}</div>
      </div>
      <div style={S.grid}>
        {/* Left col */}
        <div style={S.col}>
          <HealthPanel />
          <MemoComposer />
          <RosterPanel />
        </div>
        {/* Right col */}
        <div style={S.col}>
          <IssuesPanel />
          <CIPanel />
        </div>
      </div>
    </div>
  )
}
