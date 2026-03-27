import express from 'express'
import { readFileSync, appendFileSync, writeFileSync, existsSync, watch } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const DB_PATH = join(REPO_ROOT, 'db/ghostkey.db')
const ACTIVITY_LOG = join(REPO_ROOT, 'docs/agents/ACTIVITY.log')

const app = express()
app.use(express.json())

// ── Utilities ─────────────────────────────────────────────────────────────────

function openDb() {
  const Database = require('better-sqlite3')
  return new Database(DB_PATH, { readonly: true })
}

function safeTableName(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

// ── File API ──────────────────────────────────────────────────────────────────

// Read a repo file (docs/ only)
app.get('/api/file', (req, res) => {
  const { path: filePath } = req.query
  if (!filePath || typeof filePath !== 'string') return res.status(400).json({ error: 'path required' })
  if (!filePath.startsWith('docs/')) return res.status(403).json({ error: 'only docs/ allowed' })
  try {
    const content = readFileSync(join(REPO_ROOT, filePath), 'utf-8')
    res.json({ content })
  } catch {
    res.status(404).json({ error: 'file not found' })
  }
})

// ── Memo / Comms ──────────────────────────────────────────────────────────────

app.post('/api/memo', (req, res) => {
  const { to, from, subject, body, priority } = req.body
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' })
  const inboxPath = join(REPO_ROOT, 'docs/agents/INBOX.md')
  if (!existsSync(inboxPath)) return res.status(500).json({ error: 'INBOX.md not found' })
  const dateStr = new Date().toISOString().split('T')[0]
  const memoId = `MEMO-${Date.now().toString().slice(-6)}`
  const memoBlock = `
### ${memoId} — ${dateStr} — Priority: ${priority || 'MEDIUM'}
**To:** ${to}
**From:** ${from || 'Founder'}
**Subject:** ${subject}
${body}
**Status:** PENDING

---
`
  const current = readFileSync(inboxPath, 'utf-8')
  const processedIdx = current.indexOf('\n## Processed')
  if (processedIdx !== -1) {
    writeFileSync(inboxPath, current.slice(0, processedIdx) + memoBlock + current.slice(processedIdx))
  } else {
    appendFileSync(inboxPath, memoBlock)
  }
  res.json({ ok: true, memoId })
})

app.get('/api/inbox', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/INBOX.md'), 'utf-8') }) }
  catch { res.json({ content: '# INBOX\n\nNo memos yet.' }) }
})

app.get('/api/outbox', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/OUTBOX.md'), 'utf-8') }) }
  catch { res.json({ content: '# OUTBOX\n\nNo responses yet.' }) }
})

app.get('/api/decisions', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/DECISIONS.md'), 'utf-8') }) }
  catch { res.json({ content: '' }) }
})

app.get('/api/phases', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/corp/ORCHESTRATOR.md'), 'utf-8') }) }
  catch { res.json({ content: '' }) }
})

app.get('/api/deployments', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/DEPLOYMENTS.md'), 'utf-8') }) }
  catch { res.json({ content: '# DEPLOYMENTS\n\nNo deployments recorded yet.' }) }
})

app.get('/api/governance', (req, res) => {
  try { res.json({ content: readFileSync(join(REPO_ROOT, 'docs/agents/GOVERNANCE.md'), 'utf-8') }) }
  catch { res.json({ content: '' }) }
})

// ── Activity Log ──────────────────────────────────────────────────────────────

app.get('/api/activity', (req, res) => {
  try {
    if (!existsSync(ACTIVITY_LOG)) return res.json([])
    const lines = readFileSync(ACTIVITY_LOG, 'utf-8').trim().split('\n').filter(Boolean)
    const entries = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    res.json(entries.slice(-200).reverse())
  } catch { res.json([]) }
})

app.post('/api/activity', (req, res) => {
  const { agent, action, detail, status } = req.body
  if (!agent || !action) return res.status(400).json({ error: 'agent and action required' })
  const entry = { ts: new Date().toISOString(), agent, action, detail: detail || '', status: status || 'ok' }
  appendFileSync(ACTIVITY_LOG, JSON.stringify(entry) + '\n')
  res.json({ ok: true })
})

// ── Database Viewer ───────────────────────────────────────────────────────────

