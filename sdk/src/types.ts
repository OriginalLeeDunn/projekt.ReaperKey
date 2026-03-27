// GhostKey SDK — Core Types
// All public interfaces live here.

export type AuthMethod = 'email' | 'wallet'

export interface GhostKeyConfig {
  apiUrl: string
  chainId: number
}

export interface GhostKeyAccount {
  accountId: string
  address: string
  chain: string
  aaType: string
  createdAt: string
}

export interface Intent {
  target: string
  calldata: string
  value?: string        // wei as string — default "0"
  userOperation?: Record<string, unknown>  // pre-built UserOp; defaults to {}
}

/** Parameters for automatic UserOp construction (GAP-001 / v1.0) */
export interface IntentWithSessionKey {
  target: string
  calldata: string
  value?: string
  /** Session key private key — signs the UserOp in-browser, never sent to server */
  sessionKeyPrivateKey: `0x${string}`
  /** Smart account (Kernel) address */
  senderAddress: `0x${string}`
  /** Chain ID (84532 = Base Sepolia, 8453 = Base, 42161 = Arbitrum) */
  chainId: number
  /** RPC URL for the chain */
  rpcUrl: string
  /** Pimlico bundler URL with API key */
  bundlerUrl: string
}

export interface IntentResult {
  intentId: string
  status: IntentStatus
  txHash: string | null
  blockNumber: number | null
}

export type IntentStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

export interface AuthResponse {
  userId: string
  token: string
  expiresAt: string
}

export interface SessionKeyRequest {
  accountId: string
  keyHash: string       // SHA-256 hash of the session key — raw key never leaves client
  allowedTargets: string[]
  allowedSelectors: string[]
  maxValueWei: string
  ttlSeconds: number
}

export interface SessionKeyResponse {
  sessionId: string
  keyHash: string
  expiresAt: string
}

export interface RecoveryResult {
  recoveryId: string
  method: string
  status: string
  instructions: string
}

// Error types — never throw raw Error strings
export type GhostKeyErrorCode =
  | 'not_authenticated'
  | 'network_error'
  | 'invalid_token'
  | 'session_expired'
  | 'intent_out_of_scope'
  | 'rate_limited'
  | 'unknown'

export interface GhostKeyError {
  code: GhostKeyErrorCode
  message: string
}
