// GhostKey HTTP client
// All network calls go through here — never fetch() directly in hooks.

import type {
  AuthResponse,
  GhostKeyAccount,
  GhostKeyConfig,
  GhostKeyError,
  Intent,
  IntentResult,
  SessionKeyRequest,
  SessionKeyResponse,
} from './types.js'

export type ApiResult<T> = { data: T; error: null } | { data: null; error: GhostKeyError }

export class GhostKeyClient {
  private readonly baseUrl: string
  private token: string | null = null

  constructor(config: GhostKeyConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '')
  }

  setToken(token: string): void {
    this.token = token
  }

  clearToken(): void {
    this.token = null
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      const json = await res.json() as Record<string, unknown>

      if (!res.ok) {
        return {
          data: null,
          error: {
            code: (json['error'] as string ?? 'unknown') as GhostKeyError['code'],
            message: res.statusText,
          },
        }
      }

      return { data: json as T, error: null }
    } catch {
      return {
        data: null,
        error: { code: 'network_error', message: 'Network request failed' },
      }
    }
  }

  async login(method: string, credential: string): Promise<ApiResult<AuthResponse>> {
    return this.request('POST', '/auth/login', { method, credential })
  }

  async refresh(token: string): Promise<ApiResult<AuthResponse>> {
    return this.request('POST', '/auth/refresh', { token })
  }

  async createAccount(chain: string): Promise<ApiResult<GhostKeyAccount>> {
    return this.request('POST', '/account/create', { chain })
  }

  async getAccount(accountId: string): Promise<ApiResult<GhostKeyAccount>> {
    return this.request('GET', `/account/${accountId}`)
  }

  async issueSessionKey(req: SessionKeyRequest): Promise<ApiResult<SessionKeyResponse>> {
    return this.request('POST', '/session-key/issue', req)
  }

  async executeIntent(sessionId: string, intent: Intent): Promise<ApiResult<IntentResult>> {
    return this.request('POST', '/intent/execute', {
      session_id: sessionId,
      target: intent.target,
      calldata: intent.calldata,
      value: intent.value ?? '0',
    })
  }

  async getIntentStatus(intentId: string): Promise<ApiResult<IntentResult>> {
    return this.request('GET', `/intent/${intentId}/status`)
  }
}
