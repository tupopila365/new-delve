import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, FileVideo, Image as ImageIcon, Plus, Shield, Upload } from 'lucide-react'
import { EXAMPLE_UPLOAD_LIMITS, limitsForContext, newId, RESTRICTED_CONTEXTS, SOCIAL_VIDEO_CONTEXTS, studioModeForContext } from './config'
import { SAMPLE_GALLERY, unsplash } from './data'
import { classifyStudioMedia, detectMimeKind, orientationOf, readImageMetadata, readVideoMetadata, validateAgainstLimits } from './detect'
import { formatBytes, formatTime } from './format'
import { ImageEditor } from './ImageEditor'
import {
  DemoFailurePicker, MediaSequenceEditor, RestrictedMediaUploader, StudioChromeHeader,
  SuccessDone, VideoModerationState, VideoProcessingState, VideoPublishPreview, VideoPublishingSettings,
} from './Publish'
import type {
  FailureReason, ImageEditState, MediaAsset, MediaStudioItem, ProcessingStage,
  PublishingSettings, StudioContext, VideoEditState,
} from './types'
import { VideoEditorShell } from './VideoEditorShell'
import { VideoUpload } from './VideoUpload'

type Phase =
  | 'pick'
  | 'image-edit'
  | 'video-edit'
  | 'carousel'
  | 'details'
  | 'preview'
  | 'processing'
  | 'done'
  | 'restricted'

interface MediaStudioProps {
  open: boolean
  onClose: () => void
  onViewPost?: () => void
  initialContext?: StudioContext
}

