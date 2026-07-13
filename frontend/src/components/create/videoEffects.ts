import type { Adjustments, DrawStroke, MediaFilter, StickerOverlay, TextOverlay } from './types'
import {
  computeVideoColorGrade,
  hasBakeableOverlays,
  renderOverlaysToPng,
  type ImageOverlays,
  type VideoColorGrade,
} from './mediaUtils'

export type VideoEffectInput = {
  filter: MediaFilter
  filterIntensity: number
  adjustments: Adjustments
  textOverlays: TextOverlay[]
  stickers: StickerOverlay[]
  strokes: DrawStroke[]
}

export type PreparedVideoEffects = {
  grade: VideoColorGrade | null
  overlayPng: Blob | null
}

/** Whether the given editor state has any effect that must be baked into video. */
export function videoHasBakeableEffects(input: VideoEffectInput): boolean {
  const overlays: ImageOverlays = {
    textOverlays: input.textOverlays,
    stickers: input.stickers,
    strokes: input.strokes,
  }
  return (
    hasBakeableOverlays(overlays) ||
    computeVideoColorGrade(input.filter, input.filterIntensity, input.adjustments) != null
  )
}

/** Read a video file's natural pixel dimensions. */
function loadVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url
    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1080
      const height = video.videoHeight || 1920
      URL.revokeObjectURL(url)
      resolve({ width, height })
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video dimensions.'))
    }
  })
}

/**
 * Build the colour grade + overlay PNG (sized to the video frame) for baking a
 * clip server-side. Returns neutral values when there is nothing to bake.
 */
export async function prepareVideoEffects(
  file: File,
  input: VideoEffectInput,
): Promise<PreparedVideoEffects> {
  const grade = computeVideoColorGrade(input.filter, input.filterIntensity, input.adjustments)
  const overlays: ImageOverlays = {
    textOverlays: input.textOverlays,
    stickers: input.stickers,
    strokes: input.strokes,
  }

  let overlayPng: Blob | null = null
  if (hasBakeableOverlays(overlays)) {
    const { width, height } = await loadVideoDimensions(file)
    overlayPng = await renderOverlaysToPng(width, height, overlays)
  }

  return { grade, overlayPng }
}

/**
 * Append video effect fields to a FormData for upload. Field names are prefixed
 * so carousel slides can each carry their own effects (e.g. ``slide2_``).
 */
export function appendVideoEffectsToFormData(
  fd: FormData,
  prefix: string,
  effects: PreparedVideoEffects,
): void {
  const { grade, overlayPng } = effects
  if (grade) {
    fd.append(`${prefix}grade_brightness`, grade.brightness.toFixed(4))
    fd.append(`${prefix}grade_contrast`, grade.contrast.toFixed(4))
    fd.append(`${prefix}grade_saturation`, grade.saturation.toFixed(4))
    fd.append(`${prefix}grade_hue`, grade.hue.toFixed(2))
    fd.append(`${prefix}grade_sepia`, grade.sepia.toFixed(4))
    fd.append(`${prefix}grade_grayscale`, grade.grayscale.toFixed(4))
    fd.append(`${prefix}grade_sharpen`, grade.sharpen.toFixed(4))
  }
  if (overlayPng) {
    fd.append(`${prefix}overlay`, overlayPng, `${prefix || 'slide0_'}overlay.png`)
  }
}
