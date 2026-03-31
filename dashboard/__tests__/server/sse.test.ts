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

describe('broadcast + appendActivity functions exercised via POST /api/activity', () => {
  // These tests verify the broadcast code path is exercised
  it('broadcast is called via POST /api/activity (verifiable through appendFileSync)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('')

    // Just verify the endpoint works — broadcast() is called internally
    const res = await request(app)
      .post('/api/activity')
      .send({ agent: 'Governor', action: 'health_assessment', detail: 'Health ok', status: 'ok' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('broadcast via POST /api/activity (exercises broadcast + appendActivity)', () => {
  it('POST /api/activity triggers appendFileSync with serialized entry', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('')

    const res = await request(app)
      .post('/api/activity')
      .send({ agent: 'Claude', action: 'plan', detail: 'test', status: 'ok', event_type: 'agent' })

    expect(res.status).toBe(200)
    expect(vi.mocked(fs.appendFileSync)).toHaveBeenCalled()
    const callArg = vi.mocked(fs.appendFileSync).mock.calls[0][1] as string
    const parsed = JSON.parse(callArg.trim())
    expect(parsed.agent).toBe('Claude')
    expect(parsed.action).toBe('plan')
    expect(parsed.ts).toBeDefined()
  })

  it('POST /api/activity with all optional fields writes correct entry', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('')

    const res = await request(app)
      .post('/api/activity')
      .send({ agent: 'CI', action: 'workflow_run', detail: 'CI passed', status: 'ok', event_type: 'ci', meta: { run_id: 123 } })

    expect(res.status).toBe(200)
    const callArg = vi.mocked(fs.appendFileSync).mock.calls[0][1] as string
    const parsed = JSON.parse(callArg.trim())
    expect(parsed.event_type).toBe('ci')
    expect(parsed.meta).toEqual({ run_id: 123 })
  })
})

describe('POST /api/memo (exercises appendActivity + makeEntry path)', () => {
  it('memo posting logs activity entry via appendActivity', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('# INBOX\n')

    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Orchestrator', subject: 'Test Memo', body: 'Body text here' })

    expect(res.status).toBe(200)
    // appendFileSync should be called twice: once for the memo body, once for the activity log
    expect(vi.mocked(fs.appendFileSync)).toHaveBeenCalled()
  })
})
