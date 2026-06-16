import type { CropAspect, CropSettings, MediaFilter } from './types'

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function filterClassName(filter: MediaFilter): string {
  return filter === 'original' ? '' : `create-media__asset--${filter}`
}

export function cssFilterForMedia(filter: MediaFilter): string {
  switch (filter) {
    case 'warm':
      return 'sepia(0.35) saturate(1.2)'
    case 'mono':
      return 'grayscale(1)'
    case 'dusk':
      return 'brightness(0.9) contrast(1.1) hue-rotate(-15deg) saturate(0.85)'
    case 'vivid':
      return 'saturate(1.45) contrast(1.08)'
    default:
      return 'none'
  }
}

export function aspectRatioValue(aspect: CropAspect): number | null {
  switch (aspect) {
    case '1:1':
      return 1
    case '4:5':
      return 4 / 5
    case '16:9':
      return 16 / 9
    default:
      return null
  }
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
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(blob)
  })
}

export function videoPosterDataUrl(file: File, atSeconds = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    video.onloadeddata = () => {
      const seekTime = Math.min(Math.max(atSeconds, 0), Math.max(video.duration - 0.1, 0))
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load video'))
    }
  })
}

export async function renderEditedImage(file: File, filter: MediaFilter, crop: CropSettings): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const targetRatio = aspectRatioValue(crop.aspect)
  const sourceRatio = img.width / img.height

  let cropW = img.width
  let cropH = img.height

  if (targetRatio) {
    if (sourceRatio > targetRatio) {
      cropW = img.height * targetRatio
    } else {
      cropH = img.width / targetRatio
    }
  }

  const zoom = clamp(crop.zoom, 1, 2.5)
  cropW /= zoom
  cropH /= zoom

  const maxOffsetX = (img.width - cropW) / 2
  const maxOffsetY = (img.height - cropH) / 2
  const sx = clamp(img.width / 2 - cropW / 2 + (crop.offsetX / 100) * maxOffsetX * 2, 0, img.width - cropW)
  const sy = clamp(img.height / 2 - cropH / 2 + (crop.offsetY / 100) * maxOffsetY * 2, 0, img.height - cropH)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cropW)
  canvas.height = Math.round(cropH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  ctx.filter = cssFilterForMedia(filter)
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not export image'))
      else resolve(blob)
    }, 'image/jpeg', 0.92)
  })
}
