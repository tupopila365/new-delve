import { prisma } from '@delve/database'
import {
  GENERIC_AUTH_FAILURE_MESSAGE,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  isEmailIdentifier,
  isReservedUsername,
  normalizeEmail,
  normalizeUsername,
  usernameSchema,
  type ChangeUsernameBody,
  type LoginBody,
  type PublicUser,
  type RegisterBody,
  type UsernameAvailabilityData,
  type VerifyEmailResult,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { sendVerificationEmail } from '../email/brevo.js'
import {
  accessTtlSeconds,
  createRawToken,
  createVerificationCode,
  hashPassword,
  hashToken,
  passwordResetExpiry,
  refreshExpiry,
  signAccessToken,
  tokensEqual,
  verificationCodeExpiry,
  verifyPassword,
} from './crypto.js'
import { rateLimit } from './rate-limit.js'
import { createSessionRecord, revokeSessionFamily } from './session.js'
import type { ApproximateGeo } from './geo.js'

async function recordSecurityEvent(userId: string, type: string, metadata?: Record<string, unknown>) {
  await prisma.securityEvent.create({
    data: {
      userId,
      type,
      metadata: metadata ? (JSON.parse(JSON.stringify(metadata)) as object) : undefined,
    },
  })
}

function toPublicUser(user: {
  id: string
  email: string
  username: string
  emailVerifiedAt: Date | null
  usernameChangedAt?: Date | null
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    emailVerified: Boolean(user.emailVerifiedAt),
    usernameChangedAt: user.usernameChangedAt ? user.usernameChangedAt.toISOString() : null,
  }
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002')
}

type IssueTokenMeta = {
  userAgent?: string
  geo?: ApproximateGeo
  tokenFamilyId?: string
  isAdminSession?: boolean
}

async function issueTokens(env: Env, userId: string, meta?: IssueTokenMeta) {
  const rawRefresh = createRawToken()
  const session = await createSessionRecord(userId, hashToken(rawRefresh), refreshExpiry(), {
    userAgent: meta?.userAgent,
    geo: meta?.geo,
    tokenFamilyId: meta?.tokenFamilyId,
    isAdminSession: meta?.isAdminSession,
  })
  const accessToken = await signAccessToken(env, userId, session.id)
  return {
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: accessTtlSeconds(),
    sessionId: session.id,
    tokenFamilyId: session.tokenFamilyId,
  }
}

async function usernameTakenOrReserved(usernameNormalized: string, excludeUserId?: string): Promise<boolean> {
  if (isReservedUsername(usernameNormalized)) return true
  const existing = await prisma.user.findUnique({ where: { usernameNormalized } })
  if (existing && existing.id !== excludeUserId) return true
  const reserved = await prisma.usernameHistory.findFirst({
    where: {
      usernameNormalized,
      reservedUntil: { gt: new Date() },
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
    },
  })
  return Boolean(reserved)
}

type VerificationSendOutcome = {
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED'
  message: string
}

async function createAndSendVerification(
  env: Env,
  user: { id: string; email: string; username: string },
): Promise<VerificationSendOutcome> {
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const rawCode = createVerificationCode()
  const expiresAt = verificationCodeExpiry()
  const token = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawCode),
      expiresAt,
      deliveryStatus: 'PENDING',
    },
  })

  // Development-only code logging — never in staging/production.
  if (env.appEnv === 'development' && !env.brevoConfigured) {
    console.warn(`[auth:dev] verification code for ${user.email}: ${rawCode}`)
  }

  const result = await sendVerificationEmail(env, {
    toEmail: user.email,
    username: user.username,
    verificationCode: rawCode,
    expiresAt,
  })

  if (!result.ok) {
    await prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { deliveryStatus: 'FAILED' },
    })
    return {
      deliveryStatus: 'FAILED',
      message: 'We created your account but could not send the verification email. Please try again.',
    }
  }

  await prisma.emailVerificationToken.update({
    where: { id: token.id },
    data: { deliveryStatus: 'SENT' },
  })

  return {
    deliveryStatus: 'SENT',
    message: 'Check your email for a 6-digit verification code to activate your account.',
  }
}

