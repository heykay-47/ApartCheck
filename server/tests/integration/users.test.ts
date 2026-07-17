import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { verifyPassword } from '../../src/features/auth/password.js'
import { UserModel } from '../../src/features/users/user.model.js'
import { UserService } from '../../src/features/users/user.service.js'
import { UnitModel } from '../../src/features/units/unit.model.js'
import { UnitService } from '../../src/features/units/unit.service.js'
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
  const response = await request(app).post('/api/auth/login').send({
    email,
    password,
  })
  expect(response.status).toBe(200)
  return cookie(response)
}

describe('user administration', () => {
  it('creates residents with a one-time temporary password and safe user DTO', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()

    const response = await request(app)
      .post('/api/users')
      .set('Cookie', await login(app, admin.email))
      .send({
        name: ' New Resident ',
        email: ' RESIDENT@EXAMPLE.COM ',
        phone: ' +919876543211 ',
        role: 'resident',
        unitId: unit.id,
      })

    expect(response.status).toBe(201)
    expect(response.body.user).toMatchObject({
      name: 'New Resident',
      email: 'resident@example.com',
      phone: '+919876543211',
      role: 'resident',
      unitId: unit.id,
      active: true,
      mustChangePassword: true,
    })
    expect(response.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
    expect(response.body.user).not.toHaveProperty('passwordHash')
    expect(response.body.user).not.toHaveProperty('qrToken')
    const stored = await UserModel.findById(response.body.user.id).select(
      '+passwordHash',
    )
    expect(stored?.passwordHash).not.toBe(response.body.temporaryPassword)
    await expect(
      verifyPassword(response.body.temporaryPassword, stored!.passwordHash),
    ).resolves.toBe(true)
  })

  it('enforces role and unit invariants and rejects inaccessible units', async () => {
    const society = await createSocietyFixture()
    const otherSociety = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const otherUnit = await createUnitFixture({ societyId: otherSociety._id })
    const archivedUnit = await createUnitFixture({
      societyId: society._id,
      archivedAt: new Date(),
    })
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)
    const base = {
      name: 'User',
      email: 'new@example.com',
      phone: '+919876543212',
    }

    for (const body of [
      { ...base, role: 'resident' },
      {
        ...base,
        email: 'tech@example.com',
        role: 'technician',
        unitId: unit.id,
      },
      {
        ...base,
        email: 'other@example.com',
        role: 'admin',
        unitId: otherUnit.id,
      },
      {
        ...base,
        email: 'archived@example.com',
        role: 'resident',
        unitId: archivedUnit.id,
      },
    ]) {
      const response = await request(app)
        .post('/api/users')
        .set('Cookie', session)
        .send(body)
      expect(response.status).toBe(
        body.email === 'archived@example.com' ? 404 : 400,
      )
      if (body.email === 'archived@example.com')
        expect(response.body.error.code).toBe('UNIT_NOT_FOUND')
    }
  })

  it('lists filtered users without sensitive fields and denies non-admins', async () => {
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
    const response = await request(app)
      .get(
        '/api/users?page=1&pageSize=1&search=fixture&role=resident&active=true',
      )
      .set('Cookie', await login(app, admin.email))
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      users: expect.any(Array),
      pagination: { page: 1, pageSize: 1, total: 1, pages: 1 },
    })
    expect(response.body.users[0]).toMatchObject({
      id: resident.id,
      role: 'resident',
    })
    expect(response.body.users[0]).not.toHaveProperty('passwordHash')
    expect(response.body.users[0]).not.toHaveProperty('qrToken')
    expect(response.body.users[0]).not.toHaveProperty('temporaryPassword')

    const denied = await request(app)
      .get('/api/users')
      .set('Cookie', await login(app, resident.email))
    expect(denied.status).toBe(403)
  })

  it('invalidates sessions on reset, disable, and re-enable, and protects last admin', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const technician = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const app = createApp()
    const adminSession = await login(app, admin.email)
    const techSession = await login(app, technician.email)

    const reset = await request(app)
      .post(`/api/users/${technician.id}/reset-password`)
      .set('Cookie', adminSession)
    expect(reset.status).toBe(200)
    expect(reset.body.temporaryPassword).toHaveLength(16)
    expect(
      (await request(app).get('/api/test/protected').set('Cookie', techSession))
        .body.error.code,
    ).toBe('INVALID_SESSION')

    const disabled = await request(app)
      .patch(`/api/users/${technician.id}/status`)
      .set('Cookie', adminSession)
      .send({ active: false })
    expect(disabled.status).toBe(200)
    expect(
      (await request(app).get('/api/test/protected').set('Cookie', techSession))
        .body.error.code,
    ).toBe('INVALID_SESSION')

    const enabled = await request(app)
      .patch(`/api/users/${technician.id}/status`)
      .set('Cookie', adminSession)
      .send({ active: true })
    expect(enabled.status).toBe(200)
    expect(
      (await request(app).get('/api/test/protected').set('Cookie', techSession))
        .body.error.code,
    ).toBe('INVALID_SESSION')

    const lastAdmin = await request(app)
      .patch(`/api/users/${admin.id}`)
      .set('Cookie', adminSession)
      .send({
        name: 'Admin',
        email: admin.email,
        phone: admin.phone,
        role: 'technician',
      })
    expect(lastAdmin.status).toBe(409)
    expect(lastAdmin.body.error.code).toBe('LAST_ACTIVE_ADMIN')
  })

  it('serializes concurrent admin demotions so one active admin remains', async () => {
    const society = await createSocietyFixture()
    const first = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const second = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })

    const results = await Promise.allSettled([
      UserService.update(society.id, first.id, {
        name: first.name,
        email: first.email,
        phone: first.phone,
        role: 'technician',
      }),
      UserService.update(society.id, second.id, {
        name: second.name,
        email: second.email,
        phone: second.phone,
        role: 'technician',
      }),
    ])

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1)
    expect(
      await UserModel.countDocuments({
        societyId: society._id,
        role: 'admin',
        active: true,
      }),
    ).toBe(1)
  })

  it('does not commit a resident assignment after concurrent unit archival', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })

    const results = await Promise.allSettled([
      UserService.create(society.id, {
        name: 'Concurrent Resident',
        email: 'concurrent-resident@example.com',
        phone: '+919876543214',
        role: 'resident',
        unitId: unit.id,
      }),
      UnitService.archive(society.id, unit.id),
    ])

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1)
    const storedUnit = await UnitModel.findById(unit.id)
    const resident = await UserModel.findOne({
      email: 'concurrent-resident@example.com',
    })
    expect(storedUnit?.archivedAt === null || resident === null).toBe(true)
    if (resident) expect(storedUnit?.archivedAt).toBeNull()
  })

  it('allows every role to update only their own name and phone', async () => {
    const society = await createSocietyFixture()
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      mustChangePassword: false,
    })
    const app = createApp()
    const response = await request(app)
      .patch('/api/users/me')
      .set('Cookie', await login(app, resident.email))
      .send({
        name: 'Changed',
        phone: ' +919876543213 ',
      })
    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({
      id: resident.id,
      name: 'Changed',
      phone: '+919876543213',
    })
    expect(response.body.user.role).toBe('resident')
  })

  it('rejects unknown fields in self updates', async () => {
    const society = await createSocietyFixture()
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      mustChangePassword: false,
    })
    const app = createApp()
    const response = await request(app)
      .patch('/api/users/me')
      .set('Cookie', await login(app, resident.email))
      .send({ name: 'Changed', phone: '+919876543213', role: 'admin' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns user not found for malformed supported user IDs', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    for (const response of [
      await request(app)
        .patch('/api/users/not-an-id')
        .set('Cookie', session)
        .send({
          name: 'A',
          email: 'a@example.com',
          phone: '+919876543215',
          role: 'admin',
        }),
      await request(app)
        .patch('/api/users/not-an-id/status')
        .set('Cookie', session)
        .send({ active: false }),
      await request(app)
        .post('/api/users/not-an-id/reset-password')
        .set('Cookie', session),
    ]) {
      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('USER_NOT_FOUND')
    }
  })
})
