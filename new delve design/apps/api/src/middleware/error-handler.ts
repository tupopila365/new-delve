import type { NextFunction, Request, Response } from 'express'
import type { ApiError } from '@delve/contracts'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: { timestamp: new Date().toISOString() },
    }
    res.status(err.statusCode).json(body)
    return
  }

  if (err instanceof Error && err.message.startsWith('Origin not allowed by CORS')) {
    const body: ApiError = {
      success: false,
      error: { code: 'CORS_DENIED', message: err.message },
      meta: { timestamp: new Date().toISOString() },
    }
    res.status(403).json(body)
    return
  }

  console.error('[api] unhandled error', err)
  const body: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    meta: { timestamp: new Date().toISOString() },
  }
  res.status(500).json(body)
}