export async function registerUser(env: Env, body: RegisterBody) {
  const usernameNormalized = body.username
  const email = body.email

  if (await usernameTakenOrReserved(usernameNormalized)) {
    throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another.')
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.')
  }

  const passwordHash = await hashPassword(body.password)

  let user
  try {
    user = await prisma.user.create({
      data: {
        email,
        username: usernameNormalized,
        usernameNormalized,
        passwordHash,
        accountStatus: 'pending_verification',
      },
    })
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another.')
    }
    throw err
  }

  const send = await createAndSendVerification(env, user)

  if (send.deliveryStatus === 'FAILED') {
    return {
      email: user.email,
      message: send.message,
      deliveryStatus: 'FAILED' as const,
    }
  }

  return {
    email: user.email,
    message: send.message,
    deliveryStatus: 'SENT' as const,
  }
}

export async function checkUsernameAvailability(username: string, ip: string): Promise<UsernameAvailabilityData> {
  const limited = rateLimit(`username:${ip}`, 30, 60_000)
  if (!limited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many username checks. Try again shortly.', {
      retryAfterSec: limited.retryAfterSec,
    })
  }

  const trimmed = username.trim()
  const normalized = normalizeUsername(trimmed)

  if (isReservedUsername(normalized)) {
    return { username: normalized || trimmed, valid: false, available: false, reason: 'reserved' }
  }

  const parsed = usernameSchema.safeParse(trimmed)
  if (!parsed.success) {
    return { username: normalized || trimmed, valid: false, available: false, reason: 'invalid' }
  }

  const taken = await usernameTakenOrReserved(parsed.data)
  if (taken) {
    return { username: parsed.data, valid: true, available: false, reason: 'taken' }
  }

  return { username: parsed.data, valid: true, available: true, reason: 'available' }
}

/** @deprecated */
export const checkUsernameAvailable = checkUsernameAvailability

export async function resendVerification(env: Env, emailRaw: string, ip: string) {
  const email = normalizeEmail(emailRaw)
  const cooldownMs = env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
  const maxPerHour = env.EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR

  const ipLimited = rateLimit(`resend-ip:${ip}`, maxPerHour * 3, 60 * 60 * 1000)
  if (!ipLimited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many verification emails requested. Try again later.', {
      retryAfterSec: ipLimited.retryAfterSec,
    })
  }

  const accountCooldown = rateLimit(`resend-cd:${email}`, 1, cooldownMs)
  if (!accountCooldown.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Please wait before requesting another verification email.', {
      retryAfterSec: accountCooldown.retryAfterSec,
    })
  }

  const hourly = rateLimit(`resend-hr:${email}`, maxPerHour, 60 * 60 * 1000)
  if (!hourly.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many verification emails requested. Try again later.', {
      retryAfterSec: hourly.retryAfterSec,
    })
  }

  const generic = { message: 'If an unverified account exists for that email, a new code has been sent.' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerifiedAt || user.accountStatus === 'disabled') {
    return generic
  }

  const send = await createAndSendVerification(env, user)
  if (send.deliveryStatus === 'FAILED') {
    throw new AppError(
      502,
      'EMAIL_SEND_FAILED',
      'We could not send the verification email. Please try again.',
    )
  }

  return generic
}

export async function verifyEmailCode(
  emailRaw: string,
  codeRaw: string,
  ip: string,
): Promise<{ result: VerifyEmailResult; message: string }> {
  const email = normalizeEmail(emailRaw)
  const code = codeRaw.replace(/\D/g, '')

  if (code.length !== 6) {
    return { result: 'invalid', message: 'Enter the 6-digit code from your email.' }
  }

  const limited = rateLimit(`verify-email:${email}:${ip}`, 5, 15 * 60 * 1000)
  if (!limited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many verification attempts. Try again later.', {
      retryAfterSec: limited.retryAfterSec,
    })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return { result: 'invalid', message: 'That code is incorrect. Check your email and try again.' }
  }

  if (user.accountStatus === 'disabled') {
    return { result: 'account_disabled', message: 'This account is disabled. Contact support.' }
  }

  if (user.emailVerifiedAt) {
    return { result: 'already_verified', message: 'Your email is already verified. You can sign in.' }
  }

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  })

  if (!record) {
    return { result: 'expired', message: 'That code has expired. Request a new one.' }
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { result: 'expired', message: 'That code has expired. Request a new one.' }
  }

  const codeHash = hashToken(code)
  if (!tokensEqual(codeHash, record.tokenHash)) {
    return { result: 'invalid', message: 'That code is incorrect. Check your email and try again.' }
  }

  try {
    await prisma.$transaction(async tx => {
      const fresh = await tx.emailVerificationToken.findUnique({ where: { id: record.id } })
      if (!fresh || fresh.usedAt) {
        throw new AppError(400, 'TOKEN_USED', 'This verification code has already been used.')
      }
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      })
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          accountStatus: 'active',
        },
      })
    })
  } catch (err) {
    if (err instanceof AppError && err.code === 'TOKEN_USED') {
      return { result: 'used', message: err.message }
    }
    throw err
  }

  return { result: 'success', message: 'Email verified. You can sign in.' }
}