export default function MediaStudioRoot({
  open,
  onClose,
  onViewPost,
  initialContext = 'delvers-post',
}: MediaStudioProps) {
  const [context, setContext] = useState<StudioContext>(initialContext)
  const [phase, setPhase] = useState<Phase>('pick')
  const [items, setItems] = useState<MediaStudioItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [sharedCaption, setSharedCaption] = useState('')
  const [imageSrc, setImageSrc] = useState('')
  const [imageEdit, setImageEdit] = useState<ImageEditState | null>(null)
  const [videoAsset, setVideoAsset] = useState<MediaAsset | null>(null)
  const [videoEdit, setVideoEdit] = useState<VideoEditState | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [objectUrls, setObjectUrls] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const [settings, setSettings] = useState<PublishingSettings>(defaultSettings(initialContext))
  const [stage, setStage] = useState<ProcessingStage>('preparing')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [failure, setFailure] = useState<FailureReason | null>(null)
  const [notify, setNotify] = useState(true)
  const [moderation, setModeration] = useState<'none' | 'automated' | 'manual' | 'ready'>('none')
  const fileRef = useRef<HTMLInputElement>(null)

  const limits = useMemo(() => limitsForContext(context, EXAMPLE_UPLOAD_LIMITS), [context])
  const mode = studioModeForContext(context)

  useEffect(() => {
    if (!open) return
    setContext(initialContext)
    setPhase(RESTRICTED_CONTEXTS.includes(initialContext) ? 'restricted' : 'pick')
    setItems([])
    setActiveId(null)
    setCoverId(null)
    setSharedCaption('')
    setImageSrc('')
    setImageEdit(null)
    setVideoAsset(null)
    setVideoEdit(null)
    setCoverUrl(null)
    setSettings(defaultSettings(initialContext))
    setStage('preparing')
    setUploadProgress(null)
    setFailure(null)
    setModeration('none')
    setShowVideoUpload(false)
  }, [open, initialContext])

  useEffect(() => () => {
    objectUrls.forEach(u => URL.revokeObjectURL(u))
  }, [objectUrls])

  if (!open) return null

  function trackUrl(url: string) {
    setObjectUrls(prev => [...prev, url])
  }

  async function ingestFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (!files.length) return
    if (RESTRICTED_CONTEXTS.includes(context)) {
      setPhase('restricted')
      return
    }

    const kind = classifyStudioMedia(files, context)
    if (kind === 'mixed' || files.length > 1) {
      const nextItems: MediaStudioItem[] = []
      for (const file of files.slice(0, limits.maxClips)) {
        const detected = detectMimeKind(file.type, file.name)
        if (detected === 'unknown') continue
        const url = URL.createObjectURL(file)
        trackUrl(url)
        if (detected === 'image') {
          const meta = await readImageMetadata(url).catch(() => ({ width: 0, height: 0 }))
          const now = new Date().toISOString()
          const asset: MediaAsset = {
            id: newId('asset'),
            ownerId: 'local-user',
            context,
            mediaType: 'image',
            source: 'device',
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            width: meta.width,
            height: meta.height,
            duration: 0,
            orientation: orientationOf(meta.width, meta.height),
            uploadStatus: 'ready',
            processingStatus: 'ready',
            moderationStatus: 'none',
            createdAt: now,
            updatedAt: now,
            objectUrl: url,
            hasAudio: false,
          }
          nextItems.push({ id: asset.id, kind: 'image', asset })
        } else {
          try {
            const meta = await readVideoMetadata(file, url)
            const status = validateAgainstLimits({
              kind: 'video',
              fileSize: file.size,
              duration: meta.duration,
              width: meta.width,
              height: meta.height,
              mimeType: file.type || 'video/mp4',
              limits,
            })
            const now = new Date().toISOString()
            const asset: MediaAsset = {
              id: newId('asset'),
              ownerId: 'local-user',
              context,
              mediaType: 'audio-supported-video',
              source: 'device',
              fileName: file.name,
              mimeType: file.type || 'video/mp4',
              fileSize: file.size,
              width: meta.width,
              height: meta.height,
              duration: meta.duration,
              orientation: orientationOf(meta.width, meta.height),
              uploadStatus: status,
              processingStatus: 'ready',
              moderationStatus: 'none',
              createdAt: now,
              updatedAt: now,
              objectUrl: url,
              hasAudio: meta.hasAudio,
            }
            nextItems.push({ id: asset.id, kind: 'video', asset })
          } catch {
            URL.revokeObjectURL(url)
          }
        }
      }
      setItems(nextItems)
      setCoverId(nextItems[0]?.id ?? null)
      setPhase('carousel')
      return
    }

    const file = files[0]
    const detected = detectMimeKind(file.type, file.name)
    if (detected === 'image') {
      const url = URL.createObjectURL(file)
      trackUrl(url)
      setImageSrc(url)
      setPhase('image-edit')
      return
    }
    if (detected === 'video') {
      setShowVideoUpload(false)
      const url = URL.createObjectURL(file)
      trackUrl(url)
      try {
        const meta = await readVideoMetadata(file, url)
        const now = new Date().toISOString()
        const asset: MediaAsset = {
          id: newId('asset'),
          ownerId: 'local-user',
          context,
          mediaType: 'audio-supported-video',
          source: 'device',
          fileName: file.name,
          mimeType: file.type || 'video/mp4',
          fileSize: file.size,
          width: meta.width,
          height: meta.height,
          duration: meta.duration,
          orientation: orientationOf(meta.width, meta.height),
          uploadStatus: 'ready',
          processingStatus: 'ready',
          moderationStatus: 'none',
          createdAt: now,
          updatedAt: now,
          objectUrl: url,
          hasAudio: meta.hasAudio,
        }
        setVideoAsset(asset)
        setPhase('video-edit')
      } catch {
        setShowVideoUpload(true)
      }
      return
    }
  }

  function startPublish() {
    setPhase('processing')
    setFailure(null)
    setStage('preparing')
    setUploadProgress(0)
    let p = 0
    const iv = window.setInterval(() => {
      p += 8
      setUploadProgress(Math.min(100, p))
      if (p >= 30) setStage('uploading')
      if (p >= 100) {
        window.clearInterval(iv)
        setStage('upload-complete')
        window.setTimeout(() => setStage('transcoding'), 400)
        window.setTimeout(() => setStage('processing-captions'), 1100)
        window.setTimeout(() => setStage('moderation-review'), 1800)
        window.setTimeout(() => {
          setModeration('ready')
          setStage('published')
          setPhase('done')
        }, 2600)
      }
    }, 80)
  }

  function injectFailure(reason: FailureReason) {
    setPhase('processing')
    setStage('failed')
    setFailure(reason)
    setUploadProgress(null)
  }

  if (phase === 'restricted') {
    return (
      <RestrictedMediaUploader
        context={context}
        onClose={onClose}
        onComplete={() => { setPhase('done') }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }} role="dialog" aria-modal="true" aria-label="Media Studio">
      {phase === 'pick' && !showVideoUpload && (
        <>
          <StudioChromeHeader title="Media Studio" onClose={onClose} />
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-4 pt-3 flex gap-2 overflow-x-auto scroll-rail">
              {SOCIAL_VIDEO_CONTEXTS.slice(0, 8).map(c => (
                <button key={c} type="button" onClick={() => { setContext(c); setSettings(s => ({ ...s, context: c })) }}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px]"
                  style={{ background: context === c ? 'var(--primary)' : 'var(--surface)', color: context === c ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}>
                  {c.replace(/-/g, ' ')}
                </button>
              ))}
              <button type="button" onClick={() => setPhase('restricted')}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px] inline-flex items-center gap-1"
                style={{ border: '1px solid var(--border)', color: '#B76808' }}>
                <Shield size={12} /> Evidence
              </button>
            </div>

            <div
              className="mx-4 mt-4 rounded-2xl flex flex-col items-center justify-center gap-4 py-10"
              style={{
                border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
                background: dragging ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                void ingestFiles(e.dataTransfer.files)
              }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                <Upload size={28} />
              </span>
              <div className="text-center px-4">
                <p className="font-semibold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Photos, videos & carousels</p>
                <p className="text-sm mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
                  Adaptive studio · {mode} · up to {limits.maxClips} items · max {formatBytes(limits.maxFileSizeBytes)} · video {formatTime(limits.minDurationSec)}–{formatTime(limits.maxDurationSec)}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white min-h-[44px]" style={{ background: 'var(--primary)' }}>
                  <Upload size={14} /> Select files
                </button>
                <button type="button" onClick={() => setShowVideoUpload(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <FileVideo size={14} /> Video upload
                </button>
                <button type="button" onClick={() => setShowVideoUpload(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Camera size={14} /> Record
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { if (e.target.files) void ingestFiles(e.target.files) }} />
            </div>

            <div className="px-4 mt-5 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold m-0">Recents</h3>
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Images open the photo editor</span>
              </div>
              <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden">
                {SAMPLE_GALLERY.map(pid => (
                  <button key={pid} type="button" onClick={() => { setImageSrc(unsplash(pid, 900, 1100)); setPhase('image-edit') }} className="relative aspect-square overflow-hidden">
                    <img src={unsplash(pid, 400, 400)} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[10px] px-1 rounded bg-black/50 text-white inline-flex items-center gap-0.5"><ImageIcon size={10} /> Photo</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {phase === 'pick' && showVideoUpload && (
        <div className="flex flex-col h-full">
          <StudioChromeHeader title="Video upload" onBack={() => setShowVideoUpload(false)} />
          <div className="flex-1 overflow-y-auto">
            <VideoUpload
              limits={limits}
              context={context}
              allowRecord
              onCancel={() => setShowVideoUpload(false)}
              onReady={asset => { setVideoAsset(asset); setPhase('video-edit') }}
            />
          </div>
        </div>
      )}

      {phase === 'image-edit' && imageSrc && (
        <ImageEditor
          src={imageSrc}
          onBack={() => setPhase('pick')}
          onNext={edit => { setImageEdit(edit); setPhase('details') }}
        />
      )}

      {phase === 'video-edit' && videoAsset && (
        <VideoEditorShell
          asset={videoAsset}
          limits={limits}
          context={context}
          onBack={() => { setPhase('pick'); setShowVideoUpload(false) }}
          onClose={onClose}
          onDraft={() => setPhase('details')}
          onPreview={(edit, cover) => {
            setVideoEdit(edit)
            setCoverUrl(cover)
            setSettings(s => ({
              ...s,
              caption: s.caption,
            }))
            setPhase('preview')
          }}
        />
      )}

      {phase === 'carousel' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader title="Carousel" onBack={() => setPhase('pick')} primaryLabel="Next" onPrimary={() => setPhase('details')} primaryDisabled={!items.length} />
          <div className="flex-1 overflow-y-auto">
            <MediaSequenceEditor
              items={items.map(i => ({
                id: i.id,
                kind: i.kind,
                thumb: i.asset.objectUrl,
                label: i.asset.fileName,
                status: i.asset.uploadStatus,
              }))}
              coverId={coverId}
              sharedCaption={sharedCaption}
              onCaption={setSharedCaption}
              onSetCover={setCoverId}
              onAdd={() => fileRef.current?.click()}
              onRemove={id => setItems(prev => prev.filter(i => i.id !== id))}
              onReorder={(from, to) => {
                setItems(prev => {
                  const next = [...prev]
                  const [item] = next.splice(from, 1)
                  next.splice(to, 0, item)
                  return next
                })
              }}
              onEdit={id => {
                const item = items.find(i => i.id === id)
                if (!item) return
                setActiveId(id)
                if (item.kind === 'image') {
                  setImageSrc(item.asset.objectUrl)
                  setPhase('image-edit')
                } else {
                  setVideoAsset(item.asset)
                  setPhase('video-edit')
                }
              }}
            />
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { if (e.target.files) void ingestFiles(e.target.files) }} />
        </div>
      )}

      {phase === 'details' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader title="Publishing settings" onBack={() => setPhase(videoAsset ? 'video-edit' : imageSrc ? 'image-edit' : 'carousel')} primaryLabel="Preview" onPrimary={() => setPhase('preview')} />
          <div className="flex-1 overflow-y-auto">
            <VideoPublishingSettings
              value={{ ...settings, caption: settings.caption || sharedCaption || imageEdit?.caption || '' }}
              onChange={setSettings}
              musicAttribution={videoEdit?.music?.attribution}
            />
            {limits.allowMusic === false && (
              <p className="text-xs text-center px-4 pb-4" style={{ color: 'var(--fg-muted)' }}>Music is disabled for this context.</p>
            )}
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader title="Preview" onBack={() => setPhase(videoEdit ? 'video-edit' : 'details')} />
          <div className="flex-1 overflow-y-auto">
            <VideoPublishPreview
              coverUrl={coverUrl || imageSrc || items.find(i => i.id === coverId)?.asset.objectUrl || null}
              aspectLabel={videoEdit?.aspectRatio || imageEdit?.aspectRatio || '4:5'}
              settings={settings}
              duration={videoEdit ? (videoEdit.trimEnd - videoEdit.trimStart) / (videoEdit.playbackSpeed || 1) : 0}
              hasCaptions={(videoEdit?.captions.length ?? 0) > 0}
              musicAttribution={videoEdit?.music?.attribution ?? null}
              contextLabel={context.replace(/-/g, ' ')}
              onEdit={() => setPhase(videoEdit ? 'video-edit' : 'image-edit')}
              onDraft={() => setPhase('done')}
              onPublish={startPublish}
            />
            <div className="px-4 pb-6">
              <DemoFailurePicker onPick={injectFailure} />
            </div>
          </div>
        </div>
      )}

      {phase === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md flex flex-col gap-3">
            <VideoProcessingState
              stage={stage}
              uploadProgress={uploadProgress}
              processingProgress={stage === 'transcoding' ? 40 : stage === 'processing-captions' ? 70 : null}
              failureReason={failure}
              notificationWhenReady={notify}
              onToggleNotify={() => setNotify(n => !n)}
              onRetry={() => startPublish()}
              onResume={() => { setStage('uploading'); startPublish() }}
              onSaveDraft={() => setPhase('done')}
              onCancel={onClose}
              onContinueBackground={onClose}
            />
            {moderation !== 'none' && <VideoModerationState status={moderation === 'ready' ? 'ready' : 'automated'} affected="Video" />}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <SuccessDone onClose={onClose} onView={onViewPost} />
      )}
    </div>
  )
}

function defaultSettings(context: StudioContext): PublishingSettings {
  return {
    context,
    caption: '',
    location: '',
    linkedJourneyId: null,
    linkedCommunityId: null,
    linkedDealId: null,
    linkedListingId: null,
    visibility: 'public',
    commentsEnabled: true,
    sharingEnabled: true,
    disclosure: '',
    status: 'draft',
    contentDisclosure: false,
    sponsoredLabel: false,
  }
}

/** Compact create trigger used in headers / FABs */
export function CreatePostButton({
  onClick,
  variant = 'fab',
  label = 'Create',
}: {
  onClick: () => void
  variant?: 'fab' | 'header' | 'pill'
  label?: string
}) {
  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl active:scale-95"
        style={{ background: 'rgba(140,82,255,0.12)', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        aria-label={label}
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    )
  }
  if (variant === 'pill') {
    return (
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
        <Plus size={16} strokeWidth={2.5} />
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-[60] flex items-center justify-center rounded-full text-white active:scale-95 lg:bottom-8"
      style={{
        right: 16,
        bottom: 96,
        width: 56,
        height: 56,
        background: 'var(--primary)',
        border: 'none',
        boxShadow: '0 6px 20px rgba(140,82,255,0.4)',
      }}
      aria-label={label}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  )
}
