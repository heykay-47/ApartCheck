import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { UnitModel } from '../../src/features/units/unit.model.js'
import { UserModel } from '../../src/features/users/user.model.js'
import {
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

async function login(app: ReturnType<typeof createApp>, email: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
  expect(response.status).toBe(200)
  return cookie(response)
}

describe('society and unit administration', () => {
  it('lets every role read society and only admins update it', async () => {
    const society = await createSocietyFixture({ name: 'Society A' })
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      mustChangePassword: false,
    })
    const technician = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()

    for (const user of [resident, technician, admin]) {
      const response = await request(app)
        .get('/api/society')
        .set('Cookie', await login(app, user.email))
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        society: expect.objectContaining({ id: society.id, name: 'Society A' }),
      })
    }

    const residentUpdate = await request(app)
      .patch('/api/society')
      .set('Cookie', await login(app, resident.email))
      .send({ name: 'Nope', address: 'Nope' })
    expect(residentUpdate.status).toBe(403)

    const update = await request(app)
      .patch('/api/society')
      .set('Cookie', await login(app, admin.email))
      .send({ name: 'Updated Society', address: 'Updated Address' })
    expect(update.status).toBe(200)
    expect(update.body).toEqual({
      society: expect.objectContaining({
        name: 'Updated Society',
        address: 'Updated Address',
      }),
    })
  })

  it('restricts units to admins and returns paginated case-insensitive search results', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      mustChangePassword: false,
    })
    const app = createApp()
    const adminCookie = await login(app, admin.email)

    for (const [building, unitNumber] of [
      ['Tower A', 'A-1'],
      ['Tower A', 'A-2'],
      ['Tower B', 'B-1'],
    ]) {
      const response = await request(app)
        .post('/api/units')
        .set('Cookie', adminCookie)
        .send({ building, floor: 'Ground', unitNumber })
      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('unit')
    }

    const list = await request(app)
      .get('/api/units?page=1&pageSize=2&search=tOwEr%20a')
      .set('Cookie', adminCookie)
    expect(list.status).toBe(200)
    expect(list.body).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 3,
      pages: 2,
    })
    expect(list.body.items).toHaveLength(2)

    const denied = await request(app)
      .get('/api/units')
      .set('Cookie', await login(app, resident.email))
    expect(denied.status).toBe(403)
  })

  it('rejects unknown fields and duplicate normalized unit identity', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const invalid = await request(app)
      .post('/api/units')
      .set('Cookie', session)
      .send({ building: 'Tower A', floor: 'G', unitNumber: 'A1', extra: true })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR')

    const first = await request(app)
      .post('/api/units')
      .set('Cookie', session)
      .send({ building: ' Tower A ', floor: 'G', unitNumber: 'A1' })
    expect(first.status).toBe(201)
    expect(first.body).toEqual({
      unit: expect.objectContaining({
        building: 'Tower A',
        floor: 'G',
        unitNumber: 'A1',
      }),
    })

    const duplicate = await request(app)
      .post('/api/units')
      .set('Cookie', session)
      .send({ building: 'tower a', floor: 'g', unitNumber: 'a1' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('DUPLICATE_UNIT')
  })

  it('blocks archive while active resident exists, then archives and updates units', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const unit = await createUnitFixture({ societyId: society._id })
    await createUserFixture({
      societyId: society._id,
      role: 'resident',
      unitId: unit._id,
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const blocked = await request(app)
      .delete(`/api/units/${unit.id}`)
      .set('Cookie', session)
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('UNIT_HAS_ACTIVE_RESIDENTS')

    await UserModel.updateMany({ unitId: unit._id }, { active: false })
    const updated = await request(app)
      .patch(`/api/units/${unit.id}`)
      .set('Cookie', session)
      .send({ building: 'Updated Tower', floor: '1', unitNumber: '101' })
    expect(updated.status).toBe(200)
    expect(updated.body).toEqual({
      unit: expect.objectContaining({
        building: 'Updated Tower',
        floor: '1',
        unitNumber: '101',
      }),
    })

    const read = await request(app)
      .get(`/api/units/${unit.id}`)
      .set('Cookie', session)
    expect(read.status).toBe(200)
    expect(read.body).toEqual({
      unit: expect.objectContaining({ id: unit.id }),
    })

    const archived = await request(app)
      .delete(`/api/units/${unit.id}`)
      .set('Cookie', session)
    expect(archived.status).toBe(204)
    expect((await UnitModel.findById(unit.id))?.archivedAt).not.toBeNull()
  })

  it('rejects update when changed identity conflicts with existing unit', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const existing = await createUnitFixture({
      societyId: society._id,
      building: 'Tower A',
      floor: '1',
      unitNumber: '101',
    })
    const changing = await createUnitFixture({
      societyId: society._id,
      building: 'Tower B',
      floor: '2',
      unitNumber: '202',
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const response = await request(app)
      .patch(`/api/units/${changing.id}`)
      .set('Cookie', session)
      .send({
        building: ` ${existing.building.toLowerCase()} `,
        floor: ' 1 ',
        unitNumber: '101',
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('DUPLICATE_UNIT')
  })

  it('isolates unit reads and mutations by society', async () => {
    const societyA = await createSocietyFixture()
    const societyB = await createSocietyFixture()
    const adminA = await createUserFixture({
      societyId: societyA._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const unitB = await createUnitFixture({ societyId: societyB._id })
    const app = createApp()
    const session = await login(app, adminA.email)

    for (const response of [
      await request(app).get(`/api/units/${unitB.id}`).set('Cookie', session),
      await request(app)
        .patch(`/api/units/${unitB.id}`)
        .set('Cookie', session)
        .send({ building: 'Nope', floor: 'N', unitNumber: 'N1' }),
      await request(app)
        .delete(`/api/units/${unitB.id}`)
        .set('Cookie', session),
    ]) {
      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('UNIT_NOT_FOUND')
    }
  })
})