/** @deprecated Link-based verification — use verifyEmailCode */
export async function verifyEmailToken(rawToken: string): Promise<{ result: VerifyEmailResult; message: string }> {
  const tokenHash = hashToken(rawToken)
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!record) {
    return { result: 'invalid', message: 'This verification code is invalid.' }
  }

  if (record.user.accountStatus === 'disabled') {
    return { result: 'account_disabled', message: 'This account is disabled. Contact support.' }
  }

  if (record.user.emailVerifiedAt) {
    return { result: 'already_verified', message: 'Your email is already verified. You can sign in.' }
  }

  if (record.usedAt) {
    return { result: 'used', message: 'This verification code has already been used.' }
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { result: 'expired', message: 'This verification code has expired. Request a new one.' }
  }

  try {
    await prisma.$transaction(async tx => {
      const fresh = await tx.emailVerificationToken.findUnique({ where: { id: record.id } })
      if (!fresh || fresh.usedAt) {
        throw new AppError(400, 'TOKEN_USED', 'This verification code has already been used.')
      }
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      })
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          accountStatus: 'active',
        },
      })
    })
  } catch (err) {
    if (err instanceof AppError && err.code === 'TOKEN_USED') {
      return { result: 'used', message: err.message }
    }
    throw err
  }

  return { result: 'success', message: 'Email verified. You can sign in.' }
}

export async function loginUser(
  env: Env,
  body: LoginBody,
  _ip: string,
  meta?: { userAgent?: string; geo?: ApproximateGeo },
) {
  const limited = rateLimit(`login:${_ip}`, 10, 15 * 60 * 1000)
  if (!limited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again later.')
  }

  const identifier = body.identifier.trim()
  const user = isEmailIdentifier(identifier)
    ? await prisma.user.findUnique({ where: { email: normalizeEmail(identifier) } })
    : await prisma.user.findUnique({ where: { usernameNormalized: normalizeUsername(identifier) } })

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', GENERIC_AUTH_FAILURE_MESSAGE)
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash)
  if (!passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', GENERIC_AUTH_FAILURE_MESSAGE)
  }

  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated.')
  }

  if (user.accountStatus === 'disabled' || user.accountStatus === 'restricted') {
    throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account is restricted. Contact support.')
  }

  if (!user.emailVerifiedAt || user.accountStatus === 'pending_verification') {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in.')
  }

  const issued = await issueTokens(env, user.id, { ...meta, isAdminSession: false })
  const { sessionId: _sid, tokenFamilyId: _fid, ...tokens } = issued
  await recordSecurityEvent(user.id, 'sign_in')
  return { user: toPublicUser(user), tokens }
}

/**
 * @deprecated Prefer `adminLogin` from admin.service (cookie sessions).
 * Kept for transitional tests — delegates to cookie-oriented adminLogin and does not return JS tokens.
 */
export async function loginAdminUser(
  env: Env,
  body: LoginBody,
  ip: string,
  meta?: { userAgent?: string; geo?: ApproximateGeo },
) {
  const { adminLogin } = await import('../admin/admin.service.js')
  const result = await adminLogin(env, body, ip, meta)
  return {
    user: result.user,
    /** Intentionally empty — admin sessions are cookie-only. */
    tokens: null as null,
    rawSessionToken: result.rawSessionToken,
    expiresAt: result.expiresAt,
  }
}

