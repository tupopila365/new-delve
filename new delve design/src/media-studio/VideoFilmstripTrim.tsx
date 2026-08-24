import { useEffect, useRef, useState } from 'react'
import { clamp, formatTime } from './format'

const THUMB_COUNT = 12

/**
 * Instagram-style filmstrip trim: drag start/end handles over video frame thumbnails.
 */
export function VideoFilmstripTrim({
  src,
  duration,
  trimStart,
  trimEnd,
  minDuration,
  maxDuration,
  playhead,
  onTrimChange,
  onSeek,
}: {
  src: string
  duration: number
  trimStart: number
  trimEnd: number
  minDuration: number
  maxDuration: number
  playhead: number
  onTrimChange: (start: number, end: number) => void
  onSeek: (t: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [drag, setDrag] = useState<'start' | 'end' | 'seek' | null>(null)

  useEffect(() => {
    let cancelled = false
    const video = document.createElement('video')
    video.src = src
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    async function capture() {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve()
        video.onerror = () => reject(new Error('load'))
        if (video.readyState >= 2) resolve()
      }).catch(() => null)
      if (cancelled) return
      const total = Math.max(0.1, duration || video.duration || 1)
      const frames: string[] = []
      const canvas = document.createElement('canvas')
      canvas.width = 72
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      for (let i = 0; i < THUMB_COUNT; i++) {
        const t = (i / Math.max(1, THUMB_COUNT - 1)) * total
        video.currentTime = Math.min(t, total - 0.05)
        await new Promise<void>(resolve => {
          video.onseeked = () => resolve()
        })
        if (cancelled) return
        ctx.fillStyle = '#1a1614'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const vw = video.videoWidth || 1
        const vh = video.videoHeight || 1
        const scale = Math.max(canvas.width / vw, canvas.height / vh)
        const w = vw * scale
        const h = vh * scale
        ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        frames.push(canvas.toDataURL('image/jpeg', 0.6))
      }
      if (!cancelled) setThumbs(frames)
    }

    void capture()
    return () => {
      cancelled = true
      video.removeAttribute('src')
      video.load()
    }
  }, [src, duration])

  function timeFromClientX(clientX: number) {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width, 0, 1)
    return x * Math.max(0.1, duration)
  }

  useEffect(() => {
    if (!drag) return
    function onMove(e: PointerEvent) {
      const t = timeFromClientX(e.clientX)
      if (drag === 'seek') {
        onSeek(clamp(t, trimStart, trimEnd))
        return
      }
      if (drag === 'start') {
        const nextStart = clamp(t, 0, trimEnd - minDuration)
        const nextEnd = Math.min(trimEnd, nextStart + maxDuration)
        onTrimChange(nextStart, nextEnd)
        onSeek(nextStart)
        return
      }
      if (drag === 'end') {
        const nextEnd = clamp(t, trimStart + minDuration, duration)
        const nextStart = Math.max(trimStart, nextEnd - maxDuration)
        onTrimChange(nextStart, nextEnd)
        onSeek(nextEnd)
      }
    }
    function onUp() {
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, duration, trimStart, trimEnd, minDuration, maxDuration, onTrimChange, onSeek])

  const total = Math.max(0.1, duration)
  const leftPct = (trimStart / total) * 100
  const rightPct = 100 - (trimEnd / total) * 100
  const playPct = ((playhead - trimStart) / Math.max(0.1, trimEnd - trimStart)) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,250,242,0.7)' }}>
          {formatTime(trimEnd - trimStart)}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,250,242,0.45)' }}>
          {formatTime(trimStart)} – {formatTime(trimEnd)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-[72px] rounded-xl overflow-hidden select-none touch-none"
        style={{ background: '#1a1614' }}
        onPointerDown={e => {
          if ((e.target as HTMLElement).dataset.handle) return
          setDrag('seek')
          const t = timeFromClientX(e.clientX)
          onSeek(clamp(t, trimStart, trimEnd))
        }}
      >
        <div className="absolute inset-0 flex">
          {(thumbs.length ? thumbs : Array.from({ length: THUMB_COUNT })).map((srcOrNull, i) => (
            <div key={i} className="flex-1 h-full overflow-hidden" style={{ borderRight: i < THUMB_COUNT - 1 ? '1px solid rgba(0,0,0,0.35)' : undefined }}>
              {typeof srcOrNull === 'string' ? (
                <img src={srcOrNull} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
              ) : (
                <div className="w-full h-full animate-pulse" style={{ background: '#2a2420' }} />
              )}
            </div>
          ))}
        </div>

        {/* Dimmed outsides */}
        <div className="absolute inset-y-0 left-0 bg-black/65 pointer-events-none" style={{ width: `${leftPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-black/65 pointer-events-none" style={{ width: `${rightPct}%` }} />

        {/* Selection window */}
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{
            left: `${leftPct}%`,
            right: `${rightPct}%`,
            boxShadow: 'inset 0 0 0 2px #8C52FF',
          }}
        >
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{ left: `${clamp(playPct, 0, 100)}%` }}
          />
        </div>

        {/* Handles */}
        <button
          type="button"
          data-handle="start"
          aria-label="Trim start"
          className="absolute top-0 bottom-0 w-5 -ml-2.5 z-10 flex items-center justify-center"
          style={{ left: `${leftPct}%` }}
          onPointerDown={e => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            setDrag('start')
          }}
        >
          <span className="h-full w-3 rounded-l-md flex items-center justify-center" style={{ background: '#8C52FF' }}>
            <span className="w-0.5 h-6 rounded-full bg-white/90" />
          </span>
        </button>
        <button
          type="button"
          data-handle="end"
          aria-label="Trim end"
          className="absolute top-0 bottom-0 w-5 -mr-2.5 z-10 flex items-center justify-center"
          style={{ right: `${rightPct}%` }}
          onPointerDown={e => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            setDrag('end')
          }}
        >
          <span className="h-full w-3 rounded-r-md flex items-center justify-center" style={{ background: '#8C52FF' }}>
            <span className="w-0.5 h-6 rounded-full bg-white/90" />
          </span>
        </button>
      </div>
    </div>
  )
}
