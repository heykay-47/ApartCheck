import { z } from 'zod'
import { userRoles } from './user.model.js'

const email = z.string().trim().toLowerCase().email()
const phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be an E.164 number.')
const role = z.enum(userRoles)

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    email,
    phone,
    role,
    unitId: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.role === 'resident' && !value.unitId) {
      context.addIssue({
        code: 'custom',
        path: ['unitId'],
        message: 'Residents require a unit.',
      })
    }
    if (value.role !== 'resident' && value.unitId) {
      context.addIssue({
        code: 'custom',
        path: ['unitId'],
        message: 'Only residents can have a unit.',
      })
    }
  })

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: email.optional(),
    phone: phone.optional(),
    role: role.optional(),
    unitId: z.string().trim().min(1).nullable().optional(),
  })
  .strict()

export const userStatusSchema = z.object({ active: z.boolean() }).strict()
// Identity fields are deliberately stripped; actor identity comes from session.
export const userSelfUpdateSchema = z.object({
  name: z.string().trim().min(1),
  phone,
})

export const userListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().optional(),
    role: role.optional(),
    active: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict()

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserListInput = z.infer<typeof userListSchema>
