import { useMemo, type CSSProperties } from 'react'
import { VOICE_WAVEFORM_BAR_COUNT } from '../../../hooks/useVoiceRecorder'
import './voice-waveform.css'

type Props = {
  levels?: number[]
  active?: boolean
  live?: boolean
  progress?: number
  mine?: boolean
  compact?: boolean
}

function fallbackBars(seed: number): number[] {
  const bars: number[] = []
  for (let i = 0; i < VOICE_WAVEFORM_BAR_COUNT; i++) {
    const wave = Math.sin((i + seed) * 0.55) * 0.22 + Math.cos((i + seed) * 0.31) * 0.18
    bars.push(0.28 + Math.abs(wave))
  }
  return bars
}

export function VoiceWaveform({
  levels,
  active = false,
  live = false,
  progress = 0,
  mine = false,
  compact = false,
}: Props) {
  const bars = useMemo(() => {
    if (levels && levels.length > 0) return levels
    return fallbackBars(3)
  }, [levels])

  const playedThrough = Math.floor(progress * bars.length)

  return (
    <div
      className={[
        'voice-waveform',
        mine ? 'voice-waveform--mine' : '',
        active && !live ? 'voice-waveform--active' : '',
        live ? 'voice-waveform--live-mic' : '',
        compact ? 'voice-waveform--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {bars.map((level, index) => {
        const height = Math.max(0.12, Math.min(1, level))
        const played = index < playedThrough
        return (
          <span
            key={index}
            className={[
              'voice-waveform__bar',
              played ? 'voice-waveform__bar--played' : '',
              active && !live ? 'voice-waveform__bar--live' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--bar-scale': height.toFixed(3), '--bar-i': index } as CSSProperties}
          />
        )
      })}
    </div>
  )
}
