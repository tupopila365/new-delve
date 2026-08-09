import type { MediaKind, StudioContext, UploadLimits, UploadStatus } from './types'
import { studioModeForContext } from './config'

export function detectMimeKind(mimeType: string, fileName = ''): 'image' | 'video' | 'unknown' {
  const mime = mimeType.toLowerCase()
  const name = fileName.toLowerCase()
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/.test(name)) return 'image'
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/.test(name)) return 'video'
  return 'unknown'
}

export function classifyStudioMedia(
  files: File[],
  context: StudioContext,
): MediaKind {
  const mode = studioModeForContext(context)
  if (mode === 'restricted') {
    if (context === 'identity-verification' || context === 'business-document' || context === 'transport-permit' || context === 'insurance') {
      return 'verification-document'
    }
    if (context === 'safety-report' || context === 'support-evidence') return 'support-evidence'
    if (context === 'payment-dispute' || context === 'refund-evidence') return 'dispute-evidence'
    return 'review-evidence'
  }

  const kinds = files.map(f => detectMimeKind(f.type, f.name)).filter(k => k !== 'unknown')
  const hasImage = kinds.includes('image')
  const hasVideo = kinds.includes('video')
  if (hasImage && hasVideo) return 'mixed'
  if (hasVideo) {
    if (['listing', 'accommodation', 'transport', 'deal', 'business-content'].includes(context)) {
      return 'commercial-listing'
    }
    return 'audio-supported-video'
  }
  return 'image'
}

export async function readVideoMetadata(file: File, objectUrl: string): Promise<{
  duration: number
  width: number
  height: number
  hasAudio: boolean
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      cleanup()
      // Browser APIs do not reliably expose audio track presence without decoding.
      // Mark unknown-as-true for social preview; restricted flows can still mute.
      resolve({ duration, width, height, hasAudio: true })
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('corrupted'))
    }
  })
}

export async function readImageMetadata(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('corrupted'))
    img.src = objectUrl
  })
}

export function validateAgainstLimits(input: {
  kind: 'image' | 'video'
  fileSize: number
  duration?: number
  width: number
  height: number
  mimeType: string
  limits: UploadLimits
}): UploadStatus {
  const { kind, fileSize, duration = 0, width, height, mimeType, limits } = input
  if (!limits.acceptedMimeTypes.includes(mimeType) && !limits.acceptedMimeTypes.some(t => mimeType.startsWith(t.split('/')[0]))) {
    // Allow common subtypes when config lists family examples
    const ok =
      (kind === 'image' && mimeType.startsWith('image/')) ||
      (kind === 'video' && mimeType.startsWith('video/'))
    if (!ok) return 'unsupported-format'
  }
  if (fileSize > limits.maxFileSizeBytes) return 'file-too-large'
  if (kind === 'video') {
    if (duration > 0 && duration < limits.minDurationSec) return 'video-too-short'
    if (duration > limits.maxDurationSec) return 'video-too-long'
  }
  if (width > 0 && height > 0 && (width < limits.minWidth || height < limits.minHeight)) {
    return 'resolution-too-low'
  }
  return 'ready'
}

export function orientationOf(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (width === height) return 'square'
  return width > height ? 'landscape' : 'portrait'
}
