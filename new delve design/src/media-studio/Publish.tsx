import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, Loader2, RefreshCw, X,
} from 'lucide-react'
import type {
  FailureReason, ProcessingStage, PublishingSettings, StudioContext, Visibility,
} from './types'
import { formatTime } from './format'

export function VideoProcessingState({
  stage,
  uploadProgress,
  processingProgress,
  failureReason,
  onRetry,
  onResume,
  onSaveDraft,
  onCancel,
  onContinueBackground,
  notificationWhenReady,
  onToggleNotify,
}: {
  stage: ProcessingStage
  uploadProgress: number | null
  processingProgress: number | null
  failureReason: FailureReason | null
  onRetry?: () => void
  onResume?: () => void
  onSaveDraft?: () => void
  onCancel?: () => void
  onContinueBackground?: () => void
  notificationWhenReady: boolean
  onToggleNotify: () => void
}) {
  const label = stageLabel(stage)
  const failed = stage === 'failed'
  return (
    <div className="rounded-2xl p-5 max-w-md mx-auto text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {!failed ? (
        <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
      ) : (
        <AlertTriangle size={36} className="mx-auto mb-3" style={{ color: '#C83B3B' }} />
      )}
      <h3 className="text-lg font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>{failed ? 'Processing interrupted' : label}</h3>
      <p className="text-sm mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>
        {failed ? failureCopy(failureReason) : 'Backend processing stages remain authoritative. Progress is approximate when supplied.'}
      </p>
      {(uploadProgress != null || processingProgress != null) && !failed && (
        <div className="mt-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-subtle)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress ?? processingProgress ?? 0}%`, background: 'var(--primary)' }} />
          </div>
          <p className="text-xs mt-2 m-0 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
            {uploadProgress != null ? `Upload ${uploadProgress}%` : `Stage progress ${processingProgress}%`}
          </p>
        </div>
      )}
      <label className="flex items-center justify-center gap-2 mt-4 text-xs">
        <input type="checkbox" checked={notificationWhenReady} onChange={onToggleNotify} />
        Notify me when ready
      </label>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {failed && onRetry && <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={onRetry}>Retry</button>}
        {stage === 'upload-paused' && onResume && <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={onResume}>Resume upload</button>}
        {onContinueBackground && !failed && <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onContinueBackground}>Continue in background</button>}
        {onSaveDraft && <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onSaveDraft}>Save draft</button>}
        {onCancel && <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ color: 'var(--fg-muted)' }} onClick={onCancel}>Close</button>}
      </div>
    </div>
  )
}

function stageLabel(s: ProcessingStage) {
  const map: Record<ProcessingStage, string> = {
    preparing: 'Preparing upload',
    uploading: 'Uploading',
    'upload-paused': 'Upload paused',
    'upload-complete': 'Upload complete',
    validating: 'Validating',
    transcoding: 'Transcoding',
    'generating-previews': 'Generating previews',
    'processing-audio': 'Processing audio',
    'processing-captions': 'Processing captions',
    'moderation-review': 'Moderation review',
    ready: 'Ready',
    published: 'Published',
    failed: 'Failed',
  }
  return map[s]
}

function failureCopy(reason: FailureReason | null) {
  switch (reason) {
    case 'network-interrupted': return 'Network interrupted. You can resume the upload when online.'
    case 'upload-expired': return 'Upload session expired. Replace the video or start again.'
    case 'unsupported-codec': return 'Unsupported codec. Try another export format from your device.'
    case 'corrupted-video': return 'Corrupted video. Replace the file to continue.'
    case 'music-unavailable': return 'Selected music is unavailable. Remove or replace the track.'
    case 'moderation-required': return 'This content needs review before publishing.'
    case 'content-rejected': return 'Publishing was blocked. You can save a draft or contact Support.'
    default: return 'Something went wrong. Completed edits are preserved when possible.'
  }
}