app.get('/api/db/status', (req, res) => {
  if (!existsSync(DB_PATH)) return res.json({ available: false, reason: 'DB file not found at db/ghostkey.db' })
  try {
    const db = openDb()
    db.prepare('SELECT 1').get()
    db.close()
    res.json({ available: true, path: 'db/ghostkey.db' })
  } catch (e) {
    res.json({ available: false, reason: String(e) })
  }
})

app.get('/api/db/tables', (req, res) => {
  try {
    const db = openDb()
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    const result = tables.map(t => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as n FROM "${t.name}"`).get()
        return { name: t.name, rows: count.n }
      } catch { return { name: t.name, rows: null } }
    })
    db.close()
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.get('/api/db/table/:name', (req, res) => {
  const { name } = req.params
  const page = parseInt(req.query.page) || 0
  const limit = 50
  if (!safeTableName(name)) return res.status(400).json({ error: 'invalid table name' })
  try {
    const db = openDb()
    const rows = db.prepare(`SELECT * FROM "${name}" LIMIT ? OFFSET ?`).all(limit, page * limit)
    const total = db.prepare(`SELECT COUNT(*) as n FROM "${name}"`).get()
    const columns = rows.length > 0 ? Object.keys(rows[0])
      : db.prepare(`PRAGMA table_info("${name}")`).all().map(c => c.name)
    db.close()
    res.json({ rows, columns, total: total.n, page, limit })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.post('/api/db/query', (req, res) => {
  const { sql } = req.body
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'sql required' })
  const trimmed = sql.trim().toLowerCase()
  if (!trimmed.startsWith('select') && !trimmed.startsWith('pragma')) {
    return res.status(403).json({ error: 'only SELECT and PRAGMA queries are allowed' })
  }
  try {
    const db = openDb()
    const rows = db.prepare(sql).all()
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    db.close()
    res.json({ rows, columns })
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// ── GitHub API Proxy ──────────────────────────────────────────────────────────

async function ghFetch(path, res) {
  try {
    const token = process.env.GITHUB_TOKEN
    const headers = { 'User-Agent': 'ghostkey-dashboard', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const r = await fetch(`https://api.github.com/repos/OriginalLeeDunn/projekt.ReaperKey${path}`, { headers })
    res.json(await r.json())
  } catch { res.status(500).json({ error: 'github api error' }) }
}

app.get('/api/github/issues', (req, res) => ghFetch('/issues?state=open&per_page=20', res))
app.get('/api/github/runs', (req, res) => ghFetch('/actions/runs?per_page=10', res))
app.get('/api/github/prs', (req, res) => ghFetch('/pulls?state=open&per_page=20', res))
app.get('/api/github/pr/:number/checks', (req, res) => ghFetch(`/commits/${req.params.number}/check-runs`, res))

// ── SSE — Live Activity Stream ────────────────────────────────────────────────
// Clients connect to /api/stream/activity and receive new log entries in real-time
// as Claude or agents append them to ACTIVITY.log.

const sseClients = new Set()

app.get('/api/stream/activity', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  // Send a heartbeat every 15s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000)

  sseClients.add(res)
  req.on('close', () => { sseClients.delete(res); clearInterval(heartbeat) })
})

// Watch ACTIVITY.log for new appended lines and broadcast to all SSE clients
let lastLogSize = 0
if (existsSync(ACTIVITY_LOG)) {
  lastLogSize = readFileSync(ACTIVITY_LOG).length
}

function broadcastNewEntries() {
  if (!existsSync(ACTIVITY_LOG)) return
  const content = readFileSync(ACTIVITY_LOG, 'utf-8')
  if (content.length <= lastLogSize) return
  const newContent = content.slice(lastLogSize)
  lastLogSize = content.length
  const newLines = newContent.trim().split('\n').filter(Boolean)
  for (const line of newLines) {
    try {
      const entry = JSON.parse(line)
      const payload = `data: ${JSON.stringify(entry)}\n\n`
      for (const client of sseClients) {
        try { client.write(payload) } catch { sseClients.delete(client) }
      }
    } catch { /* skip malformed lines */ }
  }
}

// Watch the docs/agents directory so we catch the file being created too
watch(join(REPO_ROOT, 'docs/agents'), { persistent: false }, (event, filename) => {
  if (filename === 'ACTIVITY.log') broadcastNewEntries()
})

// ── Agent write helper — called by Claude hooks ───────────────────────────────
// POST /api/activity already handles this; the SSE watcher picks up the write.

app.listen(3003, () => console.log('Dashboard API server running on :3003'))
