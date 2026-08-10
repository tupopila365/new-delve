import type { Request, Response } from 'express'
import type { ApiError } from '@delve/contracts'

export function notFoundHandler(_req: Request, res: Response) {
  const body: ApiError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    meta: { timestamp: new Date().toISOString() },
  }
  res.status(404).json(body)
}
