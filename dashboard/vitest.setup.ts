import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'

// Suppress React act() warnings from async state updates in tests
const originalError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return
    originalError(...args)
  }
})

afterEach(() => {
  console.error = originalError
  vi.clearAllMocks()
})
