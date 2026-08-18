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
import { TicketModel } from '../../src/features/tickets/ticket.model.js'
import { TicketEvidenceModel } from '../../src/features/ticket-evidence/ticket-evidence.model.js'
import {
  createTestImage,
  FakeImageStorage,
} from '../helpers/fake-image-storage.js'
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
      .send({ technicianId: technician.id, requiredPhotoCount: 0 })
    expect(assigned.status).toBe(200)
    expect(assigned.body.ticket.status).toBe('assigned')
    expect(assigned.body.ticket.events.at(-1)).toMatchObject({
      previousRequiredPhotoCount: null,
      requiredPhotoCount: null,
    })

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
      evidenceSetNumber: 1,
    })
    expect(submitted.body.ticket).toMatchObject({
      activeEvidence: [],
      evidenceAttempts: [
        {
          setNumber: 1,
          outcome: 'awaiting_verification',
          photos: [],
        },
      ],
    })

    const verified = await request(app)
      .post(`/api/tickets/${ticketId}/verify`)
      .set('Cookie', adminCookie)
      .send({})
    expect(verified.status).toBe(200)
    expect(verified.body.ticket.status).toBe('completed')
    expect(verified.body.ticket.evidenceAttempts[0].outcome).toBe('verified')
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

  it('allows administrators to change photo requirements only before submission', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
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
    const adminCookie = await login(app, admin.email)
    const technicianCookie = await login(app, technician.email)
    const ticket = await createTicketFixture({
      societyId: society._id,
      unitId: unit._id,
      reporterId: admin._id,
    })

    const assigned = await request(app)
      .put(`/api/tickets/${ticket.id}/assignment`)
      .set('Cookie', adminCookie)
      .send({ technicianId: technician.id, requiredPhotoCount: 2 })
    expect(assigned.status).toBe(200)
    expect(assigned.body.ticket.requiredPhotoCount).toBe(2)
    expect(assigned.body.ticket.events.at(-1)).toMatchObject({
      previousRequiredPhotoCount: 0,
      requiredPhotoCount: 2,
    })

    const changed = await request(app)
      .put(`/api/tickets/${ticket.id}/photo-requirement`)
      .set('Cookie', adminCookie)
      .send({ requiredPhotoCount: 3 })
    expect(changed.status).toBe(200)
    expect(changed.body.ticket.requiredPhotoCount).toBe(3)
    expect(changed.body.ticket.events.at(-1)).toMatchObject({
      type: 'photo_requirement_changed',
      previousRequiredPhotoCount: 2,
      requiredPhotoCount: 3,
      evidenceSetNumber: null,
    })

    const unchanged = await request(app)
      .put(`/api/tickets/${ticket.id}/photo-requirement`)
      .set('Cookie', adminCookie)
      .send({ requiredPhotoCount: 3 })
    expect(unchanged.status).toBe(409)
    expect(unchanged.body.error.code).toBe('TICKET_PHOTO_REQUIREMENT_UNCHANGED')

    await request(app)
      .post(`/api/tickets/${ticket.id}/start-work`)
      .set('Cookie', technicianCookie)
      .send({})
    const inProgress = await request(app)
      .put(`/api/tickets/${ticket.id}/photo-requirement`)
      .set('Cookie', adminCookie)
      .send({ requiredPhotoCount: 4 })
    expect(inProgress.status).toBe(200)
    expect(inProgress.body.ticket.requiredPhotoCount).toBe(4)

    await request(app)
      .put(`/api/tickets/${ticket.id}/photo-requirement`)
      .set('Cookie', adminCookie)
      .send({ requiredPhotoCount: 0 })
      .expect(200)

    await request(app)
      .post(`/api/tickets/${ticket.id}/submit`)
      .set('Cookie', technicianCookie)
      .send({ completionSummary: 'Completed work and checked operation.' })
    const afterSubmission = await request(app)
      .put(`/api/tickets/${ticket.id}/photo-requirement`)
      .set('Cookie', adminCookie)
      .send({ requiredPhotoCount: 5 })
    expect(afterSubmission.status).toBe(409)
    expect(afterSubmission.body.error.code).toBe('TICKET_INVALID_TRANSITION')
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
        requiredPhotoCount: 2,
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
        .send({
          technicianId: replacement.id,
          requiredPhotoCount: ticket.requiredPhotoCount,
        })
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
      if (ticket.requiredPhotoCount === 2) {
        expect(repaired.body.ticket).toMatchObject({
          requiredPhotoCount: 2,
        })
        expect(repaired.body.ticket.events.at(-1)).toMatchObject({
          type: 'reassigned',
          previousRequiredPhotoCount: null,
          requiredPhotoCount: null,
        })
        const persisted = await request(app)
          .get(`/api/tickets/${ticket.id}`)
          .set('Cookie', session)
        expect(persisted.status).toBe(200)
        expect(persisted.body.ticket.requiredPhotoCount).toBe(2)
      }
    }
  })

  it('blocks requirement changes through terminal assignment repair', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      mustChangePassword: false,
    })
    const inactive = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      active: false,
      mustChangePassword: false,
    })
    const replacement = await createUserFixture({
      societyId: society._id,
      role: 'technician',
      mustChangePassword: false,
    })
    const ticket = await createTicketFixture({
      societyId: society._id,
      unitId: unit._id,
      reporterId: admin._id,
      status: 'completed',
      assigneeId: inactive._id,
      requiredPhotoCount: 2,
    })
    const app = createApp()
    const session = await login(app, admin.email)

    const blocked = await request(app)
      .put(`/api/tickets/${ticket.id}/assignment`)
      .set('Cookie', session)
      .send({ technicianId: replacement.id, requiredPhotoCount: 3 })

    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('TICKET_INVALID_TRANSITION')
    await expect(TicketModel.findById(ticket._id)).resolves.toMatchObject({
      requiredPhotoCount: 2,
      assigneeId: inactive._id,
    })
  })

  it.each(['disabled', 'demoted', 'non-Technician'] as const)(
    'rejects later requirement changes for %s assignees',
    async (label) => {
      const society = await createSocietyFixture()
      const unit = await createUnitFixture({ societyId: society._id })
      const admin = await createUserFixture({
        societyId: society._id,
        role: 'admin',
        mustChangePassword: false,
      })
      const assignee = await createUserFixture({
        societyId: society._id,
        role: 'technician',
        mustChangePassword: false,
      })
      if (label === 'demoted') {
        await UserModel.updateOne(
          { _id: assignee._id },
          { $set: { role: 'resident', unitId: unit._id } },
        )
      } else if (label === 'non-Technician') {
        await UserModel.updateOne(
          { _id: assignee._id },
          { $set: { role: 'admin', unitId: null } },
        )
      } else {
        await UserModel.updateOne(
          { _id: assignee._id },
          { $set: { active: false } },
        )
      }
      const ticket = await createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status: 'in_progress',
        assigneeId: assignee._id,
        requiredPhotoCount: 1,
      })
      const app = createApp()
      const session = await login(app, admin.email)

      const response = await request(app)
        .put(`/api/tickets/${ticket.id}/photo-requirement`)
        .set('Cookie', session)
        .send({ requiredPhotoCount: 2 })

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('TICKET_INVALID_TRANSITION')
    },
  )

  it('rejects terminal requirement updates through the dedicated route', async () => {
    for (const status of ['completed', 'cancelled'] as const) {
      const society = await createSocietyFixture()
      const unit = await createUnitFixture({ societyId: society._id })
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
      const ticket = await createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status,
        assigneeId: technician._id,
        requiredPhotoCount: 1,
      })
      const app = createApp()
      const session = await login(app, admin.email)

      const response = await request(app)
        .put(`/api/tickets/${ticket.id}/photo-requirement`)
        .set('Cookie', session)
        .send({ requiredPhotoCount: 2 })

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('TICKET_INVALID_TRANSITION')
    }
  })

  it('seals the exact active evidence set atomically and exposes provider-safe detail fields', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
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
    const ticket = await createTicketFixture({
      societyId: society._id,
      unitId: unit._id,
      reporterId: admin._id,
      status: 'in_progress',
      assigneeId: technician._id,
      requiredPhotoCount: 2,
    })
    const app = createApp({ imageStorage: new FakeImageStorage() })
    const technicianCookie = await login(app, technician.email)

    const rejected = await request(app)
      .post(`/api/tickets/${ticket.id}/submit`)
      .set('Cookie', technicianCookie)
      .send({ completionSummary: 'Completed repair and tested operation.' })
    expect(rejected.status).toBe(409)
    expect(rejected.body.error.code).toBe('EVIDENCE_REQUIREMENT_UNMET')

    const storage = new FakeImageStorage()
    const uploadApp = createApp({ imageStorage: storage })
    const uploadCookie = await login(uploadApp, technician.email)
    const uploaded = await request(uploadApp)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', uploadCookie)
      .attach('photos', await createTestImage('png'), {
        filename: 'first.png',
        contentType: 'image/png',
      })
      .attach('photos', await createTestImage('webp'), {
        filename: 'second.webp',
        contentType: 'image/webp',
      })
      .expect(201)
    const activeIds = uploaded.body.evidence.map(
      (evidence: { id: string }) => evidence.id,
    )

    const activeDetail = await request(uploadApp)
      .get(`/api/tickets/${ticket.id}`)
      .set('Cookie', uploadCookie)
      .expect(200)
    expect(activeDetail.body.ticket.activeEvidence).toHaveLength(2)
    expect(activeDetail.body.ticket.activeEvidence).not.toContainEqual(
      expect.objectContaining({
        provider: expect.anything(),
        publicId: expect.anything(),
      }),
    )
    const hiddenActiveDetail = await request(uploadApp)
      .get(`/api/tickets/${ticket.id}`)
      .set('Cookie', await login(uploadApp, admin.email))
      .expect(200)
    expect(hiddenActiveDetail.body.ticket.activeEvidence).toEqual([])

    const submitted = await request(uploadApp)
      .post(`/api/tickets/${ticket.id}/submit`)
      .set('Cookie', uploadCookie)
      .send({ completionSummary: 'Completed repair and tested operation.' })
      .expect(200)
    expect(submitted.body.ticket.events.at(-1)).toMatchObject({
      type: 'submitted_for_verification',
      evidenceSetNumber: 1,
    })
    expect(submitted.body.ticket.evidenceAttempts[0]).toMatchObject({
      setNumber: 1,
      outcome: 'awaiting_verification',
      photos: [
        { id: activeIds[0], displayOrder: 1, state: 'sealed' },
        { id: activeIds[1], displayOrder: 2, state: 'sealed' },
      ],
    })
    expect(
      submitted.body.ticket.evidenceAttempts[0].photos[0],
    ).not.toHaveProperty('assetId')
    expect(
      submitted.body.ticket.evidenceAttempts[0].photos[0],
    ).not.toHaveProperty('publicId')

    await expect(
      TicketEvidenceModel.find({
        societyId: society._id,
        ticketId: ticket._id,
      }).sort({ displayOrder: 1 }),
    ).resolves.toMatchObject([
      { state: 'sealed', evidenceSetNumber: 1, displayOrder: 1 },
      { state: 'sealed', evidenceSetNumber: 1, displayOrder: 2 },
    ])
  })

  it('preserves a returned evidence set and allocates a second set', async () => {
    const society = await createSocietyFixture()
    const unit = await createUnitFixture({ societyId: society._id })
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
    const ticket = await createTicketFixture({
      societyId: society._id,
      unitId: unit._id,
      reporterId: admin._id,
      status: 'in_progress',
      assigneeId: technician._id,
      requiredPhotoCount: 1,
    })
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const technicianCookie = await login(app, technician.email)
    const adminCookie = await login(app, admin.email)

    const firstUpload = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', technicianCookie)
      .attach('photos', await createTestImage('png'), {
        filename: 'first.png',
        contentType: 'image/png',
      })
      .expect(201)
    const firstId = firstUpload.body.evidence[0].id
    await request(app)
      .post(`/api/tickets/${ticket.id}/submit`)
      .set('Cookie', technicianCookie)
      .send({ completionSummary: 'First completion attempt.' })
      .expect(200)
    const firstSealed = await TicketEvidenceModel.findById(firstId).lean()

    await request(app)
      .post(`/api/tickets/${ticket.id}/return`)
      .set('Cookie', adminCookie)
      .send({ reason: 'Add a clearer completion photo.' })
      .expect(200)

    const secondUpload = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', technicianCookie)
      .attach('photos', await createTestImage('webp'), {
        filename: 'second.webp',
        contentType: 'image/webp',
      })
      .expect(201)
    const secondId = secondUpload.body.evidence[0].id
    const second = await request(app)
      .post(`/api/tickets/${ticket.id}/submit`)
      .set('Cookie', technicianCookie)
      .send({ completionSummary: 'Second completion attempt.' })
      .expect(200)

    expect(second.body.ticket.evidenceAttempts).toMatchObject([
      {
        setNumber: 1,
        outcome: 'returned',
        photos: [{ id: firstId, state: 'sealed', displayOrder: 1 }],
      },
      {
        setNumber: 2,
        outcome: 'awaiting_verification',
        photos: [{ id: secondId, state: 'sealed', displayOrder: 1 }],
      },
    ])
    await expect(
      TicketEvidenceModel.findById(firstId).lean(),
    ).resolves.toMatchObject({
      state: firstSealed?.state,
      evidenceSetNumber: firstSealed?.evidenceSetNumber,
      displayOrder: firstSealed?.displayOrder,
      sealedAt: firstSealed?.sealedAt,
    })
  })

  it('allows only one concurrent submission to seal a Ticket', async () => {
    const { ticket, technician } = await (async () => {
      const society = await createSocietyFixture()
      const unit = await createUnitFixture({ societyId: society._id })
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
      const ticket = await createTicketFixture({
        societyId: society._id,
        unitId: unit._id,
        reporterId: admin._id,
        status: 'in_progress',
        assigneeId: technician._id,
      })
      return { ticket, technician }
    })()
    const app = createApp()
    const technicianCookie = await login(app, technician.email)
    const submit = () =>
      request(app)
        .post(`/api/tickets/${ticket.id}/submit`)
        .set('Cookie', technicianCookie)
        .send({ completionSummary: 'Completed repair and tested operation.' })
    const responses = await Promise.all([submit(), submit()])

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ])
    const successful = responses.find((response) => response.status === 200)
    expect(successful?.body.ticket.events.at(-1)).toMatchObject({
      type: 'submitted_for_verification',
      evidenceSetNumber: 1,
    })
    expect(
      await TicketEvidenceModel.countDocuments({
        ticketId: ticket._id,
        state: 'sealed',
      }),
    ).toBe(0)
  })
})
