/**
 * Upload studio files to Cloudinary for a given media purpose.
 */

import type { MediaAssetDto, MediaPurpose } from '@delve/contracts'
import {
  completeMediaUpload,
  requestUploadSignature,
  uploadFileToCloudinary,
  validateLocalFile,
} from '../media/cloudinaryUploadClient'
import type { StudioContext } from './types'

const MAX_STUDIO_MEDIA = 10

export type StudioUploadFile = {
  file: File
  altText?: string
}

export type StudioUploadOptions = {
  purpose: MediaPurpose
  businessId?: string
  listingId?: string
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

function normalizeUploadFiles(files: Array<File | StudioUploadFile>): StudioUploadFile[] {
  return files.map(entry => (entry instanceof File ? { file: entry } : entry))
}

/** Map Media Studio contexts to Backend V2 media purposes that actually exist. */
export function purposeForStudioContext(context: StudioContext): MediaPurpose | null {
  switch (context) {
    case 'delvers-post':
    case 'delvers-short':
    case 'journey':
    case 'journey-highlight':
    case 'event':
    case 'community':
      return 'post'
    case 'message':
      return 'message'
    case 'delvers-story':
      return 'story'
    case 'listing':
    case 'deal':
    case 'activity':
    case 'accommodation':
    case 'transport':
      return 'listing'
    case 'business-content':
      return 'business_profile'
    case 'traveler-profile':
      return 'cover'
    case 'review':
      return 'review'
    default:
      return null
  }
}

export function isDelversSocialContext(context: StudioContext): boolean {
  return context === 'delvers-post' || context === 'delvers-short'
}

export function isDelversStoryContext(context: StudioContext): boolean {
  return context === 'delvers-story'
}

export function isJourneyMediaContext(context: StudioContext): boolean {
  return context === 'journey' || context === 'journey-highlight'
}

export function isEventMediaContext(context: StudioContext): boolean {
  return context === 'event'
}

/** Traveler journey/event covers uploaded through Media Studio (purpose: post). */
export function isTravelerCoverContext(context: StudioContext): boolean {
  return isJourneyMediaContext(context) || isEventMediaContext(context)
}

export function coverPatchFromStudioAsset(asset: MediaAssetDto): {
  coverMediaId: string
  preview: string
  previewResourceType: 'image' | 'video'
} {
  return {
    coverMediaId: asset.id,
    preview: asset.delivery.url,
    previewResourceType: asset.resourceType === 'video' ? 'video' : 'image',
  }
}

const MAX_STORY_MEDIA = 5

export { MAX_STUDIO_MEDIA as MAX_POST_MEDIA, MAX_STORY_MEDIA }

export async function uploadStudioMediaFiles(
  files: Array<File | StudioUploadFile>,
  options: StudioUploadOptions,
): Promise<MediaAssetDto[]> {
  const cap = options.purpose === 'story' ? MAX_STORY_MEDIA : MAX_STUDIO_MEDIA
  const list = normalizeUploadFiles(files).slice(0, cap)
  if (!list.length) throw new Error('Add at least one photo or video.')

  const purpose = options.purpose
  if (purpose === 'listing') {
    if (!options.businessId || !options.listingId) {
      throw new Error('Listing uploads need a business and listing.')
    }
  }
  if (purpose === 'business_profile' && !options.businessId) {
    throw new Error('Business media needs a business id.')
  }

  const saved: MediaAssetDto[] = []
  for (let i = 0; i < list.length; i++) {
    const { file, altText } = list[i]
    const local = validateLocalFile(file, purpose)
    if (!local.ok) throw new Error(local.error || 'Invalid file')

    const sign = await requestUploadSignature({
      purpose,
      originalFilename: file.name || 'upload',
      mimeType: file.type || 'application/octet-stream',
      bytes: file.size,
      ...(options.businessId ? { businessId: options.businessId } : {}),
      ...(options.listingId ? { listingId: options.listingId } : {}),
    })
    const result = await uploadFileToCloudinary(file, sign, {
      signal: options.signal,
      onProgress: ratio => {
        options.onProgress?.((i + ratio) / list.length)
      },
    })
    const asset = await completeMediaUpload({
      uploadIntentId: sign.uploadIntentId,
      completionToken: sign.completionToken,
      result,
      ...(altText?.trim() ? { altText: altText.trim() } : {}),
    })
    saved.push(asset)
    options.onProgress?.((i + 1) / list.length)
  }
  return saved
}

/** @deprecated Prefer uploadStudioMediaFiles with purpose: 'post' */
export async function uploadPostMediaFiles(
  files: File[],
  options?: {
    onProgress?: (ratio: number) => void
    signal?: AbortSignal
  },
): Promise<MediaAssetDto[]> {
  return uploadStudioMediaFiles(files, {
    purpose: 'post',
    onProgress: options?.onProgress,
    signal: options?.signal,
  })
}
