import { useEffect, useState } from 'react'

const THUMB_COUNT = 10

function waitForEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Could not load video frames'))
    }
    const cleanup = () => {
      target.removeEventListener(event, onSuccess)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onSuccess, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

async function buildFilmstrip(previewUrl: string): Promise<string[]> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = previewUrl

  try {
    await waitForEvent(video, 'loadedmetadata')
    const duration = video.duration || 0
    if (!Number.isFinite(duration) || duration <= 0) return []

    const canvas = document.createElement('canvas')
    canvas.width = 72
    canvas.height = 72
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    const thumbs: string[] = []
    for (let i = 0; i < THUMB_COUNT; i += 1) {
      const ratio = THUMB_COUNT === 1 ? 0 : i / (THUMB_COUNT - 1)
      video.currentTime = Math.min(duration * ratio, Math.max(0, duration - 0.05))
      await waitForEvent(video, 'seeked')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      thumbs.push(canvas.toDataURL('image/jpeg', 0.62))
    }
    return thumbs
  } finally {
    video.src = ''
  }
}

export function useVideoFilmstrip(previewUrl?: string) {
  const [thumbs, setThumbs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!previewUrl) {
      setThumbs([])
      return
    }

    let cancelled = false
    setLoading(true)
    void buildFilmstrip(previewUrl)
      .then((rows) => {
        if (!cancelled) setThumbs(rows)
      })
      .catch(() => {
        if (!cancelled) setThumbs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [previewUrl])

  return { thumbs, loading }
}
