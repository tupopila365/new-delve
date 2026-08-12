import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  attendanceBodySchema,
  createCommentBodySchema,
  createEventBodySchema,
  createPostBodySchema,
  saveBodySchema,
  updateEventBodySchema,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import type { AuthedRequest } from '../../middleware/require-auth.js'
import * as followService from './follow.service.js'
import * as postService from './post.service.js'
import * as saveService from './save.service.js'
import * as eventService from './event.service.js'
import * as publicProfile from './profile-public.service.js'
import * as notificationService from '../notifications/notification.service.js'

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

function optionalUserId(req: Request) {
  return (req as AuthedRequest).userId || null
}

export function createSocialController(env: Env) {
  return {
    async getPublicProfile(req: Request, res: Response, next: NextFunction) {
      try {
        const username = String(req.params.username || '')
        ok(res, await publicProfile.getPublicProfileByUsername(username, optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async searchUsers(req: Request, res: Response, next: NextFunction) {
      try {
        const q = String(req.query.q || '')
        ok(res, await publicProfile.searchTravelers(q, optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async follow(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await followService.followUser(requireUserId(req), String(req.params.userId)))
      } catch (err) {
        next(err)
      }
    },

    async unfollow(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await followService.unfollowUser(requireUserId(req), String(req.params.userId)))
      } catch (err) {
        next(err)
      }
    },

    async createPost(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createPostBodySchema, req.body)
        ok(res, await postService.createPost(env, requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },

    async myPosts(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const userId = requireUserId(req)
        ok(res, await postService.listPostsForUser(env, userId, userId))
      } catch (err) {
        next(err)
      }
    },

    async feed(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.listFeed(env, requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async userPosts(req: Request, res: Response, next: NextFunction) {
      try {
        const profile = await publicProfile.getPublicProfileByUsername(String(req.params.username), optionalUserId(req))
        ok(res, await postService.listPostsForUser(env, profile.id, optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async deletePost(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.softDeletePost(requireUserId(req), String(req.params.postId)))
      } catch (err) {
        next(err)
      }
    },

    async like(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.likePost(env, requireUserId(req), String(req.params.postId)))
      } catch (err) {
        next(err)
      }
    },

    async unlike(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.unlikePost(env, requireUserId(req), String(req.params.postId)))
      } catch (err) {
        next(err)
      }
    },

    async listComments(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.listComments(String(req.params.postId)))
      } catch (err) {
        next(err)
      }
    },

    async addComment(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createCommentBodySchema, req.body)
        ok(res, await postService.addComment(requireUserId(req), String(req.params.postId), body.body), 201)
      } catch (err) {
        next(err)
      }
    },

    async deleteComment(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await postService.deleteComment(requireUserId(req), String(req.params.commentId)))
      } catch (err) {
        next(err)
      }
    },

    async save(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(saveBodySchema, req.body)
        ok(res, await saveService.saveTarget(requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },

    async unsave(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(saveBodySchema, req.body)
        ok(res, await saveService.unsaveTarget(requireUserId(req), body))
      } catch (err) {
        next(err)
      }
    },

    async listSaves(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await saveService.listSaves(env, requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async createEvent(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(createEventBodySchema, req.body)
        ok(res, await eventService.createEvent(env, requireUserId(req), body), 201)
      } catch (err) {
        next(err)
      }
    },

    async updateEvent(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(updateEventBodySchema, req.body)
        ok(res, await eventService.updateEvent(env, requireUserId(req), String(req.params.eventId), body))
      } catch (err) {
        next(err)
      }
    },

    async getEvent(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await eventService.getEventDto(env, String(req.params.eventId), optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async userEvents(req: Request, res: Response, next: NextFunction) {
      try {
        const profile = await publicProfile.getPublicProfileByUsername(String(req.params.username), optionalUserId(req))
        ok(res, await eventService.listEventsForUser(env, profile.id, optionalUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async setAttendance(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        const body = parseOrThrow(attendanceBodySchema, req.body)
        ok(res, await eventService.setAttendance(env, requireUserId(req), String(req.params.eventId), body.status))
      } catch (err) {
        next(err)
      }
    },

    async clearAttendance(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await eventService.clearAttendance(env, requireUserId(req), String(req.params.eventId)))
      } catch (err) {
        next(err)
      }
    },

    async listNotifications(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await notificationService.listNotifications(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },

    async readNotification(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await notificationService.markNotificationRead(requireUserId(req), String(req.params.id)))
      } catch (err) {
        next(err)
      }
    },

    async readAllNotifications(req: AuthedRequest, res: Response, next: NextFunction) {
      try {
        ok(res, await notificationService.markAllNotificationsRead(requireUserId(req)))
      } catch (err) {
        next(err)
      }
    },
  }
}
