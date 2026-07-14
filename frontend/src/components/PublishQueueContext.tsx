import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import type { FeedPost } from './IgPostCard'
import type {
  Adjustments,
  CropSettings,
  MediaFilter,
  MediaKind,
  PlaceLink,
  StickerOverlay,
  TextOverlay,
  DrawStroke,
  VideoTrim,
} from './create/types'
import {
  appendVideoEffectsToFormData,
  prepareVideoEffects,
  videoHasBakeableEffects,
} from './create/videoEffects'
import { renderEditedImage } from './create/mediaUtils'
import { isFullVideoTrim } from './create/videoTrimUtils'
import {
  getDirectUploadEnabled,
  uploadSlidesParallel,
  type SlideUploadState,
  type SocialSlideUploadInput,
} from './create/socialMediaApi'
import { prepareDelversVideoForUpload } from '../utils/delversVideoUtils'
import {
  buildOptimisticDelversPost,
  invalidateSocialCaches,
  prependOptimisticDelversPost,
  reconcileOptimisticPost,
  removeOptimisticPost,
} from '../utils/socialCache'
import { trackCreatePublish, type CreateFormat } from '../utils/createAnalytics'
import { PublishProgressBar } from './PublishProgressBar'

export type PublishSlideSnapshot = SocialSlideUploadInput & {
  /** Durable preview URL owned by the queue (revoked when the job ends). */
  queuePreviewUrl: string
}

export type PublishJobKind = 'social' | 'journey' | 'event'

export type PublishJobStatus = 'uploading' | 'posting' | 'done' | 'failed'

export type PublishJob = {
  id: string
  kind: PublishJobKind
  tempPostId: number
  status: PublishJobStatus
  progress: number
  message: string
  error?: string
  postsToDelvers: boolean
  createdAt: number
  /** Listing title (or short label) for progress copy. */
  label?: string
}

export type EnqueueSocialPublishInput = {
  slides: SocialSlideUploadInput[]
  bodyText: string
  region: string
  postsToDelvers: boolean
  hostStory: boolean
  publishAsHighlight: boolean
  placeLink: PlaceLink
  delversBoard?: string
  author: { username: string; display_name: string; avatar?: string | null }
  analytics: { format: CreateFormat; has_place: boolean; startedAt: number }
}

export type JourneyPublishProgress = {
  status: PublishJobStatus
  progress: number
  message?: string
}

export type EnqueueJourneyPublishInput = {
  /** Shown in the progress strip (e.g. journey title). */
  title: string
  /** Background work: uploads + create/update. Throw on failure. */
  execute: (onProgress: (p: JourneyPublishProgress) => void) => Promise<void>
}

export type EnqueueEventPublishInput = EnqueueJourneyPublishInput

type PublishQueueValue = {
  jobs: PublishJob[]
  enqueueSocialPost: (input: EnqueueSocialPublishInput) => { tempPostId: number; jobId: string }
  enqueueJourneyPublish: (input: EnqueueJourneyPublishInput) => { jobId: string }
  enqueueEventPublish: (input: EnqueueEventPublishInput) => { jobId: string }
  dismissJob: (jobId: string) => void
  retryJob: (jobId: string) => void
}

const PublishQueueContext = createContext<PublishQueueValue | null>(null)

type StoredSocialJob = {
  kind: 'social'
  meta: PublishJob
  slides: PublishSlideSnapshot[]
  input: EnqueueSocialPublishInput
}

type StoredListingJob = {
  kind: 'journey' | 'event'
  meta: PublishJob
  input: EnqueueJourneyPublishInput
}

type StoredJob = StoredSocialJob | StoredListingJob

