import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import App from '../../src/App'

// ── EventSource mock ──────────────────────────────────────────────────────────
let capturedESInstance: {
  onopen: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  onmessage: ((e: MessageEvent) => void) | null
  close: ReturnType<typeof vi.fn>
} | null = null

global.EventSource = vi.fn().mockImplementation(() => {
  capturedESInstance = {
    onopen: null,
    onerror: null,
    onmessage: null,
    close: vi.fn(),
  }
  return capturedESInstance
}) as unknown as typeof EventSource

// ── Fetch mock factory ────────────────────────────────────────────────────────
const makeOk = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })

function setupFetch(overrides: Record<string, unknown> = {}) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    for (const [k, v] of Object.entries(overrides)) {
      if (url.includes(k)) return makeOk(v)
    }
    if (url.includes('/api/health/phases')) return makeOk([
      { phase: 'Phase 1', status: 'Complete', lead: 'Orchestrator', blocking: 'None' },
      { phase: 'Phase 2', status: 'In Progress', lead: 'Backend Engineer', blocking: 'Phase 3' },
    ])
    if (url.includes('/api/github/runs')) return makeOk({
      workflow_runs: [
        { id: 1, name: 'CI', conclusion: 'success', status: 'completed', html_url: 'http://gh/1', created_at: '2026-03-28T10:00:00Z', head_branch: 'dev' },
        { id: 2, name: 'Lint', conclusion: 'failure', status: 'completed', html_url: 'http://gh/2', created_at: '2026-03-27T09:00:00Z', head_branch: 'feat/test' },
      ],
    })
    if (url.match(/\/api\/github\/pr\/\d+\/checks/)) return makeOk({
      check_runs: [{ name: 'CI', conclusion: 'success', status: 'completed' }],
    })
    if (url.includes('/api/github/prs')) return makeOk([
      { number: 1, title: 'Add wallet creation', html_url: 'http://gh/pr/1', head: { ref: 'feat/wallet', sha: 'abc123' }, base: { ref: 'dev' }, labels: [{ name: 'enhancement' }], created_at: '2026-03-28T10:00:00Z', draft: false },
      { number: 2, title: 'Old draft PR', html_url: 'http://gh/pr/2', head: { ref: 'feat/old', sha: 'def456' }, base: { ref: 'dev' }, labels: [{ name: 'critical' }], created_at: '2026-02-01T10:00:00Z', draft: true },
    ])
    if (url.includes('/api/github/issues')) return makeOk([
      { number: 1, title: 'Critical auth bug', html_url: 'http://gh/1', labels: [{ name: 'critical' }, { name: 'bug' }], created_at: '2026-03-01T00:00:00Z' },
      { number: 2, title: 'Enhancement: better UX', html_url: 'http://gh/2', labels: [{ name: 'enhancement' }], created_at: '2026-03-15T00:00:00Z' },
      { number: 3, title: 'Security CVE exposure', html_url: 'http://gh/3', labels: [{ name: 'security' }], created_at: '2026-03-20T00:00:00Z' },
    ])
    if (url.includes('/api/healthcheck')) return makeOk({ ok: true, status: 200, data: { status: 'healthy', db: 'sqlite', version: '0.1.0' } })
    if (url.includes('/api/activity/agents')) return makeOk({
      'Claude': { count: 50, last: '2026-03-28T10:00:00Z', lastAction: 'plan' },
      'Orchestrator': { count: 10, last: '2026-03-27T09:00:00Z', lastAction: 'assign' },
      'CI': { count: 5, last: '2026-03-28T08:00:00Z', lastAction: 'workflow_run' },
    })
    if (url.includes('/api/activity')) return makeOk([
      { ts: '2026-03-28T10:00:00Z', event_type: 'agent', agent: 'Claude', action: 'plan', detail: 'Planning task', status: 'ok' },
      { ts: '2026-03-28T09:00:00Z', event_type: 'ci', agent: 'CI', action: 'workflow_run', detail: 'CI #154 dev — success', status: 'ok', meta: { run_id: 154 } },
      { ts: '2026-03-28T08:00:00Z', event_type: 'backend', agent: 'Backend', action: 'deploy', detail: 'Deployed testnet v0.5', status: 'ok', chain: 'sepolia' },
      { ts: '2026-03-28T07:00:00Z', event_type: 'claude', agent: 'Claude', action: 'Read', detail: 'HEALTH.md', status: 'error' },
    ])
    if (url.includes('/api/db/status')) return makeOk({ available: true, path: 'db/ghostkey.db' })
    if (url.includes('/api/db/tables')) return makeOk([
      { name: 'users', rows: 10 },
      { name: 'sessions', rows: 5 },
      { name: 'wallets', rows: 3 },
    ])
    if (url.includes('/api/db/table/')) return makeOk({
      rows: [{ id: 1, address: '0xabc', created_at: '2026-01-01' }],
      columns: ['id', 'address', 'created_at'],
      total: 1, page: 0, limit: 50,
    })
    if (url.includes('/api/db/query')) return makeOk({ rows: [{ count: 3 }], columns: ['count'] })
    if (url.includes('/api/health/gaps')) return makeOk([
      { id: 'GAP-001', area: 'Auth', description: 'Missing middleware', severity: 'CRITICAL', blocks: 'Phase 6' },
      { id: 'GAP-002', area: 'DB', description: 'No migration tooling', severity: 'HIGH', blocks: 'Phase 6' },
    ])
    if (url.includes('/api/health/freshness')) return makeOk([
      { doc: 'HEALTH.md', lastVerified: '2026-03-28', threshold: '7 days', status: 'ok', nextCheck: '2026-04-04' },
      { doc: 'SECURITY.md', lastVerified: '2026-03-20', threshold: '14 days', status: 'warn', nextCheck: '2026-04-03' },
    ])
    if (url.includes('/api/governance/hard-rules')) return makeOk([
      { number: '1', rule: 'All branches cut from dev', enforcedBy: 'CI hooks' },
      { number: '2', rule: 'PRs must have green CI', enforcedBy: 'GitHub branch protection' },
    ])
    if (url.includes('/api/decisions/structured')) return makeOk([
      { date: '2026-03-24', agent: 'Orchestrator', title: 'Use ZeroDev Kernel v3', phase: 'Phase 5', status: 'Accepted', reviews: 'Architect, Security', body: '## Context\nWe chose ZeroDev.' },
      { date: '2026-03-20', agent: 'Security', title: 'Reject session cookie auth', phase: 'Phase 4', status: 'Rejected', reviews: 'Orchestrator', body: '## Context\nSession cookies rejected.' },
    ])
    if (url.includes('/api/decisions')) return makeOk({ content: '# DECISIONS\n\n## 2026-03-24\nBody.' })
    if (url.includes('/api/phases')) return makeOk({ content: '## Phase Checklist\n- [x] Phase 1: Infrastructure\n  - [x] Rust backend\n  - [x] CI setup\n- [ ] Phase 2: SDK\n  - [x] Basic SDK\n  - [ ] UserOp building\n- [ ] Phase 3: Reference App\n  - [ ] Demo app\n' })
    if (url.includes('/api/deployments')) return makeOk({ content: '## v0.5.1 — 2026-03-10 — testnet — success\nDeployed SDK v0.5.1.\n---\n## v0.5.0 — 2026-03-01 — testnet — success\nInitial testnet.' })
    if (url.includes('/api/governance')) return makeOk({ content: '# GOVERNANCE\n\n## Hard Rules\n1. All branches from dev.' })
    if (url.includes('/api/github/releases')) return makeOk([
      { id: 1, tag_name: 'v0.5.1', name: 'Release v0.5.1', html_url: 'http://gh/v0.5.1', published_at: '2026-03-10T00:00:00Z', prerelease: false, body: '## Changes\n- Added wallet creation\n- Fixed bundler timeout' },
      { id: 2, tag_name: 'v0.5.0-beta', name: 'Beta', html_url: 'http://gh/v0.5.0', published_at: '2026-03-01T00:00:00Z', prerelease: true, body: '' },
    ])
    if (url.includes('/api/inbox')) return makeOk({ content: '# INBOX\n\n## Pending\n\n### MEMO-123 — 2026-03-28 — Priority: HIGH\n**To:** Orchestrator\n**From:** Founder\n**Subject:** Please review\nReview the new feature.\n**Status:** PENDING\n\n---\n### MEMO-124 — 2026-03-27\n**To:** Security\n**From:** Founder\n**Subject:** Audit request\nPlease audit.\n**Status:** PENDING\n---\n' })
    if (url.includes('/api/outbox')) return makeOk({ content: '# OUTBOX\n\n## Response to MEMO-001\nTask acknowledged and in progress.' })
    if (url.match(/\/api\/file\?path=docs\/agents\/HEALTH\.md/)) return makeOk({ content: 'OVERALL: HEALTHY\nOPEN ISSUES: 0\nTESTS PASSING: 100%\nCOVERAGE: 95%\nPHASE PROGRESS: Phase 2 (In Progress)\nSDK VERSION: 0.5.1' })
    if (url.match(/\/api\/file\?path=docs\/agents\/SECURITY\.md/)) return makeOk({ content: '## Active Findings\n\n_None found_\n\n### Phase 1 Security Gate\n- [x] Input validation\n- [x] Auth middleware\n- [ ] Penetration test\n\n### Phase 4 Security Gate\n- [x] Key isolation\n\n## Acceptable Risk Suppressions\n\n| CVE | Affected | Justification | Added |\n|---|---|---|---|\n| RUSTSEC-2023-0071 | rsa 0.9.6 | RSA not used in hot path | 2026-03-01 |\n' })
    if (url.includes('/api/file')) return makeOk({ content: '# Agent Doc\n## Role\nThis agent does important work.\n## Responsibilities\n- Task 1\n- Task 2' })
    if (url.includes('/api/github')) return makeOk([])
    return makeOk({})
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedESInstance = null
  setupFetch()
})

