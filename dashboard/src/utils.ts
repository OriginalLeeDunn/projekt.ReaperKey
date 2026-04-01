// ── Shared utility functions extracted from App.tsx ───────────────────────────

export interface GHIssue {
  number: number
  title: string
  html_url: string
  labels: { name: string }[]
  created_at: string
}

export interface DeployEntry {
  title: string
  date: string | null
  env: string
  status: string
  body: string
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ts = new Date(iso).getTime()
  if (isNaN(ts)) return 'just now'
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function labelColor(name: string): string {
  if (name === 'critical') return 'red'
  if (name === 'bug') return 'red'
  if (name.startsWith('v1') || name === 'on-chain') return 'yellow'
  if (name === 'sdk' || name === 'Backend' || name === 'backend') return 'blue'
  if (name === 'security' || name === 'Security') return 'purple'
  if (name === 'enhancement' || name === 'feature') return 'green'
  return 'grey'
}

export function issueSeverity(issue: GHIssue): number {
  if (issue.labels.some(l => l.name === 'critical')) return 0
  if (issue.labels.some(l => l.name === 'bug')) return 1
  if (issue.labels.some(l => l.name === 'enhancement')) return 2
  return 3
}

export function parseDeployments(content: string): DeployEntry[] {
  const blocks = content.split(/(?=^#{1,3} )/m).filter(b => b.trim())
  return blocks.map(block => {
    const firstLine = block.split('\n')[0].replace(/^#+\s*/, '')
    const body = block.split('\n').slice(1).join('\n').trim()
    const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/)
    const lower = (firstLine + ' ' + body).toLowerCase()
    const env =
      lower.includes('mainnet') ? 'mainnet' :
      lower.includes('prod') ? 'prod' :
      lower.includes('staging') ? 'staging' :
      lower.includes('sepolia') || lower.includes('testnet') ? 'testnet' :
      lower.includes('local') || lower.includes('dev') ? 'dev' : 'unknown'
    const status =
      lower.includes('failed') || lower.includes('rollback') ? 'failed' :
      lower.includes('success') || lower.includes('deployed') || lower.includes('live') ? 'success' :
      lower.includes('pending') || lower.includes('in progress') ? 'pending' : 'info'
    return { title: firstLine, date: dateMatch?.[1] ?? null, env, status, body }
  })
}
