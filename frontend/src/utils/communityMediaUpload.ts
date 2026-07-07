const IMAGE_MAX_BYTES = 12 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov'])

function waitForVideoEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Video could not be loaded'))
    }
    const cleanup = () => {
      target.removeEventListener(event, onSuccess)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onSuccess, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

/** Check that the browser can decode this video before editing or uploading. */
export async function probeCommunityVideoFile(file: File): Promise<string | null> {
  const basic = validateCommunityVideoFile(file)
  if (basic) return basic

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'metadata'
  video.muted = true
  video.src = url

  try {
    await waitForVideoEvent(video, 'loadedmetadata')
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return 'This video could not be read. Try MP4 or re-export the clip.'
    }
    return null
  } catch {
    return 'This video could not be loaded in your browser. Try MP4, WebM, or MOV.'
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}

export function validateCommunityImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Choose a photo file (JPG, PNG, WebP, etc.).'
  if (file.size > IMAGE_MAX_BYTES) return 'Photo must be 12MB or smaller.'
  return null
}

export function validateCommunityVideoFile(file: File): string | null {
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : ''
  if (!file.type.startsWith('video/') && !VIDEO_EXTENSIONS.has(ext)) {
    return 'Use MP4, WebM, or MOV for video.'
  }
  if (file.size > VIDEO_MAX_BYTES) return 'Video must be 50MB or smaller.'
  if (ext && !VIDEO_EXTENSIONS.has(ext)) return 'Unsupported video format. Use MP4, WebM, or MOV.'
  return null
}
