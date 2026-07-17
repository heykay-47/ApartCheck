import { z } from 'zod'

const unitFields = {
  building: z.string().trim().min(1),
  floor: z.string().trim().min(1),
  unitNumber: z.string().trim().min(1),
}

export const unitCreateSchema = z.object(unitFields).strict()
export const unitUpdateSchema = z.object(unitFields).strict()

export const unitListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().optional(),
  })
  .strict()

export type UnitInput = z.infer<typeof unitCreateSchema>
export type UnitList = z.infer<typeof unitListSchema>
