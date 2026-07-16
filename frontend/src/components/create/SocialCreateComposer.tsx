import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Redo2, Undo2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { startCreateSession } from '../../utils/createAnalytics'
import { CreateStudioHeader } from './CreateStudioHeader'
import { MediaPicker } from './MediaPicker'
import { FilterStrip } from './FilterStrip'
import { CropControls } from './CropControls'
import { CaptionEditor } from './CaptionEditor'
import { PostVideoTrimPanel } from './PostVideoTrimPanel'
import { AdjustmentPanel } from './AdjustmentPanel'
import { TextOverlayTool, TextOverlayRenderer } from './TextOverlayTool'
import { StickerPicker, StickerRenderer } from './StickerPicker'
import { DrawingCanvas, DrawingSurface, StrokeRenderer } from './DrawingCanvas'
import { CreateToolDock, type CreateTool } from './CreateToolDock'
import { CreateToolSheet } from './CreateToolSheet'
import { PlaceSearchSheet } from './PlaceSearchSheet'
import { RingHashtagPicker, MAX_RING_HASHTAGS } from './RingHashtagPicker'
import { extractHashtags } from '../../utils/hashtags'
import {
  DEFAULT_CROP,
  DEFAULT_PLACE_LINK,
  DEFAULT_ADJUSTMENTS,
  type CreateStudioMode,
  type MediaFilter,
  type MediaKind,
  type PlaceLink,
  type PostDestination,
  type Adjustments,
  type TextOverlay,
  type StickerOverlay,
  type DrawStroke,
  type EditorSnapshot,
} from './types'
import {
  analyzeImageForEnhance,
  clearAutoEnhanceResult,
  createEditorSnapshot,
  DEFAULT_EDITOR_SNAPSHOT,
  cssFilterForMedia,
  aspectRatioValue,
} from './mediaUtils'
import { useCropStage } from './useCropStage'
import { isFullVideoTrim, MAX_TRIM_DURATION_SEC } from './videoTrimUtils'
import {
  computeSlideFingerprint,
  ensureSlideUploaded,
  getDirectUploadEnabled,
  idleUploadState,
  slideNeedsUpload,
  uploadSlidesParallel,
  type SlideUploadState,
} from './socialMediaApi'
import { usePublishQueue } from '../PublishQueueContext'
import { loadVideoMetadata, probeDelversVideoFile } from '../../utils/delversVideoUtils'
import './SocialCreateComposer.css'

type Props = {
  mode: CreateStudioMode
}

const TOOL_TITLES: Record<CreateTool, string> = {
  filters: 'Filters',
  crop: 'Crop',
  caption: 'Caption',
  trim: 'Trim',
  adjust: 'Adjust',
  text: 'Text',
  stickers: 'Stickers',
  draw: 'Draw',
}

const MAX_HISTORY = 50
const MAX_SLIDES = 5

/** Per-slide editor state for carousel posts. The active slide's values are
 * mirrored into the top-level editing state; other slides keep their snapshot. */
type SlideState = {
  id: string
  file: File
  preview: string
  mediaKind: MediaKind
  filter: MediaFilter
  filterIntensity: number
  adjustments: Adjustments
  crop: typeof DEFAULT_CROP
  videoDuration: number
  videoTrim: { start: number; end: number }
  textOverlays: TextOverlay[]
  stickers: StickerOverlay[]
  strokes: DrawStroke[]
  hasAutoEnhance: boolean
  history: EditorSnapshot[]
  historyIndex: number
  /** Background Cloudinary upload for this slide (eager while editing). */
  upload: SlideUploadState
}

let _slideIdCounter = 0
function nextSlideId() {
  _slideIdCounter += 1
  return `slide_${_slideIdCounter}`
}

function makeSlide(file: File): SlideState {
  const mediaKind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image'
  return {
    id: nextSlideId(),
    file,
    preview: URL.createObjectURL(file),
    mediaKind,
    filter: 'original',
    filterIntensity: 100,
    adjustments: DEFAULT_ADJUSTMENTS,
    crop: DEFAULT_CROP,
    videoDuration: 0,
    videoTrim: { start: 0, end: 0 },
    textOverlays: [],
    stickers: [],
    strokes: [],
    hasAutoEnhance: false,
    history: [DEFAULT_EDITOR_SNAPSHOT],
    historyIndex: 0,
    upload: idleUploadState(),
  }
}

