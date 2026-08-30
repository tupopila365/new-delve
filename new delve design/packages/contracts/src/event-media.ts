import { z } from 'zod'
import { mediaAssetSchema } from './media.js'

export const eventMediaDtoSchema = mediaAssetSchema.extend({
  isCover: z.boolean(),
  uploadedByUserId: z.string().optional(),
  isMine: z.boolean().optional(),
})

export type EventMediaDto = z.infer<typeof eventMediaDtoSchema>
