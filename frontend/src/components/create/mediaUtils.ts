import type { CropAspect, CropSettings, MediaFilter, Adjustments, EditorSnapshot, CaptionPosition, TextOverlay, StickerOverlay, DrawStroke } from './types'
import { DEFAULT_ADJUSTMENTS, FONT_OPTIONS } from './types'

let _autoEnhanceAnalysis: { brightness: number; contrast: number; saturation: number } | null = null

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function filterClassName(filter: MediaFilter): string {
  return filter === 'original' ? '' : `create-media__asset--${filter}`
}

export function cssFilterForMedia(
  filter: MediaFilter,
  intensity = 100,
  adjustments?: Adjustments,
): string {
  const i = clamp(intensity, 0, 100) / 100
  const parts: string[] = []

  // Base filter (applied at intensity)
  switch (filter) {
    case 'warm':
      parts.push(`sepia(${0.35 * i})`, `saturate(${1 + 0.2 * i})`)
      break
    case 'mono':
      parts.push(`grayscale(${1 * i})`)
      break
    case 'dusk':
      parts.push(
        `brightness(${1 - 0.1 * i})`,
        `contrast(${1 + 0.1 * i})`,
        `hue-rotate(${-15 * i}deg)`,
        `saturate(${1 - 0.15 * i})`,
      )
      break
    case 'vivid':
      parts.push(`saturate(${1 + 0.45 * i})`, `contrast(${1 + 0.08 * i})`)
      break
    default:
      break
  }

  // Perceptual adjustments
  if (adjustments) {
    const b = (adjustments.brightness - 100) / 100
    if (Math.abs(b) > 0.02) parts.push(`brightness(${1 + b})`)

    const c = (adjustments.contrast - 100) / 100
    if (Math.abs(c) > 0.02) parts.push(`contrast(${1 + c})`)

    const s = (adjustments.saturation - 100) / 100
    if (Math.abs(s) > 0.02) parts.push(`saturate(${1 + s})`)

    const w = (adjustments.warmth - 100) / 100
    if (Math.abs(w) > 0.02) {
      // Warmth via sepia + slight red shift
      parts.push(`sepia(${Math.abs(w) * 0.3})`, `hue-rotate(${w > 0 ? 15 : -15}deg)`)
    }

    // Sharpen happens on canvas, not CSS, but we add a tiny contrast bump as approximation
    const sh = (adjustments.sharpen - 0) / 100
    if (sh > 0.02) parts.push(`contrast(${1 + sh * 0.15})`)
  }

  return parts.length > 0 ? parts.join(' ') : 'none'
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

function drawStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  width: number,
  height: number,
) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = (stroke.size / 100) * width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = stroke.opacity

    ctx.beginPath()
    ctx.moveTo(
      (stroke.points[0].x / 100) * width,
      (stroke.points[0].y / 100) * height,
    )
    for (let i = 1; i < stroke.points.length; i += 1) {
      ctx.lineTo(
        (stroke.points[i].x / 100) * width,
        (stroke.points[i].y / 100) * height,
      )
    }
    ctx.stroke()
  }
}

export type ImageOverlays = {
  textOverlays?: TextOverlay[]
  stickers?: StickerOverlay[]
  strokes?: DrawStroke[]
  caption?: { text: string; position: CaptionPosition }
}

