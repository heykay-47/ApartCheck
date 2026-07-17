import { z } from 'zod'

const passwordSchema = z.string().refine((value) => {
  const bytes = Buffer.byteLength(value, 'utf8')
  return bytes >= 12 && bytes <= 72
}, 'Password must be between 12 and 72 UTF-8 bytes.')

export const bootstrapSchema = z.strictObject({
  society: z.strictObject({
    name: z.string().trim().min(1),
    address: z.string().trim().min(1),
  }),
  admin: z.strictObject({
    name: z.string().trim().min(1),
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/),
    password: passwordSchema,
  }),
})

export type BootstrapInput = z.infer<typeof bootstrapSchema>
