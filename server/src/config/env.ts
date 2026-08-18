import 'dotenv/config'

import { z } from 'zod'

const optionalString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().min(1).optional(),
)
const optionalHexString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .string()
    .regex(/^[0-9a-fA-F]+$/, 'Must be a hex-encoded auth-token key')
    .optional(),
)

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url(),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_AUTH_TOKEN_KEY: optionalHexString,
})

export const env = environmentSchema.parse(process.env)

export type Environment = z.infer<typeof environmentSchema>

export function cloudinaryConfig() {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET ||
    !env.CLOUDINARY_AUTH_TOKEN_KEY
  )
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and CLOUDINARY_AUTH_TOKEN_KEY are required.',
    )

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    authTokenKey: env.CLOUDINARY_AUTH_TOKEN_KEY,
  }
}