export function VideoModerationState({
  status,
  affected,
}: {
  status: 'automated' | 'manual' | 'ready' | 'restricted' | 'age-restricted' | 'region-restricted' | 'music-muted' | 'audio-removed' | 'blocked' | 'removed' | 'appeal'
  affected: string
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(183,104,8,0.1)', border: '1px solid var(--border)' }} role="status">
      <p className="text-sm font-semibold m-0">Moderation · {status.replace(/-/g, ' ')}</p>
      <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>Affected: {affected}. Internal scores and private rules are not shown.</p>
    </div>
  )
}

export function VideoPublishingSettings({
  value,
  onChange,
  musicAttribution,
}: {
  value: PublishingSettings
  onChange: (v: PublishingSettings) => void
  musicAttribution?: string | null
}) {
  const vis: Visibility[] = ['public', 'followers', 'journey-members', 'community-members', 'private', 'business-listing']
  return (
    <div className="flex flex-col gap-3 p-4 max-w-lg mx-auto w-full">
      <label className="text-xs font-semibold flex flex-col gap-1">Caption
        <textarea value={value.caption} rows={3} onChange={e => onChange({ ...value, caption: e.target.value })}
          className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
      </label>
      <label className="text-xs font-semibold flex flex-col gap-1">Location
        <input value={value.location} onChange={e => onChange({ ...value, location: e.target.value })}
          className="rounded-xl px-3 py-2.5 text-sm min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
      </label>
      <label className="text-xs font-semibold flex flex-col gap-1">Visibility
        <select value={value.visibility} onChange={e => onChange({ ...value, visibility: e.target.value as Visibility })}
          className="rounded-xl px-3 py-2.5 text-sm min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          {vis.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={value.commentsEnabled} onChange={e => onChange({ ...value, commentsEnabled: e.target.checked })} /> Comments enabled</label>
      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={value.sharingEnabled} onChange={e => onChange({ ...value, sharingEnabled: e.target.checked })} /> Sharing enabled</label>
      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={value.contentDisclosure} onChange={e => onChange({ ...value, contentDisclosure: e.target.checked })} /> Content disclosure</label>
      <label className="flex items-center gap-2 text-sm min-h-[44px]"><input type="checkbox" checked={value.sponsoredLabel} onChange={e => onChange({ ...value, sponsoredLabel: e.target.checked })} /> Sponsored / Business label</label>
      {musicAttribution && <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Music attribution: {musicAttribution}</p>}
    </div>
  )
}

export function VideoPublishPreview({
  coverUrl,
  aspectLabel,
  settings,
  duration,
  hasCaptions,
  musicAttribution,
  contextLabel,
  onEdit,
  onDraft,
  onPublish,
}: {
  coverUrl: string | null
  aspectLabel: string
  settings: PublishingSettings
  duration: number
  hasCaptions: boolean
  musicAttribution: string | null
  contextLabel: string
  onEdit: () => void
  onDraft: () => void
  onPublish: () => void
}) {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-md mx-auto w-full">
      <div className="rounded-2xl overflow-hidden bg-black aspect-[4/5]">
        {coverUrl ? <img src={coverUrl} alt={settings.caption || 'Cover preview'} className="h-full w-full object-cover" /> : (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: '#B8ADA3' }}>Cover preview</div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide m-0" style={{ color: 'var(--fg-muted)' }}>{contextLabel} preview</p>
        <p className="text-sm mt-1 m-0">{settings.caption || 'No caption yet'}</p>
        <p className="text-xs mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>
          {aspectLabel} · {formatTime(duration)} · {settings.visibility}
          {hasCaptions ? ' · Captions on' : ' · No captions'}
          {settings.sponsoredLabel ? ' · Business' : ''}
        </p>
        {musicAttribution && <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>{musicAttribution}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-[48px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onEdit}>Return to edit</button>
        <button type="button" className="min-h-[48px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onDraft}>Save draft</button>
        <button type="button" className="min-h-[48px] px-4 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={onPublish}>Publish</button>
      </div>
    </div>
  )
}

