import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import { createConversationBodySchema, sendMessageBodySchema, typingBodySchema } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as messageService from './message.service.js'
import { subscribeMessageStream } from './message-events.js'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data })
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid request')
  }
  return parsed.data
}

function requireUserId(req: AuthedRequest) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  return req.userId
}

const muteBodySchema = z.object({ muted: z.boolean() }).strict()

export function createMessageController() {
  return {
    async list(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const archived = req.query.archived === 'true'
        ok(res, await messageService.listConversations(requireUserId(req), archived))
      } catch (err) {
        next(err)
      }
    },

    async create(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createConversationBodySchema, req.body)
        const userId = requireUserId(req)
        if (body.journeyId) {
          ok(res, await messageService.getOrCreateJourneyConversation(userId, body.journeyId), 201)
        } else {
          ok(
            res,
            await messageService.getOrCreateDirectConversation(userId, body.participantUserId!),
            201,
          )
        }
      } catch (err) {
        next(err)
      }
    },

    async messages(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const after = typeof req.query.after === 'string' ? req.query.after : undefined
        ok(
          res,
          await messageService.listMessages(
            requireUserId(req),
            String(req.params.conversationId),
            after,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async send(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(sendMessageBodySchema, req.body)
        ok(
          res,
          await messageService.sendMessage(
            requireUserId(req),
            String(req.params.conversationId),
            body,
          ),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async typing(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(typingBodySchema, req.body)
        ok(
          res,
          await messageService.setTyping(
            requireUserId(req),
            String(req.params.conversationId),
            body.typing,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async journeyConversation(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.getOrCreateJourneyConversation(
            requireUserId(req),
            String(req.params.journeyId),
          ),
          201,
        )
      } catch (err) {
        next(err)
      }
    },

    async accept(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.acceptConversationRequest(
            requireUserId(req),
            String(req.params.conversationId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async decline(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.declineConversationRequest(
            requireUserId(req),
            String(req.params.conversationId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async read(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.markConversationRead(
            requireUserId(req),
            String(req.params.conversationId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async archive(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.archiveConversation(
            requireUserId(req),
            String(req.params.conversationId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async unarchive(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(
          res,
          await messageService.unarchiveConversation(
            requireUserId(req),
            String(req.params.conversationId),
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async mute(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(muteBodySchema, req.body)
        ok(
          res,
          await messageService.setConversationMuted(
            requireUserId(req),
            String(req.params.conversationId),
            body.muted,
          ),
        )
      } catch (err) {
        next(err)
      }
    },

    async block(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await messageService.blockUser(requireUserId(req), String(req.params.userId)), 201)
      } catch (err) {
        next(err)
      }
    },

    async unblock(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await messageService.unblockUser(requireUserId(req), String(req.params.userId)))
      } catch (err) {
        next(err)
      }
    },

    async blocks(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await messageService.listBlockedUsers(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async stream(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const userId = requireUserId(req)
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        const send = (event: string, data: unknown) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }

        const unsubscribe = subscribeMessageStream(userId, evt => {
          send(evt.type, evt.data)
        })

        send('ready', { ok: true })

        const heartbeat = setInterval(() => {
          res.write(': heartbeat\n\n')
        }, 25_000)

        req.on('close', () => {
          clearInterval(heartbeat)
          unsubscribe()
        })
      } catch (err) {
        next(err)
      }
    },
  }
}