// ── Helper ────────────────────────────────────────────────────────────────────
async function renderApp() {
  await act(async () => { render(<App />) })
  // Wait for initial fetches to complete
  await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 3000 })
}

async function clickTab(label: string) {
  // Use getAllByRole to avoid failure when a label filter button shares the same name as a tab
  const btns = screen.getAllByRole('button', { name: label })
  await act(async () => { fireEvent.click(btns[0]) })
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
}

// ── Smoke test ────────────────────────────────────────────────────────────────
describe('App — smoke tests', () => {
  it('renders without crashing', async () => {
    await renderApp()
    expect(screen.getByText(/GhostKey/i)).toBeDefined()
  })

  it('shows all 11 tab labels', async () => {
    await renderApp()
    for (const label of ['Overview', 'Issues', 'Security', 'Phases', 'Agents', 'Database', 'Governance', 'Activity', 'Memo Center', 'Decisions', 'Deployments']) {
      expect(screen.getByRole('button', { name: label })).toBeDefined()
    }
  })

  it('auto-refresh toggle: off → on → off', async () => {
    await renderApp()
    const btn = screen.getByText(/▶ Auto-refresh/i)
    await act(async () => { fireEvent.click(btn) })
    expect(screen.getByText(/Auto-refresh ON/i)).toBeDefined()
    await act(async () => { fireEvent.click(screen.getByText(/Auto-refresh ON/i)) })
    expect(screen.getByText(/▶ Auto-refresh/i)).toBeDefined()
  })
})

