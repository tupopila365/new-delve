import { z } from 'zod'
import { mediaAssetSchema } from './media.js'

export const eventMediaUploaderSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type EventMediaUploader = z.infer<typeof eventMediaUploaderSchema>

export const eventMediaDtoSchema = mediaAssetSchema.extend({
  isCover: z.boolean(),
  uploadedByUserId: z.string().optional(),
  isMine: z.boolean().optional(),
  uploadedBy: eventMediaUploaderSchema.optional(),
})

export type EventMediaDto = z.infer<typeof eventMediaDtoSchema>
