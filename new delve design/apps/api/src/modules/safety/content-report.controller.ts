import type { NextFunction, Response } from 'express'
import { createContentReportBodySchema } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import { createContentReport } from './content-report.service.js'

export async function reportContent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
    const parsed = createContentReportBodySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid report', parsed.error.flatten())
    }
    const data = await createContentReport(req.userId, parsed.data)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