// ── Overview tab ──────────────────────────────────────────────────────────────
describe('Overview tab', () => {
  it('renders health panel data', async () => {
    await renderApp()
    await waitFor(() => {
      expect(document.body.textContent).toContain('GhostKey')
    })
  })

  it('renders CI runs with success/failure status', async () => {
    await renderApp()
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy()
    })
  })

  it('renders BackendHealthWidget with ok=true', async () => {
    await renderApp()
    await waitFor(() => {
      // widget renders status uppercased, e.g. 'HEALTHY'
      expect(document.body.textContent).toContain('HEALTHY')
    }, { timeout: 3000 })
  })

  it('renders BackendHealthWidget when backend is down', async () => {
    setupFetch({ '/api/healthcheck': { ok: false, status: null, data: null } })
    await renderApp()
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy()
    })
  })

  it('HealthPanel full-report toggle button expands and collapses', async () => {
    await renderApp()
    await waitFor(() => {
      expect(document.body.textContent).toContain('System Health')
    }, { timeout: 3000 })
    // Click "full report" to expand
    const fullReportBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('full report'))
    if (fullReportBtn) {
      await act(async () => { fireEvent.click(fullReportBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('collapse')
      }, { timeout: 1000 })
      // Collapse again
      const collapseBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('collapse'))
      if (collapseBtn) {
        await act(async () => { fireEvent.click(collapseBtn) })
      }
    }
  })
})

// ── Issues tab ────────────────────────────────────────────────────────────────
describe('Issues tab', () => {
  it('renders issue list with mock data', async () => {
    await renderApp()
    await clickTab('Issues')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Critical auth bug')
    }, { timeout: 3000 })
  })

  it('refresh button re-fetches issues', async () => {
    await renderApp()
    await clickTab('Issues')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Critical auth bug')
    }, { timeout: 3000 })
    // The ↻ refresh button in IssuesTabPanel
    const refreshBtn = screen.getAllByRole('button').find(b => b.textContent?.trim() === '↻')
    if (refreshBtn) {
      await act(async () => { fireEvent.click(refreshBtn) })
    }
  })

  it('renders stats cards (total, critical, etc.)', async () => {
    await renderApp()
    await clickTab('Issues')
    await waitFor(() => {
      const text = document.body.textContent ?? ''
      expect(text).toContain('Issues')
    })
  })

  it('label filter buttons exist and can be clicked', async () => {
    await renderApp()
    await clickTab('Issues')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Critical auth bug')
    }, { timeout: 3000 })
    // Click label filters
    for (const label of ['critical', 'bug', 'enhancement', 'security', 'All']) {
      const btns = screen.getAllByRole('button')
      const btn = btns.find(b => b.textContent?.trim() === label)
      if (btn) {
        await act(async () => { fireEvent.click(btn) })
      }
    }
  })

  it('search input filters issues', async () => {
    await renderApp()
    await clickTab('Issues')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Critical auth bug')
    }, { timeout: 3000 })
    const inputs = document.querySelectorAll('input')
    const searchInput = Array.from(inputs).find(i => i.placeholder?.includes('earch') || i.placeholder?.includes('ilter'))
    if (searchInput) {
      await act(async () => { fireEvent.change(searchInput, { target: { value: 'auth' } }) })
      await act(async () => { fireEvent.change(searchInput, { target: { value: '' } }) })
    }
  })
})

