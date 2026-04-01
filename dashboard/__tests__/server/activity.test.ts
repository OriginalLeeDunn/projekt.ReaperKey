// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// Mock fs module before importing app
vi.mock('fs', () => {
  const mockExistsSync = vi.fn().mockReturnValue(false)
  const mockReadFileSync = vi.fn().mockReturnValue('')
  const mockAppendFileSync = vi.fn()
  const mockWriteFileSync = vi.fn()
  const mockWatch = vi.fn()
  return {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    appendFileSync: mockAppendFileSync,
    writeFileSync: mockWriteFileSync,
    watch: mockWatch,
  }
})

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

describe('GET /api/activity', () => {
  it('returns [] when ACTIVITY.log does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns parsed entries reversed when log exists', async () => {
    const entry1 = { ts: '2026-03-28T10:00:00Z', event_type: 'agent', agent: 'Claude', action: 'task', detail: '', status: 'ok' }
    const entry2 = { ts: '2026-03-28T11:00:00Z', event_type: 'agent', agent: 'Orchestrator', action: 'plan', detail: '', status: 'ok' }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify(entry1) + '\n' + JSON.stringify(entry2) + '\n'
    )
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    // reversed — newer first
    expect(res.body[0].agent).toBe('Orchestrator')
    expect(res.body[1].agent).toBe('Claude')
  })

  it('skips malformed lines', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('not json\n{"ts":"2026","agent":"A","action":"x","status":"ok"}\n')
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns [] when readFileSync throws after existsSync=true', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('EIO') })
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('limits to max 200 entries (reversed)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const lines = Array.from({ length: 250 }, (_, i) =>
      JSON.stringify({ ts: `2026-03-28T${String(i).padStart(2, '0')}:00:00Z`, agent: 'A', action: 'x', status: 'ok' })
    ).join('\n')
    vi.mocked(fs.readFileSync).mockReturnValue(lines)
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(200)
  })
})

describe('POST /api/activity', () => {
  it('returns 400 when agent is missing', async () => {
    const res = await request(app)
      .post('/api/activity')
      .send({ action: 'test' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 400 when action is missing', async () => {
    const res = await request(app)
      .post('/api/activity')
      .send({ agent: 'Claude' })
    expect(res.status).toBe(400)
  })

  it('returns 200 with valid entry for minimal valid input', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('')
    const res = await request(app)
      .post('/api/activity')
      .send({ agent: 'Claude', action: 'test_action' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.entry).toBeDefined()
    expect(res.body.entry.agent).toBe('Claude')
    expect(res.body.entry.action).toBe('test_action')
    expect(res.body.entry.ts).toBeDefined()
    expect(res.body.entry.event_type).toBeDefined()
  })

  it('includes optional fields when provided', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('')
    const res = await request(app)
      .post('/api/activity')
      .send({
        agent: 'Backend Engineer',
        action: 'deploy',
        status: 'ok',
        user_id: 'user123',
        chain: 'sepolia',
        meta: { run_id: 42 },
      })
    expect(res.status).toBe(200)
    expect(res.body.entry.user_id).toBe('user123')
    expect(res.body.entry.chain).toBe('sepolia')
    expect(res.body.entry.meta).toEqual({ run_id: 42 })
  })
})

describe('GET /api/activity/agents', () => {
  it('returns {} when ACTIVITY.log does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const res = await request(app).get('/api/activity/agents')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })

  it('returns stats per agent when log has entries', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const entries = [
      { ts: '2026-03-28T10:00:00Z', agent: 'Claude', action: 'plan', status: 'ok' },
      { ts: '2026-03-28T11:00:00Z', agent: 'Claude', action: 'execute', status: 'ok' },
      { ts: '2026-03-28T09:00:00Z', agent: 'Orchestrator', action: 'assign', status: 'ok' },
    ]
    vi.mocked(fs.readFileSync).mockReturnValue(entries.map(e => JSON.stringify(e)).join('\n'))
    const res = await request(app).get('/api/activity/agents')
    expect(res.status).toBe(200)
    expect(res.body['Claude']).toBeDefined()
    expect(res.body['Claude'].count).toBe(2)
    expect(res.body['Claude'].lastAction).toBe('execute')
    expect(res.body['Orchestrator'].count).toBe(1)
  })
})
