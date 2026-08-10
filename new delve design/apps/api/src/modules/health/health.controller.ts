import type { Request, Response } from 'express'
import type { HealthResponse } from '@delve/contracts'
import { healthResponseSchema } from '@delve/contracts'

export function getHealth(_req: Request, res: Response) {
  const payload: HealthResponse = {
    success: true,
    service: 'delve-api',
    version: '2',
    status: 'healthy',
  }

  const parsed = healthResponseSchema.parse(payload)
  res.status(200).json(parsed)
}
