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
const INBOX_PATH = join(REPO_ROOT, 'docs/agents/INBOX.md')
const OUTBOX_PATH = join(REPO_ROOT, 'docs/agents/OUTBOX.md')
const DECISIONS_PATH = join(REPO_ROOT, 'docs/agents/DECISIONS.md')
const HEALTH_PATH = join(REPO_ROOT, 'docs/agents/HEALTH.md')

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
  // Emit activity entry so the live feed reflects memo arrival
  appendActivity({
    event_type: 'agent',
    agent: 'Inbox Agent',
    action: 'memo_received',
    detail: `${memoId} → ${to}: ${subject}`,
    status: 'ok',
    meta: { memo_id: memoId, to, from: from || 'Founder', priority: priority || 'MEDIUM' },
  })
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

// ── Activity helpers ──────────────────────────────────────────────────────────

function appendActivity(fields) {
  const entry = {
    ts: new Date().toISOString(),
    event_type: fields.event_type || 'agent',
    agent: fields.agent,
    action: fields.action,
    detail: fields.detail || '',
    status: fields.status || 'ok',
    ...(fields.user_id && { user_id: fields.user_id }),
    ...(fields.chain && { chain: fields.chain }),
    ...(fields.meta && { meta: fields.meta }),
  }
  appendFileSync(ACTIVITY_LOG, JSON.stringify(entry) + '\n')
  lastLogSize += Buffer.byteLength(JSON.stringify(entry) + '\n')
  broadcast(entry)
  return entry
}

