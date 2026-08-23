import 'dotenv/config'

import { z } from 'zod'

const optionalString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().min(1).optional(),
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
})

export const env = environmentSchema.parse(process.env)

export type Environment = z.infer<typeof environmentSchema>

export function cloudinaryConfig() {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  )
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required.',
    )

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  }
}
