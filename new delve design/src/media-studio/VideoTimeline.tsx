import type { ReactNode } from 'react'
import {
  Copy, GripVertical, Scissors, Trash2, ZoomIn, ZoomOut,
} from 'lucide-react'
import { clamp, formatTime } from './format'
import type { CaptionSegment, MusicEdit, VideoClip } from './types'

export function TimelineRuler({ duration, zoom }: { duration: number; zoom: number }) {
  const ticks = Math.max(4, Math.floor(duration / (zoom > 1.5 ? 1 : 2)))
  return (
    <div className="relative h-5 w-full text-[10px]" style={{ color: '#B8ADA3' }} aria-hidden>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const t = (i / ticks) * duration
        return (
          <span key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${(i / ticks) * 100}%` }}>
            {formatTime(t)}
          </span>
        )
      })}
    </div>
  )
}

export function TimelinePlayhead({ positionPct }: { positionPct: number }) {
  return (
    <div className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none" style={{ left: `${positionPct}%`, background: '#8C52FF' }} aria-hidden>
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full" style={{ background: '#8C52FF' }} />
    </div>
  )
}

export function TrimHandle({ edge, onKeyTrim }: { edge: 'start' | 'end'; onKeyTrim: (delta: number) => void }) {
  return (
    <button
      type="button"
      className="absolute top-0 bottom-0 w-4 min-w-[16px] z-10 flex items-center justify-center"
      style={{ [edge === 'start' ? 'left' : 'right']: 0, background: 'rgba(140,82,255,0.85)' }}
      aria-label={edge === 'start' ? 'Trim start' : 'Trim end'}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') onKeyTrim(edge === 'start' ? -0.1 : -0.1)
        if (e.key === 'ArrowRight') onKeyTrim(edge === 'start' ? 0.1 : 0.1)
      }}
    >
      <span className="h-8 w-1 rounded bg-white" />
    </button>
  )
}

export function VideoThumbnailStrip({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex overflow-hidden rounded-md opacity-90" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex-1 border-r border-black/30" style={{ background: `linear-gradient(135deg, #2a2420 ${i * 8}%, #3d342e)` }} />
      ))}
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/80">{label}</span>
    </div>
  )
}

export function AudioTrack({ muted, volume }: { muted: boolean; volume: number }) {
  return (
    <div className="h-8 rounded-md relative overflow-hidden" style={{ background: muted ? '#2a2420' : '#1f3d32', opacity: muted ? 0.5 : 0.4 + volume * 0.6 }}>
      <AudioWaveform bars={40} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/80">{muted ? 'Original muted' : 'Original audio'}</span>
    </div>
  )
}

export function MusicTrack({ music }: { music: MusicEdit | null }) {
  if (!music) {
    return <div className="h-8 rounded-md flex items-center px-2 text-[10px]" style={{ background: '#24201E', color: '#B8ADA3' }}>No music</div>
  }
  return (
    <div className="h-8 rounded-md relative overflow-hidden" style={{ background: 'rgba(140,82,255,0.35)' }}>
      <AudioWaveform bars={36} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white truncate max-w-[90%]">Music · {formatTime(music.trimEnd - music.trimStart)}</span>
    </div>
  )
}

export function CaptionTrack({ captions, duration }: { captions: CaptionSegment[]; duration: number }) {
  return (
    <div className="h-7 rounded-md relative" style={{ background: '#24201E' }}>
      {captions.map(c => {
        const left = (c.start / duration) * 100
        const width = ((c.end - c.start) / duration) * 100
        return (
          <div key={c.id} className="absolute top-1 bottom-1 rounded" title={c.text}
            style={{ left: `${left}%`, width: `${Math.max(2, width)}%`, background: c.reviewed ? '#16845B' : '#B76808' }} />
        )
      })}
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/70">Captions</span>
    </div>
  )
}

export function AudioWaveform({ bars = 32 }: { bars?: number }) {
  return (
    <div className="absolute inset-0 flex items-end gap-px px-1 py-1" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="flex-1 rounded-sm bg-white/40" style={{ height: `${30 + ((i * 37) % 70)}%` }} />
      ))}
    </div>
  )
}

export function TimelineZoom({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label="Zoom out" onClick={() => onZoom(clamp(zoom - 0.25, 0.5, 3))}><ZoomOut size={16} /></button>
      <span className="text-[11px] tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
      <button type="button" className="min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label="Zoom in" onClick={() => onZoom(clamp(zoom + 0.25, 0.5, 3))}><ZoomIn size={16} /></button>
    </div>
  )
}