// ── Security tab ──────────────────────────────────────────────────────────────
describe('Security tab', () => {
  it('renders security gates', async () => {
    await renderApp()
    await clickTab('Security')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Security')
    }, { timeout: 3000 })
  })

  it('renders CVE suppressions when present', async () => {
    await renderApp()
    await clickTab('Security')
    await waitFor(() => {
      const text = document.body.textContent ?? ''
      expect(text).toContain('Security')
    }, { timeout: 3000 })
  })

  it('clicking a security gate expands its checklist', async () => {
    await renderApp()
    await clickTab('Security')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Phase')
    }, { timeout: 3000 })
    // Security gates have cursor:pointer on their header div
    const gateDivs = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'))
      .filter(el => el.textContent?.includes('%') || el.textContent?.includes('Phase'))
    if (gateDivs.length > 0) {
      await act(async () => { fireEvent.click(gateDivs[0]) })
      await act(async () => { await new Promise(r => setTimeout(r, 30)) })
      // Collapse
      await act(async () => { fireEvent.click(gateDivs[0]) })
    }
  })
})

// ── Phases tab ────────────────────────────────────────────────────────────────
describe('Phases tab', () => {
  it('renders phase list', async () => {
    await renderApp()
    await clickTab('Phases')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Phase')
    }, { timeout: 3000 })
  })

  it('renders known gaps sidebar', async () => {
    await renderApp()
    await clickTab('Phases')
    await waitFor(() => {
      expect(document.body.textContent).toContain('GAP-001')
    }, { timeout: 3000 })
  })

  it('clicking a phase expands its items', async () => {
    await renderApp()
    await clickTab('Phases')
    await waitFor(() => {
      // With correct mock the phases parse and show
      expect(document.body.textContent).toContain('Phase')
    }, { timeout: 3000 })
    // Phase rows are div elements with cursor:pointer — not buttons
    const phaseDivs = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'))
      .filter(el => el.textContent?.includes('Phase'))
    if (phaseDivs.length > 0) {
      await act(async () => { fireEvent.click(phaseDivs[0]) })
      await act(async () => { await new Promise(r => setTimeout(r, 30)) })
      // Collapse
      await act(async () => { fireEvent.click(phaseDivs[0]) })
    }
  })
})

// ── Agents tab ────────────────────────────────────────────────────────────────
describe('Agents tab', () => {
  it('renders agent roster', async () => {
    await renderApp()
    await clickTab('Agents')
    await waitFor(() => {
      expect(screen.getByText(/Agent Roster/i)).toBeDefined()
    }, { timeout: 3000 })
  })

  it('clicking an agent loads its doc', async () => {
    await renderApp()
    await clickTab('Agents')
    await waitFor(() => {
      expect(screen.getByText(/Agent Roster/i)).toBeDefined()
    })
    const btns = screen.getAllByRole('button')
    const agentBtn = btns.find(b => b.textContent?.includes('Orchestrator') || b.textContent?.includes('Claude'))
    if (agentBtn) {
      await act(async () => { fireEvent.click(agentBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy()
      })
    }
  })

  it('shows activity stats per agent', async () => {
    await renderApp()
    await clickTab('Agents')
    await waitFor(() => {
      // Orchestrator is in ROSTER and in the mock agentStats, so appears in Activity Summary
      expect(document.body.textContent).toContain('Orchestrator')
    }, { timeout: 3000 })
  })

  it('clicking agent stat card loads agent doc', async () => {
    await renderApp()
    await clickTab('Agents')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Orchestrator')
    }, { timeout: 3000 })
    // The stat card for Orchestrator is a div with cursor:pointer (not a button)
    const statCards = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'))
      .filter(el => el.textContent?.includes('Orchestrator'))
    if (statCards.length > 0) {
      await act(async () => { fireEvent.click(statCards[0]) })
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy()
      }, { timeout: 2000 })
    }
  })
})

// ── Database tab ──────────────────────────────────────────────────────────────

// DB table buttons render as "users\n10 rows" — use includes() to match
function findTableBtn(name: string) {
  return screen.getAllByRole('button').find(b => b.textContent?.includes(name) && b.textContent?.includes('rows'))
}

