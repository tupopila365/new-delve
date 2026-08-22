/**
 * Bake video trim, speed, filter, crop, rotation, captions, and text overlays
 * into a WebM File via canvas + MediaRecorder.
 * Music audio mux waits on real catalogue URLs; attribution is burned in as a credit.
 */

import { VIDEO_FILTERS } from './config'
import { cssFilterFromAdjustments } from './format'
import type {
  AspectRatioId,
  CaptionSegment,
  TextOverlay,
  VideoEditState,
} from './types'

const EPS = 0.05
const MAX_EDGE = 1080

export function hasVideoTrimEdits(
  edit: VideoEditState | null | undefined,
  sourceDuration: number,
): boolean {
  if (!edit) return false
  if (edit.clips.length > 1) return true
  const dur = Math.max(0, sourceDuration || 0)
  if (edit.trimStart > EPS) return true
  if (dur > 0 && edit.trimEnd < dur - EPS) return true
  if (Math.abs((edit.playbackSpeed || 1) - 1) > 0.01) return true
  return false
}

/** Timeline segments to export (multi-clip cuts, or single trim window). */
export function orderedBakeSegments(edit: VideoEditState): { start: number; end: number }[] {
  const clips = [...edit.clips].sort((a, b) => a.order - b.order)
  if (clips.length > 1) {
    return clips.map(c => ({
      start: Math.max(0, c.sourceStart),
      end: Math.max(c.sourceStart + 0.15, c.sourceEnd),
    }))
  }
  const start = Math.max(0, edit.trimStart)
  const end = Math.max(start + 0.2, edit.trimEnd)
  return [{ start, end }]
}

export function hasVideoVisualEdits(edit: VideoEditState | null | undefined): boolean {
  if (!edit) return false
  if (edit.filter && edit.filter !== 'original') return true
  const a = edit.adjustments
  if (a.brightness || a.contrast || a.saturation || a.warmth || a.highlights || a.shadows || a.fade) {
    return true
  }
  const rotation = edit.rotation || edit.crop.rotation || 0
  if (rotation !== 0) return true
  if (edit.aspectRatio && edit.aspectRatio !== 'original') return true
  if (Math.abs((edit.crop.zoom || 1) - 1) > 0.01) return true
  if (Math.abs((edit.crop.offsetX ?? 50) - 50) > 0.5) return true
  if (Math.abs((edit.crop.offsetY ?? 50) - 50) > 0.5) return true
  return false
}

/** Captions, text overlays, or music attribution credit. */
export function hasVideoOverlayEdits(edit: VideoEditState | null | undefined): boolean {
  if (!edit) return false
  if (edit.captions.length > 0) return true
  if (edit.textOverlays.length > 0) return true
  if (edit.music?.attribution) return true
  return false
}

export function hasVideoEdits(
  edit: VideoEditState | null | undefined,
  sourceDuration: number,
): boolean {
  return (
    hasVideoTrimEdits(edit, sourceDuration) ||
    hasVideoVisualEdits(edit) ||
    hasVideoOverlayEdits(edit)
  )
}

function aspectValue(id: AspectRatioId | string): number | null {
  switch (id) {
    case '9:16':
      return 9 / 16
    case '4:5':
    case 'listing':
      return 4 / 5
    case '1:1':
      return 1
    case '16:9':
      return 16 / 9
    case '3:2':
      return 3 / 2
    default:
      return null
  }
}

function pickRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return 'video/webm'
}

