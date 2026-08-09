import { useMemo, useState } from 'react'
import {
  Check, Music, Pause, Play, RotateCcw, Search, Volume2,
} from 'lucide-react'
import { ASPECT_OPTIONS, SPEED_OPTIONS, TRANSITIONS, VIDEO_FILTERS } from './config'
import { EXAMPLE_MUSIC, MUSIC_CATEGORIES, unsplash } from './data'
import { clamp, formatTime } from './format'
import { PanelSection } from './VideoTimeline'
import type {
  Adjustments, AspectRatioId, CaptionSegment, CaptionStyle, CoverState,
  CropState, MusicEdit, MusicTrack, OriginalAudioState, StudioMode, TransitionType,
} from './types'

export function TrimVideoControls({
  start, end, duration, minDuration, maxDuration, onChange,
}: {
  start: number
  end: number
  duration: number
  minDuration: number
  maxDuration: number
  onChange: (start: number, end: number) => void
}) {
  const selected = end - start
  const tooShort = selected < minDuration
  const tooLong = selected > maxDuration
  return (
    <PanelSection title="Trim">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">Start
          <input type="number" step={0.1} min={0} max={end - minDuration} value={Number(start.toFixed(1))}
            className="rounded-lg px-2 py-2 min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            onChange={e => onChange(clamp(Number(e.target.value), 0, end - minDuration), end)} />
        </label>
        <label className="flex flex-col gap-1">End
          <input type="number" step={0.1} min={start + minDuration} max={duration} value={Number(end.toFixed(1))}
            className="rounded-lg px-2 py-2 min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            onChange={e => onChange(start, clamp(Number(e.target.value), start + minDuration, duration))} />
        </label>
      </div>
      <p className="text-xs mt-2 m-0" style={{ color: tooShort || tooLong ? '#C83B3B' : 'var(--fg-muted)' }}>
        Selected {formatTime(selected, true)} · limits {formatTime(minDuration)}–{formatTime(maxDuration)}
        {tooShort ? ' · Too short' : ''}{tooLong ? ' · Too long' : ''}
      </p>
      <button type="button" className="mt-2 min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}
        onClick={() => onChange(0, Math.min(duration, maxDuration))}>Reset trim</button>
    </PanelSection>
  )
}

