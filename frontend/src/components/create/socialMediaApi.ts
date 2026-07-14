import type { Adjustments, CropSettings, MediaFilter, MediaKind, StickerOverlay, TextOverlay, DrawStroke, VideoTrim } from './types'
import { renderEditedImage } from './mediaUtils'
import { fetchCloudinarySign, uploadFileToCloudinary } from './cloudinaryUpload'
import { prepareDelversVideoForUpload } from '../../utils/delversVideoUtils'

export type SlideUploadStatus = 'idle' | 'pending' | 'uploading' | 'ready' | 'error'

export type SlideUploadState = {
  status: SlideUploadStatus
  publicId?: string
  secureUrl?: string
  /** Content hash — when it matches, skip re-upload. */
  fingerprint?: string
  error?: string
  /** 0–1 while uploading (chunked video). */
  progress?: number
}

export type SocialSlideUploadInput = {
  id: string
  file: File
  mediaKind: MediaKind
  filter: MediaFilter
  filterIntensity: number
  adjustments: Adjustments
  crop: CropSettings
  videoDuration: number
  videoTrim: VideoTrim
  textOverlays: TextOverlay[]
  stickers: StickerOverlay[]
  strokes: DrawStroke[]
  upload: SlideUploadState
}

const UPLOAD_CONCURRENCY = 3
let directUploadCache: boolean | null = null

/** Cached feature check — avoids a sign round-trip per slide. */
let gradeDeliveryCache: boolean | null = null

export async function getDirectUploadEnabled(): Promise<boolean> {
  if (directUploadCache != null) return directUploadCache
  try {
    const sign = await fetchCloudinarySign('image')
    directUploadCache = Boolean(sign.direct_upload)
    if (sign.direct_upload) {
      gradeDeliveryCache = Boolean(sign.grade_delivery)
    }
    return directUploadCache
  } catch {
    directUploadCache = false
    return false
  }
}

/** True when the API applies approximate colour grade on Cloudinary delivery. */
export async function getGradeDeliveryEnabled(): Promise<boolean> {
  if (gradeDeliveryCache != null) return gradeDeliveryCache
  await getDirectUploadEnabled()
  return Boolean(gradeDeliveryCache)
}

/** Reset the cached Cloudinary availability (e.g. after env change in tests). */
export function resetDirectUploadCache(): void {
  directUploadCache = null
  gradeDeliveryCache = null
}

/**
 * Video uploads are the raw source file — edits travel as metadata at Share.
 * Images bake client-side, so the fingerprint covers visual edit state too.
 */
export function computeSlideFingerprint(slide: SocialSlideUploadInput): string {
  if (slide.mediaKind === 'video') {
    return `v:${slide.file.name}:${slide.file.size}:${slide.file.lastModified}`
  }
  const overlays = JSON.stringify({
    t: slide.textOverlays.map((o) => ({
      id: o.id,
      text: o.text,
      x: o.x,
      y: o.y,
      font: o.font,
      fontSize: o.fontSize,
      color: o.color,
      bgColor: o.bgColor,
      hasBg: o.hasBg,
      shadow: o.shadow,
      align: o.align,
    })),
    s: slide.stickers.map((st) => ({
      id: st.id,
      emoji: st.emoji,
      x: st.x,
      y: st.y,
      size: st.size,
      rotation: st.rotation,
    })),
    d: slide.strokes,
  })
  return [
    `i:${slide.file.name}:${slide.file.size}:${slide.file.lastModified}`,
    slide.filter,
    slide.filterIntensity,
    JSON.stringify(slide.adjustments),
    JSON.stringify(slide.crop),
    overlays,
  ].join('|')
}

export function idleUploadState(): SlideUploadState {
  return { status: 'idle' }
}

async function renderImageJpeg(slide: SocialSlideUploadInput, index: number): Promise<File> {
  const blob = await renderEditedImage(
    slide.file,
    slide.filter,
    slide.crop,
    slide.adjustments,
    slide.filterIntensity,
    {
      textOverlays: slide.textOverlays,
      stickers: slide.stickers,
      strokes: slide.strokes,
    },
  )
  return new File([blob], `post_${index}.jpg`, { type: 'image/jpeg' })
}

async function prepareVideoFile(slide: SocialSlideUploadInput): Promise<File> {
  return prepareDelversVideoForUpload(slide.file, slide.videoTrim, slide.videoDuration)
}

/**
 * Upload one slide to Cloudinary when direct upload is available.
 * Skips when fingerprint already matches a ready upload.
 * When direct upload is off, returns status idle (multipart path at Share).
 */
export async function ensureSlideUploaded(
  slide: SocialSlideUploadInput,
  index = 0,
  onProgress?: (ratio: number) => void,
): Promise<SlideUploadState> {
  const direct = await getDirectUploadEnabled()
  if (!direct) {
    return { status: 'idle' }
  }

  const fingerprint = computeSlideFingerprint(slide)
  if (
    slide.upload.status === 'ready' &&
    slide.upload.fingerprint === fingerprint &&
    slide.upload.publicId
  ) {
    return slide.upload
  }

  try {
    if (slide.mediaKind === 'video') {
      const videoFile = await prepareVideoFile(slide)
      const uploaded = await uploadFileToCloudinary(videoFile, 'video', {
        onProgress,
      })
      return {
        status: 'ready',
        publicId: uploaded.public_id,
        secureUrl: uploaded.secure_url,
        fingerprint,
        progress: 1,
      }
    }

    const jpeg = await renderImageJpeg(slide, index)
    const uploaded = await uploadFileToCloudinary(jpeg, 'image', { onProgress })
    return {
      status: 'ready',
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      fingerprint,
      progress: 1,
    }
  } catch (err) {
    return {
      status: 'error',
      fingerprint,
      error: err instanceof Error ? err.message : 'Upload failed.',
      progress: 0,
    }
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next
      next += 1
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * Ensure every slide is uploaded (or marked idle for multipart), in parallel.
 * Returns a new slides array with updated `upload` fields.
 */
export async function uploadSlidesParallel<T extends SocialSlideUploadInput>(
  slides: T[],
  concurrency = UPLOAD_CONCURRENCY,
  onSlideProgress?: (slideId: string, ratio: number) => void,
): Promise<T[]> {
  if (slides.length === 0) return slides

  const uploads = await mapPool(slides, concurrency, async (slide, index) => {
    const fingerprint = computeSlideFingerprint(slide)
    if (
      slide.upload.status === 'ready' &&
      slide.upload.fingerprint === fingerprint &&
      slide.upload.publicId
    ) {
      return slide.upload
    }
    return ensureSlideUploaded(
      { ...slide, upload: { ...slide.upload, status: 'uploading' } },
      index,
      (ratio) => onSlideProgress?.(slide.id, ratio),
    )
  })

  return slides.map((slide, i) => ({ ...slide, upload: uploads[i] }))
}

/** True when a slide still needs work before a direct-upload Share. */
export function slideNeedsUpload(slide: SocialSlideUploadInput): boolean {
  const fingerprint = computeSlideFingerprint(slide)
  return !(
    slide.upload.status === 'ready' &&
    slide.upload.fingerprint === fingerprint &&
    Boolean(slide.upload.publicId)
  )
}
