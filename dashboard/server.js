import express from 'express'
import { readFileSync, appendFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const app = express()
app.use(express.json())

// Read a repo file
app.get('/api/file', (req, res) => {
  const { path: filePath } = req.query
  if (!filePath || typeof filePath !== 'string') return res.status(400).json({ error: 'path required' })
  // Security: only allow reads from docs/ directory
  if (!filePath.startsWith('docs/')) return res.status(403).json({ error: 'only docs/ allowed' })
  try {
    const fullPath = join(REPO_ROOT, filePath)
    const content = readFileSync(fullPath, 'utf-8')
    res.json({ content })
  } catch (e) {
    res.status(404).json({ error: 'file not found' })
  }
})

// Append a memo to INBOX.md
app.post('/api/memo', (req, res) => {
  const { to, from, subject, body, priority } = req.body
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' })

  const inboxPath = join(REPO_ROOT, 'docs/agents/INBOX.md')
  if (!existsSync(inboxPath)) return res.status(500).json({ error: 'INBOX.md not found' })

  // Generate memo ID from timestamp
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
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
  // Insert before the "## Processed" section or append at end
  const current = readFileSync(inboxPath, 'utf-8')
  const processedIdx = current.indexOf('\n## Processed')
  if (processedIdx !== -1) {
    const updated = current.slice(0, processedIdx) + memoBlock + current.slice(processedIdx)
    writeFileSync(inboxPath, updated)
  } else {
    appendFileSync(inboxPath, memoBlock)
  }

  res.json({ ok: true, memoId })
})

// GitHub proxy (uses GITHUB_TOKEN env if set)
app.get('/api/github/issues', async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const r = await fetch('https://api.github.com/repos/OriginalLeeDunn/projekt.ReaperKey/issues?state=open&per_page=20', { headers })
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'github api error' })
  }
})

app.get('/api/github/runs', async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const r = await fetch('https://api.github.com/repos/OriginalLeeDunn/projekt.ReaperKey/actions/runs?per_page=10', { headers })
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'github api error' })
  }
})

app.listen(3003, () => console.log('Dashboard API server running on :3003'))
