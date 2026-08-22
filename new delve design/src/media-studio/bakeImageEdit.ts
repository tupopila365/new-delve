/**
 * Bake ImageEditor preview (filter, adjustments, aspect crop, rotation)
 * into a real JPEG File for Cloudinary upload.
 * Video filters remain preview-only in Phase D.
 */

import { cssFilterFromAdjustments } from './format'
import type { ImageEditState } from './types'

const DEFAULT_MAX_EDGE = 1600

function parseAspect(aspect: string): number | null {
  const raw = (aspect || '').trim()
  if (!raw) return null
  const parts = raw.split('/').map(p => Number(p.trim()))
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1]
  return null
}

export function hasImageEdits(edit: ImageEditState | null | undefined): boolean {
  if (!edit) return false
  if (edit.rotation !== 0) return true
  if (edit.filter.id !== 'original' && edit.filter.css) return true
  const a = edit.adjustments
  if (a.brightness || a.contrast || a.saturation || a.warmth || a.highlights || a.shadows || a.fade) {
    return true
  }
  // Non-empty aspect other than free means we crop to that frame.
  if (edit.aspectRatio.trim()) return true
  return false
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    const url = typeof source === 'string' ? source : URL.createObjectURL(source)
    const revoke = typeof source === 'string' ? null : url
    img.onload = () => {
      if (revoke) URL.revokeObjectURL(revoke)
      resolve(img)
    }
    img.onerror = () => {
      if (revoke) URL.revokeObjectURL(revoke)
      reject(new Error('Could not load image for export.'))
    }
    img.src = url
  })
}

function canvasToJpegFile(canvas: HTMLCanvasElement, fileName: string, quality = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Could not export edited image.'))
          return
        }
        const base = fileName.replace(/\.[^.]+$/, '') || 'photo'
        resolve(new File([blob], `${base}-edited.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Draw source with CSS-like object-cover into a destination frame, then filter + rotate.
 */
export async function bakeImageEdit(input: {
  source: File | string
  edit: ImageEditState
  fileName?: string
  maxEdge?: number
}): Promise<File> {
  const img = await loadImage(input.source)
  const maxEdge = input.maxEdge ?? DEFAULT_MAX_EDGE
  const aspect = parseAspect(input.edit.aspectRatio)
  const rotation = input.edit.rotation || 0

  // Destination frame size (before rotation swap for 90/270 we still define the crop frame).
  let destW: number
  let destH: number
  if (aspect) {
    if (aspect >= 1) {
      destW = maxEdge
      destH = Math.max(1, Math.round(maxEdge / aspect))
    } else {
      destH = maxEdge
      destW = Math.max(1, Math.round(maxEdge * aspect))
    }
  } else {
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    destW = Math.max(1, Math.round(img.naturalWidth * scale))
    destH = Math.max(1, Math.round(img.naturalHeight * scale))
  }

  // Rotate 90/270 swaps output canvas dimensions.
  const swap = rotation === 90 || rotation === 270
  const outW = swap ? destH : destW
  const outH = swap ? destW : destH

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')

  const filter = cssFilterFromAdjustments(input.edit.filter.css, input.edit.adjustments)
  ctx.filter = filter === 'none' ? 'none' : filter
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.save()
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((rotation * Math.PI) / 180)

  // Draw into centered destW x destH rect with object-cover from source.
  const dw = destW
  const dh = destH
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const cover = Math.max(dw / srcW, dh / srcH)
  const drawW = srcW * cover
  const drawH = srcH * cover
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  const name =
    input.fileName ||
    (typeof input.source !== 'string' ? input.source.name : 'photo.jpg')
  return canvasToJpegFile(canvas, name)
}
