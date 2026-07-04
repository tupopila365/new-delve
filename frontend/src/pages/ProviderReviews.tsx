import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import { categoriesForBusinessTypes, reviewListingChips } from '../utils/providerCategories'
import type { ListingCategory } from '../data/providerData'

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

const ALL_REVIEWS: Review[] = [
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
}

export function ProviderReviews() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const listingChips = useMemo(() => reviewListingChips(businessTypes), [businessTypes])

  const scopedReviews = useMemo(() => {
    if (allowedCategories.length === 0) return ALL_REVIEWS
    return ALL_REVIEWS.filter((r) => allowedCategories.includes(r.category as ListingCategory))
  }, [allowedCategories])

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
          {BREAKDOWN.map((b) => (
            <li key={b.stars}>
              <span>{b.stars} ★</span>
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

function ReviewCard({ review, urgent }: { review: Review; urgent?: boolean }) {
  return (
    <article className={`prov-ui-review${urgent ? ' prov-ui-review--urgent' : ''}`}>
      <div className="prov-ui-review__head">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {review.guest.charAt(0)}
        </span>
        <div>
          <strong>{review.guest}</strong>
          <span>
            {review.listing} · {review.category} · {review.date}
          </span>
        </div>
        <span className="prov-ui-review__rating">★ {review.rating}</span>
      </div>
      <p className="prov-ui-review__body">{review.body}</p>
      {review.response ? (
        <p className="prov-ui-review__response">
          <strong>Your response:</strong> {review.response}
        </p>
      ) : null}
      <div className="prov-ui__booking-actions" style={{ marginTop: 10 }}>
        <Link to="/provider/listings" className="prov-ui__btn prov-ui__btn--ghost">
          View listing
        </Link>
      </div>
    </article>
  )
}
