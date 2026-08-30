import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, FileVideo, Image as ImageIcon, Plus, Shield, Upload } from 'lucide-react'
import type { MediaAssetDto, PostDto } from '@delve/contracts'
import { createPost, createStory } from '../api/socialClient'
import { EXAMPLE_UPLOAD_LIMITS, limitsForContext, newId, RESTRICTED_CONTEXTS, SOCIAL_VIDEO_CONTEXTS } from './config'
import { SAMPLE_GALLERY, unsplash } from './data'
import { detectMimeKind, isUsableVideoStatus, orientationOf, readImageMetadata, readVideoMetadata, uploadStatusMessage, validateAgainstLimits } from './detect'
import { formatBytes } from './format'
import { ImageEditor } from './ImageEditor'
import {
  DemoFailurePicker, MediaSequenceEditor, RestrictedMediaUploader, StudioChromeHeader,
  SuccessDone, VideoModerationState, VideoProcessingState, VideoPublishPreview, VideoPublishingSettings,
} from './Publish'
import {
  MAX_POST_MEDIA,
  MAX_STORY_MEDIA,
  isDelversSocialContext,
  isDelversStoryContext,
  purposeForStudioContext,
  uploadStudioMediaFiles,
} from './publishPostMedia'
import { bakeImageEdit, hasImageEdits } from './bakeImageEdit'
import { bakeVideoTrim, hasVideoEdits, hasVideoTrimEdits } from './bakeVideoTrim'
import { preScaleImageFile } from '../media/preScaleImageFile'
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
  /** Delvers post / short: upload + createPost. */
  onCreated?: (post: PostDto) => void
  /** Delvers story: upload + createStory (24h slides). */
  onStoryCreated?: () => void
  /** Listing / business: upload only (Cloudinary + metadata). */
  onMediaReady?: (assets: MediaAssetDto[]) => void
  initialContext?: StudioContext
  businessId?: string
  listingId?: string
  eventId?: string
  /** Hide demo context chips / sample gallery. Defaults on when a live callback is set. */
  lockContext?: boolean
}

function mapVisibility(v: PublishingSettings['visibility']): 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' {
  if (v === 'followers') return 'FOLLOWERS'
  if (v === 'private') return 'PRIVATE'
  return 'PUBLIC'
}

function contextHeadline(context: StudioContext, mediaOnly: boolean): string {
  if (context === 'delvers-short') return 'Create a Short — vertical video up to 90s.'
  if (context === 'delvers-post') return 'Create a Delvers post — photo, video, or carousel.'
  if (context === 'delvers-story') return 'Add to your story — disappears after 24 hours.'
  if (context === 'journey') return 'Add a journey cover — photo or video with edit tools.'
  if (context === 'journey-highlight') return 'Add media for this stop — photos or clips from the route.'
  if (context === 'event') return 'Add an event cover — photo or video for your meetup.'
  if (context === 'message') return 'Attach a photo or video — edit before sending.'
  if (mediaOnly && purposeForStudioContext(context) === 'listing') {
    return 'Add listing media — photos and optional video.'
  }
  if (mediaOnly && purposeForStudioContext(context) === 'business_profile') {
    return 'Add business profile media — JPEG, PNG, or WebP.'
  }
  return `Media Studio — ${context.replace(/-/g, ' ')}`
}

