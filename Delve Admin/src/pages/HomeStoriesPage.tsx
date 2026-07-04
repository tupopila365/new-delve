import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
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

export function HomeStoriesPage() {
  const qc = useQueryClient()
  const [channelId, setChannelId] = useState<string>(HOME_STORY_CHANNELS[0].id)
  const [toast, setToast] = useState('')
  const [sourceType, setSourceType] = useState(HOME_STORY_CHANNELS[0].defaultSource)
  const [targetId, setTargetId] = useState('')
  const [headline, setHeadline] = useState('')
  const [sub, setSub] = useState('')
  const [ctaPath, setCtaPath] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image')
  const [formActive, setFormActive] = useState(true)

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

  useEffect(() => {
    setSourceType(selectedMeta.defaultSource)
    setTargetId('')
    setHeadline('')
    setSub('')
    setCtaPath('')
    setCtaLabel('')
    setMediaUrl('')
    setMediaKind('image')
  }, [channelId, selectedMeta.defaultSource])

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
      setTargetId('')
      setHeadline('')
      setSub('')
      setCtaPath('')
      setCtaLabel('')
      setMediaUrl('')
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
          Editorial slides appear first on Home. With auto-fill on, live host stories, Delvers posts, and featured
          listings fill remaining slots. With auto-fill off, only editorial slides show (stock fallback if empty).
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
          <DelveAdminEmpty message="No editorial slides on this channel yet." />
        ) : (
          <div className="da-stack">
            {orderedSlides.map((slide, index) => (
              <DelveAdminDataRow
                key={slide.id}
                primary={slide.headline || slide.target_label || `${slide.source_type_label} #${slide.target_id || slide.id}`}
                secondary={`${slide.source_type_label}${slide.target_id ? ` · ${slide.target_id}` : ''}${slide.sub ? ` · ${slide.sub}` : ''}${slide.cta_path ? ` · ${slide.cta_path}` : ''}`}
                badge={
                  <DelveAdminStatusBadge
                    status={slide.is_active ? 'Active' : 'Inactive'}
                    variant={slide.is_active ? 'success' : 'neutral'}
                  />
                }
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
            ))}
          </div>
        )}
      </DelveAdminPanel>

      <DelveAdminPanel title="Add editorial slide">
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (isCustom && !mediaUrl.trim()) return
            if (!isCustom && !targetId) return
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
            })
          }}
        >
          <label className="da-field">
            <span>Source</span>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {HOME_STORY_SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {isCustom ? (
            <>
              <label className="da-field">
                <span>Media URL</span>
                <input
                  required
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="da-field">
                <span>Media kind</span>
                <select
                  value={mediaKind}
                  onChange={(e) => setMediaKind(e.target.value as 'image' | 'video')}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </label>
            </>
          ) : (
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
          )}

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
          {!isCustom ? (
            <label className="da-field">
              <span>Media URL override (optional)</span>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Leave blank to use listing/post media"
              />
            </label>
          ) : null}
          <label className="da-field">
            <span className="da-flag">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              Active immediately
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
