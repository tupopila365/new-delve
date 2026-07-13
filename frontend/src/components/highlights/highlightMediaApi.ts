import { apiFetch } from '../../api/client'
import type { MediaKind, VideoTrim } from '../create/types'
import { isFullVideoTrim } from '../create/videoTrimUtils'
import { appendVideoEffectsToFormData, type PreparedVideoEffects } from '../create/videoEffects'
import { prepareDelversVideoForUpload } from '../../utils/delversVideoUtils'
import type { HighlightChannelInput } from './types'

export type HighlightMediaUploadResult = {
  url: string
  kind: MediaKind
  trim_start?: number
  trim_end?: number
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

/** Upload any blob/data slide URLs before saving highlight channels. */
export async function ensureHighlightChannelsMediaUrls(
  channels: HighlightChannelInput[],
): Promise<HighlightChannelInput[]> {
  const resolved: HighlightChannelInput[] = []
  for (const ch of channels) {
    const slides = []
    for (const slide of ch.slides) {
      const src = slide.src?.trim()
      if (!src) {
        slides.push(slide)
        continue
      }
      const kind = slide.kind === 'video' ? 'video' : 'image'
      slides.push({ ...slide, src: await ensureHighlightMediaUrl(src, kind) })
    }
    let coverSrc = ch.coverSrc?.trim()
    if (coverSrc) {
      coverSrc = await ensureHighlightMediaUrl(coverSrc, 'image')
    }
    resolved.push({
      ...ch,
      slides,
      coverSrc: coverSrc || slides.find((s) => s.src)?.src,
    })
  }
  return resolved
}
