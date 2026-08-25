import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Aperture, ArrowLeft, Check, ChevronRight, Crop, Gauge, Image as ImageIcon,
  Mic2, MoreHorizontal, Music2, Pause, Play, Redo2, Scissors, Subtitles,
  Type, Undo2, Volume2, VolumeX, Wand2, X,
} from 'lucide-react'
import {
  DEFAULT_ADJUSTMENTS, DEFAULT_CROP_STATE, SPEED_OPTIONS, VIDEO_FILTERS, newId, studioModeForContext,
} from './config'
import { EXAMPLE_MUSIC, unsplash } from './data'
import { cssFilterFromAdjustments, formatTime } from './format'
import type {
  CaptionSegment, MediaAsset, MusicTrack, StudioContext, UploadLimits, VideoClip, VideoEditState,
} from './types'
import { VideoPreviewPlayer } from './VideoPreviewPlayer'
import { VideoFilmstripTrim } from './VideoFilmstripTrim'
import {
  TransitionPicker, VideoAdjustmentPanel, VideoCaptionsEditor, VideoCoverSelector,
  VideoCropEditor, VideoSpeedControl,
} from './VideoPanels'

type EditStep = 'trim' | 'look' | 'sound' | 'text' | 'more'

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
    aspectRatio: 'original',
    crop: { ...DEFAULT_CROP_STATE },
    rotation: 0,
    trimStart: 0,
    trimEnd: end,
    playbackSpeed: 1,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filter: 'original',
    clips: [clip],
    transitions: [],
    cover: { time: Math.min(0.5, end / 2), customUrl: null, altText: '', source: 'frame' },
    originalAudio: { keep: true, muted: false, volume: 1, fadeIn: 0, fadeOut: 0 },
    music: null,
    captions: [],
    textOverlays: [],
    captionLanguage: 'en',
    autoCaptionsStatus: 'idle',
  }
}