export function SocialCreateComposer({ mode }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { enqueueSocialPost } = usePublishQueue()
  const frameRef = useRef<HTMLDivElement>(null)

  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // Carousel slides. Active slide's editor values live in the top-level state above/below.
  const [slides, setSlides] = useState<SlideState[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [caption, setCaption] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [filter, setFilter] = useState<MediaFilter>('original')
  const [filterIntensity, setFilterIntensity] = useState(100)
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS)
  const [crop, setCrop] = useState(DEFAULT_CROP)
  // Kept only so undo/redo snapshots stay compatible; the post caption is no
  // longer drawn on the media (it is the Instagram-style caption under the post).
  const [captionPosition, setCaptionPosition] = useState({ x: 50, y: 78 })
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [videoPlayheadSec, setVideoPlayheadSec] = useState(0)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [activeTool, setActiveTool] = useState<CreateTool | null>(null)
  const [destination, setDestination] = useState<PostDestination>('delvers')
  // Rings are now created from hashtags (community-style), replacing the old board name.
  const [ringHashtags, setRingHashtags] = useState('')
  const [postAsHighlight, setPostAsHighlight] = useState(false)
  const [placeLink, setPlaceLink] = useState<PlaceLink>(DEFAULT_PLACE_LINK)
  const [error, setError] = useState('')
  const [autoEnhanceBusy, setAutoEnhanceBusy] = useState(false)
  const [hasAutoEnhance, setHasAutoEnhance] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const startedAt = useRef(startCreateSession())

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [activeTextOverlayId, setActiveTextOverlayId] = useState<string | null>(null)
  // Stickers
  const [stickers, setStickers] = useState<StickerOverlay[]>([])
  const stickersRef = useRef<StickerOverlay[]>([])
  stickersRef.current = stickers
  const stickerGesture = useRef<{
    id: string
    pointers: Map<number, { x: number; y: number }>
    startSize: number
    startRotation: number
    startDist: number
    startAngle: number
    cleanup: () => void
  } | null>(null)
  const stickerWheelCommit = useRef<number | null>(null)
  // Drawing strokes
  const [strokes, setStrokes] = useState<DrawStroke[]>([])
  const [drawBrush, setDrawBrush] = useState({ color: '#ffffff', size: 8, opacity: 1 })

  // Undo/redo history
  const [history, setHistory] = useState<EditorSnapshot[]>([DEFAULT_EDITOR_SNAPSHOT])
  const [historyIndex, setHistoryIndex] = useState(0)

  const pushHistory = useCallback(
    (snapshot: EditorSnapshot) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        const next = [...trimmed, snapshot]
        if (next.length > MAX_HISTORY) next.shift()
        return next
      })
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1))
    },
    [historyIndex],
  )

  const saveSnapshot = useCallback(() => {
    pushHistory(
      createEditorSnapshot(
        filter,
        filterIntensity,
        adjustments,
        crop,
        caption,
        captionPosition,
        textOverlays,
        stickers,
        strokes,
      ),
    )
  }, [pushHistory, filter, filterIntensity, adjustments, crop, caption, captionPosition, textOverlays, stickers, strokes])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const snap = history[newIndex]
    if (!snap) return
    setFilter(snap.filter)
    setFilterIntensity(snap.filterIntensity)
    setAdjustments(snap.adjustments)
    setCrop(snap.crop)
    setCaption(snap.caption)
    setCaptionPosition(snap.captionPosition)
    setTextOverlays(snap.textOverlays)
    setStickers(snap.stickers)
    setStrokes(snap.strokes)
    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const snap = history[newIndex]
    if (!snap) return
    setFilter(snap.filter)
    setFilterIntensity(snap.filterIntensity)
    setAdjustments(snap.adjustments)
    setCrop(snap.crop)
    setCaption(snap.caption)
    setCaptionPosition(snap.captionPosition)
    setTextOverlays(snap.textOverlays)
    setStickers(snap.stickers)
    setStrokes(snap.strokes)
    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  // --- Carousel slide helpers ---
  // Snapshot the active slide from the current top-level editing state.
  const snapshotActiveSlide = (): SlideState | null => {
    const current = slides[activeIndex]
    if (!current || !file || !preview) return null
    return {
      ...current,
      file,
      preview,
      mediaKind,
      filter,
      filterIntensity,
      adjustments,
      crop,
      videoDuration,
      videoTrim,
      textOverlays,
      stickers,
      strokes,
      hasAutoEnhance,
      history,
      historyIndex,
    }
  }

  const loadSlide = (slide: SlideState) => {
    setFile(slide.file)
    setPreview(slide.preview)
    setMediaKind(slide.mediaKind)
    setFilter(slide.filter)
    setFilterIntensity(slide.filterIntensity)
    setAdjustments(slide.adjustments)
    setCrop(slide.crop)
    setVideoDuration(slide.videoDuration)
    setVideoTrim(slide.videoTrim)
    setTextOverlays(slide.textOverlays)
    setStickers(slide.stickers)
    setStrokes(slide.strokes)
    setHasAutoEnhance(slide.hasAutoEnhance)
    setHistory(slide.history)
    setHistoryIndex(slide.historyIndex)
    setActiveTextOverlayId(null)
  }

  // Slides with the active slide replaced by its current (uncommitted) state.
  const committedSlides = (): SlideState[] => {
    const snap = snapshotActiveSlide()
    if (!snap) return slides
    return slides.map((s, i) => (i === activeIndex ? snap : s))
  }

  const switchToSlide = (index: number) => {
    if (index === activeIndex || index < 0 || index >= slides.length) return
    const committed = committedSlides()
    setSlides(committed)
    setActiveIndex(index)
    loadSlide(committed[index])
    setActiveTool(null)
  }

  // Debounced eager Cloudinary upload while the user edits.
  const uploadGenRef = useRef(0)
  const [shareBusy, setShareBusy] = useState(false)
  const uploadKey = slides
    .map((s, i) => {
      const live =
        i === activeIndex && file
          ? {
              ...s,
              file,
              mediaKind,
              filter,
              filterIntensity,
              adjustments,
              crop,
              videoDuration,
              videoTrim,
              textOverlays,
              stickers,
              strokes,
            }
          : s
      return `${live.id}:${computeSlideFingerprint(live)}`
    })
    .join('||')

  useEffect(() => {
    if (!uploadKey) return
    const gen = ++uploadGenRef.current
    const timer = window.setTimeout(() => {
      void (async () => {
        const snapshot = committedSlides()
        if (snapshot.length === 0) return
        if (!(await getDirectUploadEnabled())) return
        if (snapshot.every((s) => !slideNeedsUpload(s))) return

        setSlides((prev) =>
          prev.map((s) => {
            const live = snapshot.find((x) => x.id === s.id) ?? s
            if (!slideNeedsUpload(live)) return s
            return { ...s, upload: { ...s.upload, status: 'uploading', error: undefined } }
          }),
        )

        const updated = await uploadSlidesParallel(snapshot, 3, (slideId, ratio) => {
          if (gen !== uploadGenRef.current) return
          setSlides((prev) =>
            prev.map((s) =>
              s.id === slideId
                ? {
                    ...s,
                    upload: {
                      ...s.upload,
                      status: 'uploading',
                      progress: ratio,
                      error: undefined,
                    },
                  }
                : s,
            ),
          )
        })
        if (gen !== uploadGenRef.current) return
        setSlides((prev) =>
          prev.map((s) => {
            const next = updated.find((x) => x.id === s.id)
            return next ? { ...s, upload: next.upload } : s
          }),
        )
      })()
    }, 550)
    return () => {
      window.clearTimeout(timer)
    }
    // committedSlides reads latest editor state via the uploadKey deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uploadKey captures edit fingerprints
  }, [uploadKey])

  useEffect(() => {
    if (!profile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [profile])

  const hostStory =
    searchParams.get('host_story') === '1' || searchParams.get('host_story') === 'true'
  const returnTo = searchParams.get('return')?.trim() || ''

  // Revoke every slide's object URL only on unmount (switching slides must not
  // revoke a preview we still need).
  const slidesRef = useRef<SlideState[]>([])
  slidesRef.current = slides
  const activePreviewRef = useRef<string | null>(null)
  activePreviewRef.current = preview
  useEffect(() => {
    return () => {
      for (const s of slidesRef.current) {
        if (s.preview) URL.revokeObjectURL(s.preview)
      }
      if (activePreviewRef.current) URL.revokeObjectURL(activePreviewRef.current)
    }
  }, [])

  useEffect(() => {
    if (!profile?.region) return
    setRegion(profile.region)
  }, [profile?.region])

  useEffect(() => {
    const listing = searchParams.get('listing')
    const event = searchParams.get('event')
    const vehicle = searchParams.get('vehicle')
    const busTrip = searchParams.get('bus_trip')
    const food = searchParams.get('food')
    const guide = searchParams.get('guide')
    if (listing && Number.isFinite(Number(listing)) && Number(listing) > 0) {
      if (!hostStory) setDestination('delvers')
      setPlaceLink({ kind: 'accommodation', id: Number(listing), title: '' })
      return
    }
    if (event && Number.isFinite(Number(event)) && Number(event) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'event', id: Number(event), title: '' })
      return
    }
    if (vehicle && Number.isFinite(Number(vehicle)) && Number(vehicle) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'vehicle', id: Number(vehicle), title: '' })
      return
    }
    if (busTrip && Number.isFinite(Number(busTrip)) && Number(busTrip) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'bus_trip', id: Number(busTrip), title: '' })
      return
    }
    if (food && Number.isFinite(Number(food)) && Number(food) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'food', id: Number(food), title: '' })
      return
    }
    if (guide && Number.isFinite(Number(guide)) && Number(guide) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'guide', id: Number(guide), title: '' })
    }
  }, [hostStory, searchParams])

  const postsToDelvers = !hostStory && (mode === 'story' || destination === 'delvers')
  const publishAsHighlight = !hostStory && (mode === 'story' || (mode === 'post' && postAsHighlight && destination === 'delvers'))
  const isDirty = Boolean(
    file || slides.length > 0 || caption.trim() || placeLink.kind !== 'none' || ringHashtags.trim() || postAsHighlight ||
    textOverlays.length > 0 || stickers.length > 0 || strokes.length > 0 ||
    filter !== 'original' || filterIntensity < 100 ||
    adjustments.brightness !== 100 || adjustments.contrast !== 100 ||
    adjustments.saturation !== 100 || adjustments.warmth !== 100 || adjustments.sharpen !== 0,
  )

  const requestLeave = (to: string) => {
    if (isDirty && !window.confirm('Discard this draft?')) return
    navigate(to)
  }

  // Add one or more picked files as carousel slides (up to MAX_SLIDES).
  const addFiles = async (picked: File[]) => {
    setError('')
    if (picked.length === 0) return

    const room = MAX_SLIDES - slides.length
    if (room <= 0) {
      setError(`You can add up to ${MAX_SLIDES} photos or videos.`)
      return
    }

    const accepted: File[] = []
    for (const f of picked) {
      if (accepted.length >= room) break
      if (f.type.startsWith('video/')) {
        const probeError = await probeDelversVideoFile(f)
        if (probeError) {
          setError(probeError)
          continue
        }
      }
      accepted.push(f)
    }
    if (accepted.length === 0) return
    if (picked.length > room) {
      setError(`Added ${room} — a post can hold up to ${MAX_SLIDES} slides.`)
    }

    const newSlides = accepted.map(makeSlide)
    clearAutoEnhanceResult()

    if (slides.length === 0) {
      setSlides(newSlides)
      setActiveIndex(0)
      loadSlide(newSlides[0])
      setActiveTool('filters')
    } else {
      const committed = committedSlides()
      setSlides([...committed, ...newSlides])
    }
  }

  const removeSlide = (index: number) => {
    const base = committedSlides()
    const target = base[index]
    if (!target) return
    if (target.preview) URL.revokeObjectURL(target.preview)
    const next = base.filter((_, i) => i !== index)

    if (next.length === 0) {
      setSlides([])
      setActiveIndex(0)
      setFile(null)
      setPreview(null)
      setActiveTool(null)
      setFilter('original')
      setFilterIntensity(100)
      setAdjustments(DEFAULT_ADJUSTMENTS)
      setCrop(DEFAULT_CROP)
      setTextOverlays([])
      setStickers([])
      setStrokes([])
      setHistory([DEFAULT_EDITOR_SNAPSHOT])
      setHistoryIndex(0)
      return
    }

    const newActive = index < activeIndex ? activeIndex - 1 : Math.min(activeIndex, next.length - 1)
    setSlides(next)
    setActiveIndex(newActive)
    loadSlide(next[newActive])
  }

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const base = committedSlides()
    const reordered = [...base]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setSlides(reordered)
    // Keep the same slide active after reordering.
    const newActiveIndex = reordered.findIndex((s) => s.id === base[activeIndex].id)
    setActiveIndex(newActiveIndex)
  }

  const replaceActiveSlide = async (nextFile: File | null) => {
    if (!nextFile) return
    setError('')
    if (nextFile.type.startsWith('video/')) {
      const probeError = await probeDelversVideoFile(nextFile)
      if (probeError) {
        setError(probeError)
        return
      }
    }
    const fresh = makeSlide(nextFile)
    const old = slides[activeIndex]
    if (old?.preview) URL.revokeObjectURL(old.preview)
    setSlides((prev) => prev.map((s, i) => (i === activeIndex ? fresh : s)))
    loadSlide(fresh)
    setActiveTool('filters')
  }

  useEffect(() => {
    // Load video metadata only when this slide hasn't been measured yet, so we
    // don't clobber a trim the user already set on a slide they're revisiting.
    if (!preview || mediaKind !== 'video' || videoDuration > 0) return
    let cancelled = false
    void loadVideoMetadata(preview)
      .then(({ duration, trim }) => {
        if (cancelled) return
        setVideoDuration(duration)
        setVideoTrim(trim)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load video.')
      })
    return () => {
      cancelled = true
    }
  }, [preview, mediaKind, videoDuration])

  // Instagram-style preview: keep playback inside the trim selection and loop it.
  const handlePreviewTimeUpdate = () => {
    const v = previewVideoRef.current
    if (!v) return
    const { start, end } = videoTrim
    if (end > start && v.currentTime >= end - 0.03) {
      v.currentTime = start
      if (!v.paused) void v.play().catch(() => {})
    }
    if (activeTool === 'trim') setVideoPlayheadSec(v.currentTime)
  }

  const handlePreviewPlay = () => {
    const v = previewVideoRef.current
    if (!v) return
    const { start, end } = videoTrim
    if (end > start && (v.currentTime < start - 0.1 || v.currentTime >= end - 0.03)) {
      v.currentTime = start
    }
  }

  // Seek the preview to the frame under a trim handle while the user drags it.
  const seekPreviewTo = (sec: number) => {
    const v = previewVideoRef.current
    if (!v) return
    if (!v.paused) v.pause()
    v.currentTime = sec
    setVideoPlayheadSec(sec)
  }

  const removeTextOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id))
    saveSnapshot()
  }

  // Auto-enhance
  const handleAutoEnhance = async () => {
    if (!file) return
    setAutoEnhanceBusy(true)
    try {
      const result = await analyzeImageForEnhance(file)
      setAdjustments((prev) => ({
        ...prev,
        brightness: result.brightness,
        contrast: result.contrast,
        saturation: result.saturation,
      }))
      setHasAutoEnhance(true)
      saveSnapshot()
    } catch {
      setError('Could not analyse image.')
    } finally {
      setAutoEnhanceBusy(false)
    }
  }

  // Text overlay drag
  const handleTextPointerDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const onMove = (e: globalThis.PointerEvent) => {
      const frame = frameRef.current
      if (!frame) return
      const rect = frame.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setTextOverlays((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, x: Math.min(90, Math.max(5, x)), y: Math.min(90, Math.max(5, y)) } : o,
        ),
      )
    }
    const onUp = () => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.releasePointerCapture(event.pointerId)
      saveSnapshot()
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }

  // Sticker gesture: single-finger drag to move, two-finger pinch to resize + rotate.
  const handleStickerPointerDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      /* setPointerCapture can throw if the pointer is already released */
    }

    let gesture = stickerGesture.current
    const isNewGesture = !gesture || gesture.id !== id
    if (isNewGesture) {
      gesture?.cleanup()
      gesture = {
        id,
        pointers: new Map(),
        startSize: 0,
        startRotation: 0,
        startDist: 0,
        startAngle: 0,
        cleanup: () => {},
      }
      stickerGesture.current = gesture
    }
    const g = gesture!
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const captureBase = () => {
      const pts = [...g.pointers.values()]
      if (pts.length < 2) return
      const sticker = stickersRef.current.find((s) => s.id === id)
      if (!sticker) return
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      g.startDist = Math.hypot(dx, dy) || 1
      g.startAngle = (Math.atan2(dy, dx) * 180) / Math.PI
      g.startSize = sticker.size
      g.startRotation = sticker.rotation
    }

    if (g.pointers.size === 2) captureBase()

    if (!isNewGesture) return

    const onMove = (e: globalThis.PointerEvent) => {
      if (!g.pointers.has(e.pointerId)) return
      const prevPoint = g.pointers.get(e.pointerId)!
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const frame = frameRef.current
      if (!frame) return
      const rect = frame.getBoundingClientRect()

      if (g.pointers.size >= 2) {
        const pts = [...g.pointers.values()]
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        const dist = Math.hypot(dx, dy) || 1
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI
        const scale = g.startDist > 0 ? dist / g.startDist : 1
        const nextSize = Math.min(400, Math.max(16, g.startSize * scale))
        const nextRotation = g.startRotation + (angle - g.startAngle)
        setStickers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, size: nextSize, rotation: nextRotation } : s)),
        )
      } else {
        // Single-finger move by delta so the sticker follows the finger smoothly.
        const dxPct = ((e.clientX - prevPoint.x) / rect.width) * 100
        const dyPct = ((e.clientY - prevPoint.y) / rect.height) * 100
        setStickers((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  x: Math.min(95, Math.max(5, s.x + dxPct)),
                  y: Math.min(95, Math.max(5, s.y + dyPct)),
                }
              : s,
          ),
        )
      }
    }

    const onUp = (e: globalThis.PointerEvent) => {
      g.pointers.delete(e.pointerId)
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* pointer may already be released */
      }
      if (g.pointers.size === 1) {
        // Dropped from two fingers to one — rebase so the remaining finger keeps dragging.
        captureBase()
      }
      if (g.pointers.size === 0) {
        g.cleanup()
        stickerGesture.current = null
        saveSnapshot()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    g.cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }

  // Desktop: scroll wheel over a sticker to resize it (Ctrl/no-ctrl both work).
  const handleStickerWheel = (id: string, event: WheelEvent) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.08 : 0.92
    setStickers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, size: Math.min(400, Math.max(16, s.size * factor)) } : s,
      ),
    )
    if (stickerWheelCommit.current) window.clearTimeout(stickerWheelCommit.current)
    stickerWheelCommit.current = window.setTimeout(() => saveSnapshot(), 350)
  }

  const handleShare = () => {
    setError('')
    if (!file || !profile) {
      setError('Add a photo or video first.')
      return
    }
    if (hostStory && (placeLink.kind !== 'accommodation' || placeLink.id <= 0)) {
      setError('Link a stay listing for this host story.')
      return
    }
    if (
      mediaKind === 'video' &&
      videoDuration > 0 &&
      videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC
    ) {
      setError(`Video must be ${MAX_TRIM_DURATION_SEC} seconds or less.`)
      return
    }

    const publishSlides = committedSlides()
    if (publishSlides.length === 0) {
      setError('Add a photo or video first.')
      return
    }

    const ringTags = postsToDelvers ? extractHashtags(ringHashtags).slice(0, MAX_RING_HASHTAGS) : []
    const captionText = caption.trim()
    const captionTags = new Set(extractHashtags(captionText))
    const extraTags = ringTags.filter((slug) => !captionTags.has(slug))
    const bodyText = extraTags.length
      ? `${captionText}${captionText ? '\n\n' : ''}${extraTags.map((slug) => `#${slug}`).join(' ')}`
      : captionText
    const boardName = ringTags[0]
      ? `#${ringTags[0]}`
      : publishAsHighlight
        ? 'Highlights'
        : 'Posts'

    const dest = returnTo
      ? returnTo
      : hostStory
        ? '/provider/stays'
        : postsToDelvers
          ? '/delvers'
          : profile
            ? `/u/${encodeURIComponent(profile.username)}`
            : '/'

    try {
      setShareBusy(true)
      enqueueSocialPost({
        slides: publishSlides,
        bodyText,
        region: region.trim() || profile.region || '',
        postsToDelvers,
        hostStory,
        publishAsHighlight,
        placeLink,
        delversBoard: postsToDelvers ? boardName : undefined,
        author: {
          username: profile.username,
          display_name: profile.display_name || profile.username,
          avatar: profile.avatar ?? null,
        },
        analytics: {
          format: hostStory ? 'host_story' : mode === 'story' ? 'highlight' : 'post',
          has_place: placeLink.kind !== 'none',
          startedAt: startedAt.current,
        },
      })
      navigate(dest)
    } catch (err) {
      setShareBusy(false)
      setError(err instanceof Error ? err.message : 'Could not publish.')
    }
  }

  const cropActive = activeTool === 'crop'
  const {
    transform: previewTransform,
    dragging: cropDragging,
    naturalRatio: cropNaturalRatio,
    onImageLoad: onCropImageLoad,
    onVideoLoad: onCropVideoLoad,
    stageHandlers: cropStageHandlers,
  } = useCropStage({
    crop,
    onChange: setCrop,
    frameRef,
    enabled: cropActive && mediaKind === 'image',
  })

  if (!profile) {
    return (
      <main className="create-studio create-studio--gate">
        <section className="create-studio-gate">
          <h1>{hostStory ? 'Host story' : mode === 'story' ? 'Add a highlight' : 'Create a post'}</h1>
          <p>Sign in to share photos and videos with filters, captions, and trim.</p>
          <div className="create-studio-gate__actions">
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost">
              Create account
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const title = hostStory ? 'Host story' : mode === 'story' ? 'New highlight' : 'New post'
  const subtitle = hostStory
    ? 'Stay story rings'
    : mode === 'story'
      ? 'Delvers highlights'
      : destination === 'delvers'
        ? 'Show on Delvers'
        : 'Profile only'

  const shareDisabled =
    !file ||
    (hostStory && (placeLink.kind !== 'accommodation' || placeLink.id <= 0)) ||
    (mediaKind === 'video' &&
      videoDuration > 0 &&
      videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC)

  const leaveTarget = returnTo || (hostStory ? '/provider/stays' : '/create')

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const previewFilterStyle = showOriginal
    ? 'none'
    : cssFilterForMedia(filter, filterIntensity, adjustments)

  const previewRatio = aspectRatioValue(crop.aspect)
  const previewFrameStyle = previewRatio
    ? { aspectRatio: String(previewRatio) }
    : cropNaturalRatio
      ? { aspectRatio: String(cropNaturalRatio) }
      : mode === 'story'
        ? { aspectRatio: '9 / 16' }
        : { aspectRatio: '4 / 5' }

  return (
    <main
      className={`create-studio create-studio--immersive${preview ? ' has-media' : ''}${activeTool ? ' create-studio--tool-open' : ''}`}
    >
      <CreateStudioHeader
        title={title}
        subtitle={subtitle}
        onBack={() => requestLeave(leaveTarget)}
        actionLabel="Share"
        actionDisabled={shareDisabled || shareBusy}
        actionPending={shareBusy}
        actionPendingLabel="Sharing…"
        onAction={handleShare}
      />

      <section className="create-studio__stage">
        {preview ? (
          <>
          <div className="create-media" style={previewFrameStyle}>
            <div
              ref={frameRef}
              className={`create-media__frame${cropActive && mediaKind === 'image' ? ' create-media__frame--croppable' : ''}${cropDragging ? ' is-dragging' : ''}`}
            >
              {mediaKind === 'image' ? (
                <img
                  src={preview}
                  alt=""
                  className="create-media__asset"
                  draggable={false}
                  onLoad={(event) => onCropImageLoad(event.currentTarget)}
                  style={{
                    transform: previewTransform,
                    filter: previewFilterStyle,
                  }}
                />
              ) : (
                <video
                  ref={previewVideoRef}
                  src={preview}
                  className="create-media__asset"
                  onLoadedMetadata={(event) => onCropVideoLoad(event.currentTarget)}
                  onTimeUpdate={handlePreviewTimeUpdate}
                  onPlay={handlePreviewPlay}
                  style={{
                    transform: previewTransform,
                    filter: previewFilterStyle,
                  }}
                  muted
                  playsInline
                  controls
                />
              )}

              {cropActive && mediaKind === 'image' ? (
                <div className="create-media__cropgrid create-media__cropgrid--layer" {...cropStageHandlers} aria-hidden>
                  <span /><span /><span /><span />
                </div>
              ) : null}

              <TextOverlayRenderer
                overlays={textOverlays}
                activeId={activeTextOverlayId}
                onPointerDown={handleTextPointerDown}
                onRemove={removeTextOverlay}
              />

              <StickerRenderer
                stickers={stickers}
                onPointerDown={handleStickerPointerDown}
                onWheel={handleStickerWheel}
              />

              <StrokeRenderer strokes={strokes} frameRef={frameRef} />

              <DrawingSurface
                strokes={strokes}
                onChange={(next) => {
                  setStrokes(next)
                  saveSnapshot()
                }}
                frameRef={frameRef}
                brush={drawBrush}
                active={activeTool === 'draw'}
              />
            </div>
          </div>

          <div className="create-slide-strip" role="tablist" aria-label="Carousel slides">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`create-slide-thumb${i === activeIndex ? ' is-active' : ''}${
                  s.upload.status === 'ready' ? ' is-uploaded' : ''
                }${s.upload.status === 'error' ? ' is-upload-error' : ''}${
                  s.upload.status === 'uploading' ? ' is-uploading' : ''
                }`}
              >
                <button
                  type="button"
                  className="create-slide-thumb__btn"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Slide ${i + 1}${
                    s.upload.status === 'ready'
                      ? ', uploaded'
                      : s.upload.status === 'uploading'
                        ? ', uploading'
                        : s.upload.status === 'error'
                          ? ', upload failed'
                          : ''
                  }`}
                  onClick={() => {
                    if (s.upload.status === 'error') {
                      const live =
                        i === activeIndex && file
                          ? {
                              ...s,
                              file,
                              mediaKind,
                              filter,
                              filterIntensity,
                              adjustments,
                              crop,
                              videoDuration,
                              videoTrim,
                              textOverlays,
                              stickers,
                              strokes,
                            }
                          : s
                      setSlides((prev) =>
                        prev.map((row) =>
                          row.id === s.id
                            ? { ...row, upload: { ...row.upload, status: 'uploading', error: undefined } }
                            : row,
                        ),
                      )
                      void ensureSlideUploaded(live, i).then((upload) => {
                        setSlides((prev) =>
                          prev.map((row) => (row.id === s.id ? { ...row, upload } : row)),
                        )
                      })
                    }
                    switchToSlide(i)
                  }}
                >
                  {s.mediaKind === 'video' ? (
                    <video src={s.preview} muted playsInline className="create-slide-thumb__media" />
                  ) : (
                    <img src={s.preview} alt="" className="create-slide-thumb__media" />
                  )}
                  <span className="create-slide-thumb__index">{i + 1}</span>
                  {s.upload.status === 'ready' ? (
                    <span className="create-slide-thumb__status" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                  {s.upload.status === 'uploading' ? (
                    <span
                      className="create-slide-thumb__status create-slide-thumb__status--busy"
                      aria-hidden
                      title={
                        typeof s.upload.progress === 'number'
                          ? `${Math.round(s.upload.progress * 100)}%`
                          : undefined
                      }
                    />
                  ) : null}
                  {s.upload.status === 'error' ? (
                    <span className="create-slide-thumb__status create-slide-thumb__status--error" aria-hidden>
                      !
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="create-slide-thumb__remove"
                  onClick={() => removeSlide(i)}
                  aria-label={`Remove slide ${i + 1}`}
                >
                  ×
                </button>
                {slides.length > 1 ? (
                  <div className="create-slide-thumb__reorder">
                    {i > 0 ? (
                      <button type="button" onClick={() => moveSlide(i, -1)} aria-label="Move left">
                        ‹
                      </button>
                    ) : null}
                    {i < slides.length - 1 ? (
                      <button type="button" onClick={() => moveSlide(i, 1)} aria-label="Move right">
                        ›
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {slides.length < MAX_SLIDES ? (
              <label className="create-slide-add" aria-label="Add more media">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []))
                    event.currentTarget.value = ''
                  }}
                />
                <span aria-hidden>+</span>
              </label>
            ) : null}
          </div>
          </>
        ) : (
          <MediaPicker
            mediaKind={mediaKind}
            onMediaKindChange={setMediaKind}
            onPick={(f) => {
              if (f) void addFiles([f])
            }}
            onPickMany={(files) => void addFiles(files)}
            multiple
            allowMixed
            maxFiles={MAX_SLIDES}
          />
        )}
      </section>

      {preview ? (
        <footer className="create-studio__footer">
          {error ? <p className="create-studio__error">{error}</p> : null}

          {/* Undo/Redo + Before/After */}
          <div className="create-studio__history-bar">
            <button
              type="button"
              className="create-studio__history-btn"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <Undo2 size={16} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              className="create-studio__history-btn"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 size={16} strokeWidth={2.25} />
            </button>
            <span className="create-studio__history-count">
              {historyIndex}/{history.length - 1}
            </span>
            <div className="create-studio__history-spacer" />
            <button
              type="button"
              className={`create-studio__compare-btn${showOriginal ? ' is-active' : ''}`}
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              aria-label="Hold to compare original"
            >
              {showOriginal ? <EyeOff size={16} strokeWidth={2.25} /> : <Eye size={16} strokeWidth={2.25} />}
              <span>Compare</span>
            </button>
          </div>

          {mode === 'post' && !hostStory ? (
            <div className="create-studio__dest" role="tablist" aria-label="Where to share">
              <button
                type="button"
                className={destination === 'delvers' ? 'is-active' : ''}
                onClick={() => setDestination('delvers')}
              >
                Delvers
              </button>
              <button
                type="button"
                className={destination === 'feed' ? 'is-active' : ''}
                onClick={() => {
                  setDestination('feed')
                  setPlaceLink(DEFAULT_PLACE_LINK)
                }}
              >
                Profile only
              </button>
            </div>
          ) : null}

          {(postsToDelvers || hostStory) ? (
            <details className="create-studio__details" open>
              <summary>Post details</summary>
              <div className="create-studio__details-body">
                {mode === 'post' && !hostStory && destination === 'delvers' ? (
                  <label className="create-studio__highlight-toggle">
                    <input
                      type="checkbox"
                      checked={postAsHighlight}
                      onChange={(event) => setPostAsHighlight(event.target.checked)}
                    />
                    <span>Also save as a highlight ring (story-style, not in the feed)</span>
                  </label>
                ) : null}

                {(mode === 'post' && !hostStory) || mode === 'story' ? (
                  <RingHashtagPicker
                    value={ringHashtags}
                    onChange={setRingHashtags}
                    disabled={shareBusy}
                    isHighlight={mode === 'story' || postAsHighlight}
                    onLimit={() => setError(`Use up to ${MAX_RING_HASHTAGS} hashtags.`)}
                  />
                ) : null}

                <PlaceSearchSheet
                  value={placeLink}
                  onChange={setPlaceLink}
                  disabled={shareBusy}
                  allowedKinds={hostStory ? ['accommodation'] : undefined}
                  triggerLabel={hostStory ? 'Link a stay' : 'Link a place'}
                />
              </div>
            </details>
          ) : null}

          <div className="create-studio__toolbar">
            <label className="create-studio__replace">
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(event) => {
                  void replaceActiveSlide(event.target.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
              Replace
            </label>
            <CreateToolDock
              active={activeTool}
              onChange={(tool) => setActiveTool((current) => (current === tool ? null : tool))}
              showTrim={mediaKind === 'video'}
            />
          </div>
        </footer>
      ) : null}

      <CreateToolSheet
        open={Boolean(preview && activeTool)}
        title={activeTool ? TOOL_TITLES[activeTool] : ''}
        onClose={() => setActiveTool(null)}
      >
        {activeTool === 'filters' ? (
          <FilterStrip
            value={filter}
            onChange={(f) => {
              setFilter(f)
              saveSnapshot()
            }}
            intensity={filterIntensity}
            onIntensityChange={(v) => {
              setFilterIntensity(v)
              saveSnapshot()
            }}
            previewUrl={preview}
            hasMedia={mediaKind === 'image'}
          />
        ) : null}
        {activeTool === 'adjust' ? (
          <AdjustmentPanel
            value={adjustments}
            onChange={(a) => {
              setAdjustments(a)
              setHasAutoEnhance(false)
            }}
            onCommit={saveSnapshot}
            onAutoEnhance={handleAutoEnhance}
            autoEnhanceBusy={autoEnhanceBusy}
            hasAutoEnhance={hasAutoEnhance}
          />
        ) : null}
        {activeTool === 'crop' ? (
          <CropControls
            value={crop}
            onChange={(c) => {
              setCrop(c)
              saveSnapshot()
            }}
            disabled={mediaKind !== 'image'}
          />
        ) : null}
        {activeTool === 'caption' ? (
          <CaptionEditor
            value={caption}
            onChange={setCaption}
            region={region}
            onRegionChange={setRegion}
            showPositionPresets={false}
          />
        ) : null}
        {activeTool === 'text' ? (
          <TextOverlayTool
            overlays={textOverlays}
            onChange={setTextOverlays}
            onCommit={saveSnapshot}
            onActiveOverlayChange={setActiveTextOverlayId}
          />
        ) : null}
        {activeTool === 'stickers' ? (
          <StickerPicker
            stickers={stickers}
            onChange={(s) => {
              setStickers(s)
              saveSnapshot()
            }}
          />
        ) : null}
        {activeTool === 'draw' ? (
          <DrawingCanvas
            strokes={strokes}
            onChange={(s) => {
              setStrokes(s)
              saveSnapshot()
            }}
            brush={drawBrush}
            onBrushChange={setDrawBrush}
          />
        ) : null}
        {activeTool === 'trim' && mediaKind === 'video' && preview ? (
          <PostVideoTrimPanel
            preview={preview}
            videoDuration={videoDuration}
            videoTrim={videoTrim}
            onDuration={setVideoDuration}
            onTrimChange={setVideoTrim}
            playheadSec={videoPlayheadSec}
            onScrub={seekPreviewTo}
          />
        ) : null}
      </CreateToolSheet>
    </main>
  )
}