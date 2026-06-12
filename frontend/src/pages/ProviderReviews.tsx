import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProviderPageHeader, ProviderStatGrid } from '../components/provider'
import { EmptyState } from '../components/ui'

type Review = {
  id: number
  guest: string
  listing: string
  category: string
  rating: number
  date: string
  body: string
  needsReply: boolean
  response?: string
}

const REVIEWS: Review[] = [
  { id: 1, guest: 'Anna K.', listing: 'Freesia Hotel', category: 'Stay', rating: 5, date: '2026-04-28', body: 'Spotless room and great breakfast.', needsReply: true },
  { id: 2, guest: 'Tobias L.', listing: 'Coastal Guesthouse', category: 'Stay', rating: 4.8, date: '2026-04-20', body: 'Loved the dune views from the terrace.', needsReply: false, response: 'Thank you — we are glad you enjoyed the terrace!' },
  { id: 3, guest: 'Mila K.', listing: 'Desert sunrise tour', category: 'Guide', rating: 5, date: '2026-04-15', body: 'Kaoko knew every photo stop on the route.', needsReply: true },
  { id: 4, guest: 'Priya N.', listing: 'Oryx Grill House', category: 'Food', rating: 4.7, date: '2026-04-10', body: 'Amazing local flavours. Will definitely be back.', needsReply: false },
]

const BREAKDOWN = [
  { stars: 5, pct: 72 },
  { stars: 4, pct: 18 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 3 },
  { stars: 1, pct: 1 },
]

const FILTERS = ['All', '5 stars', '4 stars', '3 stars and below', 'Needs response'] as const
const LISTING_FILTERS = ['All listings', 'Stays', 'Guides', 'Food & drink', 'Transport'] as const

export function ProviderReviews() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [listingFilter, setListingFilter] = useState<(typeof LISTING_FILTERS)[number]>('All listings')

  const filtered = useMemo(() => {
    let rows = REVIEWS
    if (filter === '5 stars') rows = rows.filter((r) => r.rating >= 4.9)
    if (filter === '4 stars') rows = rows.filter((r) => r.rating >= 4 && r.rating < 5)
    if (filter === '3 stars and below') rows = rows.filter((r) => r.rating < 4)
    if (filter === 'Needs response') rows = rows.filter((r) => r.needsReply)
    if (listingFilter === 'Stays') rows = rows.filter((r) => r.category === 'Stay')
    if (listingFilter === 'Guides') rows = rows.filter((r) => r.category === 'Guide')
    if (listingFilter === 'Food & drink') rows = rows.filter((r) => r.category === 'Food')
    if (listingFilter === 'Transport') rows = rows.filter((r) => r.category === 'Transport')
    return rows
  }, [filter, listingFilter])

  const needsReply = REVIEWS.filter((r) => r.needsReply)
  const avgRating = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1)
  const responseRate = Math.round(((REVIEWS.length - needsReply.length) / REVIEWS.length) * 100)

  if (REVIEWS.length === 0) {
    return (
      <div className="prov-page">
        <ProviderPageHeader title="Reviews" subtitle="Guest ratings and written feedback across all your listings." />
        <EmptyState icon="★" title="No reviews yet" sub="Reviews will appear here after guests complete bookings or visits." />
      </div>
    )
  }

  return (
    <div className="prov-page">
      <ProviderPageHeader title="Reviews" subtitle="Understand guest feedback and respond to build trust." />

      <ProviderStatGrid
        stats={[
          { value: avgRating, label: 'Average rating', accent: true },
          { value: REVIEWS.length, label: 'Total reviews' },
          { value: `${responseRate}%`, label: 'Response rate' },
          { value: needsReply.length, label: 'Need response', accent: needsReply.length > 0 },
        ]}
      />

      <div className="prov-toolbar__chips prov-toolbar__chips--scroll prov-toolbar__chips--solo" role="group" aria-label="Filter reviews">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`prov-chip${filter === f ? ' prov-chip--active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="prov-toolbar__chips prov-toolbar__chips--scroll" role="group" aria-label="Filter by listing">
        {LISTING_FILTERS.map((f) => (
          <button key={f} type="button" className={`prov-chip prov-chip--sub${listingFilter === f ? ' prov-chip--active' : ''}`} onClick={() => setListingFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <section className="prov-overview-card">
        <h2>Rating breakdown</h2>
        <ul className="prov-rating-breakdown">
          {BREAKDOWN.map((b) => (
            <li key={b.stars}>
              <span>{b.stars} ★</span>
              <div className="prov-health-bar" aria-hidden>
                <i style={{ width: `${b.pct}%` }} />
              </div>
              <span>{b.pct}%</span>
            </li>
          ))}
        </ul>
      </section>

      {needsReply.length > 0 ? (
        <section className="prov-overview-card">
          <h2>Reviews needing response ({needsReply.length})</h2>
          <div className="prov-reviews">
            {needsReply.map((r) => (
              <ReviewCard key={r.id} review={r} urgent />
            ))}
          </div>
        </section>
      ) : null}

      <section className="prov-overview-card">
        <h2>All reviews {filter !== 'All' || listingFilter !== 'All listings' ? `(${filtered.length})` : ''}</h2>
        {filtered.length === 0 ? (
          <EmptyState compact icon="★" title="No reviews match your filters" />
        ) : (
          <div className="prov-reviews">
            {filtered.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ReviewCard({ review, urgent }: { review: Review; urgent?: boolean }) {
  return (
    <article className={`prov-reviews__card${urgent ? ' prov-reviews__card--urgent' : ''}`}>
      <div className="prov-reviews__head">
        <span className="prov-reviews__avatar" aria-hidden>
          {review.guest.charAt(0)}
        </span>
        <div>
          <strong>{review.guest}</strong>
          <span>
            {review.listing} · {review.category} · {review.date}
          </span>
        </div>
        <span className="prov-reviews__rating">★ {review.rating}</span>
      </div>
      <p className="prov-reviews__body">{review.body}</p>
      {review.response ? (
        <p className="prov-reviews__response">
          <strong>Your response:</strong> {review.response}
        </p>
      ) : null}
      <div className="prov-reviews__actions">
        <button type="button" className="prov-reviews__reply" title="Reply coming soon">
          {review.needsReply ? 'Reply' : 'Edit reply'}
        </button>
        <Link to="/provider/listings" className="btn btn-ghost btn--sm">
          View listing
        </Link>
      </div>
    </article>
  )
}
