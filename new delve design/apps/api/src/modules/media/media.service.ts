import { prisma } from '@delve/database'
import type {
  MediaAssetDto,
  MediaCompleteBody,
  MediaUploadSignatureBody,
  MediaUploadSignatureResponse,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'
import {
  buildDeliveryUrl,
  chooseFolder,
  destroyCloudinaryAsset,
  extensionFromFilename,
  normalizeFormat,
  purposePolicies,
  safeEqualHex,
  signCloudinaryParams,
  verifyCloudinaryNotification,
} from './cloudinary.js'
import { recordMediaMetric } from './metrics.js'

const AVATAR_QUOTA_NOTE = 1
const DEFAULT_USER_READY_QUOTA = 50

type MediaTx = {
  travelerProfile: {
    findUnique: (args: { where: { userId: string } }) => Promise<{ id: string } | null>
    create: (args: {
      data: {
        userId: string
        displayName: string
        preferredCurrency: string
        preferredLanguage: string
        onboardingStatus: 'NOT_STARTED'
      }
    }) => Promise<{ id: string }>
    update: (args: {
      where: { userId: string }
      data: Record<string, unknown>
    }) => Promise<unknown>
  }
}

/** Ensure a TravelerProfile row exists, then attach avatar/cover delivery URLs. */
async function ensureProfileAndLinkMedia(
  tx: MediaTx,
  env: Env,
  userId: string,
  purpose: string,
  asset: { id: string; publicId: string; version: number | null },
) {
  if (purpose !== 'avatar' && purpose !== 'cover') return

  const existing = await tx.travelerProfile.findUnique({ where: { userId } })
  if (!existing) {
    await tx.travelerProfile.create({
      data: {
        userId,
        displayName: '',
        preferredCurrency: 'USD',
        preferredLanguage: 'en',
        onboardingStatus: 'NOT_STARTED',
      },
    })
  }

  if (purpose === 'avatar') {
    const delivery = buildDeliveryUrl({
      cloudName: env.CLOUDINARY_CLOUD_NAME!,
      publicId: asset.publicId,
      version: asset.version,
      width: 192,
      crop: 'fill',
      gravity: 'auto',
    })
    await tx.travelerProfile.update({
      where: { userId },
      data: { avatarMediaId: asset.id, avatarUrl: delivery, avatarKey: null },
    })
    return
  }

  const delivery = buildDeliveryUrl({
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    publicId: asset.publicId,
    version: asset.version,
    width: 1600,
    crop: 'fill',
    gravity: 'auto',
  })
  await tx.travelerProfile.update({
    where: { userId },
    data: { coverMediaId: asset.id, coverUrl: delivery },
  })
}

function toDto(
  env: Env,
  row: {
    id: string
    publicId: string
    version: number | null
    resourceType: string
    format: string | null
    bytes: number | null
    width: number | null
    height: number | null
    duration: number | null
    status: string
    purpose: string
    altText: string | null
    createdAt: Date
  },
): MediaAssetDto {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || 'delve'
  const presetWidth = row.purpose === 'avatar' ? 192 : 768
  const url = buildDeliveryUrl({
    cloudName,
    publicId: row.publicId,
    version: row.version,
    resourceType: row.resourceType,
    width: presetWidth,
    crop: row.purpose === 'avatar' ? 'fill' : 'limit',
    gravity: row.purpose === 'avatar' ? 'auto' : undefined,
  })
  const srcSet =
    row.resourceType === 'image'
      ? [48, 96, 192, 480, 768, 1200]
          .filter(w => (row.purpose === 'avatar' ? w <= 192 : w >= 480))
          .map(
            w =>
              `${buildDeliveryUrl({
                cloudName,
                publicId: row.publicId,
                version: row.version,
                resourceType: row.resourceType,
                width: w,
                crop: row.purpose === 'avatar' ? 'fill' : 'limit',
                gravity: row.purpose === 'avatar' ? 'auto' : undefined,
              })} ${w}w`,
          )
          .join(', ')
      : undefined

  return {
    id: row.id,
    publicId: row.publicId,
    version: row.version,
    resourceType: row.resourceType as MediaAssetDto['resourceType'],
    format: row.format,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    duration: row.duration,
    status: row.status as MediaAssetDto['status'],
    moderationStatus: (row as any).moderationStatus,
    moderationReason: (row as any).moderationReason,
    captionVttUrl: (row as any).captionVttUrl,
    purpose: row.purpose as MediaAssetDto['purpose'],
    altText: row.altText,
    delivery: {
      url,
      srcSet,
      sizes: row.purpose === 'avatar' ? '48px' : '(max-width: 768px) 100vw, 768px',
      width: row.width ?? presetWidth,
      height: row.height ?? undefined,
    },
    createdAt: row.createdAt.toISOString(),
  }
}

export function mediaAssetToDto(
  env: Env,
  row: {
    id: string
    publicId: string
    version: number | null
    resourceType: string
    format: string | null
    bytes: number | null
    width: number | null
    height: number | null
    duration: number | null
    status: string
    moderationStatus?: string
    moderationReason?: string | null
    captionVttUrl?: string | null
    purpose: string
    altText: string | null
    createdAt: Date
  },
): MediaAssetDto {
  return toDto(env, row)
}

/**
 * Architecture boundary: returns Cloudinary signed upload params only.
 * Media bytes must never pass through Backend V2.
 */
export async function createUploadSignature(
  env: Env,
  userId: string,
  body: MediaUploadSignatureBody,
): Promise<MediaUploadSignatureResponse> {
  if (!env.cloudinaryConfigured) {
    throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Media uploads are not configured yet.')
  }

  const policies = purposePolicies(env)
  const policy = policies[body.purpose]
  if (!policy || policy.notYetAvailable) {
    throw new AppError(400, 'PURPOSE_NOT_AVAILABLE', 'That media purpose is not available yet.')
  }
  if (policy.requiresBusiness || policy.requiresListing) {
    if (!body.businessId) {
      throw new AppError(400, 'BUSINESS_ID_REQUIRED', 'businessId is required for this upload purpose.')
    }
    const membership = await prisma.businessMember.findUnique({
      where: { userId_businessId: { userId, businessId: body.businessId } },
    })
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
      throw new AppError(403, 'UNAUTHORIZED', 'You must be an owner or manager to upload business media.')
    }
    if (policy.requiresListing) {
      if (!body.listingId) {
        throw new AppError(400, 'LISTING_ID_REQUIRED', 'listingId is required for this upload purpose.')
      }
      const listing = await prisma.listing.findFirst({
        where: { id: body.listingId, businessId: body.businessId },
        select: { id: true },
      })
      if (!listing) {
        throw new AppError(404, 'NOT_FOUND', 'Listing not found for this business.')
      }
    }
  }

  if (policy.requiresEvent) {
    if (!body.eventId) {
      throw new AppError(400, 'EVENT_ID_REQUIRED', 'eventId is required for this upload purpose.')
    }
    const event = await prisma.travelerEvent.findFirst({
      where: { id: body.eventId },
      select: { id: true, creatorId: true, status: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found.')
    if (event.creatorId !== userId) {
      const attendance = await prisma.eventAttendance.findUnique({
        where: { eventId_userId: { eventId: body.eventId, userId } },
      })
      if (attendance?.status !== 'GOING') {
        throw new AppError(403, 'FORBIDDEN', 'Join as Going to add media to this event.')
      }
    }
  }

  if (policy.requiresDeal) {
    if (!body.dealId) {
      throw new AppError(400, 'DEAL_ID_REQUIRED', 'dealId is required for this upload purpose.')
    }
    const deal = await prisma.deal.findFirst({
      where: { id: body.dealId, businessId: body.businessId },
      select: { id: true, businessId: true },
    })
    if (!deal) throw new AppError(404, 'NOT_FOUND', 'Deal not found for this business.')
    await requireBusinessMembership(userId, deal.businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])
  }

  const ext = normalizeFormat(extensionFromFilename(body.originalFilename))
  const mimeOk = policy.mimeTypes.includes(body.mimeType.toLowerCase())
  const formatOk = !ext || policy.formats.includes(ext)
  if (!mimeOk && !formatOk) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'That file type is not allowed for this upload.')
  }
  if (body.bytes > policy.maxBytes) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'That file is larger than the allowed maximum.')
  }

  if (body.purpose !== 'avatar') {
    const readyCount = await prisma.mediaAsset.count({
      where: { uploadedByUserId: userId, status: 'READY', deletedAt: null },
    })
    if (readyCount >= DEFAULT_USER_READY_QUOTA) {
      throw new AppError(429, 'QUOTA_EXCEEDED', 'You have reached the media upload limit for this account.')
    }
  } else {
    void AVATAR_QUOTA_NOTE
  }

  const folder = chooseFolder(env, body.purpose, userId, body.businessId, body.listingId, body.eventId, body.dealId)
  const ttl = env.CLOUDINARY_UPLOAD_SIGNATURE_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttl * 1000)
  const timestamp = Math.floor(Date.now() / 1000)

  const intent = await prisma.mediaUploadIntent.create({
    data: {
      userId,
      purpose: body.purpose,
      expectedResourceType: policy.resourceType === 'auto' ? 'auto' : policy.resourceType,
      maxBytes: policy.maxBytes,
      permittedFormats: policy.formats,
      folder,
      businessId: body.businessId,
      listingId: body.listingId,
      eventId: body.eventId,
      dealId: body.dealId,
      draftId: body.draftId,
      originalFilename: body.originalFilename.slice(0, 255),
      reportedMimeType: body.mimeType.slice(0, 128),
      reportedBytes: body.bytes,
      status: 'PENDING',
      expiresAt,
    },
  })

  const contextStr = `delve_intent_id=${intent.id}${body.draftId ? `|delve_draft_id=${body.draftId}` : ''}`
  const signParams: Record<string, string | number> = {
    folder,
    timestamp,
    context: contextStr,
  }
  if (body.purpose === 'story') {
    signParams.tags = 'delvers_story,delete_after_24h'
  }
  if (body.purpose === 'event') {
    signParams.moderation = 'aws_rek'
  }

  const signature = signCloudinaryParams(signParams, env.CLOUDINARY_API_SECRET!)
  const completionToken = signCloudinaryParams(
    { upload_intent_id: intent.id },
    env.CLOUDINARY_API_SECRET!,
  )
  const resourceType =
    policy.resourceType === 'video' ? 'video' : policy.resourceType === 'auto' ? 'auto' : 'image'
  const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`

  recordMediaMetric('upload_intent_created', {
    purpose: body.purpose,
    resourceType,
    bytes: body.bytes,
  })

  return {
    uploadIntentId: intent.id,
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    uploadUrl,
    folder,
    resourceType: resourceType as MediaUploadSignatureResponse['resourceType'],
    allowedFormats: policy.formats,
    maxBytes: policy.maxBytes,
    expiresAt: expiresAt.toISOString(),
    requiredParams: {
      folder,
      timestamp: String(timestamp),
      signature,
      api_key: env.CLOUDINARY_API_KEY!,
      context: contextStr,
      ...(signParams.tags ? { tags: String(signParams.tags) } : {}),
      ...(signParams.moderation ? { moderation: String(signParams.moderation) } : {}),
    },
    completionToken,
    chunkThresholdBytes: 100 * 1024 * 1024,
    chunkSizeBytes: 6 * 1024 * 1024,
  }
}

export async function completeUpload(env: Env, userId: string, body: MediaCompleteBody): Promise<MediaAssetDto> {
  const started = Date.now()
  if (!env.cloudinaryConfigured) {
    throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Media uploads are not configured yet.')
  }

  const intent = await prisma.mediaUploadIntent.findUnique({ where: { id: body.uploadIntentId } })
  if (!intent || intent.userId !== userId) {
    throw new AppError(404, 'INTENT_NOT_FOUND', 'Upload intent not found.')
  }
  if (intent.status === 'COMPLETED') {
    const existing = await prisma.mediaAsset.findUnique({ where: { uploadIntentId: intent.id } })
    if (existing) {
      // Idempotent retry: re-link profile in case the first complete created media
      // but failed to attach avatar/cover (e.g. missing TravelerProfile row).
      if (intent.purpose === 'avatar' || intent.purpose === 'cover') {
        await prisma.$transaction(async tx => {
          await ensureProfileAndLinkMedia(tx, env, userId, intent.purpose, existing)
        })
      }
      return toDto(env, existing)
    }
  }
  if (intent.status !== 'PENDING') {
    throw new AppError(400, 'INTENT_USED', 'This upload intent has already been used.')
  }
  if (intent.expiresAt.getTime() <= Date.now()) {
    await prisma.mediaUploadIntent.update({ where: { id: intent.id }, data: { status: 'EXPIRED' } })
    throw new AppError(400, 'INTENT_EXPIRED', 'This upload intent has expired. Request a new signature.')
  }

  const verifyParams: Record<string, string | number> = {
    public_id: body.publicId,
    resource_type: body.resourceType,
    format: body.format,
    bytes: body.bytes,
  }
  if (body.version) verifyParams.version = body.version
  if (body.cloudinaryAssetId) verifyParams.asset_id = body.cloudinaryAssetId

  const expectedCompletion = signCloudinaryParams(
    { upload_intent_id: intent.id },
    env.CLOUDINARY_API_SECRET!,
  )
  const expectedFields = signCloudinaryParams(verifyParams, env.CLOUDINARY_API_SECRET!)
  const folderOk = body.publicId === intent.folder || body.publicId.startsWith(`${intent.folder}/`)
  if (!folderOk) {
    recordMediaMetric('upload_failed', { reason: 'folder_mismatch' })
    throw new AppError(400, 'TAMPERED_METADATA', 'Upload result does not match the authorized folder.')
  }

  const signatureOk =
    safeEqualHex(expectedCompletion, body.signature) || safeEqualHex(expectedFields, body.signature)
  if (!signatureOk) {
    recordMediaMetric('upload_failed', { reason: 'signature_invalid' })
    throw new AppError(400, 'SIGNATURE_INVALID', 'Cloudinary response signature is invalid.')
  }

  const format = normalizeFormat(body.format)
  if (!intent.permittedFormats.map(normalizeFormat).includes(format)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Returned format is not permitted for this upload.')
  }
  if (body.bytes > intent.maxBytes) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Returned file size exceeds the allowed maximum.')
  }

  const expectedType = intent.expectedResourceType
  if (expectedType !== 'auto' && body.resourceType !== expectedType && body.resourceType !== 'auto') {
    throw new AppError(400, 'TAMPERED_METADATA', 'Returned resource type does not match the upload intent.')
  }

  const status = body.resourceType === 'video' ? 'PROCESSING' : 'READY'

  const asset = await prisma.$transaction(async tx => {
    if (intent.purpose === 'avatar') {
      const previous = await tx.mediaAsset.findMany({
        where: {
          uploadedByUserId: userId,
          purpose: 'avatar',
          status: { in: ['READY', 'PROCESSING', 'PENDING', 'UPLOADING'] },
          deletedAt: null,
        },
      })
      for (const prev of previous) {
        await tx.mediaAsset.update({
          where: { id: prev.id },
          data: { status: 'DELETION_PENDING', deletedAt: new Date() },
        })
      }
    }

    const byPublicId = await tx.mediaAsset.findUnique({ where: { publicId: body.publicId } })
    if (byPublicId) {
      // Soft-delete of prior avatars can hit the same publicId on overwrite retries.
      // Revive the row and always (re)link the traveler profile.
      const revived =
        byPublicId.deletedAt ||
        byPublicId.status === 'DELETION_PENDING' ||
        byPublicId.status === 'DELETED'
          ? await tx.mediaAsset.update({
              where: { id: byPublicId.id },
              data: {
                status,
                deletedAt: null,
                uploadIntentId: intent.id,
                version: body.version ?? byPublicId.version,
                format,
                bytes: body.bytes,
                width: body.width ?? byPublicId.width,
                height: body.height ?? byPublicId.height,
                secureUrl: body.secureUrl ?? byPublicId.secureUrl,
                altText: body.altText || byPublicId.altText,
              },
            })
          : byPublicId

      await tx.mediaUploadIntent.update({
        where: { id: intent.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      await ensureProfileAndLinkMedia(tx, env, userId, intent.purpose, revived)
      return revived
    }

    const created = await tx.mediaAsset.create({
      data: {
        cloudinaryAssetId: body.cloudinaryAssetId || null,
        publicId: body.publicId,
        version: body.version ?? null,
        resourceType: body.resourceType === 'auto' ? 'image' : body.resourceType,
        format,
        bytes: body.bytes,
        width: body.width ?? null,
        height: body.height ?? null,
        duration: body.duration ?? null,
        secureUrl: body.secureUrl ?? null,
        status,
        purpose: intent.purpose,
        altText: body.altText || null,
        uploadedByUserId: userId,
        businessId: intent.businessId,
        listingId: intent.listingId,
        eventId: intent.eventId,
        dealId: intent.dealId,
        uploadIntentId: intent.id,
      },
    })

    await tx.mediaUploadIntent.update({
      where: { id: intent.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await ensureProfileAndLinkMedia(tx, env, userId, intent.purpose, created)

    // First image for a listing becomes cover when none is set (media optional; videos never auto-cover).
    if (
      intent.purpose === 'listing' &&
      intent.listingId &&
      (body.resourceType === 'image' || body.resourceType === 'auto')
    ) {
      const listing = await tx.listing.findUnique({
        where: { id: intent.listingId },
        select: { coverMediaId: true },
      })
      if (listing && !listing.coverMediaId) {
        await tx.listing.update({
          where: { id: intent.listingId },
          data: { coverMediaId: created.id },
        })
      }
    }

    // First image for an event becomes cover when none is set.
    if (
      intent.purpose === 'event' &&
      intent.eventId &&
      (body.resourceType === 'image' || body.resourceType === 'auto')
    ) {
      const event = await tx.travelerEvent.findUnique({
        where: { id: intent.eventId },
        select: { coverMediaId: true },
      })
      if (event && !event.coverMediaId) {
        const isVideo = created.resourceType === 'video'
        const coverUrl = env.CLOUDINARY_CLOUD_NAME
          ? buildDeliveryUrl({
              cloudName: env.CLOUDINARY_CLOUD_NAME,
              publicId: created.publicId,
              version: created.version,
              resourceType: created.resourceType,
              width: isVideo ? undefined : 1600,
              crop: isVideo ? undefined : 'fill',
              gravity: isVideo ? undefined : 'auto',
            })
          : created.secureUrl
        await tx.travelerEvent.update({
          where: { id: intent.eventId },
          data: { coverMediaId: created.id, coverUrl: coverUrl ?? created.secureUrl },
        })
      }
    }

    if (
      intent.purpose === 'deal' &&
      intent.dealId &&
      (body.resourceType === 'image' || body.resourceType === 'auto')
    ) {
      const deal = await tx.deal.findUnique({
        where: { id: intent.dealId },
        select: { coverMediaId: true },
      })
      if (deal && !deal.coverMediaId) {
        await tx.deal.update({
          where: { id: intent.dealId },
          data: { coverMediaId: created.id },
        })
      }
    }

    return created
  })

  recordMediaMetric('upload_completed', {
    purpose: intent.purpose,
    resourceType: body.resourceType,
    bytes: body.bytes,
    latencyMs: Date.now() - started,
  })

  return toDto(env, asset)
}

export async function deleteMedia(env: Env, userId: string, mediaId: string) {
  const row = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, uploadedByUserId: userId, deletedAt: null },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Media not found')

  await prisma.mediaAsset.update({
    where: { id: row.id },
    data: { status: 'DELETION_PENDING' },
  })

  const resourceType = row.resourceType === 'video' ? 'video' : row.resourceType === 'raw' ? 'raw' : 'image'
  let destroyed: { ok: boolean; result?: string } = { ok: false, result: 'skipped' }
  try {
    destroyed = await destroyCloudinaryAsset(env, row.publicId, resourceType)
  } catch {
    recordMediaMetric('deletion_failed', { category: 'network' })
    throw new AppError(502, 'DELETION_FAILED', 'Cloudinary deletion failed. Please try again.')
  }

  if (!destroyed.ok) {
    recordMediaMetric('deletion_failed', { category: destroyed.result || 'unknown' })
    throw new AppError(502, 'DELETION_FAILED', 'Cloudinary deletion failed. Please try again.')
  }

  await prisma.mediaAsset.update({
    where: { id: row.id },
    data: { status: 'DELETED', deletedAt: new Date() },
  })

  if (row.purpose === 'avatar') {
    await prisma.travelerProfile.updateMany({
      where: { userId, avatarMediaId: row.id },
      data: { avatarMediaId: null, avatarUrl: null, avatarKey: null },
    })
  }

  if (row.purpose === 'cover') {
    await prisma.travelerProfile.updateMany({
      where: { userId, coverMediaId: row.id },
      data: { coverMediaId: null, coverUrl: null },
    })
  }

  if (row.listingId) {
    await prisma.listing.updateMany({
      where: { id: row.listingId, coverMediaId: row.id },
      data: { coverMediaId: null },
    })
  }

  if (row.eventId) {
    await prisma.travelerEvent.updateMany({
      where: { id: row.eventId, coverMediaId: row.id },
      data: { coverMediaId: null, coverUrl: null },
    })
  }

  if (row.dealId) {
    await prisma.deal.updateMany({
      where: { id: row.dealId, coverMediaId: row.id },
      data: { coverMediaId: null },
    })
  }

  await prisma.securityEvent.create({
    data: {
      userId,
      type: 'media_deleted',
      metadata: { mediaId: row.id, purpose: row.purpose },
    },
  })

  return { id: row.id, status: 'DELETED' as const, message: 'Media deleted' }
}

export async function handleCloudinaryWebhook(env: Env, rawBody: string, timestamp: string, signature: string) {
  const secret = env.CLOUDINARY_WEBHOOK_SECRET?.trim() || env.CLOUDINARY_API_SECRET || ''
  if (!secret || !verifyCloudinaryNotification(rawBody, timestamp, signature, secret)) {
    throw new AppError(401, 'SIGNATURE_INVALID', 'Invalid webhook signature')
  }

  let payload: {
    notification_type?: string
    asset_id?: string
    public_id?: string
    version?: number
    width?: number
    height?: number
    format?: string
    resource_type?: 'image' | 'video' | 'raw'
    bytes?: number
    secure_url?: string
    url?: string
    moderation_status?: 'approved' | 'rejected' | 'pending'
    moderation_kind?: string
    moderation?: Array<{ kind?: string; status?: 'approved' | 'rejected' | 'pending' }>
    raw_convert_status?: string
    resources?: Array<{ secure_url?: string; url?: string }>
    context?: {
      custom?: Record<string, string>
    } | string
    error?: { message?: string }
  }

  try {
    payload = JSON.parse(rawBody) as typeof payload
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid webhook body')
  }

  const publicId = payload.public_id
  if (!publicId) return { ok: true, ignored: true }

  const existingAsset = await prisma.mediaAsset.findUnique({ where: { publicId } })

  // 1. Intercept AI Moderation Notifications (NSFW / Content Safety)
  const isModerationNotification =
    payload.notification_type === 'moderation' || Boolean(payload.moderation_status) || Boolean(payload.moderation)

  if (isModerationNotification && existingAsset) {
    const isRejected =
      payload.moderation_status === 'rejected' ||
      (Array.isArray(payload.moderation) && payload.moderation.some(m => m.status === 'rejected'))

    if (isRejected) {
      await prisma.mediaAsset.update({
        where: { id: existingAsset.id },
        data: {
          moderationStatus: 'REJECTED',
          status: 'FAILED',
          moderationReason: 'AI moderation flagged NSFW content',
        },
      })
      // Purge offensive binary from Cloudinary in background
      const resType =
        existingAsset.resourceType === 'video' ? 'video' : existingAsset.resourceType === 'raw' ? 'raw' : 'image'
      void destroyCloudinaryAsset(env, publicId, resType).catch(() => {})
      recordMediaMetric('moderation_rejected', { publicId })
      return { ok: true, moderated: 'rejected' }
    } else {
      await prisma.mediaAsset.update({
        where: { id: existingAsset.id },
        data: {
          moderationStatus: 'APPROVED',
        },
      })
      recordMediaMetric('moderation_approved', { publicId })
      return { ok: true, moderated: 'approved' }
    }
  }

  // Extract intent ID if passed in context string or object
  let intentId: string | undefined
  let draftId: string | undefined
  if (typeof payload.context === 'object' && payload.context?.custom) {
    intentId = payload.context.custom.delve_intent_id
    draftId = payload.context.custom.delve_draft_id
  } else if (typeof payload.context === 'string') {
    const intentMatch = payload.context.match(/delve_intent_id=([^|;,\s]+)/)
    if (intentMatch) intentId = intentMatch[1]
    const draftMatch = payload.context.match(/delve_draft_id=([^|;,\s]+)/)
    if (draftMatch) draftId = draftMatch[1]
  }

  if (payload.error?.message) {
    if (existingAsset && existingAsset.status !== 'FAILED') {
      await prisma.mediaAsset.update({ where: { id: existingAsset.id }, data: { status: 'FAILED' } })
    }
    recordMediaMetric('upload_failed', { reason: 'processing' })
    return { ok: true }
  }

  if (existingAsset) {
    if (existingAsset.status === 'PROCESSING' || existingAsset.status === 'PENDING' || existingAsset.status === 'UPLOADING') {
      await prisma.mediaAsset.update({
        where: { id: existingAsset.id },
        data: {
          status: 'READY',
          ...(payload.bytes ? { bytes: payload.bytes } : {}),
          ...(payload.width ? { width: payload.width } : {}),
          ...(payload.height ? { height: payload.height } : {}),
          ...(payload.secure_url ? { secureUrl: payload.secure_url } : {}),
        },
      })
    }
    return { ok: true }
  }

  // If asset record doesn't exist yet (client dropped connection before /complete):
  // Recover orphaned upload via matching MediaUploadIntent
  if (intentId) {
    const intent = await prisma.mediaUploadIntent.findUnique({ where: { id: intentId } })
    if (intent && (intent.status === 'PENDING' || intent.status === 'EXPIRED')) {
      const resType = (payload.resource_type || intent.expectedResourceType || 'image').toLowerCase()
      const resourceType = resType === 'video' ? 'video' : resType === 'raw' ? 'raw' : 'image'
      
      const createdAsset = await prisma.$transaction(async tx => {
        const row = await tx.mediaAsset.create({
          data: {
            cloudinaryAssetId: payload.asset_id ?? null,
            publicId,
            version: payload.version ?? null,
            resourceType,
            format: payload.format ?? null,
            bytes: payload.bytes ?? intent.reportedBytes ?? null,
            width: payload.width ?? null,
            height: payload.height ?? null,
            secureUrl: payload.secure_url ?? null,
            status: 'READY',
            purpose: intent.purpose,
            uploadedByUserId: intent.userId,
            businessId: intent.businessId,
            listingId: intent.listingId,
            eventId: intent.eventId,
            dealId: intent.dealId,
            draftId: draftId || intent.draftId,
            uploadIntentId: intent.id,
          },
        })

        await tx.mediaUploadIntent.update({
          where: { id: intent.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })

        await ensureProfileAndLinkMedia(tx, env, intent.userId, intent.purpose, {
          id: row.id,
          publicId: row.publicId,
          version: row.version,
        })

        return row
      })

      recordMediaMetric('upload_completed', {
        purpose: intent.purpose,
        resourceType: createdAsset.resourceType,
        source: 'webhook_recovery',
      })
      return { ok: true, recovered: true, id: createdAsset.id }
    }
  }

  return { ok: true, ignored: true }
}

export async function cleanupMediaRecords(env: Env) {
  const now = new Date()
  const expiredIntents = await prisma.mediaUploadIntent.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  })
  recordMediaMetric('abandoned_upload_intent', { count: expiredIntents.count })

  const oldExpired = await prisma.mediaUploadIntent.deleteMany({
    where: {
      status: { in: ['EXPIRED', 'CANCELLED', 'FAILED'] },
      createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  })

  let expiredStorySlides = 0
  let destroyedStoryMedia = 0
  try {
    const { cleanupExpiredStories } = await import('../social/story.service.js')
    const stories = await cleanupExpiredStories(env)
    expiredStorySlides = stories.expiredSlides
    destroyedStoryMedia = stories.destroyedMedia
  } catch {
    // Story tables may be missing during rolling deploys.
  }

  return {
    expiredIntents: expiredIntents.count,
    deletedIntentRows: oldExpired.count,
    expiredStorySlides,
    destroyedStoryMedia,
  }
}