function jobMessage(job: Pick<PublishJob, 'kind' | 'status' | 'progress' | 'label'>): string {
  const label = job.label?.trim()
  if (job.kind === 'journey' || job.kind === 'event') {
    const noun = job.kind === 'event' ? 'event' : 'journey'
    if (job.status === 'uploading') {
      return job.progress > 0.05
        ? `Uploading ${noun}… ${Math.round(job.progress * 100)}%`
        : `Uploading ${noun}…`
    }
    if (job.status === 'posting') return `Publishing ${noun}…`
    if (job.status === 'done') {
      return label ? `“${label}” is live` : `${noun === 'event' ? 'Event' : 'Journey'} published`
    }
    return `Couldn’t publish ${noun}`
  }
  if (job.status === 'uploading') {
    return job.progress > 0.05 ? `Uploading… ${Math.round(job.progress * 100)}%` : 'Uploading…'
  }
  if (job.status === 'posting') return 'Sharing…'
  if (job.status === 'done') return 'Posted'
  return 'Couldn’t post'
}

async function buildPostFormData(
  input: EnqueueSocialPublishInput,
  slides: PublishSlideSnapshot[],
  onUploadProgress: (ratio: number) => void,
): Promise<FormData> {
  const fd = new FormData()
  fd.append('body', input.bodyText)
  fd.append('region', input.region.trim())
  fd.append('is_delvers', input.postsToDelvers ? 'true' : 'false')
  fd.append('is_accommodation_story', input.hostStory ? 'true' : 'false')
  fd.append('is_delvers_highlight', input.publishAsHighlight ? 'true' : 'false')
  if (input.postsToDelvers && input.delversBoard) {
    fd.append('delvers_board', input.delversBoard)
  }
  const { placeLink } = input
  if (placeLink.kind === 'accommodation' && placeLink.id > 0) {
    fd.append('listing', String(placeLink.id))
  }
  if (input.postsToDelvers && placeLink.kind === 'event' && placeLink.id > 0) {
    fd.append('event', String(placeLink.id))
  }
  if (input.postsToDelvers && placeLink.kind === 'vehicle' && placeLink.id > 0) {
    fd.append('vehicle_listing', String(placeLink.id))
  }
  if (input.postsToDelvers && placeLink.kind === 'bus_trip' && placeLink.id > 0) {
    fd.append('bus_trip', String(placeLink.id))
  }
  if (input.postsToDelvers && placeLink.kind === 'food' && placeLink.id > 0) {
    fd.append('food_venue', String(placeLink.id))
  }

  let publishSlides: PublishSlideSnapshot[] = slides
  const useDirectUpload = await getDirectUploadEnabled()
  if (useDirectUpload) {
    publishSlides = (await uploadSlidesParallel(slides, 3, (_id, ratio) => {
      onUploadProgress(Math.min(0.75, 0.05 + ratio * 0.7))
    })) as PublishSlideSnapshot[]
    const failed = publishSlides.find((s) => s.upload.status === 'error')
    if (failed) {
      throw new Error(failed.upload.error || 'Media upload failed.')
    }
  } else {
    onUploadProgress(0.35)
  }

  onUploadProgress(0.8)

  await Promise.all(
    publishSlides.map(async (slide, i) => {
      const imageKey = i === 0 ? 'image' : `slide${i}_image`
      const videoKey = i === 0 ? 'video' : `slide${i}_video`
      const prefix = i === 0 ? '' : `slide${i}_`

      if (slide.mediaKind === 'video') {
        if (useDirectUpload && slide.upload.publicId) {
          fd.append(`${prefix}video_public_id`, slide.upload.publicId)
          if (slide.upload.secureUrl) {
            fd.append(`${prefix}video_url`, slide.upload.secureUrl)
          }
        } else {
          const videoFile = await prepareDelversVideoForUpload(
            slide.file,
            slide.videoTrim,
            slide.videoDuration,
          )
          fd.append(videoKey, videoFile)
        }
        if (slide.videoDuration > 0 && !isFullVideoTrim(slide.videoTrim, slide.videoDuration)) {
          fd.append(`${prefix}trim_start`, slide.videoTrim.start.toFixed(3))
          fd.append(`${prefix}trim_end`, slide.videoTrim.end.toFixed(3))
        }
        const effects = await prepareVideoEffects(slide.file, {
          filter: slide.filter,
          filterIntensity: slide.filterIntensity,
          adjustments: slide.adjustments,
          textOverlays: slide.textOverlays,
          stickers: slide.stickers,
          strokes: slide.strokes,
        })
        appendVideoEffectsToFormData(fd, prefix, effects)
        return
      }

      if (useDirectUpload && slide.upload.publicId) {
        fd.append(`${prefix}image_public_id`, slide.upload.publicId)
        if (slide.upload.secureUrl) {
          fd.append(`${prefix}image_url`, slide.upload.secureUrl)
        }
        return
      }
      const blob = await renderEditedImage(
        slide.file,
        slide.filter,
        slide.crop,
        slide.adjustments,
        slide.filterIntensity,
        {
          textOverlays: slide.textOverlays,
          stickers: slide.stickers,
          strokes: slide.strokes,
        },
      )
      fd.append(imageKey, new File([blob], `post_${i}.jpg`, { type: 'image/jpeg' }))
    }),
  )

  return fd
}

