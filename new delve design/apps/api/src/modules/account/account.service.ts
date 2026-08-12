import { prisma } from '@delve/database'
import {
  GENERIC_AUTH_FAILURE_MESSAGE,
  normalizeEmail,
  type OnboardingComplete,
  type OnboardingPatch,
  type ProfileUpdate,
  type TravelerProfileDto,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { createBrevoEmailProvider } from '../email/brevo.js'
import { buildEmailChangeEmail, buildSecurityNoticeEmail } from '../email/templates/account.js'
import { createObjectStorage } from '../storage/object-storage.js'
import {
  createRawToken,
  hashPassword,
  hashToken,
  refreshExpiry,
  signAccessToken,
  accessTtlSeconds,
  verifyPassword,
  verificationExpiry,
  tokensEqual,
} from '../auth/crypto.js'
import { rateLimit } from '../auth/rate-limit.js'
import { createSessionRecord, toSessionSummary } from '../auth/session.js'

async function recordSecurityEvent(userId: string, type: string, metadata?: Record<string, unknown>) {
  await prisma.securityEvent.create({
    data: {
      userId,
      type,
      metadata: metadata ? (JSON.parse(JSON.stringify(metadata)) as object) : undefined,
    },
  })
}

async function ensureProfile(userId: string) {
  const existing = await prisma.travelerProfile.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.travelerProfile.create({
    data: {
      userId,
      displayName: '',
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      onboardingStatus: 'NOT_STARTED',
    },
  })
}

async function ensurePreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.notificationPreference.create({ data: { userId } })
}

async function requireVerifiedUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated.')
  }
  if (user.accountStatus === 'disabled' || user.accountStatus === 'restricted') {
    throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account is restricted. Contact support.')
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before continuing.')
  }
  return user
}

async function socialCountsForUser(userId: string) {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            followsIncoming: true,
            followsOutgoing: true,
            posts: { where: { status: 'PUBLISHED', deletedAt: null } },
          },
        },
      },
    })
    return {
      followersCount: row?._count.followsIncoming ?? 0,
      followingCount: row?._count.followsOutgoing ?? 0,
      delversCount: row?._count.posts ?? 0,
    }
  } catch {
    // Social tables may be unavailable during rolling deploys; profile still returns.
    return { followersCount: 0, followingCount: 0, delversCount: 0 }
  }
}

async function toProfileDto(
  user: { id: string; email: string; username: string; emailVerifiedAt: Date | null },
  profile: {
    displayName: string
    bio: string | null
    avatarUrl: string | null
    coverUrl: string | null
    homeCity: string | null
    homeCountryCode: string | null
    preferredCurrency: string
    preferredLanguage: string
    interests: string[]
    onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    onboardingCompletedAt: Date | null
    createdAt: Date
    profileVisibility?: 'PUBLIC' | 'PRIVATE'
  },
  storageConfigured: boolean,
): Promise<TravelerProfileDto> {
  const { followersCount, followingCount, delversCount } = await socialCountsForUser(user.id)
  return {
    id: user.id,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl ?? null,
    homeCity: profile.homeCity,
    homeCountryCode: profile.homeCountryCode,
    preferredCurrency: profile.preferredCurrency as TravelerProfileDto['preferredCurrency'],
    preferredLanguage: profile.preferredLanguage as TravelerProfileDto['preferredLanguage'],
    interests: profile.interests as TravelerProfileDto['interests'],
    onboardingStatus: profile.onboardingStatus,
    onboardingCompletedAt: profile.onboardingCompletedAt
      ? profile.onboardingCompletedAt.toISOString()
      : null,
    createdAt: profile.createdAt.toISOString(),
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    storageConfigured,
    profileVisibility: profile.profileVisibility ?? 'PUBLIC',
    followersCount,
    followingCount,
    delversCount,
  }
}

export async function getOnboarding(env: Env, userId: string) {
  const user = await requireVerifiedUser(userId)
  const profile = await ensureProfile(userId)
  return toProfileDto(user, profile, env.cloudinaryConfigured)
}

