import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX,
} from 'lucide-react'
import { formatTime } from './format'
import type { CaptionSegment, CropState } from './types'

export type PlayerStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'seeking' | 'failed' | 'unavailable' | 'offline'

export function VideoPosterFrame({ src, alt = 'Video poster' }: { src: string; alt?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  )
}

export function VideoSafeAreaOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-x-[6%] top-[8%] bottom-[18%] border border-dashed border-white/25 rounded-lg" />
      <span className="absolute left-[8%] bottom-[10%] text-[10px] text-white/50">Caption safe</span>
      <span className="absolute right-[8%] top-[10%] text-[10px] text-white/50">UI overlay</span>
    </div>
  )
}

export function VideoTimeDisplay({ current, duration }: { current: number; duration: number }) {
  return (
    <span className="text-xs tabular-nums" style={{ color: '#B8ADA3' }} aria-label={`${formatTime(current)} of ${formatTime(duration)}`}>
      {formatTime(current)} / {formatTime(duration)}
    </span>
  )
}

export function VideoPlaybackError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center" role="alert">
      <AlertCircle size={28} style={{ color: '#C83B3B' }} />
      <p className="text-sm m-0" style={{ color: '#FFFAF2' }}>{message}</p>
      {onRetry && (
        <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#8C52FF' }} onClick={onRetry}>
          Retry playback
        </button>
      )}
    </div>
  )
}

export function VideoLoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black" role="status" aria-live="polite">
      <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[#8C52FF] animate-spin" />
      <span className="sr-only">Loading video</span>
    </div>
  )
}

