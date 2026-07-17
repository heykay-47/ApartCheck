import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true })),
  )
})

describe('production SPA host', () => {
  it('serves SPA routes and assets without replacing API errors', async () => {
    const clientDistPath = await mkdtemp(
      path.join(os.tmpdir(), 'apartcheck-client-'),
    )
    fixtures.push(clientDistPath)
    await mkdir(path.join(clientDistPath, 'assets'))
    await writeFile(
      path.join(clientDistPath, 'index.html'),
      '<html>apartcheck shell</html>',
    )
    await writeFile(
      path.join(clientDistPath, 'assets', 'app-abc123.js'),
      'console.log("asset")',
    )

    const app = createApp({ clientDistPath })
    const login = await request(app).get('/login')
    const missingAssetRoute = await request(app).get('/assets/example')
    const asset = await request(app).get('/assets/app-abc123.js')
    const missingApi = await request(app).get('/api/missing')

    expect(login.status).toBe(200)
    expect(login.text).toContain('apartcheck shell')
    expect(login.headers['cache-control']).toContain('no-cache')
    expect(missingAssetRoute.status).toBe(200)
    expect(missingAssetRoute.text).toContain('apartcheck shell')
    expect(asset.status).toBe(200)
    expect(asset.text).toContain('console.log')
    expect(asset.headers['cache-control']).toContain('immutable')
    expect(missingApi.status).toBe(404)
    expect(missingApi.headers['content-type']).toMatch(/json/)
    expect(missingApi.body).toMatchObject({
      error: { code: 'ROUTE_NOT_FOUND' },
    })
  })
})