export async function patchOnboarding(env: Env, userId: string, body: OnboardingPatch) {
  const user = await requireVerifiedUser(userId)
  const profile = await ensureProfile(userId)
  if (profile.onboardingStatus === 'COMPLETED') {
    throw new AppError(400, 'ONBOARDING_COMPLETE', 'Onboarding is already complete. Edit your profile in Account Settings.')
  }

  const nextStatus = profile.onboardingStatus === 'NOT_STARTED' ? 'IN_PROGRESS' : profile.onboardingStatus
  const updated = await prisma.travelerProfile.update({
    where: { userId },
    data: {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.bio !== undefined ? { bio: body.bio || null } : {}),
      ...(body.homeCity !== undefined ? { homeCity: body.homeCity || null } : {}),
      ...(body.homeCountryCode !== undefined ? { homeCountryCode: body.homeCountryCode || null } : {}),
      ...(body.preferredCurrency !== undefined ? { preferredCurrency: body.preferredCurrency } : {}),
      ...(body.preferredLanguage !== undefined ? { preferredLanguage: body.preferredLanguage } : {}),
      ...(body.interests !== undefined ? { interests: body.interests } : {}),
      onboardingStatus: nextStatus,
    },
  })
  return toProfileDto(user, updated, env.cloudinaryConfigured)
}

export async function completeOnboarding(env: Env, userId: string, body: OnboardingComplete) {
  const user = await requireVerifiedUser(userId)
  if (!user.username?.trim()) {
    throw new AppError(400, 'USERNAME_REQUIRED', 'Choose a username before finishing onboarding.')
  }
  await ensureProfile(userId)
  const completedAt = new Date()
  const updated = await prisma.travelerProfile.update({
    where: { userId },
    data: {
      displayName: body.displayName,
      preferredCurrency: body.preferredCurrency,
      preferredLanguage: body.preferredLanguage,
      bio: body.bio || null,
      homeCity: body.homeCity || null,
      homeCountryCode: body.homeCountryCode || null,
      interests: body.interests ?? [],
      onboardingStatus: 'COMPLETED',
      onboardingCompletedAt: completedAt,
    },
  })
  await ensurePreferences(userId)
  return toProfileDto(user, updated, env.cloudinaryConfigured)
}

export async function getProfile(env: Env, userId: string) {
  return getOnboarding(env, userId)
}

export async function updateProfile(env: Env, userId: string, body: ProfileUpdate) {
  const user = await requireVerifiedUser(userId)
  await ensureProfile(userId)
  const updated = await prisma.travelerProfile.update({
    where: { userId },
    data: {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.bio !== undefined ? { bio: body.bio || null } : {}),
      ...(body.homeCity !== undefined ? { homeCity: body.homeCity || null } : {}),
      ...(body.homeCountryCode !== undefined ? { homeCountryCode: body.homeCountryCode || null } : {}),
      ...(body.preferredCurrency !== undefined ? { preferredCurrency: body.preferredCurrency } : {}),
      ...(body.preferredLanguage !== undefined ? { preferredLanguage: body.preferredLanguage } : {}),
      ...(body.interests !== undefined ? { interests: body.interests } : {}),
    },
  })
  return toProfileDto(user, updated, env.cloudinaryConfigured)
}

export async function createAvatarUploadUrl(
  env: Env,
  userId: string,
  input: { contentType: 'image/jpeg' | 'image/png' | 'image/webp'; contentLength: number },
  ip: string,
) {
  void input
  void ip
  await requireVerifiedUser(userId)
  // Legacy S3 path deprecated — use Cloudinary media architecture.
  if (env.cloudinaryConfigured) {
    throw new AppError(
      410,
      'USE_CLOUDINARY_MEDIA',
      'Avatar uploads now use POST /api/v2/media/upload-signature. See docs/media-architecture.md.',
    )
  }
  throw new AppError(
    503,
    'CLOUDINARY_NOT_CONFIGURED',
    'Profile picture uploads are not configured yet. You can skip this step.',
  )
}

