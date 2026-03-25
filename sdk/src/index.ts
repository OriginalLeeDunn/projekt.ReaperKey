// @ghostkey/sdk — public API surface
export { GhostKeyProvider } from './provider.js'
export { useLogin } from './hooks/useLogin.js'
export { useAccount } from './hooks/useAccount.js'
export { useSendIntent } from './hooks/useSendIntent.js'
export { GhostKeyClient } from './client.js'
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
} from './types.js'