export default function MediaStudioRoot({
  open,
  onClose,
  onViewPost,
  onCreated,
  onStoryCreated,
  onMediaReady,
  initialContext = 'delvers-post',
  businessId,
  listingId,
  eventId,
  lockContext: lockContextProp,
}: MediaStudioProps) {
  const delversPublish = Boolean(onCreated)
  const storyPublish = Boolean(onStoryCreated)
  const mediaOnlyPublish = Boolean(onMediaReady)
  const livePublish = delversPublish || storyPublish || mediaOnlyPublish
  const lockContext = lockContextProp ?? livePublish
  const [context, setContext] = useState<StudioContext>(initialContext)
  const [phase, setPhase] = useState<Phase>('pick')
  const [items, setItems] = useState<MediaStudioItem[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)
  const [sharedCaption, setSharedCaption] = useState('')
  const [imageSrc, setImageSrc] = useState('')
  const [primaryFile, setPrimaryFile] = useState<File | null>(null)
  const [imageEdit, setImageEdit] = useState<ImageEditState | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
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
  const [publishError, setPublishError] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)
  const [moderation, setModeration] = useState<'none' | 'automated' | 'manual' | 'ready'>('none')
  const fileRef = useRef<HTMLInputElement>(null)
  const appendPickRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const purpose =
    context === 'event' && eventId
      ? ('event' as const)
      : purposeForStudioContext(context)
  const imageOnly = purpose === 'business_profile' || purpose === 'cover' || purpose === 'avatar'
  const afterEditPhase: Phase = mediaOnlyPublish ? 'preview' : 'details'

  const limits = useMemo(() => {
    const base = limitsForContext(context, EXAMPLE_UPLOAD_LIMITS)
    const cap =
      context === 'delvers-short' || imageOnly || context === 'message'
        ? 1
        : context === 'delvers-story'
          ? MAX_STORY_MEDIA
          : MAX_POST_MEDIA
    return { ...base, maxClips: Math.min(base.maxClips, cap) }
  }, [context, imageOnly])

  useEffect(() => {
    if (!open) return
    setContext(initialContext)
    setPhase(RESTRICTED_CONTEXTS.includes(initialContext) ? 'restricted' : 'pick')
    setItems([])
    setCoverId(null)
    setSharedCaption('')
    setImageSrc('')
    setPrimaryFile(null)
    setImageEdit(null)
    setEditingItemId(null)
    setVideoAsset(null)
    setVideoEdit(null)
    setCoverUrl(null)
    setSettings(defaultSettings(initialContext))
    setStage('preparing')
    setUploadProgress(null)
    setFailure(null)
    setPublishError(null)
    setModeration('none')
    setShowVideoUpload(false)
    abortRef.current?.abort()
    abortRef.current = null
  }, [open, initialContext])

  useEffect(() => () => {
    objectUrls.forEach(u => URL.revokeObjectURL(u))
  }, [objectUrls])

  if (!open) return null

  function trackUrl(url: string) {
    setObjectUrls(prev => [...prev, url])
  }

  function collectOrderedItems(): MediaStudioItem[] {
    if (!items.length) return []
    let ordered = [...items]
    if (coverId) {
      const cover = ordered.find(i => i.id === coverId)
      const rest = ordered.filter(i => i.id !== coverId)
      if (cover) ordered = [cover, ...rest]
    }
    return ordered.slice(0, limits.maxClips)
  }

  /** Resolve files for upload; bake image/video edits when present. */
  async function resolvePublishFiles(): Promise<Array<{ file: File; altText?: string }>> {
    async function bakeOne(
      kind: 'image' | 'video',
      file: File,
      imageEditState?: ImageEditState | null,
      videoEditState?: VideoEditState | null,
      duration = 0,
    ): Promise<{ file: File; altText?: string }> {
      const altText =
        (kind === 'image' ? imageEditState?.altText : videoEditState?.cover.altText)?.trim() ||
        undefined
      if (kind === 'image' && hasImageEdits(imageEditState)) {
        return {
          file: await bakeImageEdit({
            source: file,
            edit: imageEditState!,
            fileName: file.name,
          }),
          altText,
        }
      }
      if (kind === 'video' && hasVideoEdits(videoEditState, duration || videoEditState?.trimEnd || 0)) {
        return {
          file: await bakeVideoTrim({
            source: file,
            edit: videoEditState!,
            sourceDuration: duration || videoEditState!.trimEnd,
            fileName: file.name,
            signal: abortRef.current?.signal,
          }),
          altText,
        }
      }
      return { file, altText }
    }

    if (items.length) {
      const ordered = collectOrderedItems()
      const out: Array<{ file: File; altText?: string }> = []
      for (const item of ordered) {
        const file = item.asset.file
        if (!file) continue
        out.push(
          await bakeOne(
            item.kind,
            file,
            item.imageEdit,
            item.videoEdit,
            item.asset.duration,
          ),
        )
      }
      return out
    }
    if (videoAsset?.file) {
      return [
        await bakeOne(
          'video',
          videoAsset.file,
          null,
          videoEdit,
          videoAsset.duration,
        ),
      ]
    }
    if (primaryFile) {
      return [await bakeOne('image', primaryFile, imageEdit, null, 0)]
    }
    return []
  }

  function fileAccept() {
    if (imageOnly) return 'image/jpeg,image/png,image/webp'
    return 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'
  }

  function openLibrary(mode: 'replace' | 'append') {
    setPublishError(null)
    appendPickRef.current = mode === 'append'
    fileRef.current?.click()
  }

  function seedItemsFromCurrent(): MediaStudioItem[] {
    if (items.length) return items
    if (videoAsset) {
      return [{ id: videoAsset.id, kind: 'video', asset: videoAsset, videoEdit: videoEdit ?? undefined }]
    }
    if (primaryFile && imageSrc) {
      const asset = studioImageAsset({
        file: primaryFile,
        url: imageSrc,
        context,
        meta: { width: 0, height: 0 },
      })
      return [{ id: asset.id, kind: 'image', asset, imageEdit: imageEdit ?? undefined }]
    }
    return []
  }

  async function ingestFiles(fileList: FileList | File[], opts?: { append?: boolean }) {
    let files = Array.from(fileList)
    if (!files.length) return
    if (RESTRICTED_CONTEXTS.includes(context)) {
      setPhase('restricted')
      return
    }
    if (imageOnly) {
      files = files.filter(f => detectMimeKind(f.type, f.name) === 'image')
      if (!files.length) {
        setPublishError('This context only accepts images.')
        return
      }
    }

    const multi = limits.maxClips > 1
    if (!multi) {
      if (context === 'delvers-short') {
        const video = files.find(f => detectMimeKind(f.type, f.name) === 'video')
        files = [video || files[0]]
      } else {
        files = files.slice(0, 1)
      }
    } else if (files.length > limits.maxClips) {
      setPublishError(`You can add up to ${limits.maxClips} photos or videos. Extra files were skipped.`)
      files = files.slice(0, limits.maxClips)
    }

    const appending = Boolean(opts?.append) || phase === 'carousel'
    const seeded = appending ? (items.length ? items : seedItemsFromCurrent()) : []
    if (appending || files.length > 1) {
      const room = Math.max(0, limits.maxClips - (appending ? seeded.length : 0))
      if (room <= 0) {
        setPublishError(`Carousel is full (max ${limits.maxClips}). Remove an item to add more.`)
        return
      }
      const batch = files.slice(0, room)
      const nextItems: MediaStudioItem[] = []
      const skipped: string[] = []
      for (let file of batch) {
        const detected = detectMimeKind(file.type, file.name)
        if (detected === 'unknown') {
          skipped.push(`${file.name}: unsupported file type.`)
          continue
        }
        if (detected === 'image') {
          file = await preScaleImageFile(file)
        }
        const url = URL.createObjectURL(file)
        trackUrl(url)
        if (detected === 'image') {
          const meta = await readImageMetadata(url).catch(() => ({ width: 0, height: 0 }))
          const asset = studioImageAsset({ file, url, context, meta })
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
            if (status === 'video-too-long' || !isUsableVideoStatus(status)) {
              if (status === 'video-too-long') {
                const asset = studioVideoAsset({ file, url, context, meta })
                nextItems.push({ id: asset.id, kind: 'video', asset })
                skipped.push(`${file.name}: longer than ${Math.round(limits.maxDurationSec)}s — trim it before posting.`)
                continue
              }
              skipped.push(`${file.name}: ${uploadStatusMessage(status, limits)}`)
              URL.revokeObjectURL(url)
              continue
            }
            const asset = studioVideoAsset({ file, url, context, meta })
            nextItems.push({ id: asset.id, kind: 'video', asset })
          } catch {
            URL.revokeObjectURL(url)
            skipped.push(`${file.name}: this video could not be read.`)
          }
        }
      }
      if (!nextItems.length) {
        setPublishError(skipped[0] || 'No valid photos or videos in that selection.')
        return
      }
      if (files.length > room) {
        setPublishError(`Only ${room} more slot${room === 1 ? '' : 's'} left — added the first ${room}.`)
      } else if (skipped.length) {
        setPublishError(`${skipped.length} file${skipped.length === 1 ? '' : 's'} skipped. ${skipped[0]}`)
      } else {
        setPublishError(null)
      }
      setItems(prev => {
        const start = prev.length ? prev : seeded
        const merged = appending ? [...start, ...nextItems] : nextItems
        return merged.slice(0, limits.maxClips)
      })
      setCoverId(prev => (appending && (prev || seeded[0]?.id) ? (prev || seeded[0].id) : nextItems[0]?.id || null))
      setPrimaryFile(null)
      setVideoAsset(null)
      setImageSrc('')
      setEditingItemId(null)
      setPhase('carousel')
      return
    }

    let file = files[0]
    const detected = detectMimeKind(file.type, file.name)
    if (detected === 'image') {
      file = await preScaleImageFile(file)
      const url = URL.createObjectURL(file)
      trackUrl(url)
      setPrimaryFile(file)
      setEditingItemId(null)
      setImageSrc(url)
      setItems([])
      setVideoAsset(null)
      setPhase('image-edit')
      return
    }
    if (detected === 'video') {
      setShowVideoUpload(false)
      const url = URL.createObjectURL(file)
      trackUrl(url)
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
        if (!isUsableVideoStatus(status) && status !== 'video-too-long') {
          URL.revokeObjectURL(url)
          setPublishError(uploadStatusMessage(status, limits))
          return
        }
        const asset = studioVideoAsset({ file, url, context, meta })
        setVideoAsset(asset)
        setVideoEdit(null)
        setPrimaryFile(null)
        setItems([])
        setEditingItemId(null)
        setPhase(status === 'video-too-long' ? 'video-edit' : afterEditPhase)
      } catch {
        URL.revokeObjectURL(url)
        setPublishError('This video could not be read. Try MP4, WebM, or MOV.')
      }
      return
    }
    setPublishError('Use MP4, WebM, or MOV for video, or JPG, PNG, or WebP for photos.')
  }

  function finishSingleVideo(edit: VideoEditState, cover: string | null) {
    setVideoEdit(edit)
    if (cover) setCoverUrl(cover)
    if (editingItemId) {
      setItems(prev => prev.map(i => (i.id === editingItemId ? { ...i, videoEdit: edit } : i)))
      setEditingItemId(null)
      setPhase('carousel')
      return
    }
    setPhase(afterEditPhase)
  }

  function addMoreMedia() {
    const seed = seedItemsFromCurrent()
    if (seed.length) {
      setItems(seed)
      setCoverId(prev => prev || seed[0]?.id || null)
    }
    setPhase('carousel')
    window.setTimeout(() => openLibrary('append'), 60)
  }

  async function startPublish() {
    if (livePublish) {
      if (!purpose || purpose === 'review' || purpose === 'message') {
        setPublishError('This studio context is not available for live upload yet.')
        setPhase('preview')
        return
      }
      const longClip =
        (items.length ? collectOrderedItems() : []).find(
          i =>
            i.kind === 'video' &&
            (i.asset.duration || 0) > limits.maxDurationSec &&
            !hasVideoTrimEdits(i.videoEdit, i.asset.duration),
        ) ||
        (videoAsset &&
        videoAsset.duration > limits.maxDurationSec &&
        !hasVideoTrimEdits(videoEdit, videoAsset.duration)
          ? { id: videoAsset.id, asset: videoAsset }
          : null)
      if (longClip) {
        setPublishError(`Trim this video to ${Math.round(limits.maxDurationSec)} seconds or less, then post.`)
        setEditingItemId('id' in longClip && items.some(i => i.id === longClip.id) ? longClip.id : null)
        setVideoAsset('asset' in longClip ? longClip.asset : videoAsset)
        setPhase('video-edit')
        return
      }
      setPhase('processing')
      setFailure(null)
      setPublishError(null)
      setStage('preparing')
      setUploadProgress(0)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const files = await resolvePublishFiles()
        if (!files.length) {
          setPublishError('Add a photo or video from your device to publish.')
          setPhase(mediaOnlyPublish ? 'preview' : 'details')
          return
        }
        setStage('uploading')
        const uploaded = await uploadStudioMediaFiles(files, {
          purpose: purpose!,
          businessId,
          listingId,
          eventId,
          signal: controller.signal,
          onProgress: ratio => setUploadProgress(Math.round(ratio * 100)),
        })
        setStage('upload-complete')
        setUploadProgress(100)

        if (delversPublish && isDelversSocialContext(context)) {
          const caption =
            settings.caption.trim() ||
            sharedCaption.trim() ||
            imageEdit?.caption.trim() ||
            ''
          const location =
            settings.location.trim() ||
            imageEdit?.location.trim() ||
            ''
          const post = await createPost({
            caption,
            location: location || null,
            mediaIds: uploaded.map(a => a.id),
            visibility: mapVisibility(settings.visibility),
          })
          setStage('published')
          setModeration('ready')
          onCreated?.(post)
          return
        }

        if (storyPublish && isDelversStoryContext(context)) {
          const caption = (
            settings.caption.trim() ||
            sharedCaption.trim() ||
            imageEdit?.caption.trim() ||
            ''
          ).slice(0, 200)
          const location = (
            settings.location.trim() ||
            imageEdit?.location.trim() ||
            ''
          ).slice(0, 120)
          await createStory({
            mediaIds: uploaded.map(a => a.id).slice(0, MAX_STORY_MEDIA),
            ...(caption ? { caption } : {}),
            location: location || null,
          })
          setStage('published')
          setModeration('ready')
          onStoryCreated?.()
          return
        }

        if (mediaOnlyPublish) {
          setStage('published')
          setModeration('ready')
          onMediaReady?.(uploaded)
          return
        }

        setStage('published')
        setPhase('done')
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStage('upload-paused')
          setFailure('network-interrupted')
        } else {
          setStage('failed')
          setFailure('server-error')
          setPublishError(err instanceof Error ? err.message : 'Could not publish')
        }
        return
      }
    }

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
      <input
        ref={fileRef}
        type="file"
        accept={fileAccept()}
        multiple={limits.maxClips > 1}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={e => {
          const list = e.target.files
          const append = appendPickRef.current
          appendPickRef.current = false
          e.target.value = ''
          if (list?.length) void ingestFiles(list, { append })
        }}
      />
      {phase === 'pick' && !showVideoUpload && (
        <>
          <StudioChromeHeader
            title={
              context === 'delvers-short'
                ? 'Create Short'
                : context === 'delvers-story'
                  ? 'Your story'
                  : context === 'journey'
                    ? 'Journey cover'
                    : context === 'journey-highlight'
                      ? 'Stop media'
                      : context === 'event'
                        ? 'Event cover'
                        : context === 'message'
                          ? 'Message attachment'
                          : mediaOnlyPublish && purpose === 'listing'
                          ? 'Listing media'
                          : mediaOnlyPublish && purpose === 'business_profile'
                            ? 'Business media'
                            : 'Media Studio'
            }
            onClose={onClose}
          />
          <div className="flex-1 overflow-y-auto min-h-0">
            {delversPublish && !storyPublish && (
              <div className="px-4 pt-3 flex gap-2">
                {([
                  { id: 'delvers-post' as const, label: 'Post' },
                  { id: 'delvers-short' as const, label: 'Short' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setContext(opt.id)
                      setSettings(s => ({ ...s, context: opt.id }))
                      setItems([])
                      setVideoAsset(null)
                      setPrimaryFile(null)
                      setImageSrc('')
                    }}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px]"
                    style={{
                      background: context === opt.id ? 'var(--primary)' : 'var(--surface)',
                      color: context === opt.id ? '#fff' : 'var(--fg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {!lockContext && (
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
            )}
            {livePublish && (
              <p className="px-4 pt-3 text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
                {contextHeadline(context, mediaOnlyPublish)}
                {limits.maxClips > 1 ? ` Up to ${limits.maxClips} items.` : ''}
              </p>
            )}

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
                if (e.dataTransfer.files?.length) void ingestFiles(e.dataTransfer.files)
              }}
            >
              <Upload size={32} style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                {imageOnly
                  ? 'Drop images here'
                  : 'Drop a photo or video here'}
              </p>
              <p className="text-xs m-0 text-center px-4" style={{ color: 'var(--fg-muted)' }}>
                {imageOnly ? 'JPG, PNG, WebP' : 'JPG, PNG, WebP, MP4, WebM, MOV'} · up to {formatBytes(limits.maxFileSizeBytes)}
                {limits.maxClips > 1 ? ` · optional carousel up to ${limits.maxClips}` : ''}
                {context === 'delvers-short' ? ` · max ${limits.maxDurationSec}s` : ''}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" onClick={() => openLibrary('replace')}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white min-h-[44px]"
                  style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                  <ImageIcon size={16} />
                  Choose file
                </button>
                {!imageOnly && (
                  <button type="button" onClick={() => setShowVideoUpload(true)}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}>
                    <FileVideo size={14} /> Video upload
                  </button>
                )}
                <button type="button" onClick={() => openLibrary('replace')}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}>
                  <Camera size={14} /> {limits.maxClips > 1 ? 'Multi-select' : 'Camera roll'}
                </button>
              </div>
              {limits.maxClips > 1 && (
                <p className="text-[11px] m-0 text-center px-6" style={{ color: 'var(--fg-muted)' }}>
                  Select more than one file to start a carousel. A single video goes straight to caption and post.
                </p>
              )}
              {publishError && (
                <p className="text-xs m-0 text-center px-4" style={{ color: '#C83B3B' }} role="alert">{publishError}</p>
              )}
            </div>

            {!lockContext && (
              <div className="px-4 mt-6 pb-8">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>Sample gallery</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {SAMPLE_GALLERY.map(pid => (
                    <button
                      key={pid}
                      type="button"
                      className="relative aspect-square rounded-xl overflow-hidden"
                      onClick={() => {
                        setImageSrc(unsplash(pid, 800, 1000))
                        setPrimaryFile(null)
                        setPhase('image-edit')
                      }}
                    >
                      <img src={unsplash(pid, 400, 400)} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[10px] px-1 rounded bg-black/50 text-white inline-flex items-center gap-0.5"><ImageIcon size={10} /> Photo</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              onReady={asset => {
                const needsTrim = asset.duration > limits.maxDurationSec
                if (items.length > 0 && limits.maxClips > 1) {
                  const item = { id: asset.id, kind: 'video' as const, asset }
                  setItems(prev => [...prev, item].slice(0, limits.maxClips))
                  setCoverId(prev => prev || asset.id)
                  setVideoAsset(null)
                  setPrimaryFile(null)
                  setEditingItemId(null)
                  setShowVideoUpload(false)
                  setPhase('carousel')
                  return
                }
                setVideoAsset(asset)
                setVideoEdit(null)
                setPrimaryFile(null)
                setItems([])
                setEditingItemId(null)
                setShowVideoUpload(false)
                setPhase(needsTrim ? 'video-edit' : afterEditPhase)
              }}
            />
          </div>
        </div>
      )}

      {phase === 'image-edit' && imageSrc && (
        <ImageEditor
          src={imageSrc}
          onBack={() => {
            setEditingItemId(null)
            setPhase(items.length ? 'carousel' : 'pick')
          }}
          onNext={edit => {
            setImageEdit(edit)
            if (editingItemId) {
              setItems(prev =>
                prev.map(i => (i.id === editingItemId ? { ...i, imageEdit: edit } : i)),
              )
              setEditingItemId(null)
              setPhase('carousel')
            } else {
              setPhase(afterEditPhase)
            }
          }}
        />
      )}

      {phase === 'video-edit' && videoAsset && (
        <VideoEditorShell
          asset={videoAsset}
          limits={limits}
          context={context}
          onBack={() => {
            setEditingItemId(null)
            setPhase(items.length ? 'carousel' : 'pick')
            setShowVideoUpload(false)
          }}
          onClose={onClose}
          onDraft={edit => finishSingleVideo(edit, coverUrl)}
          onPreview={(edit, cover) => finishSingleVideo(edit, cover)}
        />
      )}

      {phase === 'carousel' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader
            title={items.length > 1 ? `New post · ${items.length}` : 'New post'}
            onBack={() => setPhase('pick')}
            primaryLabel="Next"
            onPrimary={() => setPhase(afterEditPhase)}
            primaryDisabled={!items.length}
          />
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
              maxItems={limits.maxClips}
              onCaption={setSharedCaption}
              onSetCover={setCoverId}
              onAdd={() => openLibrary('append')}
              onRemove={id => {
                setItems(prev => {
                  const next = prev.filter(i => i.id !== id)
                  if (coverId === id) setCoverId(next[0]?.id || null)
                  return next
                })
              }}
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
                if (item.kind === 'image') {
                  setEditingItemId(item.id)
                  setImageSrc(item.asset.objectUrl)
                  setPrimaryFile(item.asset.file || null)
                  setPhase('image-edit')
                } else {
                  setEditingItemId(item.id)
                  setVideoAsset(item.asset)
                  setVideoEdit(item.videoEdit || null)
                  setPhase('video-edit')
                }
              }}
            />
            {publishError && (
              <p className="px-4 pb-3 text-xs m-0 text-center" style={{ color: '#C83B3B' }} role="alert">{publishError}</p>
            )}
          </div>
        </div>
      )}

      {phase === 'details' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader
            title={delversPublish || storyPublish ? 'New post' : 'Publishing settings'}
            onBack={() => setPhase(
              items.length
                ? 'carousel'
                : videoEdit
                  ? 'video-edit'
                  : imageSrc
                    ? 'image-edit'
                    : 'pick',
            )}
            primaryLabel={livePublish && !mediaOnlyPublish ? 'Post' : 'Preview'}
            onPrimary={() => (livePublish && !mediaOnlyPublish ? void startPublish() : setPhase('preview'))}
          />
          <div className="flex-1 overflow-y-auto">
            {(items.length > 0 || videoAsset || imageSrc) && (
              <div className="px-4 pt-4 max-w-lg mx-auto w-full">
                {items.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {items.map(item => (
                      <div key={item.id} className="shrink-0 w-20 h-24 rounded-xl overflow-hidden bg-black">
                        {item.kind === 'video' ? (
                          <video src={item.asset.objectUrl} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={item.asset.objectUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : videoAsset ? (
                  <video
                    src={videoAsset.objectUrl}
                    className="w-full rounded-2xl max-h-[40vh] bg-black"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : imageSrc ? (
                  <img src={imageSrc} alt="" className="w-full rounded-2xl max-h-[40vh] object-cover bg-black" />
                ) : items[0] ? (
                  items[0].kind === 'video' ? (
                    <video src={items[0].asset.objectUrl} className="w-full rounded-2xl max-h-[40vh] bg-black" controls playsInline />
                  ) : (
                    <img src={items[0].asset.objectUrl} alt="" className="w-full rounded-2xl max-h-[40vh] object-cover bg-black" />
                  )
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  {videoAsset && (
                    <button
                      type="button"
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}
                      onClick={() => setPhase('video-edit')}
                    >
                      Edit video
                    </button>
                  )}
                  {imageSrc && !videoAsset && (
                    <button
                      type="button"
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}
                      onClick={() => setPhase('image-edit')}
                    >
                      Edit photo
                    </button>
                  )}
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}
                      onClick={() => setPhase('carousel')}
                    >
                      Edit carousel
                    </button>
                  )}
                  {limits.maxClips > 1 && (
                    <button
                      type="button"
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}
                      onClick={addMoreMedia}
                    >
                      Add more
                    </button>
                  )}
                </div>
              </div>
            )}
            <VideoPublishingSettings
              value={{ ...settings, caption: settings.caption || sharedCaption || imageEdit?.caption || '' }}
              onChange={setSettings}
              musicAttribution={videoEdit?.music?.attribution}
            />
            {publishError && (
              <p className="px-4 pb-4 text-sm max-w-lg mx-auto" style={{ color: 'var(--auth-danger, #C42A2A)' }} role="alert">
                {publishError}
              </p>
            )}
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="flex flex-col h-full min-h-0">
          <StudioChromeHeader
            title="Preview"
            onBack={() => setPhase(
              videoEdit && !items.length
                ? 'video-edit'
                : mediaOnlyPublish
                  ? (items.length ? 'carousel' : imageSrc ? 'image-edit' : 'pick')
                  : 'details',
            )}
          />
          <div className="flex-1 overflow-y-auto">
            <VideoPublishPreview
              coverUrl={coverUrl || imageSrc || items.find(i => i.id === coverId)?.asset.objectUrl || null}
              aspectLabel={
                videoEdit?.aspectRatio ||
                imageEdit?.aspectRatio ||
                'original'
              }
              settings={settings}
              duration={videoEdit ? (videoEdit.trimEnd - videoEdit.trimStart) / (videoEdit.playbackSpeed || 1) : 0}
              hasCaptions={(videoEdit?.captions.length ?? 0) > 0}
              musicAttribution={videoEdit?.music?.attribution ?? null}
              contextLabel={
                context === 'delvers-short'
                  ? 'Delvers Short'
                  : context === 'delvers-story'
                    ? 'Delvers story'
                    : delversPublish
                      ? 'Delvers post'
                      : context.replace(/-/g, ' ')
              }
              onEdit={() => setPhase(videoEdit && !items.length ? 'video-edit' : items.length ? 'carousel' : 'image-edit')}
              onDraft={() => (livePublish ? setPhase(mediaOnlyPublish ? 'pick' : 'details') : setPhase('done'))}
              onPublish={() => void startPublish()}
            />
            {publishError && (
              <p className="px-4 text-sm" style={{ color: 'var(--auth-danger, #C42A2A)' }}>{publishError}</p>
            )}
            {!livePublish && (
              <div className="px-4 pb-6">
                <DemoFailurePicker onPick={injectFailure} />
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md flex flex-col gap-3">
            <VideoProcessingState
              stage={stage}
              uploadProgress={uploadProgress}
              processingProgress={null}
              failureReason={failure}
              notificationWhenReady={notify}
              onToggleNotify={() => setNotify(n => !n)}
              onRetry={() => void startPublish()}
              onResume={() => { setStage('uploading'); void startPublish() }}
              onSaveDraft={() => setPhase(livePublish ? 'preview' : 'done')}
              onCancel={() => {
                abortRef.current?.abort()
                onClose()
              }}
              onContinueBackground={onClose}
            />
            {publishError && (
              <p className="text-sm text-center m-0" style={{ color: 'var(--auth-danger, #C42A2A)' }}>{publishError}</p>
            )}
            {!livePublish && moderation !== 'none' && (
              <VideoModerationState status={moderation === 'ready' ? 'ready' : 'automated'} affected="Video" />
            )}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <SuccessDone onClose={onClose} onView={onViewPost} />
      )}
    </div>
  )
}

function studioImageAsset(input: {
  file: File
  url: string
  context: StudioContext
  meta: { width: number; height: number }
}): MediaAsset {
  const now = new Date().toISOString()
  return {
    id: newId('asset'),
    ownerId: 'local-user',
    context: input.context,
    mediaType: 'image',
    source: 'device',
    fileName: input.file.name,
    mimeType: input.file.type || 'image/jpeg',
    fileSize: input.file.size,
    width: input.meta.width,
    height: input.meta.height,
    duration: 0,
    orientation: orientationOf(input.meta.width, input.meta.height),
    uploadStatus: 'ready',
    processingStatus: 'ready',
    moderationStatus: 'none',
    createdAt: now,
    updatedAt: now,
    objectUrl: input.url,
    hasAudio: false,
    file: input.file,
  }
}

function studioVideoAsset(input: {
  file: File
  url: string
  context: StudioContext
  meta: { duration: number; width: number; height: number; hasAudio: boolean }
}): MediaAsset {
  const now = new Date().toISOString()
  return {
    id: newId('asset'),
    ownerId: 'local-user',
    context: input.context,
    mediaType: 'audio-supported-video',
    source: 'device',
    fileName: input.file.name,
    mimeType: input.file.type || 'video/mp4',
    fileSize: input.file.size,
    width: input.meta.width,
    height: input.meta.height,
    duration: input.meta.duration,
    orientation: orientationOf(input.meta.width, input.meta.height),
    uploadStatus: 'ready',
    processingStatus: 'ready',
    moderationStatus: 'none',
    createdAt: now,
    updatedAt: now,
    objectUrl: input.url,
    hasAudio: input.meta.hasAudio,
    file: input.file,
  }
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
      <Plus size={28} strokeWidth={2.5} />
    </button>
  )
}