export async function deleteAvatar(env: Env, userId: string) {
  await requireVerifiedUser(userId)
  const profile = await ensureProfile(userId)
  if (profile.avatarMediaId) {
    const { deleteMedia } = await import('../media/media.service.js')
    try {
      await deleteMedia(env, userId, profile.avatarMediaId)
    } catch {
      // Fall through to clear local references even if Cloudinary delete fails after retries.
    }
  }
  const storage = createObjectStorage(env)
  if (profile.avatarKey && storage.assertOwnedKey(userId, profile.avatarKey)) {
    await storage.deleteObject(profile.avatarKey)
  }
  await prisma.travelerProfile.update({
    where: { userId },
    data: { avatarUrl: null, avatarKey: null, avatarMediaId: null },
  })
  return { message: 'Avatar removed' }
}

export async function requestEmailChange(
  env: Env,
  userId: string,
  body: { newEmail: string; currentPassword: string },
  ip: string,
) {
  const user = await requireVerifiedUser(userId)
  const limited = rateLimit(`email-change:${userId}`, 5, 60 * 60 * 1000)
  const ipLimited = rateLimit(`email-change-ip:${ip}`, 20, 60 * 60 * 1000)
  if (!limited.ok || !ipLimited.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many email change requests. Try again later.')
  }

  const ok = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.')

  const newEmail = normalizeEmail(body.newEmail)
  const generic = { message: 'If that address is available, a confirmation link has been sent.' }
  if (newEmail === user.email) return generic

  const taken = await prisma.user.findUnique({ where: { email: newEmail } })
  if (taken) return generic

  await prisma.emailChangeRequest.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  const raw = createRawToken(32)
  const expiresAt = verificationExpiry(env)
  await prisma.emailChangeRequest.create({
    data: {
      userId,
      newEmail,
      tokenHash: hashToken(raw),
      expiresAt,
    },
  })

  const verifyUrl = `${env.TRAVELER_WEB_URL.replace(/\/$/, '')}/account/email-change?token=${encodeURIComponent(raw)}`
  const built = buildEmailChangeEmail({ username: user.username, verifyUrl, expiresAt })
  const provider = createBrevoEmailProvider(env)
  const sent = await provider.sendTransactionalEmail({
    toEmail: newEmail,
    subject: built.subject,
    html: built.html,
    text: built.text,
  })
  if (!sent.ok) {
    throw new AppError(502, 'EMAIL_SEND_FAILED', 'We could not send the confirmation email. Please try again.')
  }

  if (env.appEnv === 'development' && !env.brevoConfigured) {
    console.warn(`[auth:dev] email-change URL: ${verifyUrl}`)
  }

  await recordSecurityEvent(userId, 'email_change_requested')
  return generic
}

export async function verifyEmailChange(env: Env, token: string) {
  void env
  const record = await prisma.emailChangeRequest.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record || record.usedAt) {
    throw new AppError(400, 'INVALID_TOKEN', 'This email change link is invalid or has already been used.')
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'EXPIRED_TOKEN', 'This email change link has expired.')
  }

  const taken = await prisma.user.findUnique({ where: { email: record.newEmail } })
  if (taken && taken.id !== record.userId) {
    throw new AppError(409, 'EMAIL_TAKEN', 'That email address is no longer available.')
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } })
  if (!user) throw new AppError(400, 'INVALID_TOKEN', 'This email change link is invalid.')

  const oldEmail = user.email
  await prisma.$transaction([
    prisma.emailChangeRequest.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { email: record.newEmail } }),
  ])

  await recordSecurityEvent(user.id, 'email_changed')

  const notice = buildSecurityNoticeEmail({
    username: user.username,
    message: `The email address on your Delve account was changed away from ${oldEmail}. If this was not you, contact support immediately.`,
  })
  const provider = createBrevoEmailProvider(env)
  await provider.sendTransactionalEmail({
    toEmail: oldEmail,
    subject: notice.subject,
    html: notice.html,
    text: notice.text,
  })

  return { message: 'Email updated. Sign in with your new address.' }
}