app.post('/api/activity', (req, res) => {
  const { agent, action } = req.body
  if (!agent || !action) return res.status(400).json({ error: 'agent and action required' })
  const entry = appendActivity(req.body)
  res.json({ ok: true, entry })
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

// ── SSE broadcast helpers ─────────────────────────────────────────────────────

function broadcast(entry) {
  const payload = `data: ${JSON.stringify(entry)}\n\n`
  for (const client of sseClients) {
    try { client.write(payload) } catch { sseClients.delete(client) }
  }
}

// Ensure ACTIVITY.log exists so watchers and GET /api/activity always work
if (!existsSync(ACTIVITY_LOG)) {
  appendFileSync(ACTIVITY_LOG, '')
}

// Watch ACTIVITY.log for new appended lines and broadcast to all SSE clients.
// Backend (Rust) and Claude tool hooks write here directly; this picks them up.
let lastLogSize = readFileSync(ACTIVITY_LOG).length

function broadcastNewEntries() {
  if (!existsSync(ACTIVITY_LOG)) return
  const content = readFileSync(ACTIVITY_LOG, 'utf-8')
  if (content.length <= lastLogSize) return
  const newContent = content.slice(lastLogSize)
  lastLogSize = content.length
  const newLines = newContent.trim().split('\n').filter(Boolean)
  for (const line of newLines) {
    try { broadcast(JSON.parse(line)) } catch { /* skip malformed lines */ }
  }
}

// ── Doc file watchers — synthesise activity entries from agent doc changes ────
// Track last sizes to detect appends (avoids re-processing on unchanged files)
const docSizes = { inbox: 0, outbox: 0, decisions: 0, health: 0 }
if (existsSync(INBOX_PATH)) docSizes.inbox = readFileSync(INBOX_PATH).length
if (existsSync(OUTBOX_PATH)) docSizes.outbox = readFileSync(OUTBOX_PATH).length
if (existsSync(DECISIONS_PATH)) docSizes.decisions = readFileSync(DECISIONS_PATH).length
if (existsSync(HEALTH_PATH)) docSizes.health = readFileSync(HEALTH_PATH).length

function handleDocChange(filePath, sizeKey, buildEntry) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf-8')
  if (content.length <= docSizes[sizeKey]) return
  const delta = content.slice(docSizes[sizeKey])
  docSizes[sizeKey] = content.length
  const entry = buildEntry(delta.trim())
  if (!entry) return
  appendFileSync(ACTIVITY_LOG, JSON.stringify(entry) + '\n')
  broadcast(entry)
}

function makeEntry(fields) {
  return {
    ts: new Date().toISOString(),
    event_type: fields.event_type || 'agent',
    agent: fields.agent,
    action: fields.action,
    detail: fields.detail || '',
    status: fields.status || 'ok',
    ...(fields.meta && { meta: fields.meta }),
  }
}

// INBOX.md — a new MEMO block was appended by someone other than the /api/memo endpoint
function onInboxChange(delta) {
  const memoMatch = delta.match(/###\s+(MEMO-\d+)[^\n]*\n[^*]*\*\*To:\*\*\s*([^\n]+)/i)
  if (!memoMatch) return null
  const [, memoId, to] = memoMatch
  const subjectMatch = delta.match(/\*\*Subject:\*\*\s*([^\n]+)/)
  const subject = subjectMatch ? subjectMatch[1].trim() : 'unknown'
  return makeEntry({
    event_type: 'agent', agent: 'Inbox Agent', action: 'memo_received',
    detail: `${memoId} → ${to.trim()}: ${subject}`,
    status: 'ok', meta: { memo_id: memoId, to: to.trim() },
  })
}

// OUTBOX.md — an agent wrote a response
function onOutboxChange(delta) {
  const headingMatch = delta.match(/##\s+(.+)/)
  const detail = headingMatch ? headingMatch[1].trim() : delta.split('\n')[0].slice(0, 80)
  return makeEntry({ event_type: 'agent', agent: 'Orchestrator', action: 'memo_response', detail, status: 'ok' })
}

// DECISIONS.md — an architectural decision was logged
function onDecisionsChange(delta) {
  const headingMatch = delta.match(/##\s+(.+)/)
  const detail = headingMatch ? headingMatch[1].trim() : delta.split('\n')[0].slice(0, 80)
  return makeEntry({ event_type: 'agent', agent: 'Architect', action: 'decision_logged', detail, status: 'ok' })
}

// HEALTH.md — Governor ran a health assessment
function onHealthChange(delta) {
  const overallMatch = delta.match(/OVERALL:\s*([^\n]+)/)
  const detail = overallMatch ? `Health assessed: ${overallMatch[1].trim()}` : 'HEALTH.md updated'
  const hasError = delta.toLowerCase().includes('critical') || delta.toLowerCase().includes('error')
  const hasWarn = delta.toLowerCase().includes('gap') || delta.toLowerCase().includes('warning')
  return makeEntry({
    event_type: 'agent', agent: 'Governor', action: 'health_assessment',
    detail, status: hasError ? 'error' : hasWarn ? 'warn' : 'ok',
  })
}

// Single watcher on docs/agents/ directory catches top-level file changes.
// Node's fs.watch is non-recursive so subdir changes are caught separately.
watch(join(REPO_ROOT, 'docs/agents'), { persistent: false }, (event, filename) => {
  if (filename === 'ACTIVITY.log') return broadcastNewEntries()
  if (filename === 'INBOX.md') return handleDocChange(INBOX_PATH, 'inbox', onInboxChange)
  if (filename === 'OUTBOX.md') return handleDocChange(OUTBOX_PATH, 'outbox', onOutboxChange)
  if (filename === 'DECISIONS.md') return handleDocChange(DECISIONS_PATH, 'decisions', onDecisionsChange)
  if (filename === 'HEALTH.md') return handleDocChange(HEALTH_PATH, 'health', onHealthChange)
})

// Watch docs/agents/ACTIVITY.log directly to also catch Rust backend writes
// (which go directly to the file, bypassing the directory watcher sometimes)
watch(ACTIVITY_LOG, { persistent: false }, () => broadcastNewEntries())

app.listen(3003, () => console.log('Dashboard API server running on :3003'))
