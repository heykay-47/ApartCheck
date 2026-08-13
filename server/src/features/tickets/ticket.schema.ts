import { z } from 'zod'
import { ticketStatuses } from './ticket.model.js'

const id = z.string().trim().min(1)
const reason = z.string().trim().min(3).max(1000)

export const ticketCreateSchema = z
  .object({
    unitId: id,
    assetId: id.nullable().optional(),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(2000),
  })
  .strict()

export const ticketListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    status: z.enum(ticketStatuses).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict()

export const ticketAssignmentSchema = z.object({ technicianId: id }).strict()
export const ticketStartWorkSchema = z.object({}).strict()
export const ticketSubmitSchema = z
  .object({ completionSummary: z.string().trim().min(10).max(2000) })
  .strict()
export const ticketReturnSchema = z.object({ reason }).strict()
export const ticketReopenSchema = z.object({ reason }).strict()
export const ticketCancelSchema = z.object({ reason }).strict()

export const eligibleTechnicianSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().max(120).optional(),
  })
  .strict()

export const assetTicketListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
  })
  .strict()

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>
export type TicketListInput = z.infer<typeof ticketListSchema>
export type TicketAssignmentInput = z.infer<typeof ticketAssignmentSchema>
export type TicketSubmitInput = z.infer<typeof ticketSubmitSchema>
export type TicketReturnInput = z.infer<typeof ticketReturnSchema>
export type TicketReopenInput = z.infer<typeof ticketReopenSchema>
export type TicketCancelInput = z.infer<typeof ticketCancelSchema>
export type EligibleTechnicianInput = z.infer<typeof eligibleTechnicianSchema>
export type AssetTicketListInput = z.infer<typeof assetTicketListSchema>