export async function resendEmailChange(env: Env, userId: string, _ip: string) {
  const user = await requireVerifiedUser(userId)
  const cooldown = rateLimit(`email-change-resend:${userId}`, 1, env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000)
  if (!cooldown.ok) {
    throw new AppError(429, 'RATE_LIMITED', 'Please wait before requesting another email.', {
      retryAfterSec: cooldown.retryAfterSec,
    })
  }
  const pending = await prisma.emailChangeRequest.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  const generic = { message: 'If a pending email change exists, a new confirmation link has been sent.' }
  if (!pending) return generic

  await prisma.emailChangeRequest.update({ where: { id: pending.id }, data: { usedAt: new Date() } })
  const raw = createRawToken(32)
  const expiresAt = verificationExpiry(env)
  await prisma.emailChangeRequest.create({
    data: { userId, newEmail: pending.newEmail, tokenHash: hashToken(raw), expiresAt },
  })
  const verifyUrl = `${env.TRAVELER_WEB_URL.replace(/\/$/, '')}/account/email-change?token=${encodeURIComponent(raw)}`
  const built = buildEmailChangeEmail({ username: user.username, verifyUrl, expiresAt })
  const sent = await createBrevoEmailProvider(env).sendTransactionalEmail({
    toEmail: pending.newEmail,
    subject: built.subject,
    html: built.html,
    text: built.text,
  })
  if (!sent.ok) {
    throw new AppError(502, 'EMAIL_SEND_FAILED', 'We could not send the confirmation email. Please try again.')
  }
  return generic
}

export async function cancelEmailChange(userId: string) {
  await requireVerifiedUser(userId)
  await prisma.emailChangeRequest.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })
  return { message: 'Pending email change cancelled.' }
}

export async function changePassword(
  env: Env,
  userId: string,
  body: { currentPassword: string; newPassword: string },
  currentRefreshToken?: string,
) {
  const user = await requireVerifiedUser(userId)
  const ok = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.')
  if (body.currentPassword === body.newPassword) {
    throw new AppError(400, 'PASSWORD_REUSE', 'Choose a password you have not used recently.')
  }

  const passwordHash = await hashPassword(body.newPassword)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}),
    },
    data: { revokedAt: new Date(), revokedReason: 'password_changed' },
  })

  let tokens: { accessToken: string; refreshToken: string; expiresIn: number } | undefined
  if (currentRefreshToken && currentHash) {
    await prisma.session.updateMany({
      where: { tokenHash: currentHash, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'password_changed_rotate' },
    })
    const rawRefresh = createRawToken()
    const session = await createSessionRecord(userId, hashToken(rawRefresh), refreshExpiry())
    const accessToken = await signAccessToken(env, userId, session.id)
    tokens = { accessToken, refreshToken: rawRefresh, expiresIn: accessTtlSeconds() }
  }

  await recordSecurityEvent(userId, 'password_changed')
  return { message: 'Password updated. Other devices have been signed out.', tokens }
}

export async function listSessions(userId: string, currentRefreshToken?: string) {
  await requireVerifiedUser(userId)
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null
  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
  })
  const summaries = rows.map(row => toSessionSummary(row, currentHash))
  summaries.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1
    if (!a.isCurrent && b.isCurrent) return 1
    return (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '')
  })
  return summaries
}

