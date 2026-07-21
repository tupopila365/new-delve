import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, ChevronLeft, Clock3, MapPin, MessageCircle, Mountain, Star, Users } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ActivityReviewForm } from '../components/activities/ActivityReviewForm'
import { normalizeReviews } from '../components/GuestReviewCard'
import { ListingReviews } from '../components/listing'
import { MediaLightbox } from '../components/media/MediaLightbox'
import { EmptyState } from '../components/ui'
import { useAccountActionGate } from '../hooks/useAccountActionGate'
import {
  activityGallery,
  activityLocationLine,
  type ActivityListing,
  type ActivityMediaItem,
  type ActivityReviewsPayload,
} from '../utils/activityListing'
import '../components/activities/activities.css'
import '../components/listing/listing-detail.css'

export function ActivityDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const gate = useAccountActionGate()
  const qc = useQueryClient()
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity', id],
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch<ActivityListing>(`/api/activities/listings/${id}/`, { auth: Boolean(profile) }),
  })

  const { data: reviewPayload } = useQuery({
    queryKey: ['activity-reviews', String(id)],
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch<ActivityReviewsPayload>(`/api/activities/listings/${id}/reviews/`, {
        auth: Boolean(profile),
      }),
  })

  const saveMut = useMutation({
    mutationFn: () =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/activities/listings/${id}/save/`, {
        method: 'POST',
      }),
    onSuccess: (result) => {
      qc.setQueryData<ActivityListing>(['activity', id], (prev) =>
        prev ? { ...prev, saved_by_me: result.saved, saves_count: result.saves_count } : prev,
      )
      void qc.invalidateQueries({ queryKey: ['activities'] })
      void qc.invalidateQueries({ queryKey: ['saved-activities'] })
    },
  })

  const gallery = useMemo(() => (data ? activityGallery(data) : []), [data])
  const current: ActivityMediaItem | undefined = gallery[active] ?? gallery[0]
  const location = data ? activityLocationLine(data) : ''
  const reviews = useMemo(() => {
    const rows = (reviewPayload?.reviews ?? []).map((r) => ({
      ...r,
      body: r.body?.trim() ? r.body : 'Rated this activity.',
      place: location,
    }))
    return normalizeReviews(rows)
  }, [reviewPayload?.reviews, location])

  const rating = reviewPayload?.rating_avg ?? data?.rating_avg
  const reviewCount = reviewPayload?.rating_count ?? data?.rating_count ?? 0
  const canReview = Boolean(reviewPayload?.can_review)
  const ratingNum = rating != null ? Number(rating) : 0
  const saved = Boolean(data?.saved_by_me)

  if (isLoading) {
    return (
      <main className="act-detail">
        <p role="status">Loading activity…</p>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="act-detail">
        <EmptyState
          iconElement={<Mountain size={28} strokeWidth={2} aria-hidden />}
          title="Activity not found"
          sub="It may have been removed or is not published yet."
          cta={{ label: 'Browse activities', to: '/activities' }}
        />
      </main>
    )
  }

  const messageHref = `/messages/u/${encodeURIComponent(data.owner_username)}`
  const lightboxItems = gallery.map((m) => ({
    src: m.src,
    kind: m.kind as 'image' | 'video',
    caption: m.caption,
  }))

  const onSave = () => {
    if (!gate('save this activity')) return
    if (saveMut.isPending) return
    saveMut.mutate()
  }

  return (
    <main className="act-detail">
      <Link to="/activities" className="act-detail__back">
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        Activities
      </Link>

      <div className="act-detail__grid">
        <div>
          <div
            className="act-detail__stage"
            role="button"
            tabIndex={0}
            aria-label="Open media full screen"
            onClick={() => setLightbox(active)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setLightbox(active)
              }
            }}
          >
            {current?.kind === 'video' ? (
              <video src={current.src} controls playsInline preload="metadata" />
            ) : current?.src ? (
              <img src={current.src} alt={data.title} />
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="act-detail__thumbs">
              {gallery.map((item, index) => (
                <button
                  key={`${item.src}-${index}`}
                  type="button"
                  className={index === active ? 'is-active' : undefined}
                  onClick={() => setActive(index)}
                  aria-label={`Media ${index + 1}`}
                >
                  {item.kind === 'video' ? (
                    <video src={item.src} muted preload="metadata" />
                  ) : (
                    <img src={item.src} alt="" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="act-detail__kicker">{data.category_label || data.category}</p>
          <h1 className="act-detail__title">{data.title}</h1>
          {data.tagline ? <p className="act-detail__tagline">{data.tagline}</p> : null}

          <div className="act-detail__facts">
            {location ? (
              <span>
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                {location}
              </span>
            ) : null}
            {data.duration_label ? (
              <span>
                <Clock3 size={14} strokeWidth={2.25} aria-hidden />
                {data.duration_label}
              </span>
            ) : null}
            {data.max_group_size ? (
              <span>
                <Users size={14} strokeWidth={2.25} aria-hidden />
                Up to {data.max_group_size}
              </span>
            ) : null}
            {reviewCount > 0 && ratingNum > 0 ? (
              <a href="#reviews" className="act-detail__rating-link">
                <Star size={14} strokeWidth={2.25} fill="currentColor" aria-hidden />
                {ratingNum.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </a>
            ) : null}
          </div>

          <p className="act-detail__price">{data.price_label || data.price_from}</p>
          {data.description ? <p className="act-detail__body">{data.description}</p> : null}

          {data.includes && data.includes.length > 0 ? (
            <>
              <p className="act-detail__kicker" style={{ marginTop: 18 }}>
                Included
              </p>
              <ul className="act-detail__list">
                {data.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}

          {data.meeting_point ? (
            <p className="act-detail__tagline" style={{ marginTop: 14 }}>
              Meet at: {data.meeting_point}
            </p>
          ) : null}

          <p className="act-detail__tagline" style={{ marginTop: 10 }}>
            Operated by {data.owner_display_name || data.owner_username}
          </p>

          <div className="act-detail__actions">
            <Link to={messageHref} className="act-detail__cta">
              <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
              Message to book
            </Link>
            <button
              type="button"
              className={`act-detail__cta act-detail__cta--save${saved ? ' is-saved' : ''}`}
              onClick={onSave}
              disabled={saveMut.isPending}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save activity'}
            >
              <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
              {saved ? 'Saved' : 'Save'}
            </button>
            <Link to="/activities" className="act-detail__cta act-detail__cta--ghost">
              More activities
            </Link>
          </div>
        </div>
      </div>

      <div id="reviews">
        {canReview ? (
          <section className="act-detail__engage">
            <ActivityReviewForm listingId={data.id} />
          </section>
        ) : null}

        <ListingReviews
          title="Guest reviews"
          listingType="activity"
          listingId={data.id}
          reviews={reviews}
          rating={rating}
          count={reviewCount}
          emptyMessage="Reviews will appear here after travellers share feedback."
          className="act-detail__reviews"
        />
      </div>

      {lightbox != null ? (
        <MediaLightbox items={lightboxItems} index={lightbox} onClose={() => setLightbox(null)} onChange={setLightbox} />
      ) : null}
    </main>
  )
}
