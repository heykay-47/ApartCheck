import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AssetModel } from '../../src/features/assets/asset.model.js'
import {
  createAssetFixture,
  createSocietyFixture,
  createTicketFixture,
  createUnitFixture,
  createUserFixture,
} from '../helpers/factories.js'
import { TicketModel } from '../../src/features/tickets/ticket.model.js'

const password = 'apartcheck-test-password'

function cookie(response: { headers: { 'set-cookie'?: string[] } }): string {
  const value = response.headers['set-cookie']?.[0]
  if (!value) throw new Error('Expected session cookie.')
  return value.split(';')[0] ?? value
}

async function login(app: ReturnType<typeof createApp>, email: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
  expect(response.status).toBe(200)
  return cookie(response)
}

describe('protected assets and QR APIs', () => {
  it('lets admins create and manage assets while hiding QR tokens', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const created = await request(app)
      .post('/api/assets')
      .set('Cookie', session)
      .send({
        name: 'Main Lift',
        category: 'lift',
        locationDescription: 'Tower A lobby',
        installDate: '2025-01-02T00:00:00.000Z',
      })
    expect(created.status).toBe(201)
    expect(created.body).toEqual({
      asset: expect.objectContaining({
        name: 'Main Lift',
        category: 'lift',
        assetCode: expect.stringMatching(/^LFT-[A-Z2-9]{6}$/),
      }),
    })
    expect(created.body.asset).not.toHaveProperty('qrToken')

    const id = created.body.asset.id
    const updated = await request(app)
      .patch(`/api/assets/${id}`)
      .set('Cookie', session)
      .send({
        name: 'Updated Lift',
        category: 'lift',
        locationDescription: 'Tower B lobby',
      })
    expect(updated.status).toBe(200)
    expect(updated.body.asset).toMatchObject({ id, name: 'Updated Lift' })

    const invalid = await request(app)
      .patch(`/api/assets/${id}`)
      .set('Cookie', session)
      .send({
        name: 'Nope',
        category: 'lift',
        locationDescription: 'Nope',
        assetCode: 'LFT-ABC123',
      })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('allows all roles to read active same-society assets but restricts mutations and QR downloads', async () => {
    const society = await createSocietyFixture()
    const asset = await createAssetFixture({
      societyId: society._id,
      name: 'Pump Alpha',
      category: 'plumbing',
    })
    const users = await Promise.all(
      (['resident', 'technician', 'admin'] as const).map((role) =>
        createUserFixture({
          societyId: society._id,
          role,
          mustChangePassword: false,
        }),
      ),
    )
    const app = createApp()

    for (const user of users) {
      const session = await login(app, user.email)
      const list = await request(app)
        .get('/api/assets?category=plumbing&search=pump')
        .set('Cookie', session)
      expect(list.status).toBe(200)
      expect(list.body.assets).toHaveLength(1)
      expect(list.body.assets[0]).not.toHaveProperty('qrToken')
      expect(list.body.pagination).toEqual({
        page: 1,
        pageSize: 25,
        total: 1,
        pages: 1,
      })

      const read = await request(app)
        .get(`/api/assets/${asset.id}`)
        .set('Cookie', session)
      expect(read.status).toBe(200)
      expect(read.body.asset).toMatchObject({ id: asset.id })

      const mutation = await request(app)
        .patch(`/api/assets/${asset.id}`)
        .set('Cookie', session)
        .send({
          name: 'Changed',
          category: 'plumbing',
          locationDescription: 'Somewhere',
        })
      const qr = await request(app)
        .get(`/api/assets/${asset.id}/qr.svg`)
        .set('Cookie', session)
      if (user.role === 'admin') {
        expect(mutation.status).toBe(200)
        expect(qr.status).toBe(200)
        expect(qr.headers['content-type']).toMatch(/^image\/svg\+xml/)
        expect(qr.headers['content-disposition']).toContain(asset.assetCode)
      } else {
        expect(mutation.status).toBe(403)
        expect(qr.status).toBe(403)
      }
    }
  })

  it('archives assets and resolves only active same-society QR tokens', async () => {
    const society = await createSocietyFixture()
    const otherSociety = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const otherAsset = await createAssetFixture({ societyId: otherSociety._id })
    const asset = await createAssetFixture({ societyId: society._id })
    const app = createApp()
    const session = await login(app, admin.email)
    const stored = await AssetModel.findById(asset.id).select('+qrToken')
    const otherStored = await AssetModel.findById(otherAsset.id).select(
      '+qrToken',
    )
    const unavailable = async (token: string) => {
      const response = await request(app)
        .get(`/api/scan/${token}`)
        .set('Cookie', session)
      expect(response.status).toBe(404)
      expect(response.body.error).toMatchObject({ code: 'ASSET_UNAVAILABLE' })
      return response.body
    }

    const resolved = await request(app)
      .get(`/api/scan/${stored!.qrToken}`)
      .set('Cookie', session)
    expect(resolved.status).toBe(200)
    expect(resolved.body).toEqual({
      asset: expect.objectContaining({ id: asset.id }),
    })
    expect(resolved.body.asset).not.toHaveProperty('qrToken')

    expect((await unavailable('not-a-real-token')).error).toMatchObject({
      code: 'ASSET_UNAVAILABLE',
      message: 'Asset is unavailable.',
    })
    expect((await unavailable(otherStored!.qrToken)).error).toMatchObject({
      code: 'ASSET_UNAVAILABLE',
      message: 'Asset is unavailable.',
    })
    await request(app)
      .delete(`/api/assets/${asset.id}`)
      .set('Cookie', session)
      .expect(204)
    expect(
      (await request(app).get(`/api/assets/${asset.id}`).set('Cookie', session))
        .status,
    ).toBe(404)
    expect((await unavailable(stored!.qrToken)).error).toMatchObject({
      code: 'ASSET_UNAVAILABLE',
      message: 'Asset is unavailable.',
    })
    expect((await unavailable('still-not-real')).error).toMatchObject({
      code: 'ASSET_UNAVAILABLE',
      message: 'Asset is unavailable.',
    })
  })

  it('blocks archive while an active Ticket references the Asset', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const asset = await createAssetFixture({ societyId: society._id })
    const ticket = await createTicketFixture({
      societyId: society._id,
      unitId: (await createUnitFixture({ societyId: society._id }))._id,
      assetId: asset._id,
      reporterId: admin._id,
      status: 'open',
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const blocked = await request(app)
      .delete(`/api/assets/${asset.id}`)
      .set('Cookie', session)
    expect(blocked.status).toBe(409)
    expect(blocked.body.error).toMatchObject({
      code: 'ASSET_HAS_ACTIVE_TICKETS',
      message: 'Asset has active tickets and cannot be archived.',
    })

    await TicketModel.updateOne(
      { _id: ticket._id },
      { $set: { status: 'cancelled' } },
    )
    const archived = await request(app)
      .delete(`/api/assets/${asset.id}`)
      .set('Cookie', session)
    expect(archived.status).toBe(204)
  })

  it('paginates and filters assets, and rejects cross-society access', async () => {
    const society = await createSocietyFixture()
    const otherSociety = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const otherAsset = await createAssetFixture({ societyId: otherSociety._id })
    await createAssetFixture({
      societyId: society._id,
      name: 'Lift One',
      category: 'lift',
    })
    await createAssetFixture({
      societyId: society._id,
      name: 'Electrical One',
      category: 'electrical',
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const list = await request(app)
      .get('/api/assets?page=1&pageSize=1&search=lift&category=lift')
      .set('Cookie', session)
    expect(list.status).toBe(200)
    expect(list.body).toMatchObject({
      assets: expect.any(Array),
      pagination: { page: 1, pageSize: 1, total: 1, pages: 1 },
    })
    expect(
      (
        await request(app)
          .get(`/api/assets/${otherAsset.id}`)
          .set('Cookie', session)
      ).body.error.code,
    ).toBe('ASSET_NOT_FOUND')
  })

  it('returns resource not found for malformed asset IDs', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    for (const response of [
      await request(app).get('/api/assets/not-an-id').set('Cookie', session),
      await request(app)
        .patch('/api/assets/not-an-id')
        .set('Cookie', session)
        .send({
          name: 'Name',
          category: 'lift',
          locationDescription: 'Location',
        }),
      await request(app).delete('/api/assets/not-an-id').set('Cookie', session),
      await request(app)
        .get('/api/assets/not-an-id/qr.svg')
        .set('Cookie', session),
    ]) {
      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('ASSET_NOT_FOUND')
    }
  })
})
