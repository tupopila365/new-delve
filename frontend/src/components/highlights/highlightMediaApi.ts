import { apiFetch } from '../../api/client'
import type { MediaKind, VideoTrim } from '../create/types'
import { isFullVideoTrim } from '../create/videoTrimUtils'
import { appendVideoEffectsToFormData, type PreparedVideoEffects } from '../create/videoEffects'
import { prepareDelversVideoForUpload } from '../../utils/delversVideoUtils'
import { uploadFileToCloudinary } from '../create/cloudinaryUpload'
import { getDirectUploadEnabled } from '../create/socialMediaApi'
import type { HighlightChannelInput } from './types'

export type HighlightMediaUploadResult = {
  url: string
  kind: MediaKind
  trim_start?: number
  trim_end?: number
}

/** Prefer Delvers-style Cloudinary direct upload; fall back to server proxy. */
async function uploadViaCloudinaryDirect(file: File, kind: MediaKind): Promise<string | null> {
  const enabled = await getDirectUploadEnabled()
  if (!enabled) return null
  try {
    const resourceType = kind === 'video' ? 'video' : 'image'
    const result = await uploadFileToCloudinary(file, resourceType)
    return result.secure_url || null
  } catch {
    return null
  }
}

export async function uploadHighlightMedia(
  file: File,
  kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image',
  trim?: VideoTrim,
  duration = 0,
  effects?: PreparedVideoEffects,
): Promise<HighlightMediaUploadResult> {
  const uploadFile =
    kind === 'video' && trim ? await prepareDelversVideoForUpload(file, trim, duration) : file

  // Fast path — same browser→Cloudinary pipeline as Delvers posts (no server bake wait).
  const hasEffects = Boolean(effects?.grade || effects?.overlayPng)
  if (!hasEffects) {
    const directUrl = await uploadViaCloudinaryDirect(uploadFile, kind)
    if (directUrl) {
      const result: HighlightMediaUploadResult = { url: directUrl, kind }
      if (kind === 'video' && trim && duration > 0 && !isFullVideoTrim(trim, duration)) {
        result.trim_start = Number(trim.start.toFixed(3))
        result.trim_end = Number(trim.end.toFixed(3))
      }
      return result
    }
  }

  const fd = new FormData()
  fd.append('file', uploadFile, uploadFile.name || (kind === 'video' ? 'clip.mp4' : 'slide.jpg'))
  if (kind === 'video' && trim && duration > 0 && !isFullVideoTrim(trim, duration)) {
    fd.append('trim_start', trim.start.toFixed(3))
    fd.append('trim_end', trim.end.toFixed(3))
  }
  if (kind === 'video' && effects) {
    appendVideoEffectsToFormData(fd, '', effects)
  }
  return apiFetch<HighlightMediaUploadResult>('/api/highlights/upload/', {
    method: 'POST',
    body: fd,
  })
}

/** Upload when we only have a data/blob preview (legacy drafts). */
export async function uploadHighlightMediaFromDataUrl(
  dataUrl: string,
  kind: MediaKind,
): Promise<HighlightMediaUploadResult> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], kind === 'video' ? 'clip.mp4' : 'slide.jpg', {
    type: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
  })
  return uploadHighlightMedia(file, kind)
}

/** Skip re-upload when already a remote http(s) URL. */
export async function ensureHighlightMediaUrl(
  src: string,
  kind: MediaKind,
  file?: File | null,
): Promise<string> {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (file) {
    const { url } = await uploadHighlightMedia(file, kind)
    return url
  }
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    const { url } = await uploadHighlightMediaFromDataUrl(src, kind)
    return url
  }
  return src
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index], index)
    }
  }
  const agents = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => run())
  await Promise.all(agents)
  return results
}

/** Upload any blob/data slide URLs before saving highlight channels (parallel). */
export async function ensureHighlightChannelsMediaUrls(
  channels: HighlightChannelInput[],
): Promise<HighlightChannelInput[]> {
  return mapPool(channels, 2, async (ch) => {
    const slides = await mapPool(ch.slides, 3, async (slide) => {
      const src = slide.src?.trim()
      if (!src) return slide
      const kind = slide.kind === 'video' ? 'video' : 'image'
      return { ...slide, src: await ensureHighlightMediaUrl(src, kind) }
    })
    let coverSrc = ch.coverSrc?.trim()
    if (coverSrc) {
      coverSrc = await ensureHighlightMediaUrl(coverSrc, 'image')
    }
    return {
      ...ch,
      slides,
      coverSrc: coverSrc || slides.find((s) => s.src)?.src,
    }
  })
}
