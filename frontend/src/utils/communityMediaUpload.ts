const IMAGE_MAX_BYTES = 12 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov'])
export const CHAT_MAX_IMAGE_WIDTH = 1920
export const CHAT_SKIP_IMAGE_COMPRESS_BYTES = 512 * 1024
export const CHAT_IMAGE_JPEG_QUALITY = 0.85

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

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This photo could not be loaded. Try JPG or PNG.'))
    }
    img.src = url
  })
}

function scaledImageDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: maxWidth, height: Math.round((maxWidth * 4) / 3) }
  }
  if (sourceWidth <= maxWidth) {
    return { width: sourceWidth, height: sourceHeight }
  }
  const scale = maxWidth / sourceWidth
  return {
    width: maxWidth,
    height: Math.max(2, Math.round((sourceHeight * scale) / 2) * 2),
  }
}

function chatImageFilename(source: File): string {
  const base = source.name.replace(/\.[^.]+$/, '') || 'photo'
  return `${base}-chat.jpg`
}

/** Resize and JPEG-compress chat photos to keep uploads fast on slow networks. */
export async function compressImageForChat(file: File): Promise<File> {
  const validationError = validateCommunityImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const img = await loadImageFromFile(file)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scaled = scaledImageDimensions(srcW, srcH, CHAT_MAX_IMAGE_WIDTH)
  const needsScale = scaled.width < srcW
  const needsCompress = file.size > CHAT_SKIP_IMAGE_COMPRESS_BYTES || needsScale

  if (!needsCompress) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = scaled.width
  canvas.height = scaled.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not prepare photo for upload.')
  }
  ctx.drawImage(img, 0, 0, scaled.width, scaled.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Could not prepare photo for upload.'))
      },
      'image/jpeg',
      CHAT_IMAGE_JPEG_QUALITY,
    )
  })

  if (blob.size >= file.size && file.type === 'image/jpeg' && !needsScale) {
    return file
  }

  return new File([blob], chatImageFilename(file), { type: 'image/jpeg' })
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
