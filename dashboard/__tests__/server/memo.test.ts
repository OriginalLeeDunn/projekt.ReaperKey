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
  vi.mocked(fs.writeFileSync).mockReset()

  process.env.NODE_ENV = 'test'
  const mod = await import('../../server.js')
  app = mod.app
})

describe('POST /api/memo', () => {
  it('returns 400 when to is missing', async () => {
    const res = await request(app)
      .post('/api/memo')
      .send({ subject: 'Test', body: 'Body' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 400 when subject is missing', async () => {
    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Orchestrator', body: 'Body' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Orchestrator', subject: 'Test' })
    expect(res.status).toBe(400)
  })

  it('returns 500 when INBOX.md does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Orchestrator', subject: 'Test', body: 'Body text' })
    expect(res.status).toBe(500)
    expect(res.body.error).toBeTruthy()
  })

  it('inserts before ## Processed section when present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const inboxContent = '# INBOX\n\n## Processed\n\nOld memos here'
    vi.mocked(fs.readFileSync).mockReturnValue(inboxContent)
    let writtenContent = ''
    vi.mocked(fs.writeFileSync).mockImplementation((_path, content) => {
      writtenContent = content as string
    })

    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Orchestrator', subject: 'Test', body: 'This is a memo body' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.memoId).toMatch(/^MEMO-/)
    // The new memo should be inserted before ## Processed
    expect(writtenContent).toContain('Orchestrator')
    const processedIdx = writtenContent.indexOf('\n## Processed')
    const memoIdx = writtenContent.indexOf('MEMO-')
    expect(memoIdx).toBeLessThan(processedIdx)
  })

  it('appends when no ## Processed section', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('# INBOX\n\nNo processed section here')
    vi.mocked(fs.appendFileSync).mockReset()

    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Backend Engineer', subject: 'Deploy Now', body: 'Please deploy to staging' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(vi.mocked(fs.appendFileSync)).toHaveBeenCalled()
  })

  it('uses default priority MEDIUM when not specified', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('# INBOX\n')
    let appendedContent = ''
    vi.mocked(fs.appendFileSync).mockImplementation((_path, content) => {
      appendedContent += content as string
    })

    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Governor', subject: 'Health Check', body: 'Run a health check' })
    expect(res.status).toBe(200)
    expect(appendedContent).toContain('Priority: MEDIUM')
  })

  it('uses custom priority when specified', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('# INBOX\n')
    let appendedContent = ''
    vi.mocked(fs.appendFileSync).mockImplementation((_path, content) => {
      appendedContent += content as string
    })

    const res = await request(app)
      .post('/api/memo')
      .send({ to: 'Security Lead', subject: 'Urgent Scan', body: 'Run security scan now', priority: 'CRITICAL' })
    expect(res.status).toBe(200)
    expect(appendedContent).toContain('Priority: CRITICAL')
  })
})
