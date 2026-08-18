// Mock NFT collection for the drainer-scenario chapter. Purely cosmetic
// data — no images, just deterministic gradients so the demo is
// self-contained and loads instantly.

export interface MockNft {
  id: string
  name: string
  hue: number
}

export const MOCK_COLLECTION: MockNft[] = [
  { id: '1', name: 'Ghost #4127', hue: 262 },
  { id: '2', name: 'Founder Badge', hue: 48 },
  { id: '3', name: 'Key Fragment #09', hue: 168 },
  { id: '4', name: 'Ghost #0093', hue: 210 },
  { id: '5', name: 'Genesis Pass', hue: 330 },
  { id: '6', name: 'Ghost #2210', hue: 18 },
  { id: '7', name: 'Vault Relic', hue: 285 },
  { id: '8', name: 'Ghost #7781', hue: 140 },
]

// What a real drainer contract asks for: not "take 0.05 ETH" but
// "operator may transfer every token you own, forever." This is the
// literal shape of an ERC-721 `setApprovalForAll` grant.
export const MALICIOUS_REQUEST = {
  target: 'ANY_CONTRACT',
  function: 'setApprovalForAll(operator, true)',
  scope: 'ALL TOKENS — CURRENT AND FUTURE',
  expires: 'NEVER',
}
