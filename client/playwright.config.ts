import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '..')

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev:e2e -w server',
      cwd: repositoryRoot,
      url: 'http://127.0.0.1:3000/api/health/ready',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w client -- --host 127.0.0.1',
      cwd: repositoryRoot,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
