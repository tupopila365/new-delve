import { z } from 'zod'
import { mediaAssetSchema } from './media.js'

export const eventMediaDtoSchema = mediaAssetSchema.extend({
  isCover: z.boolean(),
})

export type EventMediaDto = z.infer<typeof eventMediaDtoSchema>
