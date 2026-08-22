import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { createAuthController } from './auth.controller.js'
import { createAccountController } from '../account/account.controller.js'

export function createAuthRouter(env: Env) {
  const router = Router()
  const controller = createAuthController(env)
  const account = createAccountController(env)
  const auth = requireAuth(env)

  router.post('/register', (req, res, next) => void controller.register(req, res, next))
  router.get('/username-availability', (req, res, next) => void controller.usernameAvailability(req, res, next))
  router.post('/resend-verification', (req, res, next) => void controller.resendVerification(req, res, next))
  router.get('/verify-email', (req, res, next) => void controller.verifyEmail(req, res, next))
  router.post('/verify-email', (req, res, next) => void controller.verifyEmail(req, res, next))
  router.post('/login', (req, res, next) => void controller.login(req, res, next))
  router.post('/refresh', (req, res, next) => void controller.refresh(req, res, next))
  router.post('/logout', (req, res, next) => void controller.logout(req, res, next))
  router.post('/logout-all', auth, (req, res, next) => void account.logoutAll(req, res, next))
  router.post('/logout-others', auth, (req, res, next) => void account.logoutOthers(req, res, next))
  router.post('/forgot-password', (req, res, next) => void controller.forgotPassword(req, res, next))
  router.post('/reset-password', (req, res, next) => void controller.resetPassword(req, res, next))
  router.get('/reset-password', (req, res, next) => void controller.inspectResetToken(req, res, next))

  return router
}

export function createUsersRouter(env: Env) {
  const router = Router()
  const controller = createAuthController(env)
  const account = createAccountController(env)
  const auth = requireAuth(env)

  router.get('/me/username', auth, (req, res, next) => void controller.usernameChangeStatus(req, res, next))
  router.patch('/me/username', auth, (req, res, next) => void controller.changeUsername(req, res, next))

  router.get('/me/onboarding', auth, (req, res, next) => void account.getOnboarding(req, res, next))
  router.patch('/me/onboarding', auth, (req, res, next) => void account.patchOnboarding(req, res, next))
  router.post('/me/onboarding/complete', auth, (req, res, next) => void account.completeOnboarding(req, res, next))

  router.get('/me/profile', auth, (req, res, next) => void account.getProfile(req, res, next))
  router.patch('/me/profile', auth, (req, res, next) => void account.updateProfile(req, res, next))

  router.post('/me/avatar/upload-url', auth, (req, res, next) => void account.avatarUploadUrl(req, res, next))
  router.delete('/me/avatar', auth, (req, res, next) => void account.deleteAvatar(req, res, next))

  router.post('/me/email-change', auth, (req, res, next) => void account.requestEmailChange(req, res, next))
  router.post('/me/email-change/verify', (req, res, next) => void account.verifyEmailChange(req, res, next))
  router.post('/me/email-change/resend', auth, (req, res, next) => void account.resendEmailChange(req, res, next))
  router.delete('/me/email-change', auth, (req, res, next) => void account.cancelEmailChange(req, res, next))

  router.post('/me/change-password', auth, (req, res, next) => void account.changePassword(req, res, next))

  router.get('/me/sessions', auth, (req, res, next) => void account.listSessions(req, res, next))
  router.delete('/me/sessions/:sessionId', auth, (req, res, next) => void account.revokeSession(req, res, next))

  router.get('/me/preferences', auth, (req, res, next) => void account.getPreferences(req, res, next))
  router.patch('/me/preferences', auth, (req, res, next) => void account.updatePreferences(req, res, next))

  router.post('/me/deactivate', auth, (req, res, next) => void account.deactivate(req, res, next))

  return router
}
