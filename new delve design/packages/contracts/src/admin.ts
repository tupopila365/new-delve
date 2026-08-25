import { z } from 'zod'
import {
  GENERIC_AUTH_FAILURE_MESSAGE,
  loginBodySchema,
  normalizeEmail,
  normalizeUsername,
} from './auth.js'

/** Admin login uses the same identifier+password shape as traveler login. */
export const adminLoginBodySchema = loginBodySchema

export const ADMIN_GENERIC_AUTH_FAILURE_MESSAGE = GENERIC_AUTH_FAILURE_MESSAGE

export const adminAuditActionSchema = z.enum([
  'ADMIN_BOOTSTRAPPED',
  'ADMIN_LOGIN_SUCCEEDED',
  'ADMIN_LOGIN_FAILED',
  'ADMIN_LOGOUT',
  'ADMIN_LOGOUT_ALL',
  'ADMIN_SESSION_REVOKED',
  'ADMIN_ACCESS_DENIED',
  'ADMIN_ROLE_GRANTED',
  'ADMIN_ROLE_REMOVED',
  'ADMIN_ACCOUNT_SUSPENDED',
  'ADMIN_PASSWORD_CHANGED',
  'DEAL_APPROVED',
  'DEAL_REJECTED',
  'DEAL_ARCHIVED',
  'DEAL_FEATURED',
  'DEAL_REPORT_RESOLVED',
  'DEAL_CLAIM_REDEEMED',
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'PAYMENT_PAID',
  'PAYMENT_FAILED',
  'STRIPE_CONNECT_ONBOARDED',
  'SETTLEMENT_RELEASED',
  'SETTLEMENT_FAILED',
  'PAYABLE_CANCELLED_FOR_REFUND',
  'CANCELLATION_REQUESTED',
  'CANCELLATION_APPROVED',
  'CANCELLATION_REJECTED',
  'REFUND_CREATED',
  'REFUND_PROCESSING',
  'REFUND_SUCCEEDED',
  'REFUND_FAILED',
  'TRANSFER_REVERSAL_CREATED',
  'TRANSFER_REVERSAL_PROCESSING',
  'TRANSFER_REVERSAL_SUCCEEDED',
  'TRANSFER_REVERSAL_FAILED',
  'REFUND_CONTINUED_AFTER_REVERSAL',
])

export const adminAuthErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'ADMIN_FORBIDDEN',
  'SESSION_REVOKED',
  'SESSION_EXPIRED',
  'SESSION_IDLE',
  'INVALID_CREDENTIALS',
  'RATE_LIMITED',
  'VALIDATION_ERROR',
])

export const safeAdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string().nullable(),
  role: z.literal('admin'),
  emailVerified: z.literal(true),
})

export const adminSessionInfoSchema = z.object({
  expiresAt: z.string().datetime(),
  idleTimeoutMinutes: z.number().int().positive(),
})

export const adminMeDataSchema = z.object({
  user: safeAdminUserSchema,
  session: adminSessionInfoSchema,
  /** Placeholder for future granular permissions. */
  permissions: z.array(z.string()).default([]),
  csrfToken: z.string().min(1).optional(),
})

export const adminLoginSuccessSchema = z.object({
  user: safeAdminUserSchema,
  session: adminSessionInfoSchema,
  csrfToken: z.string().min(1),
})

export const adminLogoutResponseSchema = z.object({
  message: z.string(),
})

export const adminUnauthorizedSchema = z.object({
  code: z.literal('UNAUTHORIZED'),
  message: z.string(),
})

export const adminForbiddenSchema = z.object({
  code: z.literal('ADMIN_FORBIDDEN'),
  message: z.string(),
})

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>
export type AdminAuditAction = z.infer<typeof adminAuditActionSchema>
export type SafeAdminUser = z.infer<typeof safeAdminUserSchema>
export type AdminMeData = z.infer<typeof adminMeDataSchema>
export type AdminLoginSuccess = z.infer<typeof adminLoginSuccessSchema>

export { normalizeEmail, normalizeUsername }
