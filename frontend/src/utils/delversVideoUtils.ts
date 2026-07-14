import type { VideoTrim } from '../components/create/types'
import { MAX_TRIM_DURATION_SEC, trimDurationSec } from '../components/create/videoTrimUtils'
import { probeCommunityVideoFile } from './communityMediaUpload'
import { CHAT_SKIP_COMPRESS_BYTES, compressVideoForChat } from './communityVideoUtils'

export { probeCommunityVideoFile as probeDelversVideoFile }

const WEB_FRIENDLY_MAX_PX = 1080

/**
 * True when the file looks browser-friendly enough to skip client remux:
 * H.264-ish container (mp4/mov), ≤1080 on the long edge.
 * Conservative — large or exotic codecs still compress.
 */
async function isWebFriendlyVideo(file: File): Promise<boolean> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  const looksMp4 =
    type.includes('mp4') ||
    type === 'video/quicktime' ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov')
  if (!looksMp4) return false

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'metadata'
  video.muted = true
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('meta'))
    })
    const w = video.videoWidth || 0
    const h = video.videoHeight || 0
    if (w <= 0 || h <= 0) return false
    return Math.max(w, h) <= WEB_FRIENDLY_MAX_PX
  } catch {
    return false
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}

/**
 * Prepare the video file for upload. Trimming happens server-side
 * (Cloudinary delivery transform in prod, ffmpeg on local storage), so we send
 * the ORIGINAL clip plus trim_start/trim_end offsets — no fragile in-browser
 * re-encode. We only compress large / non-web-friendly clips.
 */
export async function prepareDelversVideoForUpload(
  file: File,
  trim: VideoTrim,
  _duration: number,
): Promise<File> {
  if (trimDurationSec(trim) > MAX_TRIM_DURATION_SEC) {
    throw new Error(`Video must be ${MAX_TRIM_DURATION_SEC} seconds or less.`)
  }

  if (file.size <= CHAT_SKIP_COMPRESS_BYTES) {
    return file
  }

  // Large but already a reasonable phone MP4 → skip expensive remux.
  if (await isWebFriendlyVideo(file)) {
    return file
  }

  try {
    return await compressVideoForChat(file)
  } catch {
    return file
  }
}

export async function loadVideoMetadata(previewUrl: string): Promise<{ duration: number; trim: VideoTrim }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.playsInline = true
    video.preload = 'metadata'
    video.muted = true
    video.src = previewUrl

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('error', onError)
      video.src = ''
    }

    const onMeta = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()
      resolve({ duration, trim: { start: 0, end: duration } })
    }

    const onError = () => {
      cleanup()
      reject(new Error('This video could not be loaded. Try MP4, WebM, or MOV.'))
    }

    video.addEventListener('loadedmetadata', onMeta, { once: true })
    video.addEventListener('error', onError, { once: true })
  })
}
