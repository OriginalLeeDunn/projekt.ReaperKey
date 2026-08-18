import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', 'server.js'],
      exclude: ['src/main.tsx', '**/*.test.*', '**/*.spec.*', 'vitest.setup.ts'],
      thresholds: {
        lines: 95,
        functions: 85,
        branches: 86,
        statements: 95,
      },
    },
  },
})
