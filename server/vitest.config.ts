import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/test-env.ts', './tests/setup.ts'],
    globals: false,
    maxWorkers: 1,
  },
})
