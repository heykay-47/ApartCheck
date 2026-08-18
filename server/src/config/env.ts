import 'dotenv/config'

import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url(),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_AUTH_TOKEN_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]+$/, 'Must be a hex-encoded auth-token key')
    .optional(),
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
