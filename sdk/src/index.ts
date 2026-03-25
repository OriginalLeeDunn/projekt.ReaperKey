// @ghostkey/sdk — public API surface
export { GhostKeyProvider } from './provider.js'
export { useLogin } from './hooks/useLogin.js'
export { useAccount } from './hooks/useAccount.js'
export { useSendIntent } from './hooks/useSendIntent.js'
export { useSessionKey } from './hooks/useSessionKey.js'
export { useRecovery } from './hooks/useRecovery.js'
export { generateSessionKey } from './crypto.js'
export type { SessionKey } from './crypto.js'
export { GhostKeyClient } from './client.js'
export type { ApiResult } from './client.js'
export type {
  GhostKeyConfig,
  GhostKeyAccount,
  GhostKeyError,
  GhostKeyErrorCode,
  Intent,
  IntentResult,
  IntentStatus,
  AuthMethod,
  SessionKeyRequest,
  SessionKeyResponse,
  RecoveryResult,
} from './types.js'
