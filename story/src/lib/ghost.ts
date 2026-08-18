// Simulated GhostKey flow for the story demo.
// No network calls — but the crypto is real (Web Crypto SubtleCrypto),
// and the scope-checking logic mirrors the actual error codes the
// GhostKey server returns (see docs/sdk/hooks.md).

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function fakeAddress(): string {
  return '0x' + randomHex(20)
}

export interface Scenario {
  id: string
  label: string
  targetLabel: string
  targetAddress: string
  selector: string
  functionLabel: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'coffee',
    label: 'Coffee shop dApp',
    targetLabel: 'CoffeeShop',
    targetAddress: '0x' + '11'.repeat(20),
    selector: '0xa9059cbb',
    functionLabel: 'transfer(address,uint256)',
  },
  {
    id: 'nft',
    label: 'NFT marketplace',
    targetLabel: 'NftMarket',
    targetAddress: '0x' + '22'.repeat(20),
    selector: '0x42842e0e',
    functionLabel: 'safeTransferFrom(address,address,uint256)',
  },
  {
    id: 'game',
    label: 'On-chain game item shop',
    targetLabel: 'ItemShop',
    targetAddress: '0x' + '33'.repeat(20),
    selector: '0xd0febe60',
    functionLabel: 'buyItem(uint256)',
  },
]

export interface SessionScope {
  scenario: Scenario
  maxValueEth: number
  ttlMinutes: number
}

export interface IntentAttempt {
  targetAddress: string
  selector: string
  valueEth: number
}

export type IntentResult =
  | { ok: true; txHash: string }
  | { ok: false; code: 'intent_out_of_scope' | 'value_exceeds_session_limit'; message: string }

// Mirrors the real server's scope checks in server/src/routes/intent.rs
export function evaluateIntent(scope: SessionScope, attempt: IntentAttempt): IntentResult {
  if (attempt.targetAddress !== scope.scenario.targetAddress || attempt.selector !== scope.scenario.selector) {
    return {
      ok: false,
      code: 'intent_out_of_scope',
      message: `Session key is only scoped to ${scope.scenario.targetLabel}.${scope.scenario.functionLabel} — this call targets a different contract or function.`,
    }
  }
  if (attempt.valueEth > scope.maxValueEth) {
    return {
      ok: false,
      code: 'value_exceeds_session_limit',
      message: `Requested ${attempt.valueEth} ETH exceeds the session's ${scope.maxValueEth} ETH limit.`,
    }
  }
  return { ok: true, txHash: '0x' + randomHex(32) }
}
