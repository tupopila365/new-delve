import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { mediaKindFromFile, uploadAdminStoryMedia, type MediaKind } from '../api/mediaUpload'
import type { AdminListing, HomeStoryChannel, HomeStorySlide } from '../api/types'
import {
  HOME_STORY_CHANNELS,
  HOME_STORY_SOURCE_TYPES,
  MAX_HOME_STORY_SLIDES,
} from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatusBadge,
} from '../components'

type StorySourceType = (typeof HOME_STORY_SOURCE_TYPES)[number]['value']

const MEDIA_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** Local datetime-local value from a Date. */
function toLocalDatetimeValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function isoFromLocalInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatScheduleRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return 'Always on'
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  if (startsAt && endsAt) return `${fmt(startsAt)} → ${fmt(endsAt)}`
  if (startsAt) return `From ${fmt(startsAt)}`
  return `Until ${fmt(endsAt!)}`
}

function slideWindowStatus(
  slide: HomeStorySlide,
  now = Date.now(),
): { label: string; variant: 'success' | 'warning' | 'neutral' | 'danger' } {
  if (!slide.is_active) return { label: 'Inactive', variant: 'neutral' }
  const start = slide.starts_at ? new Date(slide.starts_at).getTime() : null
  const end = slide.ends_at ? new Date(slide.ends_at).getTime() : null
  if (start != null && now < start) return { label: 'Scheduled', variant: 'warning' }
  if (end != null && now >= end) return { label: 'Expired', variant: 'danger' }
  if (start != null || end != null) return { label: 'Live window', variant: 'success' }
  return { label: 'Active', variant: 'success' }
}

function twentyFourHourWindow() {
  const start = new Date()
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return {
    startsLocal: toLocalDatetimeValue(start),
    endsLocal: toLocalDatetimeValue(end),
  }
}

function looksLikeVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /\/video\/(?:upload\/)?/i.test(url)
}

