import type { VideoTrim } from './types'

export const MAX_TRIM_DURATION_SEC = 60
export const TRIM_FULL_VIDEO_EPSILON_SEC = 0.15
const TRIM_TIMEOUT_MS = 120_000

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

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  return 'webm'
}

function trimmedFilename(source: File, mimeType: string): string {
  const base = source.name.replace(/\.[^.]+$/, '') || 'video'
  return `${base}-trim.${extensionForMime(mimeType)}`
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

export async function renderTrimmedVideo(file: File, trim: VideoTrim): Promise<Blob> {
  const duration = trimDurationSec(trim)
  if (duration <= 0) {
    throw new Error('Set a valid trim range before sharing.')
  }
  if (duration > MAX_TRIM_DURATION_SEC) {
    throw new Error(`Trimmed video must be ${MAX_TRIM_DURATION_SEC} seconds or less.`)
  }

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.playsInline = true
  video.src = url

  try {
    await waitForEvent(video, 'loadedmetadata')
    video.currentTime = Math.max(0, trim.start)
    await waitForEvent(video, 'seeked')

    const mimeType = pickRecorderMimeType()
    const stream = video.captureStream()
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
          recorder.state !== 'inactive' && recorder.stop()
        } catch {
          /* ignore */
        }
        video.pause()
        finish(() => reject(new Error('Video preparation timed out. Try a shorter clip.')))
      }, TRIM_TIMEOUT_MS)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = () => {
        video.pause()
        if (!chunks.length) {
          finish(() => reject(new Error('Could not prepare trimmed video.')))
          return
        }
        finish(() => resolve(new Blob(chunks, { type: mimeType.split(';')[0] })))
      }

      recorder.onerror = () => {
        finish(() => reject(new Error('Could not prepare trimmed video.')))
      }

      const stopRecording = () => {
        if (recorder.state !== 'inactive') recorder.stop()
      }

      video.ontimeupdate = () => {
        if (video.currentTime >= trim.end - 0.05) {
          video.pause()
          stopRecording()
        }
      }
      video.onended = stopRecording

      recorder.start(100)
      void video.play().catch(() => {
        finish(() => reject(new Error('Could not play video for trimming.')))
      })
    })

    return blob
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}

export async function prepareVideoForUpload(
  file: File,
  trim: VideoTrim,
  duration: number,
): Promise<File> {
  if (isFullVideoTrim(trim, duration)) {
    return file
  }
  const blob = await renderTrimmedVideo(file, trim)
  const mimeType = blob.type || 'video/webm'
  return new File([blob], trimmedFilename(file, mimeType), { type: mimeType })
}

export async function appendPostVideoToFormData(
  fd: FormData,
  file: File,
  trim: VideoTrim,
  duration: number,
  key = 'video',
): Promise<void> {
  const videoFile = await prepareVideoForUpload(file, trim, duration)
  fd.append(key, videoFile)
}
