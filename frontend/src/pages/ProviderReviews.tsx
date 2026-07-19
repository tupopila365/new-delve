import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import type { ListingCategory } from '../data/providerData'
import {
  reviewStarBreakdown,
  useProviderReviewReply,
  useProviderReviews,
  type ProviderReviewRow,
} from '../hooks/useProviderReviews'
import { categoriesForBusinessTypes, reviewListingChips } from '../utils/providerCategories'

const RATING_FILTERS = [
  { id: 'All', label: 'All' },
  { id: '5 stars', label: '5 stars' },
  { id: '4 stars', label: '4 stars' },
  { id: '3 stars and below', label: '3 stars and below' },
  { id: 'Needs response', label: 'Needs response' },
]

const LISTING_FILTER_MAP: Record<string, string> = {
  Stays: 'Stay',
  Guides: 'Guide',
  'Food & drink': 'Food',
  Transport: 'Transport',
  Shop: 'Shop',
}

export function ProviderReviews() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const listingChips = useMemo(() => reviewListingChips(businessTypes), [businessTypes])

  const { data: allReviews = [], isLoading } = useProviderReviews()

  const scopedReviews = useMemo(() => {
    if (allowedCategories.length === 0) return allReviews
    return allReviews.filter((r) => allowedCategories.includes(r.category as ListingCategory))
  }, [allReviews, allowedCategories])

  const breakdown = useMemo(() => reviewStarBreakdown(scopedReviews), [scopedReviews])

  const [filter, setFilter] = useState('All')
  const [listingFilter, setListingFilter] = useState('All listings')

  const filtered = useMemo(() => {
    let rows = scopedReviews
    if (filter === '5 stars') rows = rows.filter((r) => r.rating >= 4.9)
    if (filter === '4 stars') rows = rows.filter((r) => r.rating >= 4 && r.rating < 5)
    if (filter === '3 stars and below') rows = rows.filter((r) => r.rating < 4)
    if (filter === 'Needs response') rows = rows.filter((r) => r.needsReply)
    if (listingFilter !== 'All listings') {
      const cat = LISTING_FILTER_MAP[listingFilter]
      if (cat) rows = rows.filter((r) => r.category === cat)
    }
    return rows
  }, [scopedReviews, filter, listingFilter])

  const needsReply = scopedReviews.filter((r) => r.needsReply)
  const avgRating =
    scopedReviews.length > 0
      ? (scopedReviews.reduce((s, r) => s + r.rating, 0) / scopedReviews.length).toFixed(1)
      : '—'
  const responseRate =
    scopedReviews.length > 0
      ? Math.round(((scopedReviews.length - needsReply.length) / scopedReviews.length) * 100)
      : 0

  if (isLoading) {
    return (
      <ProviderUiPage>
        <ProviderUiHeader title="Reviews" subtitle="Guest ratings and written feedback for your listings." />
        <ListSkeleton count={4} variant="row" />
      </ProviderUiPage>
    )
  }

  if (scopedReviews.length === 0) {
    return (
      <ProviderUiPage>
        <ProviderUiHeader title="Reviews" subtitle="Guest ratings and written feedback for your listings." />
        <ProviderUiEmpty title="No reviews yet" message="Reviews will appear here after guests complete bookings or visits." />
      </ProviderUiPage>
    )
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader title="Reviews" subtitle="Understand guest feedback and respond to build trust." />

      <ProviderUiStats
        columns={4}
        stats={[
          { value: avgRating, label: 'Average rating', accent: true },
          { value: scopedReviews.length, label: 'Total reviews' },
          { value: `${responseRate}%`, label: 'Response rate' },
          { value: needsReply.length, label: 'Need response', accent: needsReply.length > 0 },
        ]}
      />

      <ProviderUiChips chips={RATING_FILTERS} active={filter} onChange={setFilter} ariaLabel="Filter reviews" />

      {listingChips.length > 1 ? (
        <ProviderUiChips chips={listingChips} active={listingFilter} onChange={setListingFilter} ariaLabel="Filter by listing" />
      ) : null}

      <section className="prov-ui__card">
        <h2 className="prov-ui__section-title">Rating breakdown</h2>
        <ul className="prov-ui-breakdown">
          {breakdown.map((b) => (
            <li key={b.stars}>
              <span className="prov-ui-breakdown__star">
                {b.stars} <Star size={12} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="prov-ui-breakdown__bar" aria-hidden>
                <i style={{ width: `${b.pct}%` }} />
              </div>
              <span>{b.pct}%</span>
            </li>
          ))}
        </ul>
      </section>

      {needsReply.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Reviews needing response ({needsReply.length})</h2>
          <div className="prov-ui__list">
            {needsReply.map((r) => (
              <ReviewCard key={r.id} review={r} urgent />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="prov-ui__section-title">
          All reviews {filter !== 'All' || listingFilter !== 'All listings' ? `(${filtered.length})` : ''}
        </h2>
        {filtered.length === 0 ? (
          <ProviderUiEmpty title="No reviews match your filters" />
        ) : (
          <div className="prov-ui__list">
            {filtered.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>
    </ProviderUiPage>
  )
}

function listingPath(category: ListingCategory): string {
  if (category === 'Stay') return '/provider/stays'
  if (category === 'Guide') return '/provider/guides'
  if (category === 'Food') return '/provider/food'
  if (category === 'Transport') return '/provider/transport'
  if (category === 'Shop') return '/provider/shop'
  return '/provider/listings'
}

function ReviewCard({ review, urgent }: { review: ProviderReviewRow; urgent?: boolean }) {
  const replyMutation = useProviderReviewReply()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(review.response ?? '')
  const dateLabel = review.date || 'Recent'
  const busy = replyMutation.isPending

  const save = async () => {
    try {
      await replyMutation.mutateAsync({
        source: review.source,
        reviewId: review.reviewId,
        reply: draft,
      })
      setEditing(false)
    } catch {
      /* mutation error surfaces via isError if needed */
    }
  }

  return (
    <article className={`prov-ui-review${urgent ? ' prov-ui-review--urgent' : ''}`}>
      <div className="prov-ui-review__head">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {review.guest.charAt(0)}
        </span>
        <div>
          <strong>{review.guest}</strong>
          <span>
            {review.listing} · {review.category} · {dateLabel}
          </span>
        </div>
        <span className="prov-ui-review__rating">
          <Star size={14} strokeWidth={2.25} aria-hidden /> {review.rating}
        </span>
      </div>
      <p className="prov-ui-review__body">{review.body}</p>
      {review.response && !editing ? (
        <p className="prov-ui-review__response">
          <strong>Your response:</strong> {review.response}
        </p>
      ) : null}
      {editing ? (
        <div className="prov-ui-review__reply">
          <label className="prov-ui-review__reply-label" htmlFor={`reply-${review.id}`}>
            Your response
          </label>
          <textarea
            id={`reply-${review.id}`}
            className="prov-ui-review__reply-input"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Thank the guest and address their feedback…"
            disabled={busy}
          />
          {replyMutation.isError ? (
            <p className="prov-ui-review__reply-error" role="alert">
              Couldn’t save your response. Try again.
            </p>
          ) : null}
          <div className="prov-ui__booking-actions">
            <button type="button" className="prov-ui__btn" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save response'}
            </button>
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--ghost"
              disabled={busy}
              onClick={() => {
                setDraft(review.response ?? '')
                setEditing(false)
                replyMutation.reset()
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prov-ui__booking-actions" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="prov-ui__btn"
            onClick={() => {
              setDraft(review.response ?? '')
              setEditing(true)
            }}
          >
            {review.response ? 'Edit response' : 'Respond'}
          </button>
          <Link to={listingPath(review.category)} className="prov-ui__btn prov-ui__btn--ghost">
            View listing
          </Link>
        </div>
      )}
    </article>
  )
}
