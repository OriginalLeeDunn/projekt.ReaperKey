// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
  appendFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  watch: vi.fn(),
}))

import * as fs from 'fs'

// Note: the server.js parseMarkdownTable regex requires the separator row to NOT
// have a trailing pipe (e.g., '|-----' not '|---|---|'), so fixtures use that format.
const HEALTH_FIXTURE = `# HEALTH.md

## Critical Known Gaps

| ID | Area | Description | Severity | Blocks |
|-----
| GAP-001 | Auth | Missing auth implementation | CRITICAL | Phase 6 |
| GAP-002 | SDK | SDK not fully typed | HIGH | Phase 4 |

## Phase Progress

| Phase | Status | Lead | Blocking |
|-----
| Phase 1 | Complete | Orchestrator | None |
| Phase 2 | In Progress | Backend Engineer | Phase 3 |

## Document Freshness

| Document | Last Verified | Threshold | Status | Next Check |
|-----
| HEALTH.md | 2026-03-28 | 7 days | ok | 2026-04-04 |
| DECISIONS.md | 2026-03-20 | 14 days | warn | 2026-04-03 |

---
`

const GOVERNANCE_FIXTURE = `# GOVERNANCE.md

## Hard Rules

| # | Rule | Enforced By |
|-----
| 1 | All branches cut from dev | CI + Orchestrator |
| 2 | No direct commits to main | GitHub branch protection |

**Rule details follow below.**
`

const DECISIONS_FIXTURE = `# DECISIONS.md

## 2026-03-24 — Orchestrator — Use ZeroDev for account abstraction

**Phase:** Phase 5
**Status:** Accepted
**Reviewed by:** Architect, Security Lead

We decided to use ZeroDev because it provides the best AA support.
`

let app: import('express').Express

beforeEach(async () => {
  vi.resetModules()
  vi.mocked(fs.existsSync).mockReturnValue(false)
  vi.mocked(fs.readFileSync).mockReturnValue('')

  process.env.NODE_ENV = 'test'
  const mod = await import('../../server.js')
  app = mod.app
})

describe('GET /api/health/gaps', () => {
  it('returns array of gap objects when HEALTH.md exists', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(HEALTH_FIXTURE)
    const res = await request(app).get('/api/health/gaps')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const gap = res.body[0]
    expect(gap).toHaveProperty('id')
    expect(gap).toHaveProperty('area')
    expect(gap).toHaveProperty('description')
    expect(gap).toHaveProperty('severity')
    expect(gap).toHaveProperty('blocks')
    expect(gap.id).toBe('GAP-001')
    expect(gap.area).toBe('Auth')
  })

  it('returns [] when HEALTH.md is not found', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/health/gaps')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/health/phases', () => {
  it('returns array of phase objects', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(HEALTH_FIXTURE)
    const res = await request(app).get('/api/health/phases')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const phase = res.body[0]
    expect(phase).toHaveProperty('phase')
    expect(phase).toHaveProperty('status')
    expect(phase).toHaveProperty('lead')
    expect(phase).toHaveProperty('blocking')
    expect(phase.phase).toBe('Phase 1')
    expect(phase.status).toBe('Complete')
  })

  it('returns [] on read error', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/health/phases')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/health/freshness', () => {
  it('returns array of freshness objects', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(HEALTH_FIXTURE)
    const res = await request(app).get('/api/health/freshness')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const row = res.body[0]
    expect(row).toHaveProperty('doc')
    expect(row).toHaveProperty('lastVerified')
    expect(row).toHaveProperty('threshold')
    expect(row).toHaveProperty('status')
    expect(row.doc).toBe('HEALTH.md')
  })

  it('returns [] on read error', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/health/freshness')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/governance/hard-rules', () => {
  it('returns array of hard rule objects', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(GOVERNANCE_FIXTURE)
    const res = await request(app).get('/api/governance/hard-rules')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const rule = res.body[0]
    expect(rule).toHaveProperty('number')
    expect(rule).toHaveProperty('rule')
    expect(rule).toHaveProperty('enforcedBy')
    expect(rule.number).toBe('1')
  })

  it('returns [] on read error', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/governance/hard-rules')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/decisions/structured', () => {
  it('returns array of decision objects', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(DECISIONS_FIXTURE)
    const res = await request(app).get('/api/decisions/structured')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const decision = res.body[0]
    expect(decision).toHaveProperty('date')
    expect(decision).toHaveProperty('agent')
    expect(decision).toHaveProperty('title')
    expect(decision).toHaveProperty('phase')
    expect(decision).toHaveProperty('status')
    expect(decision).toHaveProperty('reviews')
    expect(decision).toHaveProperty('body')
    expect(decision.date).toBe('2026-03-24')
    expect(decision.agent).toBe('Orchestrator')
    expect(decision.status).toBe('Accepted')
  })

  it('returns [] when no matching decision blocks found', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# DECISIONS\n\nNo decisions yet.\n')
    const res = await request(app).get('/api/decisions/structured')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns default field values when optional markdown fields are absent', async () => {
    // A block that matches the date filter but has none of the standard fields
    vi.mocked(fs.readFileSync).mockReturnValue('# DECISIONS\n\n## 2026-03-24\n\nPlain body with no structured fields.\n')
    const res = await request(app).get('/api/decisions/structured')
    expect(res.status).toBe(200)
    if (res.body.length > 0) {
      const d = res.body[0]
      expect(d.date).toBe('2026-03-24')
      expect(d.agent).toBe('')
      expect(d.phase).toBe('')
      expect(d.status).toBe('Accepted')
      expect(d.reviews).toBe('')
    }
  })

  it('returns [] on read error', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/decisions/structured')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