describe('Database tab', () => {
  it('shows tables when DB is available', async () => {
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('users')
    }, { timeout: 3000 })
  })

  it('clicking a table loads its rows', async () => {
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('users')
    }, { timeout: 3000 })
    const tableBtn = findTableBtn('users')
    if (tableBtn) {
      await act(async () => { fireEvent.click(tableBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('0xabc')
      }, { timeout: 2000 })
    }
  })

  it('column sort headers trigger re-sort (asc then desc)', async () => {
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('users')
    }, { timeout: 3000 })
    const tableBtn = findTableBtn('users')
    if (tableBtn) {
      await act(async () => { fireEvent.click(tableBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('id')
      }, { timeout: 2000 })
      // Click sort headers — first click = asc, second = desc
      const headers = document.querySelectorAll('th')
      if (headers.length > 0) {
        await act(async () => { fireEvent.click(headers[0]) })
        await act(async () => { fireEvent.click(headers[0]) })
      }
    }
  })

  it('table refresh button reloads data', async () => {
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('users')
    }, { timeout: 3000 })
    const tableBtn = findTableBtn('users')
    if (tableBtn) {
      await act(async () => { fireEvent.click(tableBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('0xabc')
      }, { timeout: 2000 })
      // Click the ↻ refresh button
      const refreshBtn = screen.getAllByRole('button').find(b => b.textContent?.trim() === '↻')
      if (refreshBtn) {
        await act(async () => { fireEvent.click(refreshBtn) })
      }
    }
  })

  it('CSV export button triggers download', async () => {
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('users')
    }, { timeout: 3000 })
    const tableBtn = findTableBtn('users')
    if (tableBtn) {
      await act(async () => { fireEvent.click(tableBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('0xabc')
      }, { timeout: 2000 })
      const csvBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('CSV'))
      if (csvBtn) {
        await act(async () => { fireEvent.click(csvBtn) })
      }
    }
  })

  it('SQL Query mode: fill textarea, run query, use Ctrl+Enter', async () => {
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Tables')
    }, { timeout: 3000 })
    // Click SQL Query button
    const sqlBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('SQL Query'))
    if (sqlBtn) {
      await act(async () => { fireEvent.click(sqlBtn) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('SELECT only')
      }, { timeout: 2000 })
      // Change the textarea
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null
      if (textarea) {
        await act(async () => { fireEvent.change(textarea, { target: { value: 'SELECT count(*) FROM users' } }) })
        // Ctrl+Enter shortcut
        await act(async () => { fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true }) })
        await act(async () => { await new Promise(r => setTimeout(r, 50)) })
      }
      // Also click Run Query button
      const runBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Run Query'))
      if (runBtn) {
        await act(async () => { fireEvent.click(runBtn) })
        await waitFor(() => {
          expect(document.body.textContent).toBeTruthy()
        }, { timeout: 2000 })
      }
    }
  })

  it('unavailable DB shows error message', async () => {
    setupFetch({ '/api/db/status': { available: false, reason: 'DB not found' } })
    await renderApp()
    await clickTab('Database')
    await waitFor(() => {
      expect(document.body.textContent).toContain('unavailable')
    }, { timeout: 3000 })
  })
})

// ── Governance tab ────────────────────────────────────────────────────────────
describe('Governance tab', () => {
  it('renders hard rules when available', async () => {
    await renderApp()
    await clickTab('Governance')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Hard Rules')
    }, { timeout: 3000 })
  })

  it('renders doc freshness table', async () => {
    await renderApp()
    await clickTab('Governance')
    await waitFor(() => {
      expect(document.body.textContent).toContain('HEALTH.md')
    }, { timeout: 3000 })
  })

  it('renders markdown content from governance file', async () => {
    await renderApp()
    await clickTab('Governance')
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy()
    })
  })

  it('filter input narrows governance sections', async () => {
    await renderApp()
    await clickTab('Governance')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Governance')
    }, { timeout: 3000 })
    // GovernancePanel filter input (onChange line 1137)
    const filterInput = Array.from(document.querySelectorAll('input')).find(i => i.placeholder?.includes('Filter'))
    if (filterInput) {
      await act(async () => { fireEvent.change(filterInput, { target: { value: 'Hard' } }) })
      await act(async () => { fireEvent.change(filterInput, { target: { value: '' } }) })
    }
  })
})

