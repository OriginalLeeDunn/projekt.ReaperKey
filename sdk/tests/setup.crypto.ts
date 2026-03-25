// Polyfill WebCrypto for vitest node environment
// Node.js 18+ has crypto.webcrypto but doesn't expose it as globalThis.crypto
// in all vm contexts used by vitest.
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: false,
  configurable: true,
})
