import type { VideoTrim } from './types'
import { MAX_TRIM_DURATION_SEC } from './videoTrimUtils'

type Props = {
  value: VideoTrim
  duration: number
  onChange: (next: VideoTrim) => void
  disabled?: boolean
  maxDurationSec?: number
}

export function VideoTrimBar({ value, duration, onChange, disabled, maxDurationSec = MAX_TRIM_DURATION_SEC }: Props) {
  if (disabled || duration <= 0) {
    return (
      <div className="create-panel">
        <p className="create-panel__title">Trim</p>
        <p className="create-panel__hint">Pick a video to set start and end points for preview.</p>
      </div>
    )
  }

  const safeEnd = Math.max(value.start + 0.5, value.end)
  const selectionSec = safeEnd - value.start
  const overMax = selectionSec > maxDurationSec

  return (
    <div className="create-panel">
      <p className="create-panel__title">Trim video</p>
      <p className="create-panel__hint">
        {value.start.toFixed(1)}s – {safeEnd.toFixed(1)}s of {duration.toFixed(1)}s
        {overMax ? ` · Max ${maxDurationSec}s per clip` : ''}
      </p>
      <label className="create-slider">
        <span>Start</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, duration - 0.5)}
          step={0.1}
          value={value.start}
          onChange={(event) => {
            const start = Number(event.target.value)
            const end = Math.max(start + 0.5, value.end)
            const cappedEnd = Math.min(end, start + maxDurationSec)
            onChange({ start, end: cappedEnd })
          }}
        />
      </label>
      <label className="create-slider">
        <span>End</span>
        <input
          type="range"
          min={0.5}
          max={duration}
          step={0.1}
          value={safeEnd}
          onChange={(event) => {
            const end = Number(event.target.value)
            const start = Math.min(value.start, end - 0.5)
            const cappedEnd = Math.min(end, start + maxDurationSec)
            onChange({ start, end: cappedEnd })
          }}
        />
      </label>
    </div>
  )
}
