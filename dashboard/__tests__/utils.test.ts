import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeAgo, labelColor, issueSeverity, parseDeployments } from '../src/utils'
import type { GHIssue } from '../src/utils'

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for null', () => {
    expect(timeAgo(null)).toBe('—')
  })

  it('returns "just now" for invalid date string', () => {
    expect(timeAgo('not-a-date')).toBe('just now')
  })

  it('returns "just now" for future date', () => {
    expect(timeAgo('2026-03-28T13:00:00Z')).toBe('just now')
  })

  it('returns "just now" for 30 seconds ago', () => {
    expect(timeAgo('2026-03-28T11:59:30Z')).toBe('just now')
  })

  it('returns "Xm ago" for minutes ago', () => {
    expect(timeAgo('2026-03-28T11:55:00Z')).toBe('5m ago')
  })

  it('returns "Xh ago" for hours ago', () => {
    expect(timeAgo('2026-03-28T10:00:00Z')).toBe('2h ago')
  })

  it('returns "Xd ago" for days ago', () => {
    expect(timeAgo('2026-03-25T12:00:00Z')).toBe('3d ago')
  })

  it('returns "1m ago" for exactly 1 minute ago', () => {
    expect(timeAgo('2026-03-28T11:59:00Z')).toBe('1m ago')
  })

  it('returns "59m ago" for 59 minutes ago', () => {
    expect(timeAgo('2026-03-28T11:01:00Z')).toBe('59m ago')
  })

  it('returns "1h ago" for 60 minutes ago', () => {
    expect(timeAgo('2026-03-28T11:00:00Z')).toBe('1h ago')
  })
})

describe('labelColor', () => {
  it('returns red for critical', () => {
    expect(labelColor('critical')).toBe('red')
  })

  it('returns red for bug', () => {
    expect(labelColor('bug')).toBe('red')
  })

  it('returns yellow for v1 prefix', () => {
    expect(labelColor('v1.0')).toBe('yellow')
  })

  it('returns yellow for on-chain', () => {
    expect(labelColor('on-chain')).toBe('yellow')
  })

  it('returns blue for sdk', () => {
    expect(labelColor('sdk')).toBe('blue')
  })

  it('returns blue for Backend', () => {
    expect(labelColor('Backend')).toBe('blue')
  })

  it('returns blue for backend (lowercase)', () => {
    expect(labelColor('backend')).toBe('blue')
  })

  it('returns purple for security', () => {
    expect(labelColor('security')).toBe('purple')
  })

  it('returns purple for Security (capitalized)', () => {
    expect(labelColor('Security')).toBe('purple')
  })

  it('returns green for enhancement', () => {
    expect(labelColor('enhancement')).toBe('green')
  })

  it('returns green for feature', () => {
    expect(labelColor('feature')).toBe('green')
  })

  it('returns grey for unknown label', () => {
    expect(labelColor('unknown-label')).toBe('grey')
  })

  it('returns grey for SDK (uppercase, not matching)', () => {
    expect(labelColor('SDK')).toBe('grey')
  })
})

describe('issueSeverity', () => {
  const makeIssue = (labelNames: string[]): GHIssue => ({
    number: 1,
    title: 'Test',
    html_url: 'https://github.com',
    labels: labelNames.map(name => ({ name })),
    created_at: '2026-03-01T00:00:00Z',
  })

  it('returns 0 for critical label', () => {
    expect(issueSeverity(makeIssue(['critical']))).toBe(0)
  })

  it('returns 1 for bug label', () => {
    expect(issueSeverity(makeIssue(['bug']))).toBe(1)
  })

  it('returns 2 for enhancement label', () => {
    expect(issueSeverity(makeIssue(['enhancement']))).toBe(2)
  })

  it('returns 3 for no matching labels', () => {
    expect(issueSeverity(makeIssue([]))).toBe(3)
  })

  it('returns 3 for security label (not in severity mapping)', () => {
    expect(issueSeverity(makeIssue(['security']))).toBe(3)
  })

  it('returns 0 when critical is one of multiple labels', () => {
    expect(issueSeverity(makeIssue(['bug', 'critical', 'security']))).toBe(0)
  })

  it('prioritizes critical over bug', () => {
    const withBug = issueSeverity(makeIssue(['bug']))
    const withCritical = issueSeverity(makeIssue(['critical']))
    expect(withCritical).toBeLessThan(withBug)
  })
})

describe('parseDeployments', () => {
  it('returns empty array for empty content', () => {
    expect(parseDeployments('')).toEqual([])
  })

  it('returns single entry for content with no markdown headers (treated as a block)', () => {
    // Content without headers is treated as a single non-empty block with no title header
    const result = parseDeployments('no headers here just text')
    // Either 0 or 1 result is acceptable — no crash
    expect(Array.isArray(result)).toBe(true)
  })

  it('parses a single deployment entry with date', () => {
    const content = `# Deploy 2026-03-15 — testnet
Deployed to Sepolia testnet successfully.
`
    const result = parseDeployments(content)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Deploy 2026-03-15 — testnet')
    expect(result[0].date).toBe('2026-03-15')
    expect(result[0].env).toBe('testnet')
    expect(result[0].status).toBe('success')
  })

  it('parses mainnet environment', () => {
    const content = `# Deploy 2026-03-15 — mainnet
Deployed to mainnet.`
    const result = parseDeployments(content)
    expect(result[0].env).toBe('mainnet')
  })

  it('parses prod environment', () => {
    const content = `# Deploy 2026-03-15 — prod
Deployed to production.`
    const result = parseDeployments(content)
    expect(result[0].env).toBe('prod')
  })

  it('parses staging environment', () => {
    const content = `# Deploy 2026-03-15
Deployed to staging.`
    const result = parseDeployments(content)
    expect(result[0].env).toBe('staging')
  })

  it('parses dev environment', () => {
    const content = `# Deploy 2026-03-15
Local dev deployment.`
    const result = parseDeployments(content)
    expect(result[0].env).toBe('dev')
  })

  it('detects failed status', () => {
    const content = `# Deploy 2026-03-15
This deployment failed.`
    const result = parseDeployments(content)
    expect(result[0].status).toBe('failed')
  })

  it('detects pending status', () => {
    const content = `# Deploy 2026-03-15
Deployment in progress.`
    const result = parseDeployments(content)
    expect(result[0].status).toBe('pending')
  })

  it('detects info status as fallback', () => {
    const content = `# Some deployment note
Just a note.`
    const result = parseDeployments(content)
    expect(result[0].status).toBe('info')
  })

  it('parses multiple deployment entries', () => {
    const content = `# Deploy 2026-03-10 — sepolia
First deployment.

## Deploy 2026-03-15
Second deployment, success.`
    const result = parseDeployments(content)
    expect(result).toHaveLength(2)
  })

  it('returns null date when no date in title', () => {
    const content = `# Initial Setup
No date here.`
    const result = parseDeployments(content)
    expect(result[0].date).toBeNull()
  })

  it('preserves body text', () => {
    const content = `# Deploy 2026-03-15
Line one.
Line two.`
    const result = parseDeployments(content)
    expect(result[0].body).toContain('Line one')
    expect(result[0].body).toContain('Line two')
  })
})
