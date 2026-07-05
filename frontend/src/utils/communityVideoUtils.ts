import type { VideoTrim } from '../components/create/types'

export const COMMUNITY_MAX_VIDEO_SEC = 30
export const TRIM_FULL_VIDEO_EPSILON_SEC = 0.15

export type CommunityDrawStroke = {
  color: string
  width: number
  points: { x: number; y: number }[]
}

export function isFullVideoTrim(trim: VideoTrim, duration: number): boolean {
  if (duration <= 0) return true
  return (
    trim.start <= TRIM_FULL_VIDEO_EPSILON_SEC &&
    trim.end >= duration - TRIM_FULL_VIDEO_EPSILON_SEC
  )
}

export function trimDurationSec(trim: VideoTrim): number {
  return Math.max(0, trim.end - trim.start)
}

function pickRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  throw new Error('Video trimming is not supported in this browser.')
}

export function clampCommunityTrim(trim: VideoTrim, duration: number): VideoTrim {
  if (duration <= 0) return trim
  let start = Math.max(0, Math.min(trim.start, duration - 0.5))
  let end = Math.max(start + 0.5, Math.min(trim.end, duration))
  if (end - start > COMMUNITY_MAX_VIDEO_SEC) {
    end = start + COMMUNITY_MAX_VIDEO_SEC
  }
  return { start, end }
}

export function defaultCommunityTrim(duration: number): VideoTrim {
  if (duration <= 0) return { start: 0, end: 0 }
  return clampCommunityTrim({ start: 0, end: Math.min(duration, COMMUNITY_MAX_VIDEO_SEC) }, duration)
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  return 'webm'
}

function trimmedFilename(source: File, mimeType: string): string {
  const base = source.name.replace(/\.[^.]+$/, '') || 'video'
  return `${base}-community.${extensionForMime(mimeType)}`
}

function waitForEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Could not process video'))
    }
    const cleanup = () => {
      target.removeEventListener(event, onSuccess)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onSuccess, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: CommunityDrawStroke[],
  width: number,
  height: number,
) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const first = stroke.points[0]
    ctx.moveTo(first.x * width, first.y * height)
    for (let i = 1; i < stroke.points.length; i += 1) {
      const point = stroke.points[i]
      ctx.lineTo(point.x * width, point.y * height)
    }
    ctx.stroke()
  }
}

export async function renderCommunityVideo(
  file: File,
  trim: VideoTrim,
  duration: number,
  strokes: CommunityDrawStroke[],
): Promise<Blob> {
  const safeTrim = clampCommunityTrim(trim, duration)
  const clipSec = trimDurationSec(safeTrim)
  if (clipSec <= 0) {
    throw new Error('Set a valid trim range before sharing.')
  }
  if (clipSec > COMMUNITY_MAX_VIDEO_SEC) {
    throw new Error(`Community videos must be ${COMMUNITY_MAX_VIDEO_SEC} seconds or less.`)
  }

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.playsInline = true
  video.muted = true
  video.src = url

  try {
    await waitForEvent(video, 'loadedmetadata')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare video canvas.')

    video.currentTime = Math.max(0, safeTrim.start)
    await waitForEvent(video, 'seeked')

    const mimeType = pickRecorderMimeType()
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
    })
    const chunks: Blob[] = []

    const blob = await new Promise<Blob>((resolve, reject) => {
      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeoutId)
        fn()
      }

      const timeoutId = window.setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') recorder.stop()
        } catch {
          /* ignore */
        }
        video.pause()
        finish(() => reject(new Error('Video preparation timed out. Try a shorter clip.')))
      }, 120_000)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = () => {
        video.pause()
        if (!chunks.length) {
          finish(() => reject(new Error('Could not prepare video.')))
          return
        }
        finish(() => resolve(new Blob(chunks, { type: mimeType.split(';')[0] })))
      }

      recorder.onerror = () => {
        finish(() => reject(new Error('Could not prepare video.')))
      }

      const paintFrame = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        if (strokes.length > 0) {
          drawStrokes(ctx, strokes, canvas.width, canvas.height)
        }
      }

      const stopRecording = () => {
        if (recorder.state !== 'inactive') recorder.stop()
      }

      video.ontimeupdate = () => {
        paintFrame()
        if (video.currentTime >= safeTrim.end - 0.05) {
          video.pause()
          stopRecording()
        }
      }
      video.onended = stopRecording

      recorder.start(100)
      paintFrame()
      void video.play().catch(() => {
        finish(() => reject(new Error('Could not play video for export.')))
      })
    })

    return blob
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}

export async function prepareCommunityVideoForUpload(
  file: File,
  trim: VideoTrim,
  duration: number,
  strokes: CommunityDrawStroke[],
): Promise<File> {
  const safeTrim = clampCommunityTrim(trim, duration)
  const needsRender =
    strokes.length > 0 ||
    !isFullVideoTrim(safeTrim, duration) ||
    trimDurationSec(safeTrim) > COMMUNITY_MAX_VIDEO_SEC

  if (!needsRender && trimDurationSec(safeTrim) <= COMMUNITY_MAX_VIDEO_SEC) {
    return file
  }

  const blob = await renderCommunityVideo(file, safeTrim, duration, strokes)
  const mimeType = blob.type || 'video/webm'
  return new File([blob], trimmedFilename(file, mimeType), { type: mimeType })
}
