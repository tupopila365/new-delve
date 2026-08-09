import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Aperture, Clapperboard, Crop, Film, Image as ImageIcon, Music2,
  Scissors, Subtitles, Type, Volume2, Wand2,
} from 'lucide-react'
import {
  DEFAULT_ADJUSTMENTS, DEFAULT_CROP_STATE, VIDEO_FILTERS, newId, studioModeForContext,
} from './config'
import { cssFilterFromAdjustments, formatTime } from './format'
import type {
  CaptionSegment, MediaAsset, MusicTrack, StudioContext, UploadLimits, VideoClip, VideoEditState, VideoTool,
} from './types'
import { VideoPreviewPlayer } from './VideoPreviewPlayer'
import { ClipActionMenu, VideoTimeline } from './VideoTimeline'
import {
  AudioMixer, MusicLibrary, MusicTimelineEditor, OriginalAudioControls,
  TransitionPicker, TrimVideoControls, UndoRedoControls, VideoAdjustmentPanel,
  VideoCaptionsEditor, VideoCoverSelector, VideoCropEditor, VideoFilterPicker, VideoSpeedControl,
} from './VideoPanels'
import { StudioChromeHeader } from './Publish'

function defaultEdit(asset: MediaAsset, limits: UploadLimits): VideoEditState {
  const end = Math.min(asset.duration || 10, limits.maxDurationSec)
  const clip: VideoClip = {
    id: newId('clip'),
    sourceAssetId: asset.id,
    sourceStart: 0,
    sourceEnd: end,
    timelineStart: 0,
    duration: end,
    order: 0,
    objectUrl: asset.objectUrl,
  }
  return {
    sourceAssetId: asset.id,
    aspectRatio: '4:5',
    crop: { ...DEFAULT_CROP_STATE },
    rotation: 0,
    trimStart: 0,
    trimEnd: end,
    playbackSpeed: 1,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filter: 'original',
    clips: [clip],
    transitions: [],
    cover: { time: 0, customUrl: null, altText: '', source: 'frame' },
    originalAudio: { keep: true, muted: false, volume: 1, fadeIn: 0, fadeOut: 0 },
    music: null,
    captions: [],
    textOverlays: [],
    captionLanguage: 'en',
    autoCaptionsStatus: 'idle',
  }
}

const TOOLS: { id: VideoTool; label: string; icon: typeof Scissors; socialOnly?: boolean }[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'split', label: 'Split', icon: Clapperboard },
  { id: 'clips', label: 'Clips', icon: Film },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'adjust', label: 'Adjust', icon: Aperture },
  { id: 'filter', label: 'Filter', icon: Wand2 },
  { id: 'cover', label: 'Cover', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'music', label: 'Music', icon: Music2, socialOnly: true },
  { id: 'captions', label: 'Captions', icon: Subtitles },
  { id: 'speed', label: 'Speed', icon: Film, socialOnly: true },
  { id: 'transition', label: 'Transition', icon: Film, socialOnly: true },
  { id: 'text', label: 'Text', icon: Type, socialOnly: true },
]