function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: TextOverlay[],
  width: number,
  height: number,
) {
  for (const overlay of overlays) {
    const fontDef = FONT_OPTIONS.find((f) => f.id === overlay.font)
    const weight = (fontDef as { weight?: number })?.weight ?? 400
    const fontSize = (overlay.fontSize / 400) * width
    ctx.font = `${weight} ${fontSize}px ${fontDef?.family ?? 'system-ui, sans-serif'}`
    ctx.textAlign = overlay.align
    ctx.textBaseline = 'middle'

    const x = (overlay.x / 100) * width
    const y = (overlay.y / 100) * height
    const maxWidth = width * 0.88
    const lines = overlay.text.split('\n')
    const lineHeight = fontSize * 1.2
    const blockHeight = lines.length * lineHeight
    let textX = x
    if (overlay.align === 'left') textX = x - maxWidth / 2
    if (overlay.align === 'right') textX = x + maxWidth / 2

    if (overlay.hasBg && overlay.bgColor !== 'transparent') {
      const padding = fontSize * 0.25
      const bgWidth = Math.min(maxWidth, Math.max(...lines.map((line) => ctx.measureText(line).width)) + padding * 2)
      let bgX = x - bgWidth / 2
      if (overlay.align === 'left') bgX = textX - padding
      if (overlay.align === 'right') bgX = textX - bgWidth + padding
      ctx.fillStyle = overlay.bgColor
      ctx.fillRect(bgX, y - blockHeight / 2 - padding, bgWidth, blockHeight + padding * 2)
    }

    ctx.fillStyle = overlay.color
    if (overlay.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = fontSize * 0.15
      ctx.shadowOffsetY = fontSize * 0.05
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }

    lines.forEach((line, index) => {
      const lineY = y - blockHeight / 2 + lineHeight / 2 + index * lineHeight
      ctx.fillText(line, textX, lineY, maxWidth)
    })
  }
}

function drawStickerOverlays(
  ctx: CanvasRenderingContext2D,
  stickers: StickerOverlay[],
  width: number,
  height: number,
) {
  for (const sticker of stickers) {
    const fontSize = (sticker.size / 400) * width
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.save()
    ctx.translate((sticker.x / 100) * width, (sticker.y / 100) * height)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.fillText(sticker.emoji, 0, 0)
    ctx.restore()
  }
}

