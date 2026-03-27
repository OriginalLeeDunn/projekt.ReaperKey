import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.crypto.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e.bundler.test.ts'],
    coverage: {
      exclude: ['**/index.ts', '**/vitest.e2e.config.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
