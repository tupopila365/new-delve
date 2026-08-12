import { createHash, timingSafeEqual } from 'node:crypto'
import type { Env } from '../../config/env.js'
import type { MediaPurpose, MediaResourceType } from '@delve/contracts'

export type PurposePolicy = {
  resourceType: MediaResourceType
  maxBytes: number
  formats: string[]
  mimeTypes: string[]
  requiresBusiness: boolean
  requiresListing: boolean
  /** When true, purpose is rejected until Day 3 models exist. */
  notYetAvailable?: boolean
}

export function purposePolicies(env: Env): Record<MediaPurpose, PurposePolicy> {
  return {
    avatar: {
      resourceType: 'image',
      maxBytes: 5 * 1024 * 1024,
      formats: ['jpg', 'jpeg', 'png', 'webp'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      requiresBusiness: false,
      requiresListing: false,
    },
    cover: {
      resourceType: 'image',
      maxBytes: 10 * 1024 * 1024,
      formats: ['jpg', 'jpeg', 'png', 'webp'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      requiresBusiness: false,
      requiresListing: false,
    },
    post: {
      resourceType: 'auto',
      maxBytes: env.CLOUDINARY_MAX_VIDEO_BYTES,
      formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'],
      requiresBusiness: false,
      requiresListing: false,
    },
    review: {
      resourceType: 'image',
      maxBytes: 10 * 1024 * 1024,
      formats: ['jpg', 'jpeg', 'png', 'webp'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      requiresBusiness: false,
      requiresListing: false,
      notYetAvailable: true,
    },
    business_profile: {
      resourceType: 'image',
      maxBytes: 10 * 1024 * 1024,
      formats: ['jpg', 'jpeg', 'png', 'webp'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      requiresBusiness: true,
      requiresListing: false,
    },
    listing: {
      resourceType: 'auto',
      maxBytes: env.CLOUDINARY_MAX_VIDEO_BYTES,
      formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'],
      requiresBusiness: true,
      requiresListing: true,
    },
    message: {
      resourceType: 'auto',
      maxBytes: 25 * 1024 * 1024,
      formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
      requiresBusiness: false,
      requiresListing: false,
      notYetAvailable: true,
    },
  }
}

export function chooseFolder(
  env: Env,
  purpose: MediaPurpose,
  userId: string,
  businessId?: string,
  listingId?: string,
): string {
  const prefix = (env.CLOUDINARY_FOLDER_PREFIX || 'delve').replace(/\/$/, '')
  switch (purpose) {
    case 'avatar':
      return `${prefix}/users/${userId}/avatars`
    case 'cover':
      return `${prefix}/users/${userId}/covers`
    case 'post':
    case 'review':
    case 'message':
      return `${prefix}/users/${userId}/${purpose}s`
    case 'business_profile':
      return `${prefix}/businesses/${businessId}/profiles`
    case 'listing':
      return `${prefix}/businesses/${businessId}/listings/${listingId}`
    default:
      return `${prefix}/users/${userId}/misc`
  }
}

export function extensionFromFilename(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) || '') : ''
}

export function normalizeFormat(format: string): string {
  const f = format.toLowerCase().replace(/^\./, '')
  if (f === 'jpeg') return 'jpg'
  return f
}

/**
 * Cloudinary signed-parameter algorithm (SHA-1 of sorted key=value pairs + api_secret).
 * Never log api_secret or the resulting string-to-sign in production.
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export function verifyCloudinaryNotification(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHash('sha1').update(rawBody + timestamp + secret).digest('hex')
  return safeEqualHex(expected, signature)
}

export function buildDeliveryUrl(input: {
  cloudName: string
  publicId: string
  version?: number | null
  resourceType?: string
  width?: number
  height?: number
  crop?: string
  gravity?: string
}): string {
  const transforms = ['f_auto', 'q_auto']
  if (input.width) transforms.push(`w_${input.width}`)
  if (input.height) transforms.push(`h_${input.height}`)
  if (input.crop) transforms.push(`c_${input.crop}`)
  if (input.gravity) transforms.push(`g_${input.gravity}`)
  const version = input.version ? `/v${input.version}` : ''
  const resource = input.resourceType === 'video' ? 'video' : 'image'
  return `https://res.cloudinary.com/${input.cloudName}/${resource}/upload/${transforms.join(',')}${version}/${input.publicId}`
}

export type CloudinaryDestroyResult = { ok: boolean; result?: string }

export async function destroyCloudinaryAsset(
  env: Env,
  publicId: string,
  resourceType: 'image' | 'video' | 'raw',
): Promise<CloudinaryDestroyResult> {
  if (!env.cloudinaryConfigured) return { ok: false, result: 'not_configured' }
  const cloud = env.CLOUDINARY_CLOUD_NAME!
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { public_id: publicId, timestamp }
  const signature = signCloudinaryParams(params, env.CLOUDINARY_API_SECRET!)
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: env.CLOUDINARY_API_KEY!,
    signature,
  })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => null)) as { result?: string } | null
  const result = json?.result || ''
  return { ok: res.ok && (result === 'ok' || result === 'not found'), result }
}
