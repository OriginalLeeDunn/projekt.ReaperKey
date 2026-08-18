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

let app: import('express').Express

beforeEach(async () => {
  vi.resetModules()
  vi.mocked(fs.existsSync).mockReturnValue(false)
  vi.mocked(fs.readFileSync).mockReturnValue('')
  vi.mocked(fs.appendFileSync).mockReset()

  process.env.NODE_ENV = 'test'
  const mod = await import('../../server.js')
  app = mod.app
})

describe('GET /api/file', () => {
  it('returns 400 when path query param is missing', async () => {
    const res = await request(app).get('/api/file')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 403 for non-docs path', async () => {
    const res = await request(app).get('/api/file?path=/etc/passwd')
    expect(res.status).toBe(403)
  })

  it('returns 403 for path not starting with docs/', async () => {
    const res = await request(app).get('/api/file?path=config/secret.json')
    expect(res.status).toBe(403)
  })

  it('returns 200 with content for valid docs path', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# HEALTH\n\nContent here')
    const res = await request(app).get('/api/file?path=docs/agents/HEALTH.md')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# HEALTH\n\nContent here')
  })

  it('returns 404 when file does not exist', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/file?path=docs/agents/MISSING.md')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/inbox', () => {
  it('returns 200 with content when file exists', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# INBOX\n\nSome memos')
    const res = await request(app).get('/api/inbox')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('INBOX')
  })

  it('returns fallback content when file is missing', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/inbox')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('INBOX')
  })
})

describe('GET /api/outbox', () => {
  it('returns 200 with content when file exists', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# OUTBOX\n\nSome responses')
    const res = await request(app).get('/api/outbox')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('OUTBOX')
  })

  it('returns fallback content when file is missing', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/outbox')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('OUTBOX')
  })
})

describe('GET /api/decisions', () => {
  it('returns 200 with content', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# DECISIONS')
    const res = await request(app).get('/api/decisions')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# DECISIONS')
  })

  it('returns empty content on read error', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/decisions')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('')
  })
})

describe('GET /api/phases', () => {
  it('returns 200 with content', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# ORCHESTRATOR')
    const res = await request(app).get('/api/phases')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# ORCHESTRATOR')
  })

  it('returns empty content when phases file read fails', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/phases')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('')
  })
})

describe('GET /api/deployments', () => {
  it('returns 200 with content', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# DEPLOYMENTS')
    const res = await request(app).get('/api/deployments')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# DEPLOYMENTS')
  })

  it('returns fallback content when deployments file read fails', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/deployments')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('DEPLOYMENTS')
  })
})

describe('GET /api/governance', () => {
  it('returns 200 with content', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('# GOVERNANCE')
    const res = await request(app).get('/api/governance')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# GOVERNANCE')
  })

  it('returns empty content when governance file read fails', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT') })
    const res = await request(app).get('/api/governance')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('')
  })
})