export async function refreshSession(
  env: Env,
  rawRefresh: string,
  meta?: { userAgent?: string; geo?: ApproximateGeo },
) {
  const tokenHash = hashToken(rawRefresh)
  const record = await prisma.session.findUnique({ where: { tokenHash } })

  if (!record) {
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }

  // Reuse of a rotated refresh token → revoke the entire rotation family.
  if (record.revokedAt && record.revokedReason === 'rotated') {
    const revoked = await revokeSessionFamily(record.tokenFamilyId, 'reuse_detected')
    await recordSecurityEvent(record.userId, 'refresh_reuse_detected', {
      tokenFamilyId: record.tokenFamilyId,
      revokedCount: revoked,
    })
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }

  if (record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } })
  if (
    !user ||
    user.accountStatus === 'restricted' ||
    user.accountStatus === 'disabled' ||
    user.accountStatus === 'deactivated'
  ) {
    await prisma.session.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), revokedReason: 'account_ineligible' },
    })
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }

  // Admin role removed → invalidate admin session family immediately.
  if (record.isAdminSession && user.role !== 'admin') {
    await revokeSessionFamily(record.tokenFamilyId, 'admin_role_removed')
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }

  await prisma.session.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), revokedReason: 'rotated' },
  })

  const issued = await issueTokens(env, user.id, {
    userAgent: meta?.userAgent,
    geo: meta?.geo,
    tokenFamilyId: record.tokenFamilyId,
    isAdminSession: record.isAdminSession,
  })
  const { sessionId: _sid, tokenFamilyId: _fid, ...tokens } = issued
  return { user: toPublicUser(user), tokens }
}

export async function logoutSession(rawRefresh: string) {
  const tokenHash = hashToken(rawRefresh)
  const row = await prisma.session.findUnique({ where: { tokenHash } })
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'logout' },
  })
  if (row?.userId) {
    await recordSecurityEvent(row.userId, 'session_revoked', { reason: 'logout', sessionId: row.id })
  }
  return { message: 'Signed out' }
}

export async function changeUsername(env: Env, userId: string, body: ChangeUsernameBody) {
  void env
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  }

  const passwordOk = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.')
  }

  if (user.usernameChangedAt) {
    const next = new Date(user.usernameChangedAt)
    next.setUTCDate(next.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)
    if (next.getTime() > Date.now()) {
      throw new AppError(429, 'USERNAME_CHANGE_COOLDOWN', 'You can change your username again after the cooldown.', {
        nextChangeAvailableAt: next.toISOString(),
      })
    }
  }

  const nextUsername = body.username
  if (nextUsername === user.usernameNormalized) {
    const nextChange = user.usernameChangedAt
      ? new Date(user.usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
      : new Date()
    return {
      username: user.username,
      usernameChangedAt: (user.usernameChangedAt ?? new Date()).toISOString(),
      nextChangeAvailableAt: nextChange.toISOString(),
    }
  }

  if (await usernameTakenOrReserved(nextUsername, user.id)) {
    throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another.')
  }

  const changedAt = new Date()
  const reservedUntil = new Date(changedAt)
  reservedUntil.setUTCDate(reservedUntil.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

  try {
    await prisma.$transaction(async tx => {
      await tx.usernameHistory.create({
        data: {
          userId: user.id,
          usernameNormalized: user.usernameNormalized,
          releasedAt: changedAt,
          reservedUntil,
        },
      })
      await tx.user.update({
        where: { id: user.id },
        data: {
          username: nextUsername,
          usernameNormalized: nextUsername,
          usernameChangedAt: changedAt,
        },
      })
    })
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another.')
    }
    throw err
  }

  const nextChangeAvailableAt = new Date(changedAt)
  nextChangeAvailableAt.setUTCDate(nextChangeAvailableAt.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)

  await recordSecurityEvent(user.id, 'username_changed')

  return {
    username: nextUsername,
    usernameChangedAt: changedAt.toISOString(),
    nextChangeAvailableAt: nextChangeAvailableAt.toISOString(),
  }
}

