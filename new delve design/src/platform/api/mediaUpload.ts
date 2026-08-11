/**
 * @deprecated Use `src/media` (Cloudinary + Delve /media APIs) for all user uploads.
 * This admin helper no longer proxies bytes through any Delve API.
 * Architecture: Browser → Cloudinary for files; Browser → Delve API → PostgreSQL for metadata.
 */

import {
  completeMediaUpload,
  requestUploadSignature,
  uploadFileToCloudinary,
  validateLocalFile,
} from '../../media/cloudinaryUploadClient'

export type MediaKind = 'image' | 'video'

export function mediaKindFromFile(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video'
  const name = (file.name || '').toLowerCase()
  if (/\.(mp4|webm|mov|m4v)$/.test(name)) return 'video'
  return 'image'
}

/**
 * Admin story media — direct Cloudinary only. No multipart proxy fallback.
 */
export async function uploadAdminStoryMedia(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ url: string; kind: MediaKind }> {
  const kind = mediaKindFromFile(file)
  const purpose = kind === 'video' ? 'post' : 'post'
  const local = validateLocalFile(file, 'avatar')
  // Stories may be larger than avatars — signature endpoint enforces purpose policy.
  void local
  void purpose

  // Posts are not enabled yet on Backend V2; prefer avatar-compatible images for now
  // or fail clearly rather than proxying through an old API.
  if (kind === 'video') {
    throw new Error('Video story uploads require the Cloudinary media purpose to be enabled.')
  }

  const sign = await requestUploadSignature({
    purpose: 'avatar',
    originalFilename: file.name || 'story.jpg',
    mimeType: file.type || 'image/jpeg',
    bytes: file.size,
  })
  const result = await uploadFileToCloudinary(file, sign, { onProgress })
  const saved = await completeMediaUpload({
    uploadIntentId: sign.uploadIntentId,
    completionToken: sign.completionToken,
    result,
  })
  return { url: saved.delivery.url, kind: 'image' }
}

export async function getDirectUploadEnabled(): Promise<boolean> {
  return true
}