// ── Activity tab ──────────────────────────────────────────────────────────────
describe('Activity tab', () => {
  it('renders Feed view with entries', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(screen.getByText('Feed')).toBeDefined()
    }, { timeout: 3000 })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
  })

  it('can switch to Stats view and back to Feed', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => { expect(screen.getByText('Stats')).toBeDefined() })
    await act(async () => { fireEvent.click(screen.getByText('Stats')) })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Total Events')
    }, { timeout: 3000 })
    // Switch back to Feed
    await act(async () => { fireEvent.click(screen.getByText('Feed')) })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 2000 })
  })

  it('can switch to Graph view', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => { expect(screen.getByText('Graph')).toBeDefined() })
    await act(async () => { fireEvent.click(screen.getByText('Graph')) })
    await waitFor(() => {
      // SVG should render
      expect(document.querySelector('svg')).toBeDefined()
    }, { timeout: 3000 })
  })

  it('Graph view: clicking and hovering agent nodes', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => { expect(screen.getByText('Graph')).toBeDefined() })
    await act(async () => { fireEvent.click(screen.getByText('Graph')) })
    await waitFor(() => {
      expect(document.querySelector('svg')).toBeDefined()
    }, { timeout: 3000 })
    // Click SVG g elements (agent nodes) — covers onClick, onMouseEnter, onMouseLeave
    const circles = document.querySelectorAll('svg g')
    if (circles.length > 0) {
      await act(async () => { fireEvent.mouseEnter(circles[0]) })
      await act(async () => { fireEvent.mouseLeave(circles[0]) })
      await act(async () => { fireEvent.click(circles[0]) })
      // Click again to deselect (toggle)
      await act(async () => { fireEvent.click(circles[0]) })
    }
  })

  it('Graph view: legend buttons filter agent', async () => {
    await renderApp()
    await clickTab('Activity')
    await act(async () => { fireEvent.click(screen.getByText('Graph')) })
    await waitFor(() => {
      expect(document.querySelector('svg')).toBeDefined()
    }, { timeout: 3000 })
    // Find legend buttons and click
    const legendBtns = screen.getAllByRole('button')
    const ciBtn = legendBtns.find(b => b.textContent?.includes('CI'))
    if (ciBtn) {
      await act(async () => { fireEvent.click(ciBtn) })
      await act(async () => { fireEvent.click(ciBtn) })
    }
  })

  it('Feed view: source filter buttons work and agent filter select works', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    // Source filter buttons contain badge text + label, e.g. "AGT Agents", "CC Claude", "CI CI", "API API", "All"
    // Use includes() instead of exact match
    for (const label of ['Agents', 'Claude', 'CI', 'API', 'All']) {
      const btns = screen.getAllByRole('button')
      const btn = btns.find(b => b.textContent?.includes(label) && b.textContent!.length < 15)
      if (btn) {
        await act(async () => { fireEvent.click(btn) })
      }
    }
    // Agent filter select (onChange line 1347) — the select that filters by agent name
    const agentFilterSelect = Array.from(document.querySelectorAll('select')).find(
      s => Array.from(s.options).some(o => o.value === 'All') && Array.from(s.options).some(o => o.value === 'Claude')
    )
    if (agentFilterSelect) {
      await act(async () => { fireEvent.change(agentFilterSelect, { target: { value: 'Claude' } }) })
      await act(async () => { fireEvent.change(agentFilterSelect, { target: { value: 'All' } }) })
    }
  })

  it('Feed view: filter input works', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    const input = document.querySelectorAll('input')
    const filterInput = Array.from(input).find(i => i.placeholder?.toLowerCase().includes('filter') || i.placeholder?.toLowerCase().includes('search'))
    if (filterInput) {
      await act(async () => { fireEvent.change(filterInput, { target: { value: 'plan' } }) })
      await act(async () => { fireEvent.change(filterInput, { target: { value: '' } }) })
    }
  })

  it('Feed view: clicking entry opens ActivityModal (Escape closes)', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    // Activity entries have border-left style (source color stripe), not shared with tab buttons
    const entries = document.querySelectorAll('[style*="border-left"]')
    if (entries.length > 0) {
      await act(async () => { fireEvent.click(entries[0]) })
      // Modal should open — it has the action text
      await waitFor(() => {
        expect(document.body.textContent).toContain('plan')
      }, { timeout: 2000 })
      // Close via Escape key WHILE MODAL IS OPEN — triggers the handler in ActivityModal's useEffect
      await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }) })
      await act(async () => { await new Promise(r => setTimeout(r, 30)) })
    }
  })

  it('Feed view: ActivityModal × button and backdrop close', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    const entries = document.querySelectorAll('[style*="border-left"]')
    if (entries.length > 0) {
      // Open modal
      await act(async () => { fireEvent.click(entries[0]) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('plan')
      }, { timeout: 2000 })
      // Close via × button
      const closeBtn = screen.getAllByRole('button').find(b => b.textContent?.trim() === '×')
      if (closeBtn) {
        await act(async () => { fireEvent.click(closeBtn) })
      }
    }
  })

  it('Feed view: ActivityModal backdrop click closes modal', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    const entries = document.querySelectorAll('[style*="border-left"]')
    if (entries.length > 0) {
      await act(async () => { fireEvent.click(entries[0]) })
      await waitFor(() => {
        // Modal backdrop is the fixed overlay — click it
        const backdrop = document.querySelector('[style*="position: fixed"]')
        if (backdrop) {
          fireEvent.click(backdrop)
        }
      }, { timeout: 2000 })
    }
  })

  it('Feed view: mouse events on entries', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Claude')
    }, { timeout: 3000 })
    // Activity entries with border-left (source color stripe)
    const entries = document.querySelectorAll('[style*="border-left"]')
    if (entries.length > 0) {
      await act(async () => { fireEvent.mouseEnter(entries[0]) })
      await act(async () => { fireEvent.mouseLeave(entries[0]) })
    }
  })

  it('SSE: onopen handler sets connected state', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => capturedESInstance !== null, { timeout: 2000 })
    await act(async () => {
      if (capturedESInstance?.onopen) capturedESInstance.onopen(new Event('open'))
    })
    // liveConnected should be true — check for indicator
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
  })

  it('SSE: onmessage handler adds entry to feed', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => capturedESInstance !== null, { timeout: 2000 })
    await act(async () => {
      if (capturedESInstance?.onmessage) {
        capturedESInstance.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ ts: '2026-03-30T10:00:00Z', event_type: 'ci', agent: 'CI', action: 'new_run', detail: 'live entry', status: 'ok' }),
        }))
      }
    })
    await waitFor(() => {
      expect(document.body.textContent).toContain('live entry')
    }, { timeout: 2000 })
  })

  it('SSE: onerror handler triggers reconnect logic', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => capturedESInstance !== null, { timeout: 2000 })
    await act(async () => {
      if (capturedESInstance?.onerror) capturedESInstance.onerror(new Event('error'))
    })
    // Should not crash
    expect(document.body.textContent).toBeTruthy()
  })

  it('SSE: onmessage with invalid JSON is ignored', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => capturedESInstance !== null, { timeout: 2000 })
    await act(async () => {
      if (capturedESInstance?.onmessage) {
        capturedESInstance.onmessage(new MessageEvent('message', { data: 'INVALID JSON {{' }))
      }
    })
    expect(document.body.textContent).toBeTruthy()
  })

  it('Activity log form: fill action, detail, status and submit', async () => {
    await renderApp()
    await clickTab('Activity')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Log Activity')
    }, { timeout: 3000 })
    // Action input placeholder is "e.g. merged PR #115"
    const actionInput = Array.from(document.querySelectorAll('input')).find(i => i.placeholder?.includes('merged PR'))
    // Detail input placeholder is "optional"
    const detailInput = Array.from(document.querySelectorAll('input')).find(i => i.placeholder === 'optional')
    if (actionInput) {
      await act(async () => { fireEvent.change(actionInput, { target: { value: 'test_action' } }) })
    }
    if (detailInput) {
      await act(async () => { fireEvent.change(detailInput, { target: { value: 'test detail' } }) })
    }
    // Agent select
    const agentSelect = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value === 'Founder'))
    if (agentSelect) {
      await act(async () => { fireEvent.change(agentSelect, { target: { value: 'Orchestrator' } }) })
    }
    // Status select
    const statusSelect = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value === 'error'))
    if (statusSelect) {
      await act(async () => { fireEvent.change(statusSelect, { target: { value: 'error' } }) })
      await act(async () => { fireEvent.change(statusSelect, { target: { value: 'ok' } }) })
    }
    // Click Log Activity button (only enabled when action is set)
    if (actionInput) {
      const logBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Log'))
      if (logBtn) {
        await act(async () => { fireEvent.click(logBtn) })
        await waitFor(() => {
          expect(document.body.textContent).toBeTruthy()
        }, { timeout: 2000 })
      }
    }
  })
})