function drawCaptionOverlay(
  ctx: CanvasRenderingContext2D,
  caption: { text: string; position: CaptionPosition },
  width: number,
  height: number,
) {
  const text = caption.text.trim()
  if (!text) return

  const fontSize = width * 0.04
  ctx.font = `800 ${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const x = (caption.position.x / 100) * width
  const y = (caption.position.y / 100) * height
  const maxWidth = width * 0.86
  const metrics = ctx.measureText(text)
  const padding = fontSize * 0.35
  const bgWidth = Math.min(maxWidth, metrics.width + padding * 2)
  const bgHeight = fontSize * 1.5

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'
  ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y, maxWidth)
}

export async function renderEditedImage(
  file: File,
  filter: MediaFilter,
  crop: CropSettings,
  adjustments?: Adjustments,
  filterIntensity?: number,
  overlays?: ImageOverlays,
): Promise<Blob> {
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

  ctx.filter = cssFilterForMedia(filter, filterIntensity, adjustments)
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)

  // Apply sharpen via convolution if needed
  if (adjustments?.sharpen && adjustments.sharpen > 5) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const sharpened = applySharpen(imageData, (adjustments.sharpen - 0) / 100)
    ctx.putImageData(sharpened, 0, 0)
  }

  ctx.filter = 'none'
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1

  if (overlays?.strokes?.length) {
    drawStrokesOnCanvas(ctx, overlays.strokes, canvas.width, canvas.height)
  }
  if (overlays?.textOverlays?.length) {
    drawTextOverlays(ctx, overlays.textOverlays, canvas.width, canvas.height)
  }
  if (overlays?.stickers?.length) {
    drawStickerOverlays(ctx, overlays.stickers, canvas.width, canvas.height)
  }
  if (overlays?.caption?.text.trim()) {
    drawCaptionOverlay(ctx, overlays.caption, canvas.width, canvas.height)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not export image'))
      else resolve(blob)
    }, 'image/jpeg', 0.92)
  })
}

/** Simple unsharp-mask sharpen via convolution */
function applySharpen(data: ImageData, amount: number): ImageData {
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ]
  const factor = amount * 0.5 + 1
  const adjustedKernel = kernel.map((k) => k * factor)
  // Center value needs adjustment to keep sum = 1
  adjustedKernel[4] = 5 * factor - (factor - 1) * 8

  const w = data.width
  const h = data.height
  const src = new Uint8ClampedArray(data.data)
  const dst = new Uint8ClampedArray(data.data)

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = (y * w + x) * 4
      let r = 0; let g = 0; let b = 0
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const nIdx = ((y + ky) * w + (x + kx)) * 4
          const k = adjustedKernel[(ky + 1) * 3 + (kx + 1)]
          r += src[nIdx] * k
          g += src[nIdx + 1] * k
          b += src[nIdx + 2] * k
        }
      }
      dst[idx] = clamp(r, 0, 255)
      dst[idx + 1] = clamp(g, 0, 255)
      dst[idx + 2] = clamp(b, 0, 255)
    }
  }

  return new ImageData(dst, w, h)
}

/* ─── Auto-Enhance ─── */

/** Analyse image pixel data to suggest auto-enhance values */
export function analyzeImageForEnhance(file: File): Promise<{ brightness: number; contrast: number; saturation: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, 100, 100)
      const data = ctx.getImageData(0, 0, 100, 100).data

      let totalL = 0; let totalS = 0
      let minL = 255; let maxL = 0
      const len = data.length

      for (let i = 0; i < len; i += 4) {
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        // Perceived luminance
        const L = 0.299 * r + 0.587 * g + 0.114 * b
        const l = L * 255
        totalL += l
        if (l < minL) minL = l
        if (l > maxL) maxL = l
        // Simple saturation: max(r,g,b) - min(r,g,b)
        const s = Math.max(r, g, b) - Math.min(r, g, b)
        totalS += s
      }

      const n = len / 4
      const avgL = totalL / n
      const avgS = totalS / n

      // Map to adjustments
      let brightness = 100
      let contrast = 100
      let saturation = 100

      // If image is dark, increase brightness
      if (avgL < 100) brightness = 100 + (100 - avgL) * 0.4
      else if (avgL > 180) brightness = Math.max(80, 100 - (avgL - 180) * 0.3)

      // If contrast is low (min/max close), increase contrast
      const range = maxL - minL
      if (range < 150) contrast = 100 + (150 - range) * 0.3

      // If saturation is low, boost it
      if (avgS < 0.15) saturation = 100 + (0.15 - avgS) * 200

      const result = {
        brightness: clamp(Math.round(brightness), 80, 140),
        contrast: clamp(Math.round(contrast), 90, 150),
        saturation: clamp(Math.round(saturation), 90, 160),
      }

      _autoEnhanceAnalysis = result
      resolve(result)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

export function getAutoEnhanceResult() {
  return _autoEnhanceAnalysis
}

export function clearAutoEnhanceResult() {
  _autoEnhanceAnalysis = null
}

/* ─── Edit history (undo/redo) ─── */


export function createEditorSnapshot(
  filter: MediaFilter,
  filterIntensity: number,
  adjustments: Adjustments,
  crop: CropSettings,
  caption: string,
  captionPosition: CaptionPosition,
  textOverlays: TextOverlay[],
  stickers: StickerOverlay[],
  strokes: DrawStroke[],
): EditorSnapshot {
  return {
    filter,
    filterIntensity,
    adjustments: { ...adjustments },
    crop: { ...crop },
    caption,
    captionPosition: { ...captionPosition },
    textOverlays: textOverlays.map((t) => ({ ...t })),
    stickers: stickers.map((s) => ({ ...s })),
    strokes: strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) })),
  }
}

export const DEFAULT_EDITOR_SNAPSHOT: EditorSnapshot = {
  filter: 'original',
  filterIntensity: 100,
  adjustments: DEFAULT_ADJUSTMENTS,
  crop: { aspect: '4:5', zoom: 1, offsetX: 0, offsetY: 0 },
  caption: '',
  captionPosition: { x: 50, y: 78 },
  textOverlays: [],
  stickers: [],
  strokes: [],
}