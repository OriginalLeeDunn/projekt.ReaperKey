// Separate Vitest config for E2E bundler tests.
// Used by the `e2e-bundler` CI job (runs on main + release PRs only).
// Unit tests use vitest.config.ts; this config excludes coverage thresholds.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',   // No jsdom needed — pure network calls
    globals: false,
    include: ['tests/e2e.bundler.test.ts'],
    setupFiles: ['./tests/setup.crypto.ts'],
    testTimeout: 120_000,  // 2 minutes — allows for bundler + poll latency
  },
})
