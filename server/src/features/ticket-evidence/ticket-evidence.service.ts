import { randomUUID } from 'node:crypto'
import mongoose, { Types } from 'mongoose'
import { AppError } from '../../http/app-error.js'
import type {
  AcceptedImageFormat,
  ImageStorage,
  StoredImage,
} from '../../storage/image-storage.js'
import { guardSocietyMutation } from '../societies/society-transaction.js'
import { findVisible } from '../tickets/ticket.service.js'
import {
  TicketEvidenceModel,
  toTicketEvidenceDto,
  type TicketEvidence,
} from './ticket-evidence.model.js'
import {
  inspectImage,
  MAX_ACTIVE_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
} from './image-validation.js'

const storageUnavailable = () =>
  new AppError(
    503,
    'EVIDENCE_STORAGE_UNAVAILABLE',
    'Evidence storage is unavailable.',
  )
const metadataUnavailable = () =>
  new AppError(
    503,
    'EVIDENCE_METADATA_UNAVAILABLE',
    'Evidence metadata could not be saved.',
  )
const evidenceNotFound = () =>
  new AppError(404, 'EVIDENCE_NOT_FOUND', 'Evidence not found.')
const forbidden = () => new AppError(403, 'FORBIDDEN', 'Forbidden.')
const invalidEvidenceState = () =>
  new AppError(
    409,
    'TICKET_INVALID_TRANSITION',
    'Ticket cannot accept evidence in its current state.',
  )

function idOf(value: unknown): string {
  if (value instanceof Types.ObjectId) return value.toString()
  if (typeof value === 'string') return value
  return ''
}

async function compensate(storage: ImageStorage, publicIds: string[]) {
  await Promise.allSettled(
    publicIds.map((publicId) => storage.deleteImage(publicId)),
  )
}

async function assignedTicket(actor: Express.Actor, ticketId: string) {
  const ticket = await findVisible(actor, ticketId)
  if (actor.role !== 'technician' || idOf(ticket.assigneeId) !== actor.userId)
    throw forbidden()
  return ticket
}

function assertEvidenceStatus(status: string) {
  if (!['assigned', 'in_progress'].includes(status))
    throw invalidEvidenceState()
}

export class TicketEvidenceService {
  constructor(private readonly storage: ImageStorage) {}

  async upload(actor: Express.Actor, ticketId: string, files: Buffer[]) {
    const ticket = await assignedTicket(actor, ticketId)
    assertEvidenceStatus(ticket.status)
    if (files.length === 0)
      throw new AppError(
        400,
        'EVIDENCE_PHOTOS_REQUIRED',
        'Add at least one photo.',
      )
    if (files.length > MAX_ACTIVE_PHOTOS)
      throw new AppError(
        413,
        'EVIDENCE_LIMIT_EXCEEDED',
        'Add no more than five photos.',
      )

    const totalBytes = files.reduce((total, file) => total + file.byteLength, 0)
    if (totalBytes > MAX_TOTAL_PHOTO_BYTES)
      throw new AppError(
        413,
        'EVIDENCE_LIMIT_EXCEEDED',
        'Photos exceed 40 MiB.',
      )

    const inspected = await Promise.all(files.map((file) => inspectImage(file)))
    const publicIds = inspected.map(
      (_file, index) =>
        `tickets/${actor.societyId}/${ticket._id}/${randomUUID()}-${index}`,
    )
    const uploaded: StoredImage[] = []

    try {
      for (const [index, image] of inspected.entries()) {
        uploaded.push(
          await this.storage.uploadImage({
            bytes: image.bytes,
            format: image.format,
            width: image.width,
            height: image.height,
            publicId: publicIds[index] ?? '',
          }),
        )
      }
    } catch {
      await compensate(
        this.storage,
        uploaded.map((image) => image.publicId),
      )
      throw storageUnavailable()
    }

    let committedIds: Types.ObjectId[]
    try {
      committedIds = await mongoose.connection.transaction(async (session) => {
        await guardSocietyMutation(actor.societyId, session)
        const currentTicket = await findVisible(actor, ticketId, session)
        assertEvidenceStatus(currentTicket.status)

        const activeCount = await TicketEvidenceModel.countDocuments({
          societyId: actor.societyId,
          ticketId: currentTicket._id,
          state: 'active',
        }).session(session)
        if (activeCount + uploaded.length > MAX_ACTIVE_PHOTOS)
          throw new AppError(
            409,
            'EVIDENCE_LIMIT_REACHED',
            'A Ticket can have no more than five active photos.',
          )

        const latest = await TicketEvidenceModel.findOne({
          societyId: actor.societyId,
          ticketId: currentTicket._id,
          displayOrder: { $ne: null },
        })
          .sort({ displayOrder: -1, _id: -1 })
          .session(session)
        const displayOrderStart = (latest?.displayOrder ?? 0) + 1
        const documents = await TicketEvidenceModel.create(
          uploaded.map((image, index) => ({
            societyId: actor.societyId,
            ticketId: currentTicket._id,
            uploaderId: actor.userId,
            provider: image.provider,
            assetId: image.assetId,
            publicId: image.publicId,
            format: image.format,
            byteSize: image.byteSize,
            width: image.width,
            height: image.height,
            displayOrder: displayOrderStart + index,
            state: 'active' as const,
            evidenceSetNumber: null,
            sealedAt: null,
            removedAt: null,
          })),
          { session, ordered: true },
        )
        return documents.map((document) => document._id)
      })
    } catch (error) {
      await compensate(
        this.storage,
        uploaded.map((image) => image.publicId),
      )
      if (error instanceof AppError) throw error
      throw metadataUnavailable()
    }

    let committed: TicketEvidence[]
    try {
      committed = await TicketEvidenceModel.find({
        societyId: actor.societyId,
        ticketId: ticket._id,
        _id: { $in: committedIds },
      }).sort({ displayOrder: 1, _id: 1 })
    } catch {
      throw metadataUnavailable()
    }
    if (committed.length !== committedIds.length) throw metadataUnavailable()

    return committed.map(toTicketEvidenceDto)
  }