export function RestrictedMediaUploader({
  context,
  onClose,
  onComplete,
}: {
  context: StudioContext
  onClose: () => void
  onComplete: (note: string) => void
}) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [note, setNote] = useState('')
  const [rotation, setRotation] = useState(0)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  return (
    <div className="fixed inset-0 z-[310] flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }} role="dialog" aria-modal="true" aria-label="Restricted media upload">
      <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button type="button" className="min-w-[44px] min-h-[44px]" onClick={onClose} aria-label="Close"><X size={22} /></button>
        <h2 className="text-base font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Evidence upload</h2>
        <div style={{ width: 44 }} />
      </div>
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(183,104,8,0.1)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold m-0">Editing is limited</p>
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
            Music, filters, speed changes, transitions, decorative overlays and social captions are disabled for {context.replace(/-/g, ' ')} to preserve evidence accuracy.
          </p>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl py-10 cursor-pointer" style={{ border: '2px dashed var(--border)', background: 'var(--surface-subtle)' }}>
          <input type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={e => {
            const f = e.target.files?.[0]
            if (!f) return
            if (preview) URL.revokeObjectURL(preview)
            const url = URL.createObjectURL(f)
            setFileName(f.name)
            setPreview(url)
            setIsVideo(f.type.startsWith('video/'))
          }} />
          <p className="text-sm font-semibold m-0">Upload or record evidence</p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Replace · Remove · Rotate · Factual description only</p>
        </label>
        {preview && (
          <div className="mt-4 rounded-xl overflow-hidden bg-black aspect-video">
            {isVideo ? (
              <video src={preview} controls playsInline className="h-full w-full object-contain" style={{ transform: `rotate(${rotation}deg)` }} />
            ) : (
              <img src={preview} alt="" className="h-full w-full object-contain" style={{ transform: `rotate(${rotation}deg)` }} />
            )}
          </div>
        )}
        {fileName && <p className="text-xs mt-2 m-0" style={{ color: 'var(--fg-muted)' }}>{fileName}</p>}
        <div className="flex gap-2 mt-3">
          <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }} onClick={() => setRotation(r => (r + 90) % 360)}>Rotate</button>
          <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)', color: '#C83B3B' }}
            onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFileName(null) }}>Remove</button>
        </div>
        <label className="text-xs font-semibold flex flex-col gap-1 mt-4">Factual description
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        </label>
      </div>
      <div className="p-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <button type="button" disabled={!preview} className="w-full min-h-[48px] rounded-xl font-semibold text-white disabled:opacity-40" style={{ background: 'var(--primary)' }}
          onClick={() => onComplete(note)}>Submit evidence</button>
      </div>
    </div>
  )
}

