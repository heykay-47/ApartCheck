import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { TicketModel } from '../../src/features/tickets/ticket.model.js'
import { TicketEvidenceModel } from '../../src/features/ticket-evidence/ticket-evidence.model.js'
import {
  createTicketEvidenceFixture,
  createSocietyFixture,
  createTicketFixture,
  createUnitFixture,
  createUserFixture,
} from '../helpers/factories.js'
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

async function fixture(
  status = 'assigned' as
    | 'assigned'
    | 'in_progress'
    | 'awaiting_verification'
    | 'completed'
    | 'cancelled',
) {
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
  const otherTechnician = await createUserFixture({
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
    requiredPhotoCount: 0,
  })
  return { society, admin, technician, otherTechnician, ticket }
}

async function uploadOne(
  app: ReturnType<typeof createApp>,
  ticketId: string,
  session: string,
  storage: FakeImageStorage,
  format: 'jpeg' | 'png' | 'webp' = 'png',
) {
  return request(app)
    .post(`/api/tickets/${ticketId}/evidence`)
    .set('Cookie', session)
    .attach('photos', await createTestImage(format), {
      filename: `proof.${format === 'jpeg' ? 'jpg' : format}`,
      contentType: `image/${format === 'jpeg' ? 'jpeg' : format}`,
    })
    .expect(201)
    .then((response) => {
      expect(response.body.evidence).toHaveLength(1)
      expect(response.body.evidence[0]).not.toHaveProperty('provider')
      expect(response.body.evidence[0]).not.toHaveProperty('assetId')
      expect(response.body.evidence[0]).not.toHaveProperty('publicId')
      expect(storage.uploads).toHaveLength(1)
      return response
    })
}

