import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Star } from 'lucide-react'
import { apiFetch, ApiError, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { MediaLightbox } from '../media/MediaLightbox'
import type { ListingGalleryItem } from '../listing/types'
import { ListingPhotoManager, type ListingPhotoDraft } from '../listing/photos'
import { resolveListingGalleryMedia } from '../listing/photos/listingPhotoUtils'
import type { ProductReview, ProductReviewsPayload } from '../../utils/shopListing'
import './product-reviews.css'

type Props = {
  productId: number | string
}

function reviewInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase().slice(0, 2)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="pr-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          className={n <= Math.round(value) ? 'pr-stars__on' : 'pr-stars__off'}
          fill={n <= Math.round(value) ? 'currentColor' : 'none'}
          aria-hidden
        />
      ))}
    </span>
  )
}

export function ProductReviews({ productId }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [lightbox, setLightbox] = useState<{ items: ListingGalleryItem[]; index: number } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['product-reviews', String(productId)],
    queryFn: () => apiFetch<ProductReviewsPayload>(`/api/shop/products/${productId}/reviews/`, { auth: Boolean(profile) }),
  })

  const reviews = data?.reviews ?? []
  const ratingAvg = data?.rating_avg ?? 0
  const ratingCount = data?.rating_count ?? 0
  const distribution = data?.distribution ?? {}
  const maxDist = Math.max(1, ...Object.values(distribution))

  const openMedia = (media: ProductReview['media'], index: number) => {
    const items: ListingGalleryItem[] = media.map((m) => ({ src: mediaUrl(m.url) ?? m.url, kind: m.kind }))
    setLightbox({ items, index })
  }

  const canWrite = data?.can_review && !data?.has_reviewed && !data?.is_owner

  return (
    <section className="shop-detail__panel pr">
      <div className="pr__head">
        <h2 className="shop-detail__panel-title">Reviews</h2>
        {profile && canWrite ? (
          <button type="button" className="pr__write-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Write a review'}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="pr__muted" role="status">
          Loading reviews…
        </p>
      ) : (
        <>
          {ratingCount > 0 ? (
            <div className="pr__summary">
              <div className="pr__score">
                <span className="pr__score-num">{ratingAvg.toFixed(1)}</span>
                <Stars value={ratingAvg} size={18} />
                <span className="pr__score-count">
                  {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              <div className="pr__bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = distribution[String(star)] ?? 0
                  return (
                    <div key={star} className="pr__bar-row">
                      <span className="pr__bar-label">{star}★</span>
                      <span className="pr__bar-track">
                        <span className="pr__bar-fill" style={{ width: `${(n / maxDist) * 100}%` }} />
                      </span>
                      <span className="pr__bar-count">{n}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="pr__muted">
              {canWrite
                ? 'No reviews yet. Be the first to share what this product is really like.'
                : 'No reviews yet.'}
            </p>
          )}

          {showForm && canWrite ? (
            <ReviewForm
              productId={productId}
              onDone={() => {
                setShowForm(false)
                qc.invalidateQueries({ queryKey: ['product-reviews', String(productId)] })
                qc.invalidateQueries({ queryKey: ['shop-product', String(productId)] })
              }}
            />
          ) : null}

          {!profile ? (
            <p className="pr__muted">
              <Link to="/login" className="pr__link">
                Sign in
              </Link>{' '}
              to leave a review.
            </p>
          ) : data?.has_reviewed ? (
            <p className="pr__muted">Thanks — you already reviewed this product.</p>
          ) : !data?.is_owner && !data?.can_review ? (
            <p className="pr__muted">Only verified buyers can review this product.</p>
          ) : null}

          {reviews.length > 0 ? (
            <ul className="pr__list">
              {reviews.map((review) => (
                <li key={review.id} className="pr__item">
                  <div className="pr__item-head">
                    <span className="pr__avatar" aria-hidden>
                      {review.avatar ? <img src={review.avatar} alt="" /> : reviewInitials(review.name)}
                    </span>
                    <div className="pr__item-meta">
                      <span className="pr__item-name">
                        {review.name}
                        {review.verified_purchase ? <span className="pr__verified">Verified purchase</span> : null}
                      </span>
                      <span className="pr__item-sub">
                        <Stars value={review.rating} />
                        <span className="pr__item-date">{formatDate(review.created_at)}</span>
                      </span>
                    </div>
                  </div>
                  {review.body ? <p className="pr__item-body">{review.body}</p> : null}
                  {review.media.length > 0 ? (
                    <div className="pr__media">
                      {review.media.map((m, i) => (
                        <button
                          key={`${m.url}-${i}`}
                          type="button"
                          className="pr__media-thumb"
                          onClick={() => openMedia(review.media, i)}
                          aria-label="Open review media"
                        >
                          {m.kind === 'video' ? (
                            <>
                              <video src={mediaUrl(m.url) ?? m.url} muted preload="metadata" />
                              <span className="pr__media-play" aria-hidden>
                                <Play size={16} strokeWidth={2.5} fill="currentColor" />
                              </span>
                            </>
                          ) : (
                            <img src={mediaUrl(m.url) ?? m.url} alt="" loading="lazy" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {lightbox ? (
        <MediaLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          label="Review media"
        />
      ) : null}
    </section>
  )
}

function ReviewForm({ productId, onDone }: { productId: number | string; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const activeStar = hover || rating
  const canSubmit = useMemo(() => rating >= 1 && !busy, [rating, busy])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setErr('Please pick a star rating.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const resolved = await resolveListingGalleryMedia(photos, { allowVideoCover: true })
      const media = resolved.gallery.map((m) => ({ url: m.url, kind: m.kind }))
      if (resolved.cover) media.unshift({ url: resolved.cover, kind: resolved.coverKind })
      await apiFetch(`/api/shop/products/${productId}/review/`, {
        method: 'POST',
        body: JSON.stringify({ rating, body: body.trim(), media }),
      })
      onDone()
    } catch (error) {
      setErr(error instanceof ApiError ? String(error.message) : 'Could not submit your review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pr-form" onSubmit={onSubmit}>
      <div className="pr-form__stars" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="pr-form__star"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            <Star
              size={30}
              strokeWidth={2}
              className={n <= activeStar ? 'pr-stars__on' : 'pr-stars__off'}
              fill={n <= activeStar ? 'currentColor' : 'none'}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <label className="pr-form__field">
        <span>Your review</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="How is the quality? Does it match the photos? Would you recommend it?"
          maxLength={2000}
        />
      </label>

      <div className="pr-form__field">
        <span>Add photos or videos (optional)</span>
        <ListingPhotoManager
          photos={photos}
          onChange={setPhotos}
          allowVideoCover
          maxPhotos={8}
          hint="Show the product in real life — buyers trust reviews with real photos and clips."
        />
      </div>

      {err ? <p className="pr-form__error">{err}</p> : null}

      <button type="submit" className="pr__write-btn pr-form__submit" disabled={!canSubmit}>
        {busy ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
