import { z } from 'zod'
import { apiSuccessSchema } from './api.js'

export const healthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy'])

export const healthPayloadSchema = z.object({
  service: z.literal('delve-api'),
  version: z.literal('2'),
  status: healthStatusSchema,
  database: z
    .object({
      status: z.enum(['connected', 'disconnected', 'unknown']),
      message: z.string().optional(),
    })
    .optional(),
})

/** Wire response used by GET /api/v2/health (flat success envelope for this checkpoint). */
export const healthResponseSchema = z.object({
  success: z.literal(true),
  service: z.literal('delve-api'),
  version: z.literal('2'),
  status: healthStatusSchema,
})

export const healthSuccessEnvelopeSchema = apiSuccessSchema(healthPayloadSchema)

export type HealthStatus = z.infer<typeof healthStatusSchema>
export type HealthPayload = z.infer<typeof healthPayloadSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
