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

const mockFetch = vi.fn()
global.fetch = mockFetch

const makeJsonResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(data),
})

let app: import('express').Express

beforeEach(async () => {
  vi.resetModules()
  vi.mocked(fs.existsSync).mockReturnValue(false)
  vi.mocked(fs.readFileSync).mockReturnValue('')
  mockFetch.mockReset()

  process.env.NODE_ENV = 'test'
  delete process.env.GITHUB_TOKEN
  const mod = await import('../../server.js')
  app = mod.app
})

describe('GET /api/github/issues', () => {
  it('proxies GitHub API and returns issues', async () => {
    const issues = [{ number: 1, title: 'Bug', labels: [], html_url: 'https://github.com', created_at: '2026-01-01' }]
    mockFetch.mockResolvedValueOnce(makeJsonResponse(issues))

    const res = await request(app).get('/api/github/issues')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(issues)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues?state=open'),
      expect.anything()
    )
  })

  it('includes labels query param when provided', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse([]))
    await request(app).get('/api/github/issues?labels=critical')
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('labels=')
    expect(calledUrl).toContain('critical')
  })
})

describe('GET /api/github/runs', () => {
  it('proxies /actions/runs', async () => {
    const data = { workflow_runs: [] }
    mockFetch.mockResolvedValueOnce(makeJsonResponse(data))
    const res = await request(app).get('/api/github/runs')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(data)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/actions/runs'),
      expect.anything()
    )
  })
})

describe('GET /api/github/prs', () => {
  it('proxies /pulls', async () => {
    const prs = [{ number: 1, title: 'PR', state: 'open' }]
    mockFetch.mockResolvedValueOnce(makeJsonResponse(prs))
    const res = await request(app).get('/api/github/prs')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(prs)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/pulls'),
      expect.anything()
    )
  })
})

describe('GET /api/github/releases', () => {
  it('proxies /releases', async () => {
    const releases = [{ id: 1, tag_name: 'v1.0.0' }]
    mockFetch.mockResolvedValueOnce(makeJsonResponse(releases))
    const res = await request(app).get('/api/github/releases')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(releases)
  })
})

describe('GET /api/github/pr/:number/checks', () => {
  it('fetches PR then check-runs using head SHA', async () => {
    const pr = { head: { sha: 'abc123' } }
    const checkRuns = { check_runs: [{ id: 1, name: 'CI' }] }
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(pr))
      .mockResolvedValueOnce(makeJsonResponse(checkRuns))

    const res = await request(app).get('/api/github/pr/42/checks')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(checkRuns)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toContain('/pulls/42')
    expect(mockFetch.mock.calls[1][0]).toContain('abc123')
  })

  it('returns { check_runs: [] } when PR has no head.sha', async () => {
    const pr = { head: {} }
    mockFetch.mockResolvedValueOnce(makeJsonResponse(pr))

    const res = await request(app).get('/api/github/pr/99/checks')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ check_runs: [] })
  })

  it('returns 500 when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const res = await request(app).get('/api/github/pr/1/checks')
    expect(res.status).toBe(500)
  })
})

describe('POST /api/github/pr/:number/merge', () => {
  it('returns 403 when GITHUB_TOKEN is not set', async () => {
    delete process.env.GITHUB_TOKEN
    const res = await request(app)
      .post('/api/github/pr/42/merge')
      .send({})
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('GITHUB_TOKEN')
  })

  it('calls GitHub PUT with token and returns status', async () => {
    process.env.GITHUB_TOKEN = 'test-token'
    const mergeResponse = { sha: 'abc', merged: true, message: 'Pull Request successfully merged' }
    mockFetch.mockResolvedValueOnce({ ...makeJsonResponse(mergeResponse), status: 200 })

    const res = await request(app)
      .post('/api/github/pr/42/merge')
      .send({ merge_method: 'squash' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/pulls/42/merge'),
      expect.objectContaining({ method: 'PUT' })
    )
    expect(res.status).toBe(200)
  })

  it('returns 500 when fetch throws', async () => {
    process.env.GITHUB_TOKEN = 'test-token'
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const res = await request(app)
      .post('/api/github/pr/42/merge')
      .send({})
    expect(res.status).toBe(500)
  })
})

describe('GET /api/healthcheck', () => {
  it('returns ok:true when backend responds', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ status: 'ok' }, true, 200))
    const res = await request(app).get('/api/healthcheck')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.status).toBe(200)
    expect(res.body.data).toBeDefined()
  })

  it('returns ok:false when backend is down', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const res = await request(app).get('/api/healthcheck')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.status).toBeNull()
    expect(res.body.data).toBeNull()
  })
})
