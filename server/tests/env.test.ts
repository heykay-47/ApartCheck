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

  it('constructs the local app when Cloudinary values are omitted or blank', () => {
    const configPath = pathToFileURL(
      join(fileURLToPath(new URL('../src/config/env.ts', import.meta.url))),
    ).href
    const appPath = pathToFileURL(
      join(fileURLToPath(new URL('../src/app.ts', import.meta.url))),
    ).href
    const loaderPath = fileURLToPath(
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url),
    )

    const output = execFileSync(
      process.execPath,
      [
        '--import',
        loaderPath,
        '--input-type=module',
        '-e',
        `import '${configPath}'; import { createApp } from '${appPath}'; createApp(); console.log('local-app-ready')`,
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PORT: '3000',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/apartcheck',
          JWT_SECRET: 'local-secret-that-is-at-least-32-characters',
          APP_BASE_URL: 'http://localhost:5173',
          TRUST_PROXY_HOPS: '0',
          CLOUDINARY_CLOUD_NAME: '',
          CLOUDINARY_API_KEY: '',
          CLOUDINARY_API_SECRET: '',
        },
      },
    )

    expect(output.toString()).toContain('local-app-ready')
  })

  it('constructs the production app with the three Cloudinary values', () => {
    const appPath = pathToFileURL(
      join(fileURLToPath(new URL('../src/app.ts', import.meta.url))),
    ).href
    const loaderPath = fileURLToPath(
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url),
    )

    const output = execFileSync(
      process.execPath,
      [
        '--import',
        loaderPath,
        '--input-type=module',
        '-e',
        `import { createApp } from '${appPath}'; createApp(); console.log('production-app-ready')`,
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '3000',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/apartcheck',
          JWT_SECRET: 'production-secret-that-is-at-least-32-characters',
          APP_BASE_URL: 'http://localhost:5173',
          TRUST_PROXY_HOPS: '0',
          CLOUDINARY_CLOUD_NAME: 'apartcheck',
          CLOUDINARY_API_KEY: 'server-key',
          CLOUDINARY_API_SECRET: 'server-secret',
        },
      },
    )

    expect(output.toString()).toContain('production-app-ready')
  })

  it('rejects production app construction without Cloudinary values', () => {
    const appPath = pathToFileURL(
      join(fileURLToPath(new URL('../src/app.ts', import.meta.url))),
    ).href
    const loaderPath = fileURLToPath(
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url),
    )

    let error: unknown
    try {
      execFileSync(
        process.execPath,
        [
          '--import',
          loaderPath,
          '--input-type=module',
          '-e',
          `import { createApp } from '${appPath}'; createApp()`,
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: '3000',
            MONGODB_URI: 'mongodb://127.0.0.1:27017/apartcheck',
            JWT_SECRET: 'production-secret-that-is-at-least-32-characters',
            APP_BASE_URL: 'http://localhost:5173',
            TRUST_PROXY_HOPS: '0',
            CLOUDINARY_CLOUD_NAME: '',
            CLOUDINARY_API_KEY: '',
            CLOUDINARY_API_SECRET: '',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
    } catch (caught) {
      error = caught
    }

    expect(error).toBeTruthy()
    expect(String(error)).toContain('CLOUDINARY_CLOUD_NAME')
    expect(String(error)).toContain('CLOUDINARY_API_KEY')
    expect(String(error)).toContain('CLOUDINARY_API_SECRET')
  })
})