describe('Ticket evidence APIs', () => {
  it('accepts an assigned Technician batch and returns provider-neutral metadata', async () => {
    const { ticket, technician } = await fixture('in_progress')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const session = await login(app, technician.email)

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
      .attach('photos', await createTestImage('png'), {
        filename: 'first.png',
        contentType: 'image/png',
      })
      .attach('photos', await createTestImage('webp'), {
        filename: 'second.webp',
        contentType: 'image/webp',
      })

    expect(response.status).toBe(201)
    expect(response.body.evidence).toHaveLength(2)
    expect(response.body.evidence[0]).toMatchObject({
      format: 'png',
      width: 32,
      height: 24,
      displayOrder: 1,
      state: 'active',
      evidenceSetNumber: null,
      sealedAt: null,
    })
    expect(response.body.evidence[1].displayOrder).toBe(2)
    expect(response.body.evidence[0]).not.toHaveProperty('publicId')
    expect(storage.uploads).toHaveLength(2)
  })

  it('allows only the assigned Technician to upload in the active work states', async () => {
    const { ticket, technician, otherTechnician, admin } =
      await fixture('assigned')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const [technicianSession, otherSession, adminSession] = await Promise.all([
      login(app, technician.email),
      login(app, otherTechnician.email),
      login(app, admin.email),
    ])
    const image = await createTestImage('jpeg')

    const allowed = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', technicianSession)
      .attach('photos', image, {
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
      })
    expect(allowed.status).toBe(201)

    const other = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', otherSession)
      .attach('photos', image, {
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
      })
    expect(other.status).toBe(404)
    expect(other.body.error.code).toBe('TICKET_NOT_FOUND')

    const adminResponse = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', adminSession)
      .attach('photos', image, {
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
      })
    expect(adminResponse.status).toBe(403)
    expect(adminResponse.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects a sixth active photo and an encoded file above 8 MiB', async () => {
    const { ticket, technician } = await fixture('assigned')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const session = await login(app, technician.email)
    const image = await createTestImage('png')

    const five = request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
    for (let index = 0; index < 5; index += 1) {
      five.attach('photos', image, {
        filename: `proof-${index}.png`,
        contentType: 'image/png',
      })
    }
    await five.expect(201)

    const sixth = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
      .attach('photos', image, {
        filename: 'sixth.png',
        contentType: 'image/png',
      })
    expect(sixth.status).toBe(409)
    expect(sixth.body.error.code).toBe('EVIDENCE_LIMIT_REACHED')

    const tooLarge = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
      .attach('photos', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
    expect(tooLarge.status).toBe(413)
    expect(tooLarge.body.error.code).toBe('EVIDENCE_LIMIT_EXCEEDED')
  })

  it('maps provider failures and compensates uploaded files after a metadata failure', async () => {
    const { ticket, technician } = await fixture('assigned')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const session = await login(app, technician.email)
    storage.failUpload = true

    const providerFailure = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
      .attach('photos', await createTestImage('png'), {
        filename: 'proof.png',
        contentType: 'image/png',
      })
    expect(providerFailure.status).toBe(503)
    expect(providerFailure.body.error.code).toBe('EVIDENCE_STORAGE_UNAVAILABLE')

    storage.failUpload = false
    const createSpy = vi
      .spyOn(TicketEvidenceModel, 'create')
      .mockRejectedValueOnce(new Error('metadata unavailable'))
    const metadataFailure = await request(app)
      .post(`/api/tickets/${ticket.id}/evidence`)
      .set('Cookie', session)
      .attach('photos', await createTestImage('png'), {
        filename: 'proof.png',
        contentType: 'image/png',
      })
    createSpy.mockRestore()

    expect(metadataFailure.status).toBe(503)
    expect(metadataFailure.body.error.code).toBe(
      'EVIDENCE_METADATA_UNAVAILABLE',
    )
    expect(storage.deletions).toEqual(['test/1'])
  })

  it('removes evidence with retryable provider cleanup and returns secure view URLs', async () => {
    const { ticket, technician, admin } = await fixture('assigned')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const [technicianSession, adminSession] = await Promise.all([
      login(app, technician.email),
      login(app, admin.email),
    ])
    const uploaded = await uploadOne(
      app,
      ticket.id,
      technicianSession,
      storage,
      'webp',
    )
    const evidenceId = uploaded.body.evidence[0].id

    const view = await request(app)
      .get(`/api/tickets/${ticket.id}/evidence/${evidenceId}/view`)
      .set('Cookie', adminSession)
    expect(view.status).toBe(200)
    expect(view.body).toMatchObject({
      url: `https://images.example.test/test/1`,
      expiresAt: '2026-08-18T00:05:00.000Z',
    })
    expect(Object.keys(view.body)).toEqual(['url', 'expiresAt'])

    storage.failDelete = true
    const failedRemoval = await request(app)
      .delete(`/api/tickets/${ticket.id}/evidence/${evidenceId}`)
      .set('Cookie', technicianSession)
    expect(failedRemoval.status).toBe(503)
    expect(failedRemoval.body.error.code).toBe('EVIDENCE_STORAGE_UNAVAILABLE')

    storage.failDelete = false
    const removed = await request(app)
      .delete(`/api/tickets/${ticket.id}/evidence/${evidenceId}`)
      .set('Cookie', technicianSession)
    expect(removed.status).toBe(204)
    expect(storage.deletions).toEqual(['test/1'])

    const hidden = await request(app)
      .get(`/api/tickets/${ticket.id}/evidence/${evidenceId}/view`)
      .set('Cookie', adminSession)
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.code).toBe('EVIDENCE_NOT_FOUND')
  })

  it('rejects removal outside the assigned and in-progress status window', async () => {
    for (const status of [
      'awaiting_verification',
      'completed',
      'cancelled',
    ] as const) {
      const { society, ticket, technician } = await fixture('assigned')
      await TicketModel.updateOne({ _id: ticket._id }, { $set: { status } })
      const evidence = await createTicketEvidenceFixture({
        societyId: society._id,
        ticketId: ticket._id,
        uploaderId: technician._id,
      })
      const storage = new FakeImageStorage()
      const app = createApp({ imageStorage: storage })
      const session = await login(app, technician.email)

      const response = await request(app)
        .delete(`/api/tickets/${ticket.id}/evidence/${evidence.id}`)
        .set('Cookie', session)

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('TICKET_INVALID_TRANSITION')
      expect(storage.deletions).toEqual([])
      await expect(
        TicketEvidenceModel.findById(evidence._id),
      ).resolves.toMatchObject({
        state: 'active',
        removedAt: null,
      })
    }
  })

  it('serializes concurrent persistence at the five-photo cap', async () => {
    const { society, ticket, technician } = await fixture('assigned')
    await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createTicketEvidenceFixture({
          societyId: society._id,
          ticketId: ticket._id,
          uploaderId: technician._id,
          publicId: `test/existing/${index + 1}`,
          displayOrder: index + 1,
        }),
      ),
    )
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const session = await login(app, technician.email)
    const image = await createTestImage('png')
    const upload = () =>
      request(app)
        .post(`/api/tickets/${ticket.id}/evidence`)
        .set('Cookie', session)
        .attach('photos', image, {
          filename: 'concurrent.png',
          contentType: 'image/png',
        })

    const responses = await Promise.all([upload(), upload()])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ])
    expect(
      await TicketEvidenceModel.countDocuments({
        societyId: society._id,
        ticketId: ticket._id,
        state: 'active',
      }),
    ).toBe(5)
    expect(storage.deletions).toHaveLength(1)
    expect(
      responses.find((response) => response.status === 409)?.body.error.code,
    ).toBe('EVIDENCE_LIMIT_REACHED')
  })

  it('allocates the next display order above removed evidence', async () => {
    const { ticket, technician } = await fixture('assigned')
    const storage = new FakeImageStorage()
    const app = createApp({ imageStorage: storage })
    const session = await login(app, technician.email)
    const image = await createTestImage('png')
    const upload = () =>
      request(app)
        .post(`/api/tickets/${ticket.id}/evidence`)
        .set('Cookie', session)
        .attach('photos', image, {
          filename: 'ordered.png',
          contentType: 'image/png',
        })

    const first = await upload()
    const second = await upload()
    await request(app)
      .delete(`/api/tickets/${ticket.id}/evidence/${first.body.evidence[0].id}`)
      .set('Cookie', session)
      .expect(204)
    const third = await upload()

    expect(second.body.evidence[0].displayOrder).toBe(2)
    expect(third.body.evidence[0].displayOrder).toBe(3)
  })
})
