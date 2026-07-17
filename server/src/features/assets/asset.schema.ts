import { z } from 'zod'
import { assetCategories } from './asset.model.js'

const assetFields = {
  name: z.string().trim().min(1),
  category: z.enum(assetCategories),
  locationDescription: z.string().trim().min(1),
  installDate: z.string().datetime().nullable().optional(),
}

export const assetCreateSchema = z.object(assetFields).strict()
export const assetUpdateSchema = z.object(assetFields).strict()
export const assetListSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().optional(),
    category: z.enum(assetCategories).optional(),
  })
  .strict()

export type AssetInput = z.infer<typeof assetCreateSchema>
export type AssetList = z.infer<typeof assetListSchema>