export async function revokeSession(userId: string, sessionId: string, currentRefreshToken?: string) {
  await requireVerifiedUser(userId)
  const row = await prisma.session.findFirst({ where: { id: sessionId, userId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Session not found')

  const isCurrent = Boolean(
    currentRefreshToken && tokensEqual(row.tokenHash, hashToken(currentRefreshToken)),
  )

  if (!row.revokedAt) {
    await prisma.session.update({
      where: { id: row.id },
      data: {
        revokedAt: new Date(),
        revokedReason: isCurrent ? 'revoked_current' : 'revoked',
      },
    })
    await recordSecurityEvent(userId, 'session_revoked', { sessionId, isCurrent })
  }

  return {
    message: isCurrent ? 'Current session revoked. You have been signed out.' : 'Session revoked',
    revokedCurrent: isCurrent,
  }
}

export async function logoutAll(userId: string) {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'logout_all' },
  })
  await recordSecurityEvent(userId, 'logout_all', { revokedCount: result.count })
  return { message: 'Signed out from every device', revokedCount: result.count }
}

export async function logoutOthers(userId: string, currentRefreshToken: string) {
  const currentHash = hashToken(currentRefreshToken)
  const current = await prisma.session.findFirst({
    where: { userId, tokenHash: currentHash, revokedAt: null },
  })
  if (!current) {
    throw new AppError(401, 'INVALID_REFRESH', 'Your session has expired. Sign in again to continue.')
  }
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null, NOT: { tokenHash: currentHash } },
    data: { revokedAt: new Date(), revokedReason: 'logout_others' },
  })
  await recordSecurityEvent(userId, 'logout_others', { revokedCount: result.count })
  return { message: 'Signed out from all other devices', revokedCount: result.count }
}

export async function getPreferences(userId: string) {
  await requireVerifiedUser(userId)
  const prefs = await ensurePreferences(userId)
  return {
    securityAccount: true as const,
    bookingTrip: prefs.bookingTrip,
    providerMessages: prefs.providerMessages,
    communityActivity: prefs.communityActivity,
    productUpdates: prefs.productUpdates,
    marketing: prefs.marketing,
    inApp: prefs.inApp,
    marketingOptInAt: prefs.marketingOptInAt ? prefs.marketingOptInAt.toISOString() : null,
  }
}

export async function updatePreferences(
  userId: string,
  body: {
    bookingTrip?: boolean
    providerMessages?: boolean
    communityActivity?: boolean
    productUpdates?: boolean
    marketing?: boolean
    inApp?: boolean
    securityAccount?: boolean
  },
) {
  await requireVerifiedUser(userId)
  if (body.securityAccount === false) {
    throw new AppError(400, 'SECURITY_EMAILS_REQUIRED', 'Security and account emails cannot be disabled')
  }
  await ensurePreferences(userId)
  const updated = await prisma.notificationPreference.update({
    where: { userId },
    data: {
      ...(body.bookingTrip !== undefined ? { bookingTrip: body.bookingTrip } : {}),
      ...(body.providerMessages !== undefined ? { providerMessages: body.providerMessages } : {}),
      ...(body.communityActivity !== undefined ? { communityActivity: body.communityActivity } : {}),
      ...(body.productUpdates !== undefined ? { productUpdates: body.productUpdates } : {}),
      ...(body.inApp !== undefined ? { inApp: body.inApp } : {}),
      ...(body.marketing !== undefined
        ? {
            marketing: body.marketing,
            marketingOptInAt: body.marketing ? new Date() : null,
          }
        : {}),
      securityAccount: true,
    },
  })
  return {
    securityAccount: true as const,
    bookingTrip: updated.bookingTrip,
    providerMessages: updated.providerMessages,
    communityActivity: updated.communityActivity,
    productUpdates: updated.productUpdates,
    marketing: updated.marketing,
    inApp: updated.inApp,
    marketingOptInAt: updated.marketingOptInAt ? updated.marketingOptInAt.toISOString() : null,
  }
}

export async function deactivateAccount(userId: string, currentPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', GENERIC_AUTH_FAILURE_MESSAGE)

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'deactivated' },
  })
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'account_deactivated' },
  })
  await recordSecurityEvent(userId, 'account_deactivated')
  return { message: 'Your account has been deactivated.' }
}