function waitForEvent(target: EventTarget, event: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const onOk = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      target.removeEventListener(event, onOk)
      signal?.removeEventListener('abort', onAbort)
    }
    target.addEventListener(event, onOk, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function seekVideo(video: HTMLVideoElement, time: number, signal?: AbortSignal) {
  if (Math.abs(video.currentTime - time) < 0.04) return
  video.currentTime = Math.max(0, time)
  await waitForEvent(video, 'seeked', signal)
}

function outputSize(videoW: number, videoH: number, aspect: number | null, rotation: number) {
  let destW: number
  let destH: number
  if (aspect) {
    if (aspect >= 1) {
      destW = MAX_EDGE
      destH = Math.max(2, Math.round(MAX_EDGE / aspect))
    } else {
      destH = MAX_EDGE
      destW = Math.max(2, Math.round(MAX_EDGE * aspect))
    }
  } else {
    const scale = Math.min(1, MAX_EDGE / Math.max(videoW, videoH, 1))
    destW = Math.max(2, Math.round(videoW * scale))
    destH = Math.max(2, Math.round(videoH * scale))
  }
  // Even dimensions help some encoders.
  destW -= destW % 2
  destH -= destH % 2
  const swap = rotation === 90 || rotation === 270
  return {
    frameW: destW,
    frameH: destH,
    outW: swap ? destH : destW,
    outH: swap ? destW : destH,
  }
}

function drawEditedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  edit: VideoEditState,
  frameW: number,
  frameH: number,
  outW: number,
  outH: number,
) {
  const filterCss = VIDEO_FILTERS.find(f => f.id === edit.filter)?.css ?? ''
  const filter = cssFilterFromAdjustments(filterCss, edit.adjustments)
  const rotation = edit.rotation || edit.crop.rotation || 0
  const zoom = Math.max(0.5, edit.crop.zoom || 1)
  const ox = (edit.crop.offsetX ?? 50) / 100
  const oy = (edit.crop.offsetY ?? 50) / 100
  const fitCover = edit.crop.fit !== 'fit'

  ctx.save()
  ctx.clearRect(0, 0, outW, outH)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, outW, outH)
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.filter = filter === 'none' ? 'none' : filter

  const vw = video.videoWidth || 1
  const vh = video.videoHeight || 1
  const cover = fitCover
    ? Math.max(frameW / vw, frameH / vh) * zoom
    : Math.min(frameW / vw, frameH / vh) * zoom
  const drawW = vw * cover
  const drawH = vh * cover
  // object-position: shift so focal point maps toward offsets
  const maxShiftX = Math.max(0, (drawW - frameW) / 2)
  const maxShiftY = Math.max(0, (drawH - frameH) / 2)
  const shiftX = (0.5 - ox) * 2 * maxShiftX
  const shiftY = (0.5 - oy) * 2 * maxShiftY
  ctx.drawImage(video, -drawW / 2 + shiftX, -drawH / 2 + shiftY, drawW, drawH)
  ctx.restore()
}

function fontPx(size: 'sm' | 'md' | 'lg', outH: number) {
  const base = Math.max(14, outH * 0.032)
  if (size === 'lg') return base * 1.35
  if (size === 'sm') return base * 0.85
  return base
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines: string[] = []
  let line = words[0]
  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) line = next
    else {
      lines.push(line)
      line = words[i]
    }
  }
  lines.push(line)
  return lines
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  caption: CaptionSegment,
  outW: number,
  outH: number,
) {
  const style = caption.style
  const size = fontPx(style.textSize, outH)
  ctx.font = `600 ${size}px "DM Sans", system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = style.alignment === 'left' ? 'left' : style.alignment === 'right' ? 'right' : 'center'

  const maxWidth = outW * 0.86
  const lines = wrapLines(ctx, caption.text, maxWidth)
  if (!lines.length) return

  const lineH = size * 1.25
  const blockH = lines.length * lineH + size * 0.5
  const padX = size * 0.55
  let yCenter =
    style.position === 'top' ? outH * 0.12 + blockH / 2
      : style.position === 'center' ? outH * 0.5
        : outH * 0.88 - blockH / 2

  const widest = Math.max(...lines.map(l => ctx.measureText(l).width))
  const boxW = widest + padX * 2
  let boxX =
    style.alignment === 'left' ? outW * 0.07
      : style.alignment === 'right' ? outW * 0.93 - boxW
        : (outW - boxW) / 2

  ctx.fillStyle = style.highContrast ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.48)'
  const radius = 8
  const boxY = yCenter - blockH / 2
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, blockH, radius)
  ctx.fill()

  ctx.fillStyle = style.color || '#fff'
  const startY = yCenter - ((lines.length - 1) * lineH) / 2
  const textX =
    style.alignment === 'left' ? boxX + padX
      : style.alignment === 'right' ? boxX + boxW - padX
        : outW / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineH, maxWidth)
  })
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  outW: number,
  outH: number,
) {
  const size = fontPx(overlay.size, outH)
  ctx.font = `700 ${size}px Syne, "DM Sans", system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = overlay.alignment === 'left' ? 'left' : overlay.alignment === 'right' ? 'right' : 'center'
  const x = (Math.min(100, Math.max(0, overlay.x)) / 100) * outW
  const y = (Math.min(100, Math.max(0, overlay.y)) / 100) * outH
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.fillStyle = overlay.color || '#fff'
  ctx.strokeText(overlay.text, x, y, outW * 0.9)
  ctx.fillText(overlay.text, x, y, outW * 0.9)
}