export function MediaSequenceEditor({
  items,
  onReorder,
  onRemove,
  onEdit,
  onAdd,
  onSetCover,
  coverId,
  sharedCaption,
  onCaption,
  maxItems = 10,
}: {
  items: { id: string; kind: 'image' | 'video'; thumb: string; label: string; status: string }[]
  onReorder: (from: number, to: number) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onAdd: () => void
  onSetCover: (id: string) => void
  coverId: string | null
  sharedCaption: string
  onCaption: (c: string) => void
  maxItems?: number
}) {
  const canAdd = items.length < maxItems
  const cover = items.find(i => i.id === coverId) || items[0]

  return (
    <div className="p-4 max-w-xl mx-auto w-full flex flex-col gap-4">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: '4 / 5', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
      >
        {cover ? (
          cover.kind === 'video' ? (
            <video src={cover.thumb} className="h-full w-full object-cover" muted playsInline loop autoPlay />
          ) : (
            <img src={cover.thumb} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm" style={{ color: 'var(--fg-muted)' }}>
            Add photos or videos
          </div>
        )}
        {items.length > 1 && (
          <span
            className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-1 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            {items.length}/{maxItems}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
          {items.length} of {maxItems} · tap to edit · drag order with arrows
        </p>
        <div className="flex gap-2 overflow-x-auto scroll-rail pb-1">
          {items.map((item, index) => (
            <div key={item.id} className="shrink-0 w-20">
              <button
                type="button"
                className="w-20 h-24 rounded-xl overflow-hidden relative"
                style={{
                  border: coverId === item.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  padding: 0,
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                onClick={() => onEdit(item.id)}
              >
                {item.kind === 'video' ? (
                  <video src={item.thumb} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute top-1 left-1 text-[9px] px-1 rounded bg-black/60 text-white">
                  {index + 1}
                </span>
                {item.kind === 'video' && (
                  <span className="absolute bottom-1 right-1 text-[9px] px-1 rounded bg-black/60 text-white">▶</span>
                )}
              </button>
              <div className="flex gap-0.5 mt-1">
                <button
                  type="button"
                  className="flex-1 min-h-[32px] text-[10px] rounded-lg"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}
                  disabled={index === 0}
                  onClick={() => onReorder(index, index - 1)}
                  aria-label="Move left"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="flex-1 min-h-[32px] text-[10px] rounded-lg"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: index === items.length - 1 ? 'default' : 'pointer', opacity: index === items.length - 1 ? 0.4 : 1 }}
                  disabled={index === items.length - 1}
                  onClick={() => onReorder(index, index + 1)}
                  aria-label="Move right"
                >
                  →
                </button>
                <button
                  type="button"
                  className="flex-1 min-h-[32px] text-[10px] rounded-lg"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: '#C83B3B', cursor: 'pointer' }}
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                className="w-full mt-0.5 min-h-[28px] text-[10px] rounded-lg font-semibold"
                style={{
                  border: 'none',
                  background: coverId === item.id ? 'rgba(140,82,255,0.15)' : 'transparent',
                  color: coverId === item.id ? 'var(--primary)' : 'var(--fg-muted)',
                  cursor: 'pointer',
                }}
                onClick={() => onSetCover(item.id)}
              >
                {coverId === item.id ? 'Cover' : 'Set cover'}
              </button>
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="shrink-0 w-20 h-24 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold"
              style={{
                border: '2px dashed var(--border)',
                background: 'var(--surface-subtle)',
                color: 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              <span className="text-lg leading-none">+</span>
              Add
            </button>
          )}
        </div>
      </div>

      <label className="text-xs font-semibold flex flex-col gap-1">
        Caption
        <textarea
          value={sharedCaption}
          onChange={e => onCaption(e.target.value)}
          rows={2}
          placeholder="Write a caption…"
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
      </label>
    </div>
  )
}

export function StudioChromeHeader({
  title,
  onBack,
  onClose,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  left,
}: {
  title: string
  onBack?: () => void
  onClose?: () => void
  primaryLabel?: string
  onPrimary?: () => void
  primaryDisabled?: boolean
  left?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-2 sm:px-3 py-2.5 shrink-0 min-w-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      {left ?? (
        <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={onBack ?? onClose} aria-label={onBack ? 'Back' : 'Close'}>
          {onBack ? <ChevronLeft size={24} /> : <X size={22} />}
        </button>
      )}
      <h2 className="text-base font-bold m-0 truncate px-2" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h2>
      {primaryLabel && onPrimary ? (
        <button type="button" disabled={primaryDisabled} onClick={onPrimary}
          className="min-w-[52px] min-h-[44px] text-sm font-semibold disabled:opacity-40" style={{ color: 'var(--primary)' }}>
          {primaryLabel}
        </button>
      ) : <div style={{ width: 52 }} />}
    </div>
  )
}

export function SuccessDone({
  onView, onClose,
}: {
  onView?: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center h-full">
      <CheckCircle2 size={48} style={{ color: '#16845B' }} />
      <h3 className="text-xl font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Published</h3>
      <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>Your media is live when the backend confirms publishing.</p>
      <div className="flex gap-2">
        {onView && <button type="button" className="min-h-[48px] px-5 rounded-full text-sm font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={onView}>View post</button>}
        <button type="button" className="min-h-[48px] px-5 rounded-full text-sm font-semibold" style={{ border: '1px solid var(--border)' }} onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export function DemoFailurePicker({ onPick }: { onPick: (r: FailureReason) => void }) {
  const reasons: FailureReason[] = ['network-interrupted', 'unsupported-codec', 'music-unavailable', 'moderation-required']
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {reasons.map(r => (
        <button key={r} type="button" className="min-h-[36px] px-2 rounded-lg text-[10px] inline-flex items-center gap-1" style={{ border: '1px solid var(--border)' }} onClick={() => onPick(r)}>
          <RefreshCw size={12} /> Demo: {r}
        </button>
      ))}
    </div>
  )
}
