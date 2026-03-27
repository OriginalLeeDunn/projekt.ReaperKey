// GhostKey HTTP client
// All network calls go through here — never fetch() directly in hooks.

import type {
  AuthResponse,
  GhostKeyAccount,
  GhostKeyConfig,
  GhostKeyError,
  Intent,
  IntentResult,
  RecoveryResult,
  SessionKeyRequest,
  SessionKeyResponse,
} from './types.js'

export type ApiResult<T> = { data: T; error: null } | { data: null; error: GhostKeyError }

// Raw API shapes (snake_case from Rust backend)
type RawAuth = { user_id: string; token: string; expires_at: string }
type RawAccount = { account_id: string; address: string; chain: string; aa_type: string; created_at: string }
type RawIntent = { intent_id: string; status: string; tx_hash: string | null; block_number: number | null }
type RawSession = { session_id: string; key_hash: string; session_key_address: string | null; expires_at: string }
type RawRecovery = { recovery_id: string; method: string; status: string; instructions: string }

export class GhostKeyClient {
  private readonly baseUrl: string
  private readonly config: GhostKeyConfig
  private token: string | null = null

  constructor(config: GhostKeyConfig) {
    this.config = config
    this.baseUrl = config.apiUrl.replace(/\/$/, '')
  }

  private chainName(): string {
    const map: Record<number, string> = {
      8453: 'base',
      84532: 'base-sepolia',
    }
    return map[this.config.chainId] ?? `chain-${this.config.chainId}`
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
        body: body !== undefined ? JSON.stringify(body) : null,
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

  // ── Response mappers (snake_case API → camelCase SDK) ──────────────────────

  private mapAuth(raw: RawAuth): AuthResponse {
    return { userId: raw.user_id, token: raw.token, expiresAt: raw.expires_at }
  }

  private mapAccount(raw: RawAccount): GhostKeyAccount {
    return {
      accountId: raw.account_id,
      address: raw.address,
      chain: raw.chain,
      aaType: raw.aa_type,
      createdAt: raw.created_at,
    }
  }

  private mapIntent(raw: RawIntent): IntentResult {
    return {
      intentId: raw.intent_id,
      status: raw.status as IntentResult['status'],
      txHash: raw.tx_hash,
      blockNumber: raw.block_number,
    }
  }

  private mapSession(raw: RawSession): SessionKeyResponse {
    return {
      sessionId: raw.session_id,
      keyHash: raw.key_hash,
      sessionKeyAddress: raw.session_key_address ?? null,
      expiresAt: raw.expires_at,
    }
  }

  private mapRecovery(raw: RawRecovery): RecoveryResult {
    return {
      recoveryId: raw.recovery_id,
      method: raw.method,
      status: raw.status,
      instructions: raw.instructions,
    }
  }

  // ── API methods ────────────────────────────────────────────────────────────

  async login(method: string, credential: string): Promise<ApiResult<AuthResponse>> {
    const res = await this.request<RawAuth>('POST', '/auth/login', { method, credential })
    if (res.error) return res
    return { data: this.mapAuth(res.data), error: null }
  }

  async refresh(token: string): Promise<ApiResult<AuthResponse>> {
    const res = await this.request<RawAuth>('POST', '/auth/refresh', { token })
    if (res.error) return res
    return { data: this.mapAuth(res.data), error: null }
  }

  async createAccount(address: string): Promise<ApiResult<GhostKeyAccount>> {
    const chain = this.chainName()
    const res = await this.request<RawAccount>('POST', '/account/create', { chain, address })
    if (res.error) return res
    return { data: this.mapAccount(res.data), error: null }
  }

  async getAccount(accountId: string): Promise<ApiResult<GhostKeyAccount>> {
    const res = await this.request<RawAccount>('GET', `/account/${accountId}`)
    if (res.error) return res
    return { data: this.mapAccount(res.data), error: null }
  }

  async issueSessionKey(req: SessionKeyRequest): Promise<ApiResult<SessionKeyResponse>> {
    const res = await this.request<RawSession>('POST', '/session-key/issue', {
      account_id: req.accountId,
      key_hash: req.keyHash,
      allowed_targets: req.allowedTargets,
      allowed_selectors: req.allowedSelectors,
      max_value_wei: req.maxValueWei,
      ttl_seconds: req.ttlSeconds,
    })
    if (res.error) return res
    return { data: this.mapSession(res.data), error: null }
  }

  async executeIntent(sessionId: string, intent: Intent): Promise<ApiResult<IntentResult>> {
    const res = await this.request<RawIntent>('POST', '/intent/execute', {
      session_id: sessionId,
      target: intent.target,
      calldata: intent.calldata,
      value: intent.value ?? '0',
      user_operation: intent.userOperation ?? {},
    })
    if (res.error) return res
    return { data: this.mapIntent(res.data), error: null }
  }

  async getIntentStatus(intentId: string): Promise<ApiResult<IntentResult>> {
    const res = await this.request<RawIntent>('GET', `/intent/${intentId}/status`)
    if (res.error) return res
    return { data: this.mapIntent(res.data), error: null }
  }

  async initiateRecovery(accountAddress: string): Promise<ApiResult<RecoveryResult>> {
    const res = await this.request<RawRecovery>('POST', '/recovery/initiate', {
      account_address: accountAddress,
    })
    if (res.error) return res
    return { data: this.mapRecovery(res.data), error: null }
  }
}