  async remove(actor: Express.Actor, ticketId: string, evidenceId: string) {
    const ticket = await assignedTicket(actor, ticketId)
    assertEvidenceStatus(ticket.status)
    if (!Types.ObjectId.isValid(evidenceId)) throw evidenceNotFound()

    let evidence = await TicketEvidenceModel.findOneAndUpdate(
      {
        societyId: actor.societyId,
        ticketId: ticket._id,
        _id: evidenceId,
        state: 'active',
        removedAt: null,
      },
      { $set: { state: 'pending_cleanup' } },
      { returnDocument: 'after' },
    )
    if (!evidence) {
      evidence = await TicketEvidenceModel.findOne({
        societyId: actor.societyId,
        ticketId: ticket._id,
        _id: evidenceId,
        state: 'pending_cleanup',
        removedAt: null,
      })
    }
    if (!evidence) throw evidenceNotFound()

    try {
      await this.storage.deleteImage(evidence.publicId)
    } catch {
      throw storageUnavailable()
    }

    try {
      const result = await TicketEvidenceModel.updateOne(
        {
          societyId: actor.societyId,
          ticketId: ticket._id,
          _id: evidence._id,
          state: 'pending_cleanup',
        },
        { $set: { removedAt: new Date() } },
      )
      if (result.matchedCount !== 1 || result.modifiedCount !== 1)
        throw new Error('Evidence cleanup metadata was not finalized.')
    } catch {
      throw metadataUnavailable()
    }
  }

  async view(
    actor: Express.Actor,
    ticketId: string,
    evidenceId: string,
  ): Promise<{ bytes: Buffer; format: AcceptedImageFormat }> {
    const ticket = await findVisible(actor, ticketId)
    if (!Types.ObjectId.isValid(evidenceId)) throw evidenceNotFound()
    const evidence = await TicketEvidenceModel.findOne({
      societyId: actor.societyId,
      ticketId: ticket._id,
      _id: evidenceId,
      state: { $in: ['active', 'sealed'] },
      removedAt: null,
    })
    if (!evidence) throw evidenceNotFound()

    try {
      return {
        bytes: await this.storage.readImage(evidence.publicId),
        format: evidence.format,
      }
    } catch {
      throw storageUnavailable()
    }
  }
}

export function createTicketEvidenceService(storage: ImageStorage) {
  return new TicketEvidenceService(storage)
}
