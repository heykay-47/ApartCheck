import { z } from 'zod'

export const societyUpdateSchema = z
  .object({
    name: z.string().trim().min(1),
    address: z.string().trim().min(1),
  })
  .strict()

export type SocietyUpdate = z.infer<typeof societyUpdateSchema>