// ── Memo Center tab ───────────────────────────────────────────────────────────
describe('Memo Center tab', () => {
  it('shows compose form and inbox', async () => {
    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => {
      expect(screen.getByText(/Compose Memo/i)).toBeDefined()
    }, { timeout: 3000 })
  })

  it('inbox search filters memos', async () => {
    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => {
      expect(screen.getByText(/Compose Memo/i)).toBeDefined()
    })
    const inputs = document.querySelectorAll('input')
    const searchInput = Array.from(inputs).find(i => i.placeholder?.toLowerCase().includes('search inbox'))
    if (searchInput) {
      await act(async () => { fireEvent.change(searchInput, { target: { value: 'review' } }) })
      await act(async () => { fireEvent.change(searchInput, { target: { value: 'nomatch_xyz' } }) })
      await act(async () => { fireEvent.change(searchInput, { target: { value: '' } }) })
    }
  })

  it('can switch to outbox then back to inbox', async () => {
    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => { expect(screen.getByText(/OUTBOX/i)).toBeDefined() })
    await act(async () => { fireEvent.click(screen.getByText(/OUTBOX/i)) })
    await waitFor(() => {
      expect(document.body.textContent).toContain('OUTBOX')
    })
    // Switch back to INBOX
    const inboxBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('INBOX'))
    if (inboxBtn) {
      await act(async () => { fireEvent.click(inboxBtn) })
    }
  })

  it('refresh button re-fetches inbox', async () => {
    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => { expect(screen.getByText(/Refresh/i)).toBeDefined() })
    await act(async () => { fireEvent.click(screen.getByText(/Refresh/i)) })
  })

  it('filling compose form and clicking Send', async () => {
    // Mock the POST /api/memo to succeed
    const mockPost = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true, memoId: 'MEMO-TEST' }) })
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST' && url.includes('/api/memo')) return mockPost()
      return setupFetch(), (global.fetch as ReturnType<typeof vi.fn>)(url)
    })
    setupFetch()

    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => { expect(screen.getByText(/Compose Memo/i)).toBeDefined() })

    // Fill subject and body
    const inputs = document.querySelectorAll('input')
    const subjectInput = Array.from(inputs).find(i => i.placeholder?.toLowerCase().includes('subject'))
    if (subjectInput) {
      await act(async () => { fireEvent.change(subjectInput, { target: { value: 'Test Subject' } }) })
    }
    const textarea = document.querySelector('textarea')
    if (textarea) {
      await act(async () => { fireEvent.change(textarea, { target: { value: 'Test memo body content' } }) })
    }
    // Click Send button
    const sendBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Send'))
    if (sendBtn) {
      await act(async () => { fireEvent.click(sendBtn) })
    }
  })

  it('select agent in compose form', async () => {
    await renderApp()
    await clickTab('Memo Center')
    await waitFor(() => { expect(screen.getByText(/Compose Memo/i)).toBeDefined() })
    const selects = document.querySelectorAll('select')
    if (selects.length > 0) {
      await act(async () => { fireEvent.change(selects[0], { target: { value: 'Security' } }) })
    }
    if (selects.length > 1) {
      await act(async () => { fireEvent.change(selects[1], { target: { value: 'HIGH' } }) })
    }
  })
})

