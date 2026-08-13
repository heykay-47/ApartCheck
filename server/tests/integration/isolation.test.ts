import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AssetModel } from '../../src/features/assets/asset.model.js'
import {
  createAssetFixture,
  createTicketEventFixture,
  createTicketFixture,
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

    const userList = await request(app)
      .get('/api/users?search=secret')
      .set('Cookie', session)
    expect(userList.status).toBe(200)
    expect(userList.body.users).toEqual([])

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

  it('isolates Tickets, events, assignments, and asset-related lookups', async () => {
    const societyA = await createSocietyFixture({ name: 'Ticket Society A' })
    const societyB = await createSocietyFixture({ name: 'Ticket Society B' })
    const unitB = await createUnitFixture({ societyId: societyB._id })
    const assetA = await createAssetFixture({ societyId: societyA._id })
    const assetB = await createAssetFixture({ societyId: societyB._id })
    const adminA = await createUserFixture({
      societyId: societyA._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const reporterB = await createUserFixture({
      societyId: societyB._id,
      role: 'resident',
      unitId: unitB._id,
      mustChangePassword: false,
    })
    const technicianB = await createUserFixture({
      societyId: societyB._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const ticketB = await createTicketFixture({
      societyId: societyB._id,
      unitId: unitB._id,
      assetId: assetB._id,
      reporterId: reporterB._id,
      status: 'assigned',
      assigneeId: technicianB._id,
    })
    await createTicketEventFixture({
      societyId: societyB._id,
      ticketId: ticketB._id,
      actorId: reporterB._id,
      type: 'created',
      toStatus: 'open',
    })
    const app = createApp()
    const session = cookie(
      await request(app)
        .post('/api/auth/login')
        .send({ email: adminA.email, password }),
    )

    const list = await request(app).get('/api/tickets').set('Cookie', session)
    expect(list.status).toBe(200)
    expect(list.body.tickets).toEqual([])

    const hiddenDetail = await request(app)
      .get(`/api/tickets/${ticketB.id}`)
      .set('Cookie', session)
    expect(hiddenDetail.status).toBe(404)
    expect(hiddenDetail.body.error.code).toBe('TICKET_NOT_FOUND')

    const hiddenAssignment = await request(app)
      .put(`/api/tickets/${ticketB.id}/assignment`)
      .set('Cookie', session)
      .send({ technicianId: technicianB.id })
    expect(hiddenAssignment.status).toBe(404)
    expect(hiddenAssignment.body.error.code).toBe('TICKET_NOT_FOUND')

    const malformedAsset = await request(app)
      .get('/api/tickets/for-asset/not-an-id')
      .set('Cookie', session)
    expect(malformedAsset.status).toBe(404)
    expect(malformedAsset.body.error.code).toBe('ASSET_NOT_FOUND')

    const crossSocietyAsset = await request(app)
      .get(`/api/tickets/for-asset/${assetB.id}`)
      .set('Cookie', session)
    expect(crossSocietyAsset.status).toBe(404)
    expect(crossSocietyAsset.body.error.code).toBe('ASSET_NOT_FOUND')

    await AssetModel.updateOne(
      { _id: assetB._id },
      { $set: { archivedAt: new Date() } },
    )
    const archivedAsset = await request(app)
      .get(`/api/tickets/for-asset/${assetB.id}`)
      .set('Cookie', session)
    expect(archivedAsset.status).toBe(404)
    expect(archivedAsset.body.error.code).toBe('ASSET_NOT_FOUND')

    const ownAssetList = await request(app)
      .get(`/api/tickets/for-asset/${assetA.id}`)
      .set('Cookie', session)
    expect(ownAssetList.status).toBe(200)
    expect(ownAssetList.body).toMatchObject({
      tickets: [],
      pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
    })
  })
})