export function VideoPreviewPlayer({
  src,
  trimStart,
  trimEnd,
  currentTime,
  onTimeUpdate,
  playing,
  onPlayingChange,
  muted,
  volume,
  onMutedChange,
  filterCss,
  crop,
  playbackRate = 1,
  captions = [],
  showCaptions = true,
  showSafeAreas = false,
  posterUrl,
  loop = false,
  fit = 'contain',
  className = '',
}: {
  src: string
  trimStart: number
  trimEnd: number
  currentTime: number
  onTimeUpdate: (t: number) => void
  playing: boolean
  onPlayingChange: (p: boolean) => void
  muted: boolean
  volume: number
  onMutedChange: (m: boolean) => void
  filterCss?: string
  crop: CropState
  playbackRate?: number
  captions?: CaptionSegment[]
  showCaptions?: boolean
  showSafeAreas?: boolean
  posterUrl?: string | null
  loop?: boolean
  fit?: 'contain' | 'cover'
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<PlayerStatus>('loading')
  const [fullscreen, setFullscreen] = useState(false)
  const duration = Math.max(0.1, trimEnd - trimStart)
  const activeCaption = captions.find(c => currentTime >= c.start && currentTime <= c.end)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = Math.min(1, Math.max(0, volume))
    v.muted = muted
    v.playbackRate = playbackRate
  }, [volume, muted, playbackRate])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const sync = async () => {
      if (playing) {
        try {
          if (v.currentTime < trimStart || v.currentTime >= trimEnd - 0.05) {
            v.currentTime = trimStart
          }
          await v.play()
          setStatus('playing')
        } catch {
          onPlayingChange(false)
          setStatus('paused')
        }
      } else {
        v.pause()
        setStatus(s => (s === 'loading' || s === 'failed' ? s : 'paused'))
      }
    }
    void sync()
  }, [playing, trimStart, trimEnd, onPlayingChange])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (Math.abs(v.currentTime - currentTime) > 0.35) {
      setStatus('seeking')
      v.currentTime = currentTime
    }
  }, [currentTime])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        onPlayingChange(!playing)
      }
      if (e.key === 'ArrowRight') onTimeUpdate(Math.min(trimEnd, currentTime + 1))
      if (e.key === 'ArrowLeft') onTimeUpdate(Math.max(trimStart, currentTime - 1))
      if (e.key === 'm') onMutedChange(!muted)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, currentTime, trimStart, trimEnd, muted, onPlayingChange, onTimeUpdate, onMutedChange])

  const aspect = crop.aspectRatio === 'original' ? undefined
    : crop.aspectRatio === '9:16' ? '9 / 16'
      : crop.aspectRatio === '16:9' ? '16 / 9'
        : crop.aspectRatio === '1:1' ? '1 / 1'
          : crop.aspectRatio === '3:2' ? '3 / 2'
            : '4 / 5'

  return (
    <div className={`relative w-full max-w-full min-w-0 overflow-hidden bg-black ${className}`} style={{ aspectRatio: aspect || '4 / 5' }}>
      {status === 'loading' && posterUrl && <VideoPosterFrame src={posterUrl} />}
      {status === 'loading' && !posterUrl && <VideoLoadingState />}
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="h-full w-full"
        style={{
          objectFit: fit === 'cover' || crop.fit === 'fill' ? 'cover' : 'contain',
          objectPosition: `${crop.offsetX}% ${crop.offsetY}%`,
          transform: `scale(${crop.zoom}) rotate(${crop.rotation}deg)`,
          filter: filterCss || 'none',
        }}
        onLoadedData={() => {
          const v = videoRef.current
          if (v && v.currentTime < trimStart) v.currentTime = trimStart
          setStatus('ready')
        }}
        onWaiting={() => setStatus('buffering')}
        onPlaying={() => setStatus('playing')}
        onPause={() => setStatus(playing ? 'buffering' : 'paused')}
        onError={() => setStatus('failed')}
        onTimeUpdate={() => {
          const v = videoRef.current
          if (!v) return
          if (v.currentTime >= trimEnd) {
            if (loop) {
              v.currentTime = trimStart
              onTimeUpdate(trimStart)
              return
            }
            v.pause()
            onPlayingChange(false)
            onTimeUpdate(trimEnd)
            return
          }
          onTimeUpdate(v.currentTime)
        }}
      />
      <VideoSafeAreaOverlay show={showSafeAreas} />
      {showCaptions && activeCaption && (
        <div
          className="absolute inset-x-4 pointer-events-none"
          style={{
            bottom: activeCaption.style.position === 'bottom' ? '12%' : undefined,
            top: activeCaption.style.position === 'top' ? '12%' : activeCaption.style.position === 'center' ? '45%' : undefined,
            textAlign: activeCaption.style.alignment,
          }}
        >
          <span
            className="inline-block px-2 py-1 rounded text-sm max-w-full break-anywhere"
            style={{
              color: activeCaption.style.color,
              background: activeCaption.style.highContrast ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
              fontSize: activeCaption.style.textSize === 'lg' ? 18 : activeCaption.style.textSize === 'sm' ? 12 : 14,
            }}
          >
            {activeCaption.text}
          </span>
        </div>
      )}
      {status === 'failed' && <VideoPlaybackError message="Playback failed. The preview may be unsupported in this browser." onRetry={() => { setStatus('loading'); videoRef.current?.load() }} />}
      <VideoPlaybackControls
        playing={playing}
        muted={muted}
        current={currentTime}
        duration={trimStart + duration}
        trimStart={trimStart}
        trimEnd={trimEnd}
        fullscreen={fullscreen}
        onTogglePlay={() => onPlayingChange(!playing)}
        onToggleMute={() => onMutedChange(!muted)}
        onSeek={onTimeUpdate}
        onToggleFullscreen={() => setFullscreen(f => !f)}
      />
      <span className="sr-only" aria-live="polite">{playing ? 'Playing' : 'Paused'}</span>
    </div>
  )
}

export function VideoPlaybackControls({
  playing,
  muted,
  current,
  duration,
  trimStart,
  trimEnd,
  fullscreen,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onToggleFullscreen,
}: {
  playing: boolean
  muted: boolean
  current: number
  duration: number
  trimStart: number
  trimEnd: number
  fullscreen: boolean
  onTogglePlay: () => void
  onToggleMute: () => void
  onSeek: (t: number) => void
  onToggleFullscreen: () => void
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8 bg-gradient-to-t from-black/80 to-transparent">
      <input
        type="range"
        min={trimStart}
        max={trimEnd}
        step={0.05}
        value={Math.min(trimEnd, Math.max(trimStart, current))}
        onChange={e => onSeek(Number(e.target.value))}
        className="w-full accent-[#8C52FF]"
        aria-label="Seek"
      />
      <div className="flex items-center gap-1 mt-1">
        <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <VideoTimeDisplay current={current - trimStart} duration={Math.max(0, trimEnd - trimStart)} />
        <div className="flex-1" />
        <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white" onClick={onToggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  )
}