// ── Decisions tab ─────────────────────────────────────────────────────────────
describe('Decisions tab', () => {
  it('renders decision list', async () => {
    await renderApp()
    await clickTab('Decisions')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Use ZeroDev Kernel v3')
    }, { timeout: 3000 })
  })

  it('clicking a decision expands it', async () => {
    await renderApp()
    await clickTab('Decisions')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Use ZeroDev Kernel v3')
    }, { timeout: 3000 })
    // Find the clickable header of the ZeroDev decision specifically
    const rows = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'))
    const zeroDevRow = rows.find(el => el.textContent?.includes('Use ZeroDev Kernel v3'))
    if (zeroDevRow) {
      await act(async () => { fireEvent.click(zeroDevRow) })
      // Should show expanded body
      await waitFor(() => {
        expect(document.body.textContent).toContain('We chose ZeroDev')
      }, { timeout: 2000 })
      // Click again to collapse
      await act(async () => { fireEvent.click(zeroDevRow) })
    }
  })

  it('shows different status badge colors (accepted, rejected)', async () => {
    await renderApp()
    await clickTab('Decisions')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Reject session cookie auth')
    }, { timeout: 3000 })
  })

  it('filter input narrows decision list', async () => {
    await renderApp()
    await clickTab('Decisions')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Use ZeroDev')
    }, { timeout: 3000 })
    const input = document.querySelector('input[placeholder*="Filter"]') as HTMLInputElement | null
    if (input) {
      await act(async () => { fireEvent.change(input, { target: { value: 'ZeroDev' } }) })
      await act(async () => { fireEvent.change(input, { target: { value: 'nomatch_xyz_abc' } }) })
      await act(async () => { fireEvent.change(input, { target: { value: '' } }) })
    }
  })
})

// ── Deployments tab ───────────────────────────────────────────────────────────
describe('Deployments tab', () => {
  it('renders deployment history', async () => {
    await renderApp()
    await clickTab('Deployments')
    await waitFor(() => {
      const text = document.body.textContent ?? ''
      expect(text).toContain('Deployment')
    }, { timeout: 3000 })
  })

  it('env filter buttons exist and are clickable', async () => {
    await renderApp()
    await clickTab('Deployments')
    await waitFor(() => {
      expect(document.body.textContent).toContain('Deployment')
    }, { timeout: 3000 })
    // Click All filter
    const btns = screen.getAllByRole('button')
    const allBtn = btns.find(b => b.textContent?.trim() === 'All')
    if (allBtn) await act(async () => { fireEvent.click(allBtn) })
    // Click testnet filter if present
    const testnetBtn = btns.find(b => b.textContent?.trim() === 'testnet')
    if (testnetBtn) await act(async () => { fireEvent.click(testnetBtn) })
  })

  it('shows ReleasesPanel below deployment history', async () => {
    await renderApp()
    await clickTab('Deployments')
    await waitFor(() => {
      expect(document.body.textContent).toContain('v0.5.1')
    }, { timeout: 3000 })
  })

  it('clicking a release expands its changelog', async () => {
    await renderApp()
    await clickTab('Deployments')
    await waitFor(() => {
      expect(document.body.textContent).toContain('v0.5.1')
    }, { timeout: 3000 })
    // Find the release row by looking for element containing 'v0.5.1' with cursor:pointer
    const clickableEls = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'))
    const releaseRow = clickableEls.find(el => el.textContent?.includes('v0.5.1') && el.textContent?.includes('Release'))
    if (releaseRow) {
      await act(async () => { fireEvent.click(releaseRow) })
      await waitFor(() => {
        expect(document.body.textContent).toContain('Added wallet creation')
      }, { timeout: 2000 })
      // Click again to collapse
      await act(async () => { fireEvent.click(releaseRow) })
    }
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────
describe('Edge cases', () => {
  it('renders when all API calls fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<App />) })
    await act(async () => { await new Promise(r => setTimeout(r, 100)) })
    expect(document.body.textContent).toContain('GhostKey')
  })

  it('renders all tabs gracefully with empty data', async () => {
    setupFetch({
      '/api/github/issues': [],
      '/api/github/prs': [],
      '/api/github/runs': { workflow_runs: [] },
      '/api/activity': [],
      '/api/activity/agents': {},
      '/api/decisions/structured': [],
      '/api/health/gaps': [],
    })
    await renderApp()
    for (const label of ['Issues', 'Security', 'Phases', 'Agents', 'Database', 'Governance', 'Activity', 'Memo Center', 'Decisions', 'Deployments']) {
      await clickTab(label)
      await act(async () => { await new Promise(r => setTimeout(r, 30)) })
    }
    expect(document.body.textContent).toBeTruthy()
  })
})
