import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AssetModel } from '../../src/features/assets/asset.model.js'
import {
  createAssetFixture,
  createSocietyFixture,
  createUnitFixture,
  createUserFixture,
} from '../helpers/factories.js'

const password = 'apartcheck-test-password'

function cookie(response: { headers: { 'set-cookie'?: string[] } }): string {
  const value = response.headers['set-cookie']?.[0]
  if (!value) throw new Error('Expected session cookie.')
  return value.split(';')[0] ?? value
}

describe('society isolation', () => {
  it('hides Society B units, users, assets, and QR tokens from Society A', async () => {
    const societyA = await createSocietyFixture({ name: 'Society A' })
    const societyB = await createSocietyFixture({ name: 'Society B secret' })
    const adminA = await createUserFixture({
      societyId: societyA._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const unitB = await createUnitFixture({
      societyId: societyB._id,
      building: 'B secret tower',
    })
    const userB = await createUserFixture({
      societyId: societyB._id,
      role: 'resident',
      unitId: unitB._id,
    })
    const assetB = await createAssetFixture({
      societyId: societyB._id,
      name: 'B secret lift',
    })
    const storedAssetB = await AssetModel.findById(assetB.id).select('+qrToken')
    const app = createApp()
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: adminA.email, password })
    const session = cookie(login)

    const responses = [
      await request(app).get(`/api/units/${unitB.id}`).set('Cookie', session),
      await request(app)
        .patch(`/api/units/${unitB.id}`)
        .set('Cookie', session)
        .send({
          building: 'Nope',
          floor: 'N',
          unitNumber: 'N1',
        }),
      await request(app)
        .delete(`/api/units/${unitB.id}`)
        .set('Cookie', session),
      await request(app).get(`/api/users/${userB.id}`).set('Cookie', session),
      await request(app)
        .patch(`/api/users/${userB.id}`)
        .set('Cookie', session)
        .send({
          name: 'Nope',
          email: userB.email,
          phone: userB.phone,
          role: userB.role,
        }),
      await request(app).get(`/api/assets/${assetB.id}`).set('Cookie', session),
      await request(app)
        .patch(`/api/assets/${assetB.id}`)
        .set('Cookie', session)
        .send({
          name: 'Nope',
          category: 'lift',
          locationDescription: 'Nope',
        }),
      await request(app)
        .get(`/api/scan/${storedAssetB!.qrToken}`)
        .set('Cookie', session),
    ]

    for (const response of responses) {
      expect(response.status).toBe(404)
      expect(JSON.stringify(response.body)).not.toContain('Society B')
      expect(JSON.stringify(response.body)).not.toContain('secret')
    }
  })
})
