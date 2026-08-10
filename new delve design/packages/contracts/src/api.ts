import { z } from 'zod'

export const apiMetaSchema = z
  .object({
    requestId: z.string().optional(),
    timestamp: z.string().datetime().optional(),
  })
  .optional()

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: apiMetaSchema,
  })

export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: apiErrorBodySchema,
  meta: apiMetaSchema,
})

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: {
    requestId?: string
    timestamp?: string
  }
}

export type ApiError = z.infer<typeof apiErrorSchema>
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
