import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { formatVoiceDuration } from '../../../hooks/useVoiceRecorder'
import { formatMessageTime } from '../dm/messagingUtils'
import { VoiceWaveform } from './VoiceWaveform'
import './voice-note-player.css'
import './voice-waveform.css'

type Props = {
  src: string
  durationSec?: number | null
  mine?: boolean
  sentAt?: string | null
  pending?: boolean
}

export function VoiceNotePlayer({ src, durationSec, mine = false, sentAt, pending = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(durationSec ?? 0)

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      /* ignore */
    }
  }

  const elapsed = playing
    ? Math.round(duration * progress)
    : progress > 0
      ? Math.round(duration * progress)
      : durationSec ?? duration

  return (
    <div className={`voice-note-player${mine ? ' voice-note-player--mine' : ''}`}>
      <div className="voice-note-player__row">
        <button type="button" className="voice-note-player__btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <span className="voice-note-player__pause" aria-hidden />
          ) : (
            <Play size={14} strokeWidth={2.5} aria-hidden />
          )}
        </button>
        <VoiceWaveform active={playing} progress={progress} mine={mine} compact />
      </div>
      <div className="voice-note-player__meta">
        <span className="voice-note-player__time">{formatVoiceDuration(elapsed)}</span>
        {pending ? (
          <span className="voice-note-player__sent">Sending…</span>
        ) : sentAt ? (
          <time className="voice-note-player__sent" dateTime={sentAt}>
            {formatMessageTime(sentAt)}
          </time>
        ) : null}
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => {
          const audio = audioRef.current
          if (!audio || !Number.isFinite(audio.duration)) return
          setDuration(Math.round(audio.duration))
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current
          if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
          setProgress(audio.currentTime / audio.duration)
        }}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
        onPause={() => setPlaying(false)}
      />
    </div>
  )
}