export function ClipActionMenu({
  onSplit,
  onDelete,
  onDuplicate,
}: {
  onSplit: () => void
  onDelete: () => void
  onDuplicate?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1" style={{ border: '1px solid var(--border)' }} onClick={onSplit}><Scissors size={14} /> Split</button>
      {onDuplicate && <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1" style={{ border: '1px solid var(--border)' }} onClick={onDuplicate}><Copy size={14} /> Duplicate</button>}
      <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1" style={{ border: '1px solid var(--border)', color: '#C83B3B' }} onClick={onDelete}><Trash2 size={14} /> Remove</button>
    </div>
  )
}

export function VideoTimeline({
  clips,
  selectedClipId,
  onSelectClip,
  playhead,
  duration,
  trimStart,
  trimEnd,
  onSeek,
  onTrimStart,
  onTrimEnd,
  zoom,
  onZoom,
  music,
  originalMuted,
  originalVolume,
  captions,
  onReorder,
}: {
  clips: VideoClip[]
  selectedClipId: string | null
  onSelectClip: (id: string) => void
  playhead: number
  duration: number
  trimStart: number
  trimEnd: number
  onSeek: (t: number) => void
  onTrimStart: (t: number) => void
  onTrimEnd: (t: number) => void
  zoom: number
  onZoom: (z: number) => void
  music: MusicEdit | null
  originalMuted: boolean
  originalVolume: number
  captions: CaptionSegment[]
  onReorder: (from: number, to: number) => void
}) {
  const pct = duration > 0 ? ((playhead - trimStart) / Math.max(0.1, trimEnd - trimStart)) * 100 : 0

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-xl p-2 sm:p-3" style={{ background: '#12100F', color: '#FFFAF2', border: '1px solid #39322E' }}>
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <p className="text-xs font-semibold m-0 truncate">Timeline · {formatTime(trimEnd - trimStart)}</p>
        <TimelineZoom zoom={zoom} onZoom={onZoom} />
      </div>

      <div className="relative overflow-x-auto scroll-rail" style={{ minHeight: 120 }}>
        <div style={{ minWidth: `${100 * zoom}%` }} className="relative pr-2">
          <TimelineRuler duration={trimEnd - trimStart} zoom={zoom} />
          <button
            type="button"
            className="relative h-14 w-full rounded-md mt-1"
            style={{ background: '#1B1816' }}
            aria-label="Seek on timeline"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = (e.clientX - rect.left) / rect.width
              onSeek(trimStart + x * (trimEnd - trimStart))
            }}
          >
            <div className="absolute inset-y-0 rounded-md overflow-hidden" style={{
              left: `${(trimStart / Math.max(duration, trimEnd)) * 100}%`,
              right: `${100 - (trimEnd / Math.max(duration, trimEnd)) * 100}%`,
              background: 'rgba(140,82,255,0.25)',
            }}>
              <VideoThumbnailStrip label="Video" />
            </div>
            <TrimHandle edge="start" onKeyTrim={d => onTrimStart(clamp(trimStart + d, 0, trimEnd - 0.5))} />
            <TrimHandle edge="end" onKeyTrim={d => onTrimEnd(clamp(trimEnd + d, trimStart + 0.5, duration))} />
            <TimelinePlayhead positionPct={clamp(pct, 0, 100)} />
          </button>

          <div className="flex gap-1 mt-2 overflow-x-auto">
            {clips.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onSelectClip(clip.id)}
                className="relative h-12 min-w-[88px] flex-1 rounded-md overflow-hidden text-left"
                style={{
                  border: selectedClipId === clip.id ? '2px solid #8C52FF' : '1px solid #39322E',
                  background: '#24201E',
                }}
              >
                <VideoThumbnailStrip label={`Clip ${index + 1}`} />
                <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-black/50 px-1 rounded">{formatTime(clip.duration)}</span>
                <span className="absolute top-1 right-1 text-white/50" aria-hidden><GripVertical size={12} /></span>
                {index > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute -left-1 top-1/2 -translate-y-1/2 text-[9px] px-1 rounded bg-black/70"
                    onClick={e => { e.stopPropagation(); onReorder(index, index - 1) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onReorder(index, index - 1) } }}
                    aria-label={`Move clip ${index + 1} earlier`}
                  >
                    ←
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <AudioTrack muted={originalMuted} volume={originalVolume} />
            <MusicTrack music={music} />
            <CaptionTrack captions={captions} duration={Math.max(0.1, trimEnd - trimStart)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs" style={{ border: '1px solid #39322E' }} onClick={() => onTrimStart(clamp(trimStart + 0.1, 0, trimEnd - 0.5))}>Trim start +0.1s</button>
        <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs" style={{ border: '1px solid #39322E' }} onClick={() => onTrimStart(clamp(trimStart - 0.1, 0, trimEnd - 0.5))}>Trim start −0.1s</button>
        <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs" style={{ border: '1px solid #39322E' }} onClick={() => onTrimEnd(clamp(trimEnd - 0.1, trimStart + 0.5, duration))}>Trim end −0.1s</button>
        <button type="button" className="min-h-[40px] px-2 rounded-lg text-xs" style={{ border: '1px solid #39322E' }} onClick={() => onTrimEnd(clamp(trimEnd + 0.1, trimStart + 0.5, duration))}>Trim end +0.1s</button>
      </div>
    </div>
  )
}

export function PanelSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl p-3 min-w-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