function drawMusicCredit(
  ctx: CanvasRenderingContext2D,
  attribution: string,
  outW: number,
  outH: number,
  time: number,
  trimEnd: number,
) {
  // Show credit in the last ~2.8s of the exported window.
  if (time < trimEnd - 2.8) return
  const size = Math.max(12, outH * 0.022)
  ctx.font = `500 ${size}px "DM Sans", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  const label = `Music: ${attribution}`
  const pad = outW * 0.04
  const textW = Math.min(outW * 0.92, ctx.measureText(label).width + size)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(pad - size * 0.3, outH - pad - size * 1.4, textW + size * 0.6, size * 1.5)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(label, pad, outH - pad, outW * 0.9)
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  edit: VideoEditState,
  outW: number,
  outH: number,
  time: number,
) {
  ctx.save()
  ctx.filter = 'none'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  for (const caption of edit.captions) {
    if (time >= caption.start && time <= caption.end) {
      drawCaption(ctx, caption, outW, outH)
    }
  }
  for (const overlay of edit.textOverlays) {
    if (time >= overlay.start && time <= overlay.end) {
      drawTextOverlay(ctx, overlay, outW, outH)
    }
  }
  if (edit.music?.attribution) {
    drawMusicCredit(ctx, edit.music.attribution, outW, outH, time, edit.trimEnd)
  }
  ctx.restore()
}

/**
 * Re-encode the edited video window. Output is usually WebM.
 */
export async function bakeVideoTrim(input: {
  source: File
  edit: VideoEditState
  sourceDuration: number
  fileName?: string
  signal?: AbortSignal
  onProgress?: (ratio: number) => void
}): Promise<File> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video export is not supported in this browser.')
  }

  const edit = input.edit
  const segments = orderedBakeSegments(edit)
  const speed = Math.min(2, Math.max(0.5, edit.playbackSpeed || 1))
  const totalSpan = Math.max(
    0.2,
    segments.reduce((sum, seg) => sum + Math.max(0.15, seg.end - seg.start), 0),
  )
  const rotation = edit.rotation || edit.crop.rotation || 0
  const aspect = aspectValue(edit.aspectRatio)
  const exportEnd = segments[segments.length - 1]?.end ?? edit.trimEnd

  const url = URL.createObjectURL(input.source)
  const video = document.createElement('video')
  video.playsInline = true
  video.muted = false
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  video.src = url

  let drawRaf = 0
  try {
    await waitForEvent(video, 'loadedmetadata', input.signal)
    await seekVideo(video, segments[0]?.start ?? 0, input.signal)

    const { frameW, frameH, outW, outH } = outputSize(
      video.videoWidth || 720,
      video.videoHeight || 1280,
      aspect,
      rotation,
    )

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')

    const canvasStream = canvas.captureStream(30)
    const videoEl = video as HTMLVideoElement & {
      captureStream?: (frameRate?: number) => MediaStream
      mozCaptureStream?: (frameRate?: number) => MediaStream
    }
    const rawStream = videoEl.captureStream?.(30) || videoEl.mozCaptureStream?.(30)
    if (!rawStream) {
      throw new Error('This browser cannot export edited video. Upload the original instead.')
    }

    const keepAudio = edit.originalAudio.keep && !edit.originalAudio.muted
    if (keepAudio) {
      rawStream.getAudioTracks().forEach(track => {
        canvasStream.addTrack(track)
      })
    }

    const mime = pickRecorderMime()
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mime,
      videoBitsPerSecond: 4_500_000,
    })

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve()
      recorder.onerror = () => reject(new Error('Video export failed.'))
    })

    const paint = () => {
      drawEditedFrame(ctx, video, edit, frameW, frameH, outW, outH)
      // Music credit uses export end; overlays use source currentTime.
      drawOverlays(ctx, { ...edit, trimEnd: exportEnd }, outW, outH, video.currentTime)
      drawRaf = requestAnimationFrame(paint)
    }
    paint()

    video.playbackRate = speed
    recorder.start(200)

    let covered = 0
    for (const seg of segments) {
      if (input.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      await seekVideo(video, seg.start, input.signal)
      await video.play()

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          cleanup()
          reject(new DOMException('Aborted', 'AbortError'))
        }
        const tick = () => {
          if (input.signal?.aborted) {
            onAbort()
            return
          }
          const t = video.currentTime
          const local = Math.min(1, Math.max(0, (t - seg.start) / Math.max(0.15, seg.end - seg.start)))
          input.onProgress?.(Math.min(1, (covered + local * (seg.end - seg.start)) / totalSpan))
          if (t >= seg.end - 0.02 || video.ended) {
            cleanup()
            resolve()
            return
          }
          watchRaf = requestAnimationFrame(tick)
        }
        let watchRaf = requestAnimationFrame(tick)
        const cleanup = () => {
          cancelAnimationFrame(watchRaf)
          input.signal?.removeEventListener('abort', onAbort)
          video.removeEventListener('ended', onEnded)
        }
        const onEnded = () => {
          cleanup()
          resolve()
        }
        video.addEventListener('ended', onEnded)
        input.signal?.addEventListener('abort', onAbort, { once: true })
      })

      video.pause()
      covered += Math.max(0.15, seg.end - seg.start)

      // Fade-to-black / crossfade remain preview-only; export uses hard cuts between clips.
      if (edit.transitions.some(tr => tr.type === 'fade-to-black' || tr.type === 'fade-from-black')) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = '#000'
        ctx.globalAlpha = 1
        ctx.fillRect(0, 0, outW, outH)
        ctx.restore()
        await new Promise(r => setTimeout(r, 120))
      }
    }

    cancelAnimationFrame(drawRaf)
    drawEditedFrame(ctx, video, edit, frameW, frameH, outW, outH)
    drawOverlays(ctx, { ...edit, trimEnd: exportEnd }, outW, outH, video.currentTime)

    if (recorder.state !== 'inactive') recorder.stop()
    await stopped

    canvasStream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    rawStream.getTracks().forEach((t: MediaStreamTrack) => t.stop())

    if (!chunks.length) {
      throw new Error('Edited video was empty. Try again or upload without edits.')
    }

    const blob = new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' })
    const base = (input.fileName || input.source.name || 'video').replace(/\.[^.]+$/, '')
    const ext = blob.type.includes('webm') ? 'webm' : 'mp4'
    return new File([blob], `${base}-edited.${ext}`, { type: blob.type || 'video/webm' })
  } finally {
    cancelAnimationFrame(drawRaf)
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