export async function getUsernameChangeStatus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  }

  let nextChangeAvailableAt: string | null = null
  let canChange = true
  if (user.usernameChangedAt) {
    const next = new Date(user.usernameChangedAt)
    next.setUTCDate(next.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS)
    nextChangeAvailableAt = next.toISOString()
    canChange = next.getTime() <= Date.now()
  }

  return {
    username: user.username,
    usernameChangedAt: user.usernameChangedAt ? user.usernameChangedAt.toISOString() : null,
    nextChangeAvailableAt,
    canChange,
  }
}

const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, a password reset code has been sent.'

export async function requestPasswordReset(env: Env, emailRaw: string, ip: string) {
  const email = normalizeEmail(emailRaw)
  const limited = rateLimit(`reset:${ip}`, 20, 60 * 60 * 1000)
  const accountLimited = rateLimit(`reset-email:${email}`, 5, 60 * 60 * 1000)
  if (!limited.ok || !accountLimited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many password reset requests. Try again later.')
  }

  const generic = { message: GENERIC_RESET_MESSAGE }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.accountStatus === 'disabled' || user.accountStatus === 'deactivated') {
    return generic
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const rawCode = createVerificationCode()
  const expiresAt = verificationCodeExpiry()
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawCode),
      expiresAt,
    },
  })

  const { buildPasswordResetEmail } = await import('../email/templates/account.js')
  const built = buildPasswordResetEmail({ username: user.username, resetCode: rawCode, expiresAt })
  const { createBrevoEmailProvider } = await import('../email/brevo.js')
  const sent = await createBrevoEmailProvider(env).sendTransactionalEmail({
    toEmail: user.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
  })

  if (env.appEnv === 'development' && !env.brevoConfigured) {
    console.warn(`[auth:dev] password-reset code for ${user.email}: ${rawCode}`)
  }

  if (!sent.ok && env.brevoConfigured) {
    throw new AppError(502, 'EMAIL_SEND_FAILED', 'We could not send the reset email. Please try again.')
  }

  return generic
}

type ResetPasswordInput =
  | { token: string; newPassword: string; email?: never; code?: never }
  | { email: string; code: string; newPassword: string; token?: never }

async function resolvePasswordResetRecord(input: ResetPasswordInput) {
  if ('token' in input && input.token) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      include: { user: true },
    })
  }

  const email = normalizeEmail(input.email!)
  const code = input.code!.replace(/\D/g, '')
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null

  const record = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  })
  if (!record) return null
  if (!tokensEqual(hashToken(code), record.tokenHash)) return null
  return record
}

export async function resetPassword(
  env: Env,
  body: ResetPasswordInput,
  ip = 'unknown',
): Promise<{ result: 'success' | 'expired' | 'used' | 'invalid'; message: string }> {
  void env

  if ('email' in body && body.email) {
    const limited = rateLimit(`reset-verify:${body.email}:${ip}`, 5, 15 * 60 * 1000)
    if (!limited.ok) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many reset attempts. Try again later.', {
        retryAfterSec: limited.retryAfterSec,
      })
    }
  }

  const record = await resolvePasswordResetRecord(body)

  if (!record) {
    return { result: 'invalid', message: 'That reset code is incorrect. Check your email and try again.' }
  }
  if (record.usedAt) {
    return { result: 'used', message: 'This reset code has already been used.' }
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { result: 'expired', message: 'This reset code has expired. Request a new one.' }
  }
  if (
    record.user.accountStatus === 'disabled' ||
    record.user.accountStatus === 'deactivated'
  ) {
    return { result: 'invalid', message: 'That reset code is incorrect. Check your email and try again.' }
  }

  const passwordHash = await hashPassword(body.newPassword)
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'password_reset' },
    }),
  ])

  await recordSecurityEvent(record.userId, 'password_changed', { via: 'reset' })

  return {
    result: 'success',
    message: 'Your password has been changed. Other sessions were signed out. Sign in with your new password.',
  }
}

/** @deprecated Link-based reset — codes are entered in-app with email. */
export async function inspectPasswordResetToken(
  token: string,
): Promise<{ result: 'valid' | 'expired' | 'used' | 'invalid'; message: string }> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record) return { result: 'invalid', message: 'This password reset link is invalid.' }
  if (record.usedAt) return { result: 'used', message: 'This password reset link has already been used.' }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { result: 'expired', message: 'This password reset link has expired. Request a new one.' }
  }
  return { result: 'valid', message: 'Choose a new password.' }
}