export function PublishQueueProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [jobs, setJobs] = useState<PublishJob[]>([])
  const storeRef = useRef<Map<string, StoredJob>>(new Map())
  const runningRef = useRef<Set<string>>(new Set())

  const patchJob = useCallback((jobId: string, patch: Partial<PublishJob>) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        const next = { ...j, ...patch }
        next.message = patch.message ?? jobMessage(next)
        return next
      }),
    )
    const stored = storeRef.current.get(jobId)
    if (stored) {
      stored.meta = { ...stored.meta, ...patch }
      stored.meta.message = patch.message ?? jobMessage(stored.meta)
    }
  }, [])

  const cleanupPreviews = useCallback((slides: PublishSlideSnapshot[]) => {
    for (const slide of slides) {
      if (slide.queuePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(slide.queuePreviewUrl)
      }
    }
  }, [])

  const runSocialJob = useCallback(
    async (jobId: string, stored: StoredSocialJob) => {
      const { input, slides, meta } = stored
      patchJob(jobId, { status: 'uploading', progress: 0.05, error: undefined })

      try {
        const fd = await buildPostFormData(input, slides, (ratio) => {
          patchJob(jobId, { status: 'uploading', progress: ratio })
        })
        patchJob(jobId, { status: 'posting', progress: 0.9 })
        const data = await apiFetch<FeedPost>('/api/social/posts/', { method: 'POST', body: fd })

        reconcileOptimisticPost(qc, meta.tempPostId, data)
        trackCreatePublish(input.analytics)

        await invalidateSocialCaches(qc, {
          username: input.author.username,
          accommodationStories: input.hostStory,
          listingId:
            data.listing?.id ??
            (input.placeLink.kind === 'accommodation' ? input.placeLink.id : undefined),
          eventId: data.event?.id,
          vehicleListingId:
            data.vehicle_listing?.id ??
            (input.placeLink.kind === 'vehicle' ? input.placeLink.id : undefined),
          busTripId:
            data.bus_trip?.id ?? (input.placeLink.kind === 'bus_trip' ? input.placeLink.id : undefined),
          foodVenueId:
            data.food_venue?.id ?? (input.placeLink.kind === 'food' ? input.placeLink.id : undefined),
          skipFeeds: input.postsToDelvers,
        })
        if (input.publishAsHighlight) {
          void qc.invalidateQueries({ queryKey: ['delvers-highlights'] })
        }
        if (!input.postsToDelvers) {
          void qc.invalidateQueries({ queryKey: ['user-posts', input.author.username] })
          void qc.invalidateQueries({ queryKey: ['public-profile', input.author.username] })
        }

        patchJob(jobId, { status: 'done', progress: 1 })
        cleanupPreviews(slides)
        storeRef.current.delete(jobId)
        window.setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== jobId || j.status !== 'done'))
        }, 2200)
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not publish.'
        removeOptimisticPost(qc, meta.tempPostId)
        patchJob(jobId, { status: 'failed', progress: 1, error: message, message })
      }
    },
    [cleanupPreviews, patchJob, qc],
  )

  const runListingJob = useCallback(
    async (jobId: string, stored: StoredListingJob) => {
      const noun = stored.kind === 'event' ? 'event' : 'journey'
      patchJob(jobId, {
        status: 'uploading',
        progress: 0.05,
        error: undefined,
        message: `Uploading ${noun}…`,
      })

      try {
        await stored.input.execute((p) => {
          patchJob(jobId, {
            status: p.status,
            progress: p.progress,
            ...(p.message ? { message: p.message } : {}),
          })
        })
        patchJob(jobId, { status: 'done', progress: 1 })
        storeRef.current.delete(jobId)
        window.setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== jobId || j.status !== 'done'))
        }, 3200)
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : `Could not publish ${noun}.`
        patchJob(jobId, { status: 'failed', progress: 1, error: message, message })
      }
    },
    [patchJob],
  )

  const runJob = useCallback(
    async (jobId: string) => {
      if (runningRef.current.has(jobId)) return
      const stored = storeRef.current.get(jobId)
      if (!stored) return
      runningRef.current.add(jobId)
      try {
        if (stored.kind === 'social') {
          await runSocialJob(jobId, stored)
        } else {
          await runListingJob(jobId, stored)
        }
      } finally {
        runningRef.current.delete(jobId)
      }
    },
    [runListingJob, runSocialJob],
  )

  const enqueueSocialPost = useCallback(
    (input: EnqueueSocialPublishInput) => {
      if (input.slides.length === 0) {
        throw new Error('Add a photo or video first.')
      }
      if (input.hostStory && (input.placeLink.kind !== 'accommodation' || input.placeLink.id <= 0)) {
        throw new Error('Link a stay listing for this host story.')
      }

      const jobId = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const tempPostId = -Date.now()
      const slides: PublishSlideSnapshot[] = input.slides.map((slide) => ({
        ...slide,
        queuePreviewUrl: slide.upload.secureUrl || URL.createObjectURL(slide.file),
      }))

      const first = slides[0]
      const mediaUrl = first.queuePreviewUrl
      const needsBake = videoHasBakeableEffects({
        filter: first.filter,
        filterIntensity: first.filterIntensity,
        adjustments: first.adjustments,
        textOverlays: first.textOverlays,
        stickers: first.stickers,
        strokes: first.strokes,
      })

      if (input.postsToDelvers) {
        void qc.cancelQueries({ queryKey: ['delvers-social'] })
        prependOptimisticDelversPost(
          qc,
          buildOptimisticDelversPost({
            tempId: tempPostId,
            body: input.bodyText,
            region: input.region.trim(),
            image: first.mediaKind === 'image' ? mediaUrl : null,
            video: first.mediaKind === 'video' ? mediaUrl : null,
            author: input.author,
            is_delvers: true,
            is_delvers_highlight: input.publishAsHighlight,
            delvers_board: input.delversBoard,
            processing_status: first.mediaKind === 'video' && needsBake ? 'processing' : 'ready',
          }),
        )
      }

      const meta: PublishJob = {
        id: jobId,
        kind: 'social',
        tempPostId,
        status: 'uploading',
        progress: 0,
        message: 'Uploading…',
        postsToDelvers: input.postsToDelvers,
        createdAt: Date.now(),
      }
      storeRef.current.set(jobId, { kind: 'social', meta, slides, input })
      setJobs((prev) => [meta, ...prev.filter((j) => j.status !== 'done')])
      void runJob(jobId)
      return { tempPostId, jobId }
    },
    [qc, runJob],
  )

  const enqueueListingPublish = useCallback(
    (kind: 'journey' | 'event', input: EnqueueJourneyPublishInput) => {
      const noun = kind === 'event' ? 'event' : 'journey'
      const jobId = `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const label = input.title.trim() || (kind === 'event' ? 'Event' : 'Journey')
      const meta: PublishJob = {
        id: jobId,
        kind,
        tempPostId: 0,
        status: 'uploading',
        progress: 0,
        message: `Uploading ${noun}…`,
        postsToDelvers: false,
        createdAt: Date.now(),
        label,
      }
      storeRef.current.set(jobId, { kind, meta, input })
      setJobs((prev) => [meta, ...prev.filter((j) => j.status !== 'done')])
      void runJob(jobId)
      return { jobId }
    },
    [runJob],
  )

  const enqueueJourneyPublish = useCallback(
    (input: EnqueueJourneyPublishInput) => enqueueListingPublish('journey', input),
    [enqueueListingPublish],
  )

  const enqueueEventPublish = useCallback(
    (input: EnqueueEventPublishInput) => enqueueListingPublish('event', input),
    [enqueueListingPublish],
  )

  const dismissJob = useCallback(
    (jobId: string) => {
      const stored = storeRef.current.get(jobId)
      if (stored) {
        if (stored.kind === 'social' && stored.meta.status === 'failed') {
          removeOptimisticPost(qc, stored.meta.tempPostId)
        }
        if (stored.kind === 'social') {
          cleanupPreviews(stored.slides)
        }
        storeRef.current.delete(jobId)
      }
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    },
    [cleanupPreviews, qc],
  )

  const retryJob = useCallback(
    (jobId: string) => {
      const stored = storeRef.current.get(jobId)
      if (!stored || stored.meta.status !== 'failed') return
      if (stored.kind === 'social') {
        const first = stored.slides[0]
        const mediaUrl = first.queuePreviewUrl
        prependOptimisticDelversPost(
          qc,
          buildOptimisticDelversPost({
            tempId: stored.meta.tempPostId,
            body: stored.input.bodyText,
            region: stored.input.region.trim(),
            image: first.mediaKind === 'image' ? mediaUrl : null,
            video: first.mediaKind === 'video' ? mediaUrl : null,
            author: stored.input.author,
            is_delvers: stored.input.postsToDelvers,
            is_delvers_highlight: stored.input.publishAsHighlight,
            delvers_board: stored.input.delversBoard,
            processing_status: 'ready',
          }),
        )
      }
      void runJob(jobId)
    },
    [qc, runJob],
  )

  const value = useMemo(
    () => ({
      jobs,
      enqueueSocialPost,
      enqueueJourneyPublish,
      enqueueEventPublish,
      dismissJob,
      retryJob,
    }),
    [jobs, enqueueSocialPost, enqueueJourneyPublish, enqueueEventPublish, dismissJob, retryJob],
  )

  return (
    <PublishQueueContext.Provider value={value}>
      {children}
      <PublishProgressBar jobs={jobs} onRetry={retryJob} onDismiss={dismissJob} />
    </PublishQueueContext.Provider>
  )
}

export function usePublishQueue(): PublishQueueValue {
  const ctx = useContext(PublishQueueContext)
  if (!ctx) {
    throw new Error('usePublishQueue must be used within PublishQueueProvider')
  }
  return ctx
}

/** Optional hook that returns null outside the provider (for optional UI). */
export function usePublishQueueOptional(): PublishQueueValue | null {
  return useContext(PublishQueueContext)
}

// Re-export types used by callers building slide snapshots.
export type {
  Adjustments,
  CropSettings,
  MediaFilter,
  MediaKind,
  PlaceLink,
  StickerOverlay,
  TextOverlay,
  DrawStroke,
  VideoTrim,
  SlideUploadState,
}
