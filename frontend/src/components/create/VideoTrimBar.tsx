import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { VideoTrim } from './types'
import { MAX_TRIM_DURATION_SEC } from './videoTrimUtils'
import { useVideoFilmstrip } from './useVideoFilmstrip'
import './VideoTrimBar.css'

type DragMode = 'start' | 'end' | 'range'

type Props = {
  value: VideoTrim
  duration: number
  onChange: (next: VideoTrim) => void
  disabled?: boolean
  maxDurationSec?: number
  previewUrl?: string
  playheadSec?: number
  onScrub?: (sec: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatClock(sec: number) {
  const safe = Math.max(0, sec)
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function applyTrimChange(
  duration: number,
  maxDurationSec: number,
  anchor: VideoTrim,
  nextStart: number,
  nextEnd: number,
): VideoTrim {
  let start = clamp(nextStart, 0, Math.max(0, duration - 0.5))
  let end = clamp(nextEnd, start + 0.5, duration)
  if (end - start > maxDurationSec) {
    if (Math.abs(nextEnd - anchor.end) >= Math.abs(nextStart - anchor.start)) {
      end = start + maxDurationSec
    } else {
      start = end - maxDurationSec
    }
  }
  return { start, end }
}

export function VideoTrimBar({
  value,
  duration,
  onChange,
  disabled,
  maxDurationSec = MAX_TRIM_DURATION_SEC,
  previewUrl,
  playheadSec,
  onScrub,
}: Props) {
  const onScrubRef = useRef(onScrub)
  onScrubRef.current = onScrub
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: DragMode; originX: number; originTrim: VideoTrim } | null>(null)
  const { thumbs } = useVideoFilmstrip(previewUrl)

  const safeEnd = Math.max(value.start + 0.5, value.end)
  const selectionSec = safeEnd - value.start
  const overMax = selectionSec > maxDurationSec

  const secFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || duration <= 0) return 0
      const rect = track.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return ratio * duration
    },
    [duration],
  )

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || duration <= 0) return

      const deltaSec = secFromClientX(event.clientX) - secFromClientX(drag.originX)
      const { originTrim, mode } = drag

      if (mode === 'start') {
        const next = applyTrimChange(duration, maxDurationSec, originTrim, originTrim.start + deltaSec, originTrim.end)
        onChange(next)
        onScrubRef.current?.(next.start)
        return
      }
      if (mode === 'end') {
        const next = applyTrimChange(duration, maxDurationSec, originTrim, originTrim.start, originTrim.end + deltaSec)
        onChange(next)
        onScrubRef.current?.(Math.max(next.start, next.end - 0.05))
        return
      }
      const span = originTrim.end - originTrim.start
      let start = originTrim.start + deltaSec
      start = clamp(start, 0, Math.max(0, duration - span))
      onChange({ start, end: start + span })
      onScrubRef.current?.(start)
    }

    const onUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [duration, maxDurationSec, onChange, secFromClientX, value])

  const beginDrag = (mode: DragMode, event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (disabled || duration <= 0) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = { mode, originX: event.clientX, originTrim: { start: value.start, end: safeEnd } }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  if (disabled || duration <= 0) {
    return (
      <div className="video-trim-bar video-trim-bar--disabled">
        <p className="video-trim-bar__hint">Pick a video to trim your clip.</p>
      </div>
    )
  }

  const startPct = (value.start / duration) * 100
  const endPct = (safeEnd / duration) * 100
  const playhead = playheadSec ?? value.start
  const playheadPct = clamp((playhead / duration) * 100, 0, 100)
  const filmstrip = thumbs.length > 0 ? thumbs : Array.from({ length: 10 }, () => '')

  return (
    <div className="video-trim-bar">
      <div className="video-trim-bar__meta">
        <p className="video-trim-bar__duration">
          <strong>{formatClock(selectionSec)}</strong> selected · {formatClock(value.start)}–{formatClock(safeEnd)}
        </p>
        {overMax ? <p className="video-trim-bar__warn">Max {maxDurationSec}s</p> : null}
      </div>

      <div ref={trackRef} className="video-trim-bar__track" aria-label="Trim video">
        <div className="video-trim-bar__filmstrip" aria-hidden>
          {filmstrip.map((src, index) =>
            src ? (
              <img key={index} className="video-trim-bar__thumb" src={src} alt="" />
            ) : (
              <span key={index} className="video-trim-bar__thumb video-trim-bar__thumb--placeholder" />
            ),
          )}
        </div>

        <div className="video-trim-bar__dim video-trim-bar__dim--left" style={{ width: `${startPct}%` }} />
        <div
          className="video-trim-bar__dim video-trim-bar__dim--right"
          style={{ left: `${endPct}%`, width: `${100 - endPct}%` }}
        />

        {playheadSec !== undefined ? (
          <div className="video-trim-bar__playhead" style={{ left: `${playheadPct}%` }} />
        ) : null}

        <div
          className="video-trim-bar__selection"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          onPointerDown={(event) => beginDrag('range', event)}
        >
          <button
            type="button"
            className="video-trim-bar__handle video-trim-bar__handle--start"
            aria-label="Trim start"
            onPointerDown={(event) => beginDrag('start', event)}
          />
          <button
            type="button"
            className="video-trim-bar__handle video-trim-bar__handle--end"
            aria-label="Trim end"
            onPointerDown={(event) => beginDrag('end', event)}
          />
        </div>
      </div>

      <p className="video-trim-bar__hint">Drag the handles to trim · drag the middle to move the clip</p>
    </div>
  )
}