export function HomeStoriesPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localPreviewRef = useRef<string | null>(null)
  const [channelId, setChannelId] = useState<string>(HOME_STORY_CHANNELS[0].id)
  const [toast, setToast] = useState('')
  const [sourceType, setSourceType] = useState<StorySourceType>(HOME_STORY_CHANNELS[0].defaultSource)
  const [targetId, setTargetId] = useState('')
  const [headline, setHeadline] = useState('')
  const [sub, setSub] = useState('')
  const [ctaPath, setCtaPath] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [endsAtLocal, setEndsAtLocal] = useState('')

  const selectedMeta = HOME_STORY_CHANNELS.find((c) => c.id === channelId) ?? HOME_STORY_CHANNELS[0]
  const isCustom = sourceType === 'custom'

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['home-story-channels'],
    queryFn: () => apiFetch<HomeStoryChannel[]>('/api/accounts/admin/home-story-channels/'),
  })

  const {
    data: slides = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['home-story-slides', channelId],
    queryFn: () =>
      apiFetch<HomeStorySlide[]>(
        `/api/accounts/admin/home-story-slides/?channel=${encodeURIComponent(channelId)}`,
      ),
  })

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => apiFetch<AdminListing[]>('/api/accounts/admin/listings/'),
  })

  const channelConfig = channels.find((c) => c.channel_id === channelId)
  const autoFill = channelConfig?.auto_fill ?? true

  const clearLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current)
      localPreviewRef.current = null
    }
  }

  const resetFormFields = () => {
    setTargetId('')
    setHeadline('')
    setSub('')
    setCtaPath('')
    setCtaLabel('')
    setMediaUrl('')
    setMediaKind('image')
    clearLocalPreview()
    setMediaPreview(null)
    setUploadProgress(null)
    setStartsAtLocal('')
    setEndsAtLocal('')
  }

  useEffect(() => {
    setSourceType(selectedMeta.defaultSource)
    setTargetId('')
    setHeadline('')
    setSub('')
    setCtaPath('')
    setCtaLabel('')
    setMediaUrl('')
    setMediaKind('image')
    clearLocalPreview()
    setMediaPreview(null)
    setUploadProgress(null)
    setStartsAtLocal('')
    setEndsAtLocal('')
  }, [channelId, selectedMeta.defaultSource])

  useEffect(() => () => clearLocalPreview(), [])

  const sourceMeta = HOME_STORY_SOURCE_TYPES.find((s) => s.value === sourceType)
  const listingOptions = useMemo(() => {
    if (!sourceMeta || isCustom) return []
    const types = new Set(sourceMeta.listingTypes)
    return listings.filter((l) => types.has(l.listing_type) && l.status === 'published')
  }, [listings, sourceMeta, isCustom])

  const orderedSlides = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [slides],
  )
  const activeCount = orderedSlides.filter((s) => s.is_active).length
  const previewSrc = mediaPreview || mediaUrl.trim() || null

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['home-story-slides'] })
    void qc.invalidateQueries({ queryKey: ['home-story-channels'] })
    void qc.invalidateQueries({ queryKey: ['activity'] })
  }

  const autoFillMut = useMutation({
    mutationFn: (next: boolean) =>
      apiFetch<HomeStoryChannel>(`/api/accounts/admin/home-story-channels/${channelId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ auto_fill: next }),
      }),
    onSuccess: (data) => {
      setToast(data.auto_fill ? 'Auto-fill turned on.' : 'Auto-fill turned off for this channel.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not update channel.'),
  })

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<HomeStorySlide>('/api/accounts/admin/home-story-slides/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Editorial slide added.')
      resetFormFields()
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not create slide.'),
  })

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiFetch<HomeStorySlide>(`/api/accounts/admin/home-story-slides/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setToast('Slide updated.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not update slide.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/accounts/admin/home-story-slides/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      setToast('Slide removed.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not delete slide.'),
  })

  const reorderMut = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiFetch<HomeStorySlide[]>('/api/accounts/admin/home-story-slides/reorder/', {
        method: 'POST',
        body: JSON.stringify({ channel_id: channelId, ordered_ids: orderedIds }),
      }),
    onSuccess: () => {
      setToast('Order saved.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not reorder slides.'),
  })

  const moveSlide = (id: number, direction: -1 | 1) => {
    const ids = orderedSlides.map((s) => s.id)
    const idx = ids.indexOf(id)
    const swap = idx + direction
    if (idx < 0 || swap < 0 || swap >= ids.length) return
    ;[ids[idx], ids[swap]] = [ids[swap], ids[idx]]
    reorderMut.mutate(ids)
  }

  const applyTwentyFourHours = () => {
    const { startsLocal, endsLocal } = twentyFourHourWindow()
    setStartsAtLocal(startsLocal)
    setEndsAtLocal(endsLocal)
  }

  const clearSchedule = () => {
    setStartsAtLocal('')
    setEndsAtLocal('')
  }

  const runSlideForTwentyFourHours = (slide: HomeStorySlide) => {
    const start = new Date()
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    patchMut.mutate({
      id: slide.id,
      body: {
        is_active: true,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      },
    })
  }

  const clearMedia = () => {
    clearLocalPreview()
    setMediaPreview(null)
    setMediaUrl('')
    setMediaKind('image')
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onPickMedia = async (file: File | null) => {
    if (!file) return
    const kind = mediaKindFromFile(file)
    clearLocalPreview()
    const localUrl = URL.createObjectURL(file)
    localPreviewRef.current = localUrl
    setMediaPreview(localUrl)
    setMediaKind(kind)
    setUploadBusy(true)
    setUploadProgress(0)
    setToast('')
    try {
      const result = await uploadAdminStoryMedia(file, (ratio) => setUploadProgress(ratio))
      clearLocalPreview()
      setMediaPreview(null)
      setMediaUrl(result.url)
      setMediaKind(result.kind)
      setToast(result.kind === 'video' ? 'Video uploaded.' : 'Image uploaded.')
    } catch (err) {
      clearLocalPreview()
      setMediaPreview(null)
      setToast(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadBusy(false)
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading || channelsLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Home stories" subtitle="Curate highlight rings on the traveller home page." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Home stories" subtitle="Curate highlight rings on the traveller home page." />
        <DelveAdminError message="Could not load story slides." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Home stories"
        subtitle={`${activeCount} active of ${MAX_HOME_STORY_SLIDES} max · editorial first, then auto-fill`}
        action={
          <>
            <Link to="/admin/home-pins" className="da-btn da-btn--ghost">
              Home pins
            </Link>
            <Link to="/admin/promotions" className="da-btn da-btn--ghost">
              Featured partners
            </Link>
          </>
        }
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      <DelveAdminFilterBar>
        {HOME_STORY_CHANNELS.map((c) => (
          <DelveAdminFilterChip
            key={c.id}
            label={c.label}
            active={channelId === c.id}
            onClick={() => setChannelId(c.id)}
          />
        ))}
      </DelveAdminFilterBar>

      <DelveAdminPanel title={`${selectedMeta.label} channel`}>
        <p className="da-panel__hint">
          Editorial slides appear first on Home. Upload image or video the same way as Delvers (Cloudinary when
          configured). Schedule a start/end or use Live 24 hours. With auto-fill on, live content fills remaining
          slots; empty channels stay hidden.
        </p>
        <label className="da-field">
          <span className="da-flag">
            <input
              type="checkbox"
              checked={autoFill}
              disabled={autoFillMut.isPending}
              onChange={(e) => autoFillMut.mutate(e.target.checked)}
            />
            Auto-fill from live content
          </span>
        </label>
      </DelveAdminPanel>

      <DelveAdminPanel title="Editorial slides">
        {orderedSlides.length === 0 ? (
          <DelveAdminEmpty title="No slides" message="No editorial slides on this channel yet." />
        ) : (
          <div className="da-stack">
            {orderedSlides.map((slide, index) => {
              const status = slideWindowStatus(slide)
              return (
                <DelveAdminDataRow
                  key={slide.id}
                  primary={
                    slide.headline ||
                    slide.target_label ||
                    `${slide.source_type_label} #${slide.target_id || slide.id}`
                  }
                  secondary={`${slide.source_type_label}${slide.target_id ? ` · ${slide.target_id}` : ''}${slide.sub ? ` · ${slide.sub}` : ''} · ${slide.media_kind} · ${formatScheduleRange(slide.starts_at, slide.ends_at)}${slide.cta_path ? ` · ${slide.cta_path}` : ''}`}
                  badge={<DelveAdminStatusBadge status={status.label} variant={status.variant} />}
                  actions={
                    <>
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={index === 0 || reorderMut.isPending}
                        onClick={() => moveSlide(slide.id, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={index === orderedSlides.length - 1 || reorderMut.isPending}
                        onClick={() => moveSlide(slide.id, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={patchMut.isPending}
                        title="Set window to now → +24 hours and activate"
                        onClick={() => runSlideForTwentyFourHours(slide)}
                      >
                        Live 24h
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={patchMut.isPending}
                        onClick={() =>
                          patchMut.mutate({
                            id: slide.id,
                            body: { starts_at: null, ends_at: null },
                          })
                        }
                      >
                        Clear schedule
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={patchMut.isPending}
                        onClick={() =>
                          patchMut.mutate({ id: slide.id, body: { is_active: !slide.is_active } })
                        }
                      >
                        {slide.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--danger"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                          if (window.confirm('Remove this editorial slide?')) {
                            deleteMut.mutate(slide.id)
                          }
                        }}
                      >
                        Remove
                      </button>
                    </>
                  }
                />
              )
            })}
          </div>
        )}
      </DelveAdminPanel>

      <DelveAdminPanel title="Add editorial slide">
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (uploadBusy) {
              setToast('Wait for the upload to finish.')
              return
            }
            if (isCustom && !mediaUrl.trim()) {
              setToast('Upload a photo or video for custom slides.')
              return
            }
            if (!isCustom && !targetId) return
            const startsIso = isoFromLocalInput(startsAtLocal)
            const endsIso = isoFromLocalInput(endsAtLocal)
            if (startsAtLocal.trim() && !startsIso) {
              setToast('Invalid start time.')
              return
            }
            if (endsAtLocal.trim() && !endsIso) {
              setToast('Invalid end time.')
              return
            }
            if (startsIso && endsIso && new Date(endsIso) <= new Date(startsIso)) {
              setToast('End time must be after start time.')
              return
            }
            const listing = listingOptions.find((l) => String(l.listing_id) === targetId)
            createMut.mutate({
              channel_id: channelId,
              source_type: sourceType,
              target_id: isCustom ? '' : targetId,
              target_label: listing?.title ?? '',
              headline: headline.trim(),
              sub: sub.trim(),
              cta_path: ctaPath.trim(),
              cta_label: ctaLabel.trim(),
              media_url: mediaUrl.trim(),
              media_kind: mediaKind,
              is_active: formActive,
              starts_at: startsIso,
              ends_at: endsIso,
            })
          }}
        >
          <label className="da-field">
            <span>Source</span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as StorySourceType)}
            >
              {HOME_STORY_SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {!isCustom ? (
            <label className="da-field">
              <span>Listing / post</span>
              <select required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Select…</option>
                {listingOptions.map((l) => (
                  <option key={l.id} value={String(l.listing_id)}>
                    {l.title} (#{l.listing_id})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="da-field">
            <span>{isCustom ? 'Media (required)' : 'Media override (optional)'}</span>
            <p className="da-panel__hint" style={{ margin: '0.35rem 0 0.65rem' }}>
              Same pipeline as Delvers: pick a photo or short video — uploads go to Cloudinary when available,
              otherwise through the highlight upload API.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={MEDIA_ACCEPT}
              className="sr-only"
              id="home-story-media-upload"
              disabled={uploadBusy || createMut.isPending}
              onChange={(e) => void onPickMedia(e.target.files?.[0] ?? null)}
            />
            <div className="da-field-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <label
                htmlFor="home-story-media-upload"
                className="da-btn da-btn--ghost"
                style={{ cursor: uploadBusy ? 'wait' : 'pointer' }}
              >
                {uploadBusy ? 'Uploading…' : previewSrc ? 'Replace media' : 'Upload photo or video'}
              </label>
              {previewSrc || mediaUrl ? (
                <button type="button" className="da-btn da-btn--ghost" disabled={uploadBusy} onClick={clearMedia}>
                  Clear media
                </button>
              ) : null}
            </div>
            {uploadProgress != null ? (
              <div className="da-upload-progress" aria-label="Upload progress">
                <div className="da-upload-progress__bar" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
                <span className="da-upload-progress__label">{Math.round(uploadProgress * 100)}%</span>
              </div>
            ) : null}
            {previewSrc ? (
              <div className="da-media-preview">
                {mediaKind === 'video' || looksLikeVideoUrl(previewSrc) ? (
                  <video src={previewSrc} controls playsInline muted preload="metadata" />
                ) : (
                  <img src={previewSrc} alt="" />
                )}
                <p className="da-panel__hint">{mediaKind === 'video' ? 'Video' : 'Image'} · ready for this slide</p>
              </div>
            ) : null}
          </div>

          <label className="da-field">
            <span>Headline (optional override)</span>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} />
          </label>
          <label className="da-field">
            <span>Subtext (optional)</span>
            <input value={sub} onChange={(e) => setSub(e.target.value)} maxLength={255} />
          </label>
          <label className="da-field">
            <span>CTA path (optional)</span>
            <input
              value={ctaPath}
              onChange={(e) => setCtaPath(e.target.value)}
              placeholder="/accommodation/3"
              maxLength={255}
            />
          </label>
          <label className="da-field">
            <span>CTA label (optional)</span>
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={80} />
          </label>

          <fieldset className="da-field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="da-panel__hint" style={{ padding: 0, marginBottom: '0.5rem' }}>
              Visibility window (optional — leave blank for always on)
            </legend>
            <div className="da-field-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button type="button" className="da-btn da-btn--ghost" onClick={applyTwentyFourHours}>
                Live 24 hours
              </button>
              <button
                type="button"
                className="da-btn da-btn--ghost"
                onClick={clearSchedule}
                disabled={!startsAtLocal && !endsAtLocal}
              >
                Clear window
              </button>
            </div>
            <div className="da-field-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <label className="da-field" style={{ flex: '1 1 12rem' }}>
                <span>Starts</span>
                <input
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={(e) => setStartsAtLocal(e.target.value)}
                />
              </label>
              <label className="da-field" style={{ flex: '1 1 12rem' }}>
                <span>Ends</span>
                <input
                  type="datetime-local"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <label className="da-field">
            <span className="da-flag">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              Mark active
            </span>
          </label>
          {formActive && activeCount >= MAX_HOME_STORY_SLIDES ? (
            <p className="da-panel__hint">
              This channel already has {MAX_HOME_STORY_SLIDES} active slides. Deactivate one first, or add as inactive.
            </p>
          ) : null}
          <div className="da-field-row">
            <button
              type="submit"
              className="da-btn da-btn--primary"
              disabled={
                createMut.isPending ||
                uploadBusy ||
                (isCustom ? !mediaUrl.trim() : !targetId) ||
                (formActive && activeCount >= MAX_HOME_STORY_SLIDES)
              }
            >
              {createMut.isPending ? 'Adding…' : 'Add slide'}
            </button>
          </div>
        </form>
      </DelveAdminPanel>
    </div>
  )
}