export function VideoEditorShell({
  asset,
  limits,
  context,
  onBack,
  onClose,
  onDraft,
  onPreview,
}: {
  asset: MediaAsset
  limits: UploadLimits
  context: StudioContext
  onBack: () => void
  onClose: () => void
  onDraft: (edit: VideoEditState) => void
  onPreview: (edit: VideoEditState, coverDataUrl: string | null) => void
}) {
  const mode = studioModeForContext(context)
  const [edit, setEdit] = useState(() => defaultEdit(asset, limits))
  const [tool, setTool] = useState<VideoTool>('trim')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(edit.clips[0]?.id ?? null)
  const [zoom, setZoom] = useState(1)
  const [showSafe, setShowSafe] = useState(false)
  const [mobileSheet, setMobileSheet] = useState(true)
  const [history, setHistory] = useState<VideoEditState[]>([])
  const [future, setFuture] = useState<VideoEditState[]>([])
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null)
  const captureRef = useRef<HTMLVideoElement | null>(null)

  const filterCss = useMemo(() => {
    const f = VIDEO_FILTERS.find(x => x.id === edit.filter)?.css ?? ''
    return cssFilterFromAdjustments(f, edit.adjustments)
  }, [edit.filter, edit.adjustments])

  const update = useCallback((patch: Partial<VideoEditState> | ((prev: VideoEditState) => VideoEditState)) => {
    setHistory(h => [...h.slice(-29), edit])
    setFuture([])
    setEdit(prev => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }))
  }, [edit])

  const undo = () => {
    setHistory(h => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setFuture(f => [edit, ...f])
      setEdit(prev)
      return h.slice(0, -1)
    })
  }
  const redo = () => {
    setFuture(f => {
      if (!f.length) return f
      const [next, ...rest] = f
      setHistory(h => [...h, edit])
      setEdit(next)
      return rest
    })
  }

  useEffect(() => {
    captureRef.current = document.createElement('video')
    captureRef.current.src = asset.objectUrl
    captureRef.current.muted = true
    captureRef.current.playsInline = true
  }, [asset.objectUrl])

  async function captureFrame(at: number) {
    const v = captureRef.current
    if (!v) return null
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve()
      v.onerror = () => reject()
      if (v.readyState >= 2) resolve()
      else v.load()
    }).catch(() => null)
    v.currentTime = at
    await new Promise<void>(resolve => { v.onseeked = () => resolve() })
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 720
    canvas.height = v.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.filter = filterCss
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }

  const tools = TOOLS.filter(t => {
    if (mode === 'restricted') return ['trim', 'crop', 'cover'].includes(t.id)
    if (!limits.allowMusic && t.id === 'music') return false
    if (!limits.allowFilters && t.id === 'filter') return false
    if (!limits.allowSpeed && t.id === 'speed') return false
    if (!limits.allowTransitions && t.id === 'transition') return false
    if (!limits.allowTextOverlays && t.id === 'text') return false
    if (mode === 'commercial' && t.socialOnly && (t.id === 'filter' || t.id === 'text')) {
      return t.id === 'filter' ? limits.allowFilters : false
    }
    return true
  })

  function splitAtPlayhead() {
    const clip = edit.clips.find(c => c.id === selectedClipId) ?? edit.clips[0]
    if (!clip) return
    const local = currentTime
    if (local <= edit.trimStart + 0.25 || local >= edit.trimEnd - 0.25) return
    const left: VideoClip = { ...clip, id: newId('clip'), sourceEnd: local, duration: local - clip.sourceStart }
    const right: VideoClip = {
      ...clip,
      id: newId('clip'),
      sourceStart: local,
      timelineStart: left.duration,
      duration: clip.sourceEnd - local,
      order: clip.order + 1,
    }
    const rest = edit.clips.filter(c => c.id !== clip.id)
    update({
      clips: [...rest, left, right].sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i })),
      trimEnd: edit.trimEnd,
    })
    setSelectedClipId(right.id)
  }

  function removeSelectedClip() {
    if (edit.clips.length <= 1) {
      update({ trimStart: 0, trimEnd: Math.min(asset.duration, limits.maxDurationSec) })
      return
    }
    const next = edit.clips.filter(c => c.id !== selectedClipId).map((c, i) => ({ ...c, order: i }))
    update({ clips: next })
    setSelectedClipId(next[0]?.id ?? null)
  }

  function reorder(from: number, to: number) {
    const next = [...edit.clips]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update({ clips: next.map((c, i) => ({ ...c, order: i })) })
  }

  function selectMusic(track: MusicTrack) {
    update({
      music: {
        trackId: track.id,
        source: track.licenceType,
        licenceType: track.licenceType,
        commercialUseAllowed: track.commercialUseAllowed,
        regionalAvailability: track.regionalAvailability,
        attribution: track.attribution,
        trimStart: 0,
        trimEnd: Math.min(track.duration, edit.trimEnd - edit.trimStart),
        timelineStart: 0,
        volume: 0.45,
        fadeIn: 0.5,
        fadeOut: 0.5,
        loop: false,
      },
    })
  }

  function requestAutoCaptions() {
    update({ autoCaptionsStatus: 'requesting' })
    window.setTimeout(() => update(prev => ({ ...prev, autoCaptionsStatus: 'processing' })), 400)
    window.setTimeout(() => {
      const sample: CaptionSegment[] = [
        {
          id: newId('cap'),
          language: edit.captionLanguage,
          source: 'automatic',
          start: edit.trimStart,
          end: Math.min(edit.trimStart + 2.4, edit.trimEnd),
          text: 'Arriving at the riad this afternoon.',
          confidence: 0.82,
          reviewed: false,
          style: { position: 'bottom', alignment: 'center', textSize: 'md', highContrast: true, color: '#FFFAF2' },
        },
        {
          id: newId('cap'),
          language: edit.captionLanguage,
          source: 'automatic',
          start: Math.min(edit.trimStart + 2.5, edit.trimEnd - 1),
          end: Math.min(edit.trimStart + 5, edit.trimEnd),
          text: 'The courtyard is quieter than expected.',
          confidence: 0.61,
          reviewed: false,
          style: { position: 'bottom', alignment: 'center', textSize: 'md', highContrast: true, color: '#FFFAF2' },
        },
      ]
      update(prev => ({ ...prev, autoCaptionsStatus: 'ready', captions: sample }))
    }, 1600)
  }

  const inspector = (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto min-h-0 min-w-0">
      {tool === 'trim' && (
        <TrimVideoControls
          start={edit.trimStart}
          end={edit.trimEnd}
          duration={asset.duration || edit.trimEnd}
          minDuration={limits.minDurationSec}
          maxDuration={limits.maxDurationSec}
          onChange={(s, e) => update({ trimStart: s, trimEnd: e })}
        />
      )}
      {tool === 'split' && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Split</p>
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>Playhead at {formatTime(currentTime)}. Music and captions stay linked — review timeline after splitting.</p>
          <div className="mt-3"><ClipActionMenu onSplit={splitAtPlayhead} onDelete={removeSelectedClip} onDuplicate={() => {
            const clip = edit.clips.find(c => c.id === selectedClipId)
            if (!clip) return
            update({ clips: [...edit.clips, { ...clip, id: newId('clip'), order: edit.clips.length }] })
          }} /></div>
        </div>
      )}
      {tool === 'clips' && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold m-0 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Multi-clip</p>
          {edit.clips.map((c, i) => (
            <button key={c.id} type="button" onClick={() => setSelectedClipId(c.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm mb-1 min-h-[44px]"
              style={{ background: selectedClipId === c.id ? 'rgba(140,82,255,0.12)' : 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              Clip {i + 1} · {formatTime(c.duration)}
            </button>
          ))}
          <p className="text-[11px] m-0" style={{ color: 'var(--fg-muted)' }}>Total {formatTime(edit.clips.reduce((s, c) => s + c.duration, 0))}</p>
        </div>
      )}
      {tool === 'crop' && (
        <VideoCropEditor
          crop={{ ...edit.crop, aspectRatio: edit.aspectRatio, rotation: edit.rotation }}
          listingRatioEnabled={!!limits.listingAspectRatio}
          onChange={c => update({ crop: c, aspectRatio: c.aspectRatio, rotation: c.rotation })}
        />
      )}
      {tool === 'adjust' && <VideoAdjustmentPanel value={edit.adjustments} onChange={a => update({ adjustments: a })} />}
      {tool === 'filter' && <VideoFilterPicker selectedId={edit.filter} onSelect={id => update({ filter: id })} mode={mode} />}
      {tool === 'cover' && (
        <VideoCoverSelector
          cover={edit.cover}
          currentTime={currentTime}
          feedPreviewUrl={coverDataUrl}
          onChange={c => update({ cover: c })}
          onUseCurrentFrame={() => {
            void captureFrame(currentTime).then(url => {
              if (!url) return
              setCoverDataUrl(url)
              update({ cover: { ...edit.cover, time: currentTime, customUrl: url, source: 'frame' } })
            })
          }}
        />
      )}
      {tool === 'audio' && (
        <>
          <OriginalAudioControls value={edit.originalAudio} hasAudio={asset.hasAudio} onChange={o => update({ originalAudio: o })} />
          {edit.music && (
            <AudioMixer
              original={edit.originalAudio}
              musicVolume={edit.music.volume}
              onOriginal={o => update({ originalAudio: o })}
              onMusicVolume={v => update({ music: edit.music ? { ...edit.music, volume: v } : null })}
            />
          )}
        </>
      )}
      {tool === 'music' && limits.allowMusic && (
        <>
          <MusicLibrary mode={mode} selectedId={edit.music?.trackId ?? null} onSelect={selectMusic} commercialOnly={mode === 'commercial'} />
          {edit.music && (
            <MusicTimelineEditor
              music={edit.music}
              videoDuration={edit.trimEnd - edit.trimStart}
              onChange={m => update({ music: m })}
              onRemove={() => update({ music: null })}
            />
          )}
        </>
      )}
      {tool === 'captions' && (
        <VideoCaptionsEditor
          captions={edit.captions}
          language={edit.captionLanguage}
          onLanguage={l => update({ captionLanguage: l })}
          status={edit.autoCaptionsStatus}
          onRequestAuto={requestAutoCaptions}
          onChange={(id, patch) => update({ captions: edit.captions.map(c => c.id === id ? { ...c, ...patch } : c) })}
          onAdd={() => update({
            captions: [...edit.captions, {
              id: newId('cap'),
              language: edit.captionLanguage,
              source: 'manual',
              start: currentTime,
              end: Math.min(currentTime + 2, edit.trimEnd),
              text: '',
              confidence: null,
              reviewed: true,
              style: { position: 'bottom', alignment: 'center', textSize: 'md', highContrast: true, color: '#FFFAF2' },
            }],
          })}
          onDelete={id => update({ captions: edit.captions.filter(c => c.id !== id) })}
          onJump={t => setCurrentTime(t)}
        />
      )}
      {tool === 'speed' && (
        <VideoSpeedControl
          enabled={limits.allowSpeed}
          speed={edit.playbackSpeed}
          onChange={s => update({ playbackSpeed: s })}
          resultingDuration={(edit.trimEnd - edit.trimStart) / edit.playbackSpeed}
        />
      )}
      {tool === 'transition' && (
        <TransitionPicker
          enabled={limits.allowTransitions}
          value={edit.transitions[0]?.type ?? 'none'}
          duration={edit.transitions[0]?.duration ?? 0.4}
          onChange={(type, duration) => update({
            transitions: type === 'none' ? [] : [{ afterClipId: edit.clips[0]?.id ?? '', type, duration }],
          })}
        />
      )}
      {tool === 'text' && limits.allowTextOverlays && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Text overlay</p>
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>Restrained overlays only. Stay inside safe areas.</p>
          <button type="button" className="mt-2 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}
            onClick={() => update({
              textOverlays: [...edit.textOverlays, {
                id: newId('tx'),
                text: 'Delve',
                start: currentTime,
                end: Math.min(currentTime + 3, edit.trimEnd),
                x: 50,
                y: 20,
                alignment: 'center',
                size: 'md',
                color: '#FFFAF2',
              }],
            })}>Add text</button>
          {edit.textOverlays.map(t => (
            <input key={t.id} value={t.text} className="mt-2 w-full rounded-lg px-3 py-2 text-sm min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              onChange={e => update({ textOverlays: edit.textOverlays.map(x => x.id === t.id ? { ...x, text: e.target.value } : x) })} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <StudioChromeHeader
        title="Edit video"
        onBack={onBack}
        primaryLabel="Next"
        onPrimary={() => {
          void (async () => {
            const url = coverDataUrl ?? await captureFrame(edit.cover.time || edit.trimStart)
            onPreview(edit, url)
          })()
        }}
        left={(
          <div className="flex items-center gap-1">
            <button type="button" className="min-w-[44px] min-h-[44px]" onClick={onBack} aria-label="Back">←</button>
            <UndoRedoControls canUndo={history.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo} />
          </div>
        )}
      />

      <div className="flex-1 min-h-0 grid lg:grid-cols-[72px_minmax(0,1fr)_minmax(280px,340px)] grid-rows-[1fr_auto] lg:grid-rows-1 overflow-hidden">
        {/* Desktop tool rail */}
        <aside className="hidden lg:flex flex-col gap-1 p-2 overflow-y-auto border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {tools.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} type="button" onClick={() => setTool(t.id)}
                className="flex flex-col items-center gap-1 py-2 rounded-xl min-h-[56px] text-[10px] font-semibold"
                style={{ background: tool === t.id ? 'rgba(140,82,255,0.12)' : 'transparent', color: tool === t.id ? 'var(--primary)' : 'var(--fg-muted)' }}>
                <Icon size={18} />
                {t.label}
              </button>
            )
          })}
        </aside>

        {/* Preview + timeline */}
        <div className="flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ background: '#0C0A09' }}>
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <div className="w-full max-w-[420px] min-w-0">
              <VideoPreviewPlayer
                src={asset.objectUrl}
                trimStart={edit.trimStart}
                trimEnd={edit.trimEnd}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                playing={playing}
                onPlayingChange={setPlaying}
                muted={edit.originalAudio.muted}
                volume={edit.originalAudio.volume}
                onMutedChange={m => update({ originalAudio: { ...edit.originalAudio, muted: m } })}
                filterCss={filterCss}
                crop={{ ...edit.crop, aspectRatio: edit.aspectRatio, rotation: edit.rotation }}
                playbackRate={edit.playbackSpeed}
                captions={edit.captions}
                showSafeAreas={showSafe}
                posterUrl={coverDataUrl}
              />
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                <button type="button" className="min-h-[40px] px-3 rounded-lg text-xs text-white/80" style={{ border: '1px solid #39322E' }} onClick={() => setShowSafe(s => !s)}>
                  {showSafe ? 'Hide guides' : 'Safe guides'}
                </button>
                <button type="button" className="min-h-[40px] px-3 rounded-lg text-xs text-white/80" style={{ border: '1px solid #39322E' }} onClick={() => onDraft(edit)}>Save draft</button>
              </div>
            </div>
          </div>
          <div className="shrink-0 p-2 sm:p-3 overflow-hidden">
            <VideoTimeline
              clips={edit.clips}
              selectedClipId={selectedClipId}
              onSelectClip={setSelectedClipId}
              playhead={currentTime}
              duration={asset.duration || edit.trimEnd}
              trimStart={edit.trimStart}
              trimEnd={edit.trimEnd}
              onSeek={t => { setCurrentTime(t); setPlaying(false) }}
              onTrimStart={t => update({ trimStart: t })}
              onTrimEnd={t => update({ trimEnd: t })}
              zoom={zoom}
              onZoom={setZoom}
              music={edit.music}
              originalMuted={edit.originalAudio.muted}
              originalVolume={edit.originalAudio.volume}
              captions={edit.captions}
              onReorder={reorder}
            />
          </div>
        </div>

        {/* Desktop inspector */}
        <aside className="hidden lg:flex flex-col min-h-0 overflow-hidden border-l" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          {inspector}
        </aside>
      </div>

      {/* Mobile tool rail + sheet */}
      <div className="lg:hidden shrink-0" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-1 overflow-x-auto scroll-rail px-2 py-2">
          {tools.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} type="button" onClick={() => { setTool(t.id); setMobileSheet(true) }}
                className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[64px] min-h-[56px] text-[10px] font-semibold"
                style={{ background: tool === t.id ? 'rgba(140,82,255,0.12)' : 'transparent', color: tool === t.id ? 'var(--primary)' : 'var(--fg-muted)' }}>
                <Icon size={18} />
                {t.label}
              </button>
            )
          })}
        </div>
        {mobileSheet && (
          <div className="max-h-[42vh] overflow-y-auto border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center px-3 pt-2">
              <p className="text-xs font-semibold m-0 capitalize">{tool}</p>
              <button type="button" className="text-xs min-h-[36px] px-2" style={{ color: 'var(--fg-muted)' }} onClick={() => setMobileSheet(false)}>Hide</button>
            </div>
            {inspector}
          </div>
        )}
      </div>
    </div>
  )
}