export function VideoCropEditor({
  crop, onChange, listingRatioEnabled,
}: {
  crop: CropState
  onChange: (c: CropState) => void
  listingRatioEnabled?: boolean
}) {
  const options = ASPECT_OPTIONS.filter(o => o.id !== 'listing' || listingRatioEnabled)
  return (
    <PanelSection title="Crop & reposition">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {options.map(o => (
          <button key={o.id} type="button" className="min-h-[40px] px-2.5 rounded-full text-xs font-semibold"
            style={{
              background: crop.aspectRatio === o.id ? 'var(--primary)' : 'var(--surface-subtle)',
              color: crop.aspectRatio === o.id ? '#fff' : 'var(--fg)',
              border: '1px solid var(--border)',
            }}
            onClick={() => onChange({ ...crop, aspectRatio: o.id as AspectRatioId })}>
            {o.label}
          </button>
        ))}
      </div>
      <label className="text-xs flex flex-col gap-1 mb-2">Zoom {crop.zoom.toFixed(2)}×
        <input type="range" min={1} max={3} step={0.01} value={crop.zoom} onChange={e => onChange({ ...crop, zoom: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1 mb-2">Horizontal {crop.offsetX}%
        <input type="range" min={0} max={100} value={crop.offsetX} onChange={e => onChange({ ...crop, offsetX: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1 mb-2">Vertical {crop.offsetY}%
        <input type="range" min={0} max={100} value={crop.offsetY} onChange={e => onChange({ ...crop, offsetY: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}
          onClick={() => onChange({ ...crop, rotation: ((crop.rotation + 90) % 360) as CropState['rotation'] })}>Rotate 90°</button>
        <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}
          onClick={() => onChange({ ...crop, fit: crop.fit === 'fill' ? 'fit' : 'fill' })}>{crop.fit === 'fill' ? 'Fit' : 'Fill'}</button>
        <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1" style={{ border: '1px solid var(--border)' }}
          onClick={() => onChange({ zoom: 1, offsetX: 50, offsetY: 50, rotation: 0, fit: 'fill', aspectRatio: crop.aspectRatio })}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <p className="text-[11px] mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>Safe areas help keep captions and subjects visible. Cropping may hide content near edges.</p>
    </PanelSection>
  )
}

export function VideoAdjustmentPanel({
  value, onChange,
}: {
  value: Adjustments
  onChange: (a: Adjustments) => void
}) {
  const keys: (keyof Adjustments)[] = ['brightness', 'contrast', 'saturation', 'warmth', 'highlights', 'shadows', 'fade']
  return (
    <PanelSection
      title="Adjust"
      action={<button type="button" className="text-xs font-semibold" style={{ color: 'var(--primary)' }} onClick={() => onChange({ brightness: 0, contrast: 0, saturation: 0, warmth: 0, highlights: 0, shadows: 0, fade: 0, sharpness: 0 })}>Reset all</button>}
    >
      {keys.map(k => (
        <label key={k} className="text-xs flex flex-col gap-1 mb-2 capitalize">{k} {value[k]}
          <div className="flex items-center gap-2">
            <input type="range" min={-50} max={50} value={value[k]} onChange={e => onChange({ ...value, [k]: Number(e.target.value) })} className="flex-1" style={{ accentColor: 'var(--primary)' }} />
            <button type="button" className="text-[10px] min-h-[32px] px-1" style={{ color: 'var(--fg-muted)' }} onClick={() => onChange({ ...value, [k]: 0 })}>Reset</button>
          </div>
        </label>
      ))}
    </PanelSection>
  )
}

export function VideoFilterPicker({
  selectedId, onSelect, mode,
}: {
  selectedId: string
  onSelect: (id: string) => void
  mode: StudioMode
}) {
  const filters = VIDEO_FILTERS.filter(f => mode !== 'commercial' || f.commercialApproved)
  return (
    <PanelSection title="Filters">
      <div className="flex gap-2 overflow-x-auto scroll-rail pb-1">
        {filters.map(f => (
          <button key={f.id} type="button" onClick={() => onSelect(f.id)}
            className="shrink-0 w-16 text-center">
            <div className="h-16 w-16 rounded-xl overflow-hidden mb-1" style={{
              border: selectedId === f.id ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: 'linear-gradient(135deg,#3d342e,#1b1816)',
              filter: f.css || 'none',
            }} />
            <span className="text-[10px] font-medium">{f.name}</span>
          </button>
        ))}
      </div>
    </PanelSection>
  )
}

export function TransitionPicker({
  value, duration, onChange, enabled,
}: {
  value: TransitionType
  duration: number
  onChange: (t: TransitionType, d: number) => void
  enabled: boolean
}) {
  if (!enabled) return null
  return (
    <PanelSection title="Transitions">
      <div className="flex flex-wrap gap-1.5">
        {TRANSITIONS.map(t => (
          <button key={t.id} type="button" className="min-h-[40px] px-2.5 rounded-full text-xs font-semibold"
            style={{ background: value === t.id ? 'var(--primary)' : 'var(--surface-subtle)', color: value === t.id ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}
            onClick={() => onChange(t.id, duration)}>
            {t.label}
          </button>
        ))}
      </div>
      {value !== 'none' && value !== 'cut' && (
        <label className="text-xs flex flex-col gap-1 mt-2">Duration {duration.toFixed(1)}s
          <input type="range" min={0.2} max={1.5} step={0.1} value={duration} onChange={e => onChange(value, Number(e.target.value))} style={{ accentColor: 'var(--primary)' }} />
        </label>
      )}
    </PanelSection>
  )
}

export function VideoSpeedControl({
  speed, onChange, enabled, resultingDuration,
}: {
  speed: number
  onChange: (s: number) => void
  enabled: boolean
  resultingDuration: number
}) {
  if (!enabled) return null
  return (
    <PanelSection title="Speed">
      <div className="flex flex-wrap gap-1.5">
        {SPEED_OPTIONS.map(s => (
          <button key={s} type="button" className="min-h-[40px] px-2.5 rounded-full text-xs font-semibold"
            style={{ background: speed === s ? 'var(--primary)' : 'var(--surface-subtle)', color: speed === s ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}
            onClick={() => onChange(s)}>{s}×</button>
        ))}
      </div>
      <p className="text-[11px] mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>
        Resulting duration {formatTime(resultingDuration)}. Original audio pitch may change. Music timing is unaffected.
      </p>
    </PanelSection>
  )
}

export function VideoCoverSelector({
  cover, currentTime, onChange, onUseCurrentFrame, feedPreviewUrl,
}: {
  cover: CoverState
  currentTime: number
  onChange: (c: CoverState) => void
  onUseCurrentFrame: () => void
  feedPreviewUrl?: string | null
}) {
  return (
    <PanelSection title="Cover">
      <div className="rounded-xl overflow-hidden mb-2 aspect-[4/5] bg-black">
        {feedPreviewUrl ? <img src={feedPreviewUrl} alt="" className="h-full w-full object-cover" /> : (
          <div className="h-full flex items-center justify-center text-xs" style={{ color: '#B8ADA3' }}>Frame at {formatTime(cover.time)}</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={onUseCurrentFrame}>
          Use current frame ({formatTime(currentTime)})
        </button>
      </div>
      <label className="text-xs flex flex-col gap-1">Alternative text
        <input value={cover.altText} onChange={e => onChange({ ...cover, altText: e.target.value })}
          className="rounded-lg px-3 py-2.5 min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          placeholder="Describe the cover for accessibility" />
      </label>
      <p className="text-[11px] mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>Recommended cover follows the selected aspect ratio. Black or blurry frames may look weak in the feed.</p>
    </PanelSection>
  )
}

export function OriginalAudioControls({
  value, onChange, hasAudio,
}: {
  value: OriginalAudioState
  onChange: (v: OriginalAudioState) => void
  hasAudio: boolean
}) {
  if (!hasAudio) {
    return <PanelSection title="Original audio"><p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>No audio track detected on this video.</p></PanelSection>
  }
  return (
    <PanelSection title="Original audio">
      <div className="flex flex-wrap gap-2 mb-2">
        <button type="button" className="min-h-[40px] px-3 rounded-full text-xs font-semibold"
          style={{ background: value.keep && !value.muted ? 'var(--primary)' : 'var(--surface-subtle)', color: value.keep && !value.muted ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}
          onClick={() => onChange({ ...value, keep: true, muted: false })}>Keep</button>
        <button type="button" className="min-h-[40px] px-3 rounded-full text-xs font-semibold"
          style={{ background: value.muted ? 'var(--primary)' : 'var(--surface-subtle)', color: value.muted ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}
          onClick={() => onChange({ ...value, muted: true })}>Mute</button>
      </div>
      <label className="text-xs flex flex-col gap-1 mb-2">Volume {Math.round(value.volume * 100)}%
        <input type="range" min={0} max={1} step={0.01} value={value.volume} disabled={value.muted}
          onChange={e => onChange({ ...value, volume: Number(e.target.value), muted: false, keep: true })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1 mb-2">Fade in {value.fadeIn.toFixed(1)}s
        <input type="range" min={0} max={3} step={0.1} value={value.fadeIn} onChange={e => onChange({ ...value, fadeIn: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1">Fade out {value.fadeOut.toFixed(1)}s
        <input type="range" min={0} max={3} step={0.1} value={value.fadeOut} onChange={e => onChange({ ...value, fadeOut: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
    </PanelSection>
  )
}

export function MusicRightsBadge({ track }: { track: MusicTrack }) {
  const label = track.regionalAvailability === 'unavailable-region'
    ? 'Unavailable in region'
    : track.commercialUseAllowed
      ? 'Commercial use allowed'
      : 'Personal use only'
  const color = track.regionalAvailability === 'unavailable-region' ? '#C83B3B' : track.commercialUseAllowed ? '#16845B' : '#B76808'
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>{label}</span>
}

export function MusicLibrary({
  mode, selectedId, onSelect, commercialOnly,
}: {
  mode: StudioMode
  selectedId: string | null
  onSelect: (track: MusicTrack) => void
  commercialOnly?: boolean
}) {
  const [cat, setCat] = useState('For You')
  const [q, setQ] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const tracks = useMemo(() => {
    let list = EXAMPLE_MUSIC
    if (commercialOnly || mode === 'commercial') list = list.filter(t => t.commercialUseAllowed)
    if (cat !== 'For You' && cat !== 'Trending' && cat !== 'Recently used' && cat !== 'Saved') {
      list = list.filter(t => t.category === cat)
    }
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(s) || t.artist.toLowerCase().includes(s))
    }
    return list
  }, [cat, q, mode, commercialOnly])

  return (
    <PanelSection title="Music library">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
        <Search size={16} style={{ color: 'var(--fg-muted)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search songs, artists..." className="flex-1 text-sm outline-none bg-transparent" style={{ color: 'var(--fg)' }} aria-label="Search music" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto scroll-rail mb-2">
        {MUSIC_CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setCat(c)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px]"
            style={{ background: cat === c ? 'var(--primary)' : 'var(--surface)', color: cat === c ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}>{c}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {tracks.map(track => (
          <button key={track.id} type="button" onClick={() => track.regionalAvailability === 'available' && onSelect(track)}
            className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left min-w-0"
            style={{
              background: selectedId === track.id ? 'rgba(140,82,255,0.1)' : 'var(--surface)',
              border: `1px solid ${selectedId === track.id ? 'color-mix(in srgb, var(--primary) 35%, var(--border))' : 'var(--border)'}`,
              opacity: track.regionalAvailability === 'unavailable-region' ? 0.55 : 1,
            }}>
            <img src={unsplash(track.coverId, 88, 88)} alt="" className="h-11 w-11 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate m-0">{track.title}</p>
              <p className="text-xs truncate m-0" style={{ color: 'var(--fg-muted)' }}>{track.artist} · {formatTime(track.duration)}</p>
              <MusicRightsBadge track={track} />
            </div>
            <span role="button" tabIndex={0} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full shrink-0"
              style={{ background: playingId === track.id ? 'var(--primary)' : 'var(--surface-subtle)', color: playingId === track.id ? '#fff' : 'var(--fg-muted)' }}
              onClick={e => { e.stopPropagation(); setPlayingId(playingId === track.id ? null : track.id) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setPlayingId(playingId === track.id ? null : track.id) } }}
              aria-label={playingId === track.id ? 'Pause preview' : 'Preview'}>
              {playingId === track.id ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            </span>
            {selectedId === track.id && <Check size={16} style={{ color: 'var(--primary)' }} />}
          </button>
        ))}
        {tracks.length === 0 && <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>No tracks match this search.</p>}
      </div>
    </PanelSection>
  )
}

export function MusicTimelineEditor({
  music, videoDuration, onChange, onRemove,
}: {
  music: MusicEdit
  videoDuration: number
  onChange: (m: MusicEdit) => void
  onRemove: () => void
}) {
  return (
    <PanelSection title="Music on timeline" action={<button type="button" className="text-xs font-semibold" style={{ color: '#C83B3B' }} onClick={onRemove}>Remove</button>}>
      <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>{music.attribution}</p>
      <label className="text-xs flex flex-col gap-1 mb-2">Music start in video {formatTime(music.timelineStart)}
        <input type="range" min={0} max={Math.max(0, videoDuration - 0.5)} step={0.1} value={music.timelineStart}
          onChange={e => onChange({ ...music, timelineStart: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1 mb-2">Trim start {formatTime(music.trimStart)}
        <input type="range" min={0} max={Math.max(0, music.trimEnd - 0.5)} step={0.1} value={music.trimStart}
          onChange={e => onChange({ ...music, trimStart: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      <label className="text-xs flex flex-col gap-1 mb-2">Trim end {formatTime(music.trimEnd)}
        <input type="range" min={music.trimStart + 0.5} max={120} step={0.1} value={music.trimEnd}
          onChange={e => onChange({ ...music, trimEnd: Number(e.target.value) })} style={{ accentColor: 'var(--primary)' }} />
      </label>
      {!music.commercialUseAllowed && (
        <p className="text-xs m-0" style={{ color: '#B76808' }} role="status">This track is not approved for commercial use.</p>
      )}
      {music.regionalAvailability === 'unavailable-region' && (
        <p className="text-xs m-0" style={{ color: '#C83B3B' }} role="alert">Music unavailable in the publishing region.</p>
      )}
    </PanelSection>
  )
}

export function AudioMixer({
  original, musicVolume, onOriginal, onMusicVolume,
}: {
  original: OriginalAudioState
  musicVolume: number
  onOriginal: (o: OriginalAudioState) => void
  onMusicVolume: (v: number) => void
}) {
  return (
    <PanelSection title="Audio mix">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 size={14} style={{ color: 'var(--fg-muted)' }} />
          <span className="text-xs w-24" style={{ color: 'var(--fg-muted)' }}>Original</span>
          <input type="range" min={0} max={1} step={0.01} value={original.muted ? 0 : original.volume}
            onChange={e => onOriginal({ ...original, volume: Number(e.target.value), muted: false, keep: true })} className="flex-1" style={{ accentColor: 'var(--primary)' }} />
        </div>
        <div className="flex items-center gap-2">
          <Music size={14} style={{ color: 'var(--fg-muted)' }} />
          <span className="text-xs w-24" style={{ color: 'var(--fg-muted)' }}>Music</span>
          <input type="range" min={0} max={1} step={0.01} value={musicVolume}
            onChange={e => onMusicVolume(Number(e.target.value))} className="flex-1" style={{ accentColor: 'var(--primary)' }} />
        </div>
      </div>
      <button type="button" className="mt-2 min-h-[40px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}
        onClick={() => { onOriginal({ ...original, volume: 0.7, muted: false }); onMusicVolume(0.45) }}>
        Recommended balance
      </button>
      <p className="text-[11px] mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>Simple balance for preview — not a professionally mastered mix.</p>
    </PanelSection>
  )
}

export function AutomaticCaptionStatus({
  status, onRequest, onRetry,
}: {
  status: 'idle' | 'requesting' | 'processing' | 'ready' | 'failed' | 'unsupported'
  onRequest: () => void
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl p-3 mb-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold m-0">Automatic captions</p>
      <p className="text-[11px] mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
        {status === 'idle' && 'Generate a draft transcript from audio. Review before publishing.'}
        {status === 'requesting' && 'Requesting transcription…'}
        {status === 'processing' && 'Processing captions…'}
        {status === 'ready' && 'Ready — review automatic captions before publishing.'}
        {status === 'failed' && 'Caption processing failed.'}
        {status === 'unsupported' && 'Language or audio unsupported for automatic captions.'}
      </p>
      {(status === 'idle' || status === 'failed' || status === 'unsupported') && (
        <button type="button" className="mt-2 min-h-[40px] px-3 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}
          onClick={status === 'failed' ? onRetry : onRequest}>
          {status === 'failed' ? 'Retry' : 'Generate automatic captions'}
        </button>
      )}
    </div>
  )
}

export function VideoCaptionsEditor({
  captions, language, onLanguage, status, onRequestAuto, onChange, onAdd, onDelete, onJump,
}: {
  captions: CaptionSegment[]
  language: string
  onLanguage: (l: string) => void
  status: 'idle' | 'requesting' | 'processing' | 'ready' | 'failed' | 'unsupported'
  onRequestAuto: () => void
  onChange: (id: string, patch: Partial<CaptionSegment>) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onJump: (start: number) => void
}) {
  return (
    <PanelSection title="Captions">
      <AutomaticCaptionStatus status={status} onRequest={onRequestAuto} onRetry={onRequestAuto} />
      <label className="text-xs flex flex-col gap-1 mb-2">Language
        <select value={language} onChange={e => onLanguage(e.target.value)} className="rounded-lg px-3 py-2.5 min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          <option value="en">English (detected)</option>
          <option value="fr">French</option>
          <option value="ar">Arabic</option>
          <option value="es">Spanish</option>
        </select>
      </label>
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
        {captions.map(c => (
          <div key={c.id} className="rounded-xl p-2" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <button type="button" className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }} onClick={() => onJump(c.start)}>{formatTime(c.start)}–{formatTime(c.end)}</button>
              {!c.reviewed && <span className="text-[10px] px-1.5 rounded-full" style={{ background: 'rgba(183,104,8,0.15)', color: '#B76808' }}>Review</span>}
              {c.confidence != null && c.confidence < 0.7 && <span className="text-[10px]" style={{ color: '#B76808' }}>Low confidence</span>}
            </div>
            <textarea value={c.text} rows={2} className="w-full text-sm rounded-lg px-2 py-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              onChange={e => onChange(c.id, { text: e.target.value, reviewed: true })} />
            <div className="flex gap-2 mt-1">
              <button type="button" className="text-[11px] min-h-[36px] px-2" style={{ color: 'var(--fg-muted)' }} onClick={() => onChange(c.id, { reviewed: true })}>Mark reviewed</button>
              <button type="button" className="text-[11px] min-h-[36px] px-2" style={{ color: '#C83B3B' }} onClick={() => onDelete(c.id)}>Delete</button>
            </div>
            <CaptionStylePanel style={c.style} onChange={style => onChange(c.id, { style })} />
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onAdd}>Add caption segment</button>
    </PanelSection>
  )
}

export function CaptionStylePanel({ style, onChange }: { style: CaptionStyle; onChange: (s: CaptionStyle) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {(['bottom', 'center', 'top'] as const).map(p => (
        <button key={p} type="button" className="min-h-[32px] px-2 rounded-full text-[10px] font-semibold capitalize"
          style={{ background: style.position === p ? 'var(--primary)' : 'var(--surface-subtle)', color: style.position === p ? '#fff' : 'var(--fg)' }}
          onClick={() => onChange({ ...style, position: p })}>{p}</button>
      ))}
      <button type="button" className="min-h-[32px] px-2 rounded-full text-[10px] font-semibold"
        style={{ background: style.highContrast ? 'var(--primary)' : 'var(--surface-subtle)', color: style.highContrast ? '#fff' : 'var(--fg)' }}
        onClick={() => onChange({ ...style, highContrast: !style.highContrast })}>High contrast</button>
    </div>
  )
}

export function UndoRedoControls({
  canUndo, canRedo, onUndo, onRedo,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={!canUndo} className="min-w-[44px] min-h-[44px] rounded-xl text-xs font-semibold disabled:opacity-40" style={{ border: '1px solid var(--border)' }} onClick={onUndo} aria-label="Undo">Undo</button>
      <button type="button" disabled={!canRedo} className="min-w-[44px] min-h-[44px] rounded-xl text-xs font-semibold disabled:opacity-40" style={{ border: '1px solid var(--border)' }} onClick={onRedo} aria-label="Redo">Redo</button>
    </div>
  )
}
