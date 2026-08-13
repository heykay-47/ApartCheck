import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import {
  createAssetFixture,
  createSocietyFixture,
  createUnitFixture,
  createTicketFixture,
  createUserFixture,
} from '../helpers/factories.js'
import { UserModel } from '../../src/features/users/user.model.js'
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

describe('Ticket workflow APIs', () => {
  it('creates and runs the complete lifecycle with immutable event history', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const asset = await createAssetFixture({ societyId: society._id })
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      unitId: unit._id,
      mustChangePassword: false,
    })
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
    const residentCookie = await login(app, resident.email)
    const adminCookie = await login(app, admin.email)
    const technicianCookie = await login(app, technician.email)

    const created = await request(app)
      .post('/api/tickets')
      .set('Cookie', residentCookie)
      .send({
        unitId: unit.id,
        assetId: asset.id,
        title: 'Lift door problem',
        description: 'The lift door does not close reliably.',
      })
    expect(created.status).toBe(201)
    expect(created.body.ticket.events).toHaveLength(1)
    expect(created.body.ticket.events[0]).toMatchObject({
      type: 'created',
      fromStatus: null,
      toStatus: 'open',
      assigneeId: null,
      note: null,
    })
    const ticketId = created.body.ticket.id

    const assigned = await request(app)
      .put(`/api/tickets/${ticketId}/assignment`)
      .set('Cookie', adminCookie)
      .send({ technicianId: technician.id })
    expect(assigned.status).toBe(200)
    expect(assigned.body.ticket.status).toBe('assigned')

    const started = await request(app)
      .post(`/api/tickets/${ticketId}/start-work`)
      .set('Cookie', technicianCookie)
      .send({})
    expect(started.status).toBe(200)
    expect(started.body.ticket.status).toBe('in_progress')

    const submitted = await request(app)
      .post(`/api/tickets/${ticketId}/submit`)
      .set('Cookie', technicianCookie)
      .send({ completionSummary: 'Replaced guide and tested two cycles.' })
    expect(submitted.status).toBe(200)
    expect(submitted.body.ticket.status).toBe('awaiting_verification')
    expect(submitted.body.ticket.events.at(-1)).toMatchObject({
      type: 'submitted_for_verification',
      note: 'Replaced guide and tested two cycles.',
    })

    const verified = await request(app)
      .post(`/api/tickets/${ticketId}/verify`)
      .set('Cookie', adminCookie)
      .send({})
    expect(verified.status).toBe(200)
    expect(verified.body.ticket.status).toBe('completed')
    expect(
      verified.body.ticket.events.map((event: { type: string }) => event.type),
    ).toEqual([
      'created',
      'assigned',
      'work_started',
      'submitted_for_verification',
      'verified',
    ])
  })

  it('keeps visibility and identity fields server-owned', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
      unitId: unit._id,
      mustChangePassword: false,
    })
    const technician = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const app = createApp()
    const residentCookie = await login(app, resident.email)
    const technicianCookie = await login(app, technician.email)
    const invalid = await request(app)
      .post('/api/tickets')
      .set('Cookie', residentCookie)
      .send({
        societyId: society.id,
        reporterId: technician.id,
        unitId: unit.id,
        title: 'A valid title',
        description: 'A sufficiently long ticket description.',
      })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR')

    const forbidden = await request(app)
      .post('/api/tickets')
      .set('Cookie', technicianCookie)
      .send({
        unitId: unit.id,
        title: 'A valid title',
        description: 'A sufficiently long ticket description.',
      })
    expect(forbidden.status).toBe(403)
  })
  it('repairs completed tickets with missing, inactive, or demoted assignees', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const replacement = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const inactive = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      active: false,
      mustChangePassword: false,
    })
    const demoted = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    await UserModel.updateOne(
      { _id: demoted._id },
      { $set: { role: 'resident', unitId: unit._id } },
    )
    const tickets = await Promise.all([
      createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status: 'completed',
      }),
      createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status: 'completed',
        assigneeId: inactive._id,
      }),
      createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status: 'completed',
        assigneeId: demoted._id,
      }),
    ])
    const app = createApp()
    const session = await login(app, admin.email)

    for (const ticket of tickets) {
      const repaired = await request(app)
        .put(`/api/tickets/${ticket.id}/assignment`)
        .set('Cookie', session)
        .send({ technicianId: replacement.id })
      expect(repaired.status).toBe(200)
      expect(repaired.body.ticket).toMatchObject({
        id: ticket.id,
        status: 'completed',
        assignee: {
          id: replacement.id,
          active: true,
          role: 'technician',
        },
      })
      expect(repaired.body.ticket.events.at(-1)).toMatchObject({
        type: 'reassigned',
        fromStatus: 'completed',
        toStatus: 'completed',
        assigneeId: replacement.id,
      })
    }
  })
})
