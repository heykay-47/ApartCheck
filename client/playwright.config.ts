import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const e2eServerPort = Number(process.env.E2E_SERVER_PORT ?? 3000)
const e2eServerUrl = `http://127.0.0.1:${e2eServerPort}`

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `E2E_SERVER_PORT=${e2eServerPort} npm run dev:e2e -w server`,
      cwd: repositoryRoot,
      url: `${e2eServerUrl}/api/health/ready`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `VITE_API_TARGET=${e2eServerUrl} npm run dev -w client -- --host 127.0.0.1`,
      cwd: repositoryRoot,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
