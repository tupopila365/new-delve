import type { NextFunction, Request, Response } from 'express'
import { mediaCompleteBodySchema, mediaUploadSignatureBodySchema } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as media from './media.service.js'

function parseOrThrow<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => unknown } } },
  value: unknown,
): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', parsed.error.flatten())
  }
  return parsed.data
}

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } })
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

export function createMediaController(env: Env) {
  return {
    async uploadSignature(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(mediaUploadSignatureBodySchema, req.body)
        ok(res, await media.createUploadSignature(env, requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },

    async complete(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(mediaCompleteBodySchema, req.body)
        ok(res, await media.completeUpload(env, requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },

    async remove(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const mediaId = String(req.params.mediaId || '')
        ok(res, await media.deleteMedia(env, requireUserId(req), mediaId))
      } catch (err) {
        next(err)
      }
    },

    async webhook(req: Request, res: Response, next: NextFunction) {
      try {
        const raw =
          typeof req.body === 'string'
            ? req.body
            : Buffer.isBuffer(req.body)
              ? req.body.toString('utf8')
              : JSON.stringify(req.body ?? {})
        const timestamp = String(req.headers['x-cld-timestamp'] || '')
        const signature = String(req.headers['x-cld-signature'] || '')
        ok(res, await media.handleCloudinaryWebhook(env, raw, timestamp, signature))
      } catch (err) {
        next(err)
      }
    },

    async cleanup(_req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        // Internal/ops style — authenticated user required for now; tighten to admin later.
        ok(res, await media.cleanupMediaRecords(env))
      } catch (err) {
        next(err)
      }
    },
  }
}