const STEPS: { id: EditStep; label: string; icon: typeof Scissors }[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'look', label: 'Look', icon: Wand2 },
  { id: 'sound', label: 'Sound', icon: Music2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

export function VideoEditorShell({
  asset,
  limits,
  context,
  onBack,
  onClose: _onClose,
  onDraft: _onDraft,
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
  const [step, setStep] = useState<EditStep>('trim')
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [history, setHistory] = useState<VideoEditState[]>([])
  const [future, setFuture] = useState<VideoEditState[]>([])
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null)
  const [morePanel, setMorePanel] = useState<'crop' | 'adjust' | 'cover' | 'speed' | 'captions' | 'transition' | null>(null)
  const [musicQuery, setMusicQuery] = useState('')
  const captureRef = useRef<HTMLVideoElement | null>(null)

  const filterCss = useMemo(() => {
    const f = VIDEO_FILTERS.find(x => x.id === edit.filter)?.css ?? ''
    return cssFilterFromAdjustments(f, edit.adjustments)
  }, [edit.filter, edit.adjustments])

  const duration = Math.max(0.1, asset.duration || edit.trimEnd)
  const stepIndex = STEPS.findIndex(s => s.id === step)

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

  async function finishEditing() {
    const url = coverDataUrl ?? await captureFrame(edit.cover.time || (edit.trimStart + edit.trimEnd) / 2)
    onPreview(edit, url)
  }

  function goPrevStep() {
    if (morePanel) {
      setMorePanel(null)
      return
    }
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].id)
      return
    }
    onBack()
  }

  const filters = VIDEO_FILTERS.filter(f => mode !== 'commercial' || f.commercialApproved)
  const musicTracks = EXAMPLE_MUSIC.filter(t => {
    if (mode === 'commercial' && !t.commercialUseAllowed) return false
    if (!musicQuery.trim()) return true
    const q = musicQuery.toLowerCase()
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
  })

  const selectedTrack = EXAMPLE_MUSIC.find(t => t.id === edit.music?.trackId)

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full overflow-hidden" style={{ background: '#0C0A09', color: '#FFFAF2' }}>
      {/* Top chrome */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-2 py-2 z-20"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)', paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full"
          style={{ background: 'rgba(0,0,0,0.35)' }} onClick={goPrevStep} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1">
          <button type="button" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full disabled:opacity-30"
            disabled={!history.length} onClick={undo} aria-label="Undo" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <Undo2 size={16} />
          </button>
          <button type="button" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full disabled:opacity-30"
            disabled={!future.length} onClick={redo} aria-label="Redo" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <Redo2 size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="min-h-[40px] px-4 rounded-full text-sm font-bold inline-flex items-center gap-1"
            style={{ background: '#8C52FF', color: '#fff' }}
            onClick={() => void finishEditing()}>
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Full-bleed preview */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-full max-w-[480px] relative">
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
              showSafeAreas={false}
              posterUrl={coverDataUrl}
              loop
              fit={edit.aspectRatio === 'original' ? 'contain' : 'cover'}
              fill
              showControls={false}
              className="h-full w-full"
            />
            {/* Text overlays preview */}
            {edit.textOverlays.map(t => (
              currentTime >= t.start && currentTime <= t.end ? (
                <div
                  key={t.id}
                  className="absolute pointer-events-none px-3 py-1 text-center font-bold"
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: t.color,
                    fontSize: t.size === 'lg' ? 28 : t.size === 'sm' ? 16 : 22,
                    textShadow: '0 2px 8px rgba(0,0,0,0.65)',
                    fontFamily: 'Syne, sans-serif',
                  }}
                >
                  {t.text || 'Text'}
                </div>
              ) : null
            ))}
          </div>
        </div>

        <button
          type="button"
          className="absolute left-1/2 z-10 min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center pointer-events-none"
          style={{
            top: '42%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.45)',
            opacity: playing ? 0 : 1,
            transition: 'opacity 0.2s',
          }}
          aria-hidden
        >
          {playing ? <Pause size={28} fill="#fff" /> : <Play size={28} fill="#fff" />}
        </button>
      </div>

      {/* Bottom dock */}
      <div
        className="shrink-0 z-20"
        style={{
          background: 'linear-gradient(to top, #0C0A09 70%, rgba(12,10,9,0.92))',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Step content */}
        <div className="px-3 pt-2 pb-1 min-h-[120px]">
          {step === 'trim' && (
            <div>
              <p className="text-[11px] m-0 mb-2 px-0.5" style={{ color: 'rgba(255,250,242,0.55)' }}>
                Optional — tap Next to keep the clip as-is.
              </p>
              <VideoFilmstripTrim
                src={asset.objectUrl}
                duration={duration}
                trimStart={edit.trimStart}
                trimEnd={edit.trimEnd}
                minDuration={limits.minDurationSec}
                maxDuration={limits.maxDurationSec}
                playhead={currentTime}
                onTrimChange={(s, e) => update({ trimStart: s, trimEnd: e })}
                onSeek={t => { setCurrentTime(t); setPlaying(false) }}
              />
            </div>
          )}

          {step === 'look' && (
            <div>
              <div className="flex gap-3 overflow-x-auto scroll-rail pb-1 -mx-1 px-1">
                {filters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update({ filter: f.id })}
                    className="shrink-0 flex flex-col items-center gap-1.5 w-[72px]"
                  >
                    <div
                      className="h-[72px] w-[72px] rounded-2xl overflow-hidden relative"
                      style={{
                        border: edit.filter === f.id ? '2.5px solid #8C52FF' : '2px solid transparent',
                        background: 'linear-gradient(145deg,#4a3f38,#1c1816)',
                        filter: f.css || 'none',
                      }}
                    >
                      {edit.filter === f.id && (
                        <span className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: '#8C52FF' }}>
                          <Check size={12} color="#fff" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: edit.filter === f.id ? '#8C52FF' : 'rgba(255,250,242,0.7)' }}>
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 min-h-[40px] px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,250,242,0.85)' }}
                onClick={() => { setStep('more'); setMorePanel('adjust') }}
              >
                <Aperture size={14} /> Adjust
              </button>
            </div>
          )}

          {step === 'sound' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                  style={{
                    background: edit.originalAudio.muted ? 'rgba(255,255,255,0.06)' : 'rgba(140,82,255,0.2)',
                    border: `1px solid ${edit.originalAudio.muted ? 'rgba(255,255,255,0.12)' : '#8C52FF'}`,
                    color: '#FFFAF2',
                  }}
                  onClick={() => update({
                    originalAudio: { ...edit.originalAudio, muted: !edit.originalAudio.muted, keep: edit.originalAudio.muted },
                  })}
                >
                  {edit.originalAudio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {edit.originalAudio.muted ? 'Original off' : 'Original on'}
                </button>
                {limits.allowMusic && edit.music && (
                  <button
                    type="button"
                    className="min-h-[48px] px-4 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(200,59,59,0.15)', color: '#F87171', border: '1px solid rgba(200,59,59,0.3)' }}
                    onClick={() => update({ music: null })}
                  >
                    Remove
                  </button>
                )}
              </div>

              {limits.allowMusic && (
                <>
                  {selectedTrack && (
                    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(140,82,255,0.15)', border: '1px solid rgba(140,82,255,0.35)' }}>
                      <img src={unsplash(selectedTrack.coverId, 80)} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold m-0 truncate">{selectedTrack.title}</p>
                        <p className="text-xs m-0 truncate" style={{ color: 'rgba(255,250,242,0.55)' }}>{selectedTrack.artist}</p>
                      </div>
                      <Music2 size={16} style={{ color: '#8C52FF' }} />
                    </div>
                  )}
                  <input
                    value={musicQuery}
                    onChange={e => setMusicQuery(e.target.value)}
                    placeholder="Search sounds…"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFAF2' }}
                  />
                  <div className="flex gap-2 overflow-x-auto scroll-rail pb-1">
                    {musicTracks.slice(0, 8).map(track => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => selectMusic(track)}
                        className="shrink-0 w-[140px] text-left rounded-2xl overflow-hidden"
                        style={{
                          background: edit.music?.trackId === track.id ? 'rgba(140,82,255,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${edit.music?.trackId === track.id ? '#8C52FF' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <img src={unsplash(track.coverId, 160)} alt="" className="h-16 w-full object-cover" />
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold m-0 truncate">{track.title}</p>
                          <p className="text-[10px] m-0 truncate" style={{ color: 'rgba(255,250,242,0.5)' }}>{track.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'text' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {limits.allowTextOverlays && (
                  <button
                    type="button"
                    className="flex-1 min-h-[48px] rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                    style={{ background: '#8C52FF', color: '#fff' }}
                    onClick={() => update({
                      textOverlays: [...edit.textOverlays, {
                        id: newId('tx'),
                        text: 'Your text',
                        start: currentTime,
                        end: Math.min(currentTime + 3, edit.trimEnd),
                        x: 50,
                        y: 35,
                        alignment: 'center',
                        size: 'md',
                        color: '#FFFAF2',
                      }],
                    })}
                  >
                    <Type size={16} /> Add text
                  </button>
                )}
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFAF2', border: '1px solid rgba(255,255,255,0.12)' }}
                  onClick={requestAutoCaptions}
                >
                  <Subtitles size={16} /> Auto captions
                </button>
              </div>
              {edit.textOverlays.map(t => (
                <div key={t.id} className="flex gap-2 items-center">
                  <input
                    value={t.text}
                    onChange={e => update({
                      textOverlays: edit.textOverlays.map(x => x.id === t.id ? { ...x, text: e.target.value } : x),
                    })}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFAF2' }}
                    placeholder="Overlay text"
                  />
                  <button
                    type="button"
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(200,59,59,0.15)', color: '#F87171' }}
                    onClick={() => update({ textOverlays: edit.textOverlays.filter(x => x.id !== t.id) })}
                    aria-label="Remove text"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {edit.captions.length > 0 && (
                <p className="text-xs m-0" style={{ color: 'rgba(255,250,242,0.55)' }}>
                  {edit.captions.length} caption{edit.captions.length === 1 ? '' : 's'} · edit in More
                </p>
              )}
              {edit.autoCaptionsStatus === 'processing' || edit.autoCaptionsStatus === 'requesting' ? (
                <p className="text-xs m-0" style={{ color: '#8C52FF' }}>Generating captions…</p>
              ) : null}
            </div>
          )}

          {step === 'more' && !morePanel && (
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'crop' as const, label: 'Crop', icon: Crop },
                { id: 'adjust' as const, label: 'Adjust', icon: Aperture },
                { id: 'cover' as const, label: 'Cover', icon: ImageIcon },
                ...(limits.allowSpeed ? [{ id: 'speed' as const, label: 'Speed', icon: Gauge }] : []),
                { id: 'captions' as const, label: 'Captions', icon: Mic2 },
                ...(limits.allowTransitions ? [{ id: 'transition' as const, label: 'Transition', icon: Wand2 }] : []),
              ]).map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMorePanel(item.id)}
                    className="min-h-[72px] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFAF2' }}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}

          {step === 'more' && morePanel && (
            <div className="max-h-[38vh] overflow-y-auto rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-bold m-0 capitalize">{morePanel}</p>
                <button type="button" className="text-xs min-h-[36px] px-2" style={{ color: 'rgba(255,250,242,0.55)' }} onClick={() => setMorePanel(null)}>
                  Done
                </button>
              </div>
              {morePanel === 'crop' && (
                <VideoCropEditor
                  crop={{ ...edit.crop, aspectRatio: edit.aspectRatio, rotation: edit.rotation }}
                  listingRatioEnabled={!!limits.listingAspectRatio}
                  onChange={c => update({ crop: c, aspectRatio: c.aspectRatio, rotation: c.rotation })}
                />
              )}
              {morePanel === 'adjust' && (
                <VideoAdjustmentPanel value={edit.adjustments} onChange={a => update({ adjustments: a })} />
              )}
              {morePanel === 'cover' && (
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
              {morePanel === 'speed' && (
                <VideoSpeedControl
                  enabled={limits.allowSpeed}
                  speed={edit.playbackSpeed}
                  onChange={s => update({ playbackSpeed: s })}
                  resultingDuration={(edit.trimEnd - edit.trimStart) / edit.playbackSpeed}
                />
              )}
              {morePanel === 'captions' && (
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
              {morePanel === 'transition' && (
                <TransitionPicker
                  enabled={limits.allowTransitions}
                  value={edit.transitions[0]?.type ?? 'none'}
                  duration={edit.transitions[0]?.duration ?? 0.4}
                  onChange={(type, duration) => update({
                    transitions: type === 'none' ? [] : [{ afterClipId: edit.clips[0]?.id ?? '', type, duration }],
                  })}
                />
              )}
              {morePanel === 'speed' && SPEED_OPTIONS.length > 0 && (
                <p className="text-[11px] m-0 mt-2 px-1" style={{ color: 'rgba(255,250,242,0.45)' }}>
                  Result {formatTime((edit.trimEnd - edit.trimStart) / edit.playbackSpeed)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step tabs */}
        <nav className="flex items-stretch justify-around px-1 pt-1" aria-label="Edit steps">
          {STEPS.map(s => {
            const Icon = s.icon
            const active = step === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setStep(s.id); setMorePanel(null) }}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-[10px] font-semibold"
                style={{ color: active ? '#8C52FF' : 'rgba(255,250,242,0.45)' }}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {s.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
