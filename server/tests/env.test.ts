import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('environment loading', () => {
  it('loads values from .env before validating configuration', () => {
    const directory = mkdtempSync(join(tmpdir(), 'apartcheck-env-'))
    const configPath = pathToFileURL(
      join(fileURLToPath(new URL('../src/config/env.ts', import.meta.url))),
    ).href

    writeFileSync(
      join(directory, '.env'),
      [
        'MONGODB_URI=mongodb://127.0.0.1:27017/apartcheck?replicaSet=rs0',
        'JWT_SECRET=env-file-secret-that-is-at-least-32-characters',
        'APP_BASE_URL=http://localhost:5173',
      ].join('\n'),
    )

    try {
      const output = execFileSync(
        process.execPath,
        [
          '--import',
          fileURLToPath(
            new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url),
          ),
          '--input-type=module',
          '-e',
          `import { env } from '${configPath}'; console.log(JSON.stringify(env))`,
        ],
        {
          cwd: directory,
          env: {
            ...process.env,
            NODE_ENV: undefined,
            PORT: undefined,
            MONGODB_URI: undefined,
            JWT_SECRET: undefined,
            APP_BASE_URL: undefined,
            TRUST_PROXY_HOPS: undefined,
          },
        },
      )

      expect(JSON.parse(output.toString())).toMatchObject({
        MONGODB_URI: 'mongodb://127.0.0.1:27017/apartcheck?replicaSet=rs0',
        JWT_SECRET: 'env-file-secret-that-is-at-least-32-characters',
      })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
