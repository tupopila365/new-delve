import { useCallback, useEffect, useRef, useState, type RefObject, type SyntheticEvent } from 'react'

export type StoryPlaybackSlideKind = 'image' | 'video' | 'text'

export type StoryPlaybackSlide = {
  id: string | number
  kind: StoryPlaybackSlideKind
  durationMs?: number
}

export const DEFAULT_STORY_IMAGE_MS = 15_000
export const DEFAULT_STORY_VIDEO_CAP_MS = 15_000
export const DEFAULT_STORY_TEXT_MS = 8_000

type Options = {
  active: boolean
  slides: StoryPlaybackSlide[]
  index: number
  onIndexChange: (next: number) => void
  onComplete?: () => void
  paused?: boolean
  imageDurationMs?: number
  videoCapMs?: number
}

export function useStoryPlayback({
  active,
  slides,
  index,
  onIndexChange,
  onComplete,
  paused = false,
  imageDurationMs = DEFAULT_STORY_IMAGE_MS,
  videoCapMs = DEFAULT_STORY_VIDEO_CAP_MS,
}: Options) {
  const [videoProgress, setVideoProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const [restartTick, setRestartTick] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const slide = slides[index]
  const slideCount = slides.length
  const isFirst = index <= 0
  const isLast = index >= slideCount - 1
  const isPaused = paused || holding

  const onIndexChangeRef = useRef(onIndexChange)
  const onCompleteRef = useRef(onComplete)
  onIndexChangeRef.current = onIndexChange
  onCompleteRef.current = onComplete

  const resetProgress = useCallback(() => setVideoProgress(0), [])

  const advance = useCallback(() => {
    resetProgress()
    if (index >= slideCount - 1) {
      onCompleteRef.current?.()
      return
    }
    onIndexChangeRef.current(index + 1)
  }, [index, resetProgress, slideCount])

  const goNext = useCallback(() => {
    advance()
  }, [advance])

  const goPrev = useCallback(() => {
    resetProgress()
    if (index <= 0) {
      setRestartTick((tick) => tick + 1)
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        if (!isPaused) void video.play().catch(() => {})
      }
      return
    }
    onIndexChangeRef.current(index - 1)
  }, [index, isPaused, resetProgress])

  const handleVideoTimeUpdate = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.duration && Number.isFinite(video.duration)) {
      setVideoProgress(video.currentTime / video.duration)
    }
  }, [])

  const handleVideoEnded = useCallback(() => {
    advance()
  }, [advance])

  useEffect(() => {
    setVideoProgress(0)
  }, [index, slide?.id])

  useEffect(() => {
    if (!active || isPaused || !slide) return
    if (slide.kind !== 'image' && slide.kind !== 'text') return
    const duration =
      slide.durationMs ?? (slide.kind === 'text' ? DEFAULT_STORY_TEXT_MS : imageDurationMs)
    const timer = window.setTimeout(() => advance(), duration)
    return () => window.clearTimeout(timer)
  }, [active, advance, imageDurationMs, index, isPaused, restartTick, slide?.id, slide?.kind, slide?.durationMs])

  useEffect(() => {
    if (!active || isPaused || slide?.kind !== 'video') return
    const cap = slide.durationMs ?? videoCapMs
    const timer = window.setTimeout(() => advance(), cap)
    return () => window.clearTimeout(timer)
  }, [active, advance, index, isPaused, restartTick, slide?.id, slide?.kind, slide?.durationMs, videoCapMs])

  useEffect(() => {
    const video = videoRef.current
    if (!video || slide?.kind !== 'video') return
    if (isPaused) video.pause()
    else void video.play().catch(() => {})
  }, [isPaused, slide?.id, slide?.kind])

  const holdStart = useCallback(() => setHolding(true), [])
  const holdEnd = useCallback(() => setHolding(false), [])

  const currentImageDurationMs =
    slide?.durationMs ?? (slide?.kind === 'text' ? DEFAULT_STORY_TEXT_MS : imageDurationMs)

  return {
    slide,
    slideCount,
    isFirst,
    isLast,
    videoProgress,
    isPaused,
    videoRef: videoRef as RefObject<HTMLVideoElement | null>,
    goNext,
    goPrev,
    holdStart,
    holdEnd,
    handleVideoTimeUpdate,
    handleVideoEnded,
    currentImageDurationMs,
    videoCapMs: slide?.durationMs ?? videoCapMs,
  }
}
