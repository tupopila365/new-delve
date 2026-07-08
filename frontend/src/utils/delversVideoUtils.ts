import type { VideoTrim } from '../components/create/types'
import {
  isFullVideoTrim,
  MAX_TRIM_DURATION_SEC,
  prepareVideoForUpload,
  trimDurationSec,
} from '../components/create/videoTrimUtils'
import { probeCommunityVideoFile } from './communityMediaUpload'
import { CHAT_SKIP_COMPRESS_BYTES, compressVideoForChat } from './communityVideoUtils'

export { probeCommunityVideoFile as probeDelversVideoFile }

export async function prepareDelversVideoForUpload(
  file: File,
  trim: VideoTrim,
  duration: number,
): Promise<File> {
  if (trimDurationSec(trim) > MAX_TRIM_DURATION_SEC) {
    throw new Error(`Video must be ${MAX_TRIM_DURATION_SEC} seconds or less.`)
  }

  if (isFullVideoTrim(trim, duration)) {
    if (file.size > CHAT_SKIP_COMPRESS_BYTES) {
      try {
        return await compressVideoForChat(file)
      } catch {
        return file
      }
    }
    return file
  }

  return prepareVideoForUpload(file, trim, duration)
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
