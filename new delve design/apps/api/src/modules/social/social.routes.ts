import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth, optionalAuth } from '../../middleware/require-auth.js'
import { createSocialController } from './social.controller.js'

export function createSocialRouter(env: Env) {
  const router = Router()
  const c = createSocialController(env)
  const auth = requireAuth(env)
  const soft = optionalAuth(env)

  router.get('/users/search', soft, (req, res, next) => void c.searchUsers(req, res, next))
  router.get('/users/:username/followers', soft, (req, res, next) => void c.listFollowers(req, res, next))
  router.get('/users/:username/following', soft, (req, res, next) => void c.listFollowing(req, res, next))
  router.get('/users/:username', soft, (req, res, next) => void c.getPublicProfile(req, res, next))
  router.get('/users/:username/posts', soft, (req, res, next) => void c.userPosts(req, res, next))
  router.get('/users/:username/events', soft, (req, res, next) => void c.userEvents(req, res, next))

  router.post('/follows/:userId', auth, (req, res, next) => void c.follow(req, res, next))
  router.delete('/follows/:userId', auth, (req, res, next) => void c.unfollow(req, res, next))

  router.post('/posts', auth, (req, res, next) => void c.createPost(req, res, next))
  router.get('/posts/me', auth, (req, res, next) => void c.myPosts(req, res, next))
  router.get('/posts/feed', soft, (req, res, next) => void c.feed(req, res, next))
  router.get('/posts/search', soft, (req, res, next) => void c.searchPosts(req, res, next))
  router.delete('/posts/:postId', auth, (req, res, next) => void c.deletePost(req, res, next))
  router.post('/posts/:postId/reactions', auth, (req, res, next) => void c.like(req, res, next))
  router.delete('/posts/:postId/reactions', auth, (req, res, next) => void c.unlike(req, res, next))
  router.get('/posts/:postId/comments', soft, (req, res, next) => void c.listComments(req, res, next))
  router.post('/posts/:postId/comments', auth, (req, res, next) => void c.addComment(req, res, next))
  router.delete('/comments/:commentId', auth, (req, res, next) => void c.deleteComment(req, res, next))

  router.post('/saves', auth, (req, res, next) => void c.save(req, res, next))
  router.delete('/saves', auth, (req, res, next) => void c.unsave(req, res, next))
  router.get('/saves', auth, (req, res, next) => void c.listSaves(req, res, next))

  router.post('/stories', auth, (req, res, next) => void c.createStory(req, res, next))
  router.get('/stories/rail', auth, (req, res, next) => void c.storyRail(req, res, next))
  router.get('/stories/:userId', auth, (req, res, next) => void c.getUserStories(req, res, next))
  router.post('/stories/:userId/view', auth, (req, res, next) => void c.viewStories(req, res, next))
  router.delete('/stories/:slideId', auth, (req, res, next) => void c.deleteStory(req, res, next))

  router.post('/events', auth, (req, res, next) => void c.createEvent(req, res, next))
  router.get('/events', soft, (req, res, next) => void c.listEvents(req, res, next))
  router.get('/events/search', soft, (req, res, next) => void c.searchEvents(req, res, next))
  router.patch('/events/:eventId', auth, (req, res, next) => void c.updateEvent(req, res, next))
  router.get('/events/:eventId/attendees', soft, (req, res, next) => void c.listEventAttendees(req, res, next))
  router.get('/events/:eventId', soft, (req, res, next) => void c.getEvent(req, res, next))
  router.post('/events/:eventId/attendance', auth, (req, res, next) => void c.setAttendance(req, res, next))
  router.delete('/events/:eventId/attendance', auth, (req, res, next) => void c.clearAttendance(req, res, next))

  router.get('/notifications', auth, (req, res, next) => void c.listNotifications(req, res, next))
  router.post('/notifications/read-all', auth, (req, res, next) => void c.readAllNotifications(req, res, next))
  router.post('/notifications/:id/read', auth, (req, res, next) => void c.readNotification(req, res, next))

  return router
}
