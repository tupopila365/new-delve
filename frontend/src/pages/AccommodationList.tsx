import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type AccListing = {
  id: number
  title: string
  region: string
  city?: string | null
  price_per_night: string
  max_guests?: number | null
  bedrooms?: number | null
  cover_image: string | null
  property_type?: string | null
  pet_friendly?: boolean
  wifi?: boolean
  pool?: boolean
  parking?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg?: string | null
  rating_count?: number | null
  likes_count?: number
  liked_by_me?: boolean
}

const PROPERTY_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'guesthouse', label: 'Guest house', emoji: '🏡' },
  { value: 'apartment', label: 'Apartment', emoji: '🏢' },
  { value: 'lodge', label: 'Lodge', emoji: '🌿' },
  { value: 'hostel', label: 'Hostel', emoji: '🛏' },
  { value: 'villa', label: 'Villa', emoji: '🌴' },
  { value: 'resort', label: 'Resort', emoji: '🏖' },
  { value: 'bed_and_breakfast', label: 'B&B', emoji: '☕' },
  { value: 'camping_glamping', label: 'Camping', emoji: '⛺' },
]

const PROPERTY_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  guesthouse: 'Guest house',
  apartment: 'Apartment',
  lodge: 'Lodge',
  hostel: 'Hostel',
  villa: 'Villa',
  resort: 'Resort',
  bed_and_breakfast: 'B&B',
  camping_glamping: 'Camping',
  other: 'Other',
}

function propLabel(v: string | null | undefined) {
  if (!v) return null
  return PROPERTY_LABELS[v] ?? v
}

function stayEmoji(a: AccListing) {
  const t = (a.property_type || '').toLowerCase()
  return PROPERTY_TYPES.find((x) => x.value === t)?.emoji ?? '🏨'
}

export function AccommodationList() {
  const [propType, setPropType] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [minGuests, setMinGuests] = useState(1)
  const [amenityWifi, setAmenityWifi] = useState(false)
  const [amenityPool, setAmenityPool] = useState(false)
  const [amenityParking, setAmenityParking] = useState(false)
  const [amenityKitchen, setAmenityKitchen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (propType) p.set('property_type', propType)
    if (minPrice) p.set('min_price', minPrice)
    if (maxPrice) p.set('max_price', maxPrice)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [propType, minPrice, maxPrice, search])

  const { data, isLoading } = useQuery({
    queryKey: ['accommodation', qs],
    queryFn: () => apiFetch<AccListing[]>(`/api/accommodation/listings/${qs}`),
  })

  const likeMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/accommodation/listings/${listingId}/like/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accommodation'] })
    },
  })

  const onToggleLike = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profile) {
      navigate('/login')
      return
    }
    likeMut.mutate(listingId)
  }

  const listings = data ?? []

  const filteredListings = useMemo(() => {
    return listings.filter((a) => {
      const maxG = a.max_guests ?? 0
      if (maxG < minGuests) return false
      if (amenityWifi && !a.wifi) return false
      if (amenityPool && !a.pool) return false
      if (amenityParking && !a.parking) return false
      if (amenityKitchen && !a.kitchen) return false
      return true
    })
  }, [listings, minGuests, amenityWifi, amenityPool, amenityParking, amenityKitchen])

  const featured = useMemo(() => filteredListings.slice(0, 5), [filteredListings])

  const hasApiFilters = !!(propType || minPrice || maxPrice || search)
  const hasClientFilters =
    minGuests > 1 ||
    amenityWifi ||
    amenityPool ||
    amenityParking ||
    amenityKitchen
  const hasFilters = hasApiFilters || hasClientFilters

  const clearAll = () => {
    setPropType('')
    setMinPrice('')
    setMaxPrice('')
    setSearchInput('')
    setSearch('')
    setMinGuests(1)
    setAmenityWifi(false)
    setAmenityPool(false)
    setAmenityParking(false)
    setAmenityKitchen(false)
  }

  return (
    <div className="ev-page acc-page">
      <header className="page-header ev-page__header acc-page__header">
        <div>
          <h1 className="display ev-page__title">Stays</h1>
          <p className="page-sub ev-page__sub">
            Boutique rooms &amp; stays — browse like a discovery feed, then refine with filters.
          </p>
        </div>
        <button
          type="button"
          className="acc-page__filter-btn btn btn-ghost"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          {showFilters ? 'Hide filters' : 'Filters'}
        </button>
      </header>

      <section className="ev-page__discover card" aria-labelledby="acc-discover-title">
        <h2 id="acc-discover-title" className="ev-page__discover-title">
          Discover a place
        </h2>
        <p className="ev-page__discover-sub">
          Start with a property style — then search or open filters for price and amenities.
        </p>
        <div className="ev-page__discover-chips" role="group" aria-label="Property types">
          {PROPERTY_TYPES.map(({ value, label, emoji }) => (
            <button
              key={`acc-disc-${value}`}
              type="button"
              className={`acc-quick-chip ev-page__discover-chip${propType === value ? ' acc-quick-chip--active' : ''}`}
              onClick={() => setPropType(propType === value ? '' : value)}
            >
              <span aria-hidden>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </section>

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="acc-search">
          Search stays
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>
            ⌕
          </span>
          <input
            id="acc-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="City, region, or listing name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchInput ? (
            <button
              type="button"
              className="acc-page__search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {showFilters && (
        <div className="acc-page__filter-panel">
          <fieldset className="acc-page__filter-fieldset">
            <legend className="acc-page__filter-legend">Price per night ($)</legend>
            <div className="acc-page__filter-two">
              <div className="field">
                <label className="label" htmlFor="acc-min">
                  From ($ / night)
                </label>
                <input
                  id="acc-min"
                  type="number"
                  className="input"
                  min={0}
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="acc-max">
                  Up to ($ / night)
                </label>
                <input
                  id="acc-max"
                  type="number"
                  className="input"
                  min={0}
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="acc-page__filter-fieldset">
            <legend className="acc-page__filter-legend">Guests</legend>
            <div className="field">
              <span className="label" id="acc-filter-guests-label">
                Minimum guests
              </span>
              <div
                className="acc-book__guest-stepper"
                role="group"
                aria-labelledby="acc-filter-guests-label"
              >
                <button
                  type="button"
                  className="acc-book__guest-btn"
                  aria-label="Decrease minimum guests"
                  disabled={minGuests <= 1}
                  onClick={() => setMinGuests((g) => Math.max(1, g - 1))}
                >
                  −
                </button>
                <span className="acc-book__guest-value" aria-live="polite">
                  {minGuests}
                </span>
                <button
                  type="button"
                  className="acc-book__guest-btn"
                  aria-label="Increase minimum guests"
                  disabled={minGuests >= 12}
                  onClick={() => setMinGuests((g) => Math.min(12, g + 1))}
                >
                  +
                </button>
              </div>
              <p className="acc-page__filter-hint acc-page__filter-hint--after-stepper">
                Show stays that can host at least this many guests.
              </p>
            </div>
          </fieldset>

          <fieldset className="acc-page__filter-fieldset">
            <legend className="acc-page__filter-legend">Amenities</legend>
            <p className="acc-page__filter-hint acc-page__filter-hint--amenities-intro">Match all selected.</p>
            <div className="acc-page__amenity-checks">
              <label className="acc-page__check">
                <input type="checkbox" checked={amenityWifi} onChange={(e) => setAmenityWifi(e.target.checked)} />
                Wi-Fi
              </label>
              <label className="acc-page__check">
                <input type="checkbox" checked={amenityPool} onChange={(e) => setAmenityPool(e.target.checked)} />
                Pool
              </label>
              <label className="acc-page__check">
                <input
                  type="checkbox"
                  checked={amenityParking}
                  onChange={(e) => setAmenityParking(e.target.checked)}
                />
                Parking
              </label>
              <label className="acc-page__check">
                <input
                  type="checkbox"
                  checked={amenityKitchen}
                  onChange={(e) => setAmenityKitchen(e.target.checked)}
                />
                Kitchen
              </label>
            </div>
          </fieldset>
        </div>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="acc-stories-title">
          <div className="ev-page__stories-head">
            <h2 id="acc-stories-title" className="ev-page__stories-title">
              Trending now
            </h2>
            <span className="ev-page__stories-sub">Swipe to explore</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((a) => {
              const loc = a.city ? `${a.city}, ${a.region}` : a.region
              const pt = propLabel(a.property_type)
              return (
                <Link key={`acc-story-${a.id}`} to={`/accommodation/${a.id}`} className="ev-story">
                  <div className="ev-story__img-wrap">
                    {a.cover_image ? (
                      <img className="ev-story__img" src={mediaUrl(a.cover_image) || ''} alt="" />
                    ) : (
                      <div className="ev-story__img ev-story__img--placeholder">
                        <span aria-hidden>{stayEmoji(a)}</span>
                      </div>
                    )}
                  </div>
                  <div className="ev-story__meta">
                    <p className="ev-story__title">{a.title}</p>
                    <p className="ev-story__sub">
                      {pt ? `${pt} · ` : ''}
                      {loc}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {propType ? ` · ${propLabel(propType)}` : ''}
            {minPrice ? ` · from $${minPrice}` : ''}
            {maxPrice ? ` · up to $${maxPrice}` : ''}
            {search ? ` · "${search}"` : ''}
            {minGuests > 1 ? ` · ${minGuests}+ guests` : ''}
            {amenityWifi ? ' · Wi-Fi' : ''}
            {amenityPool ? ' · Pool' : ''}
            {amenityParking ? ' · Parking' : ''}
            {amenityKitchen ? ' · Kitchen' : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {isLoading && (
        <div className="ev-page__skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton ev-page__skeleton-card" />
          ))}
        </div>
      )}

      {!isLoading && filteredListings.length > 0 && (
        <p className="ev-page__results-hint">
          {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
        </p>
      )}

      <div className="acc-page__grid ev-page__grid">
        {filteredListings.map((a) => {
          const liked = Boolean(a.liked_by_me)
          const likeCount = a.likes_count ?? 0
          const location = a.city ? `${a.city}, ${a.region}` : a.region
          const typeLabel = propLabel(a.property_type)
          const likePending = likeMut.isPending && likeMut.variables === a.id

          return (
            <Link key={a.id} to={`/accommodation/${a.id}`} className="media-card acc-media-card">
              <div className="acc-media-card__img-wrap">
                {a.cover_image ? (
                  <img
                    className="acc-media-card__img"
                    src={mediaUrl(a.cover_image) || ''}
                    alt={a.title}
                  />
                ) : (
                  <div className="acc-media-card__img acc-media-card__placeholder">
                    <span aria-hidden>🏨</span>
                  </div>
                )}
                {likeCount > 0 && (
                  <span className="acc-media-card__like-count" aria-label={`${likeCount} likes`}>
                    {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                  </span>
                )}
                <button
                  type="button"
                  className={`acc-media-card__save${liked ? ' acc-media-card__save--saved' : ''}`}
                  aria-label={liked ? 'Unlike this stay' : 'Like this stay'}
                  disabled={likePending}
                  onClick={(e) => onToggleLike(a.id, e)}
                >
                  <IconHeart filled={liked} />
                </button>
              </div>
              <div className="media-card__body">
                <div className="acc-media-card__type-row">
                  {typeLabel && <span className="acc-media-card__type">{typeLabel}</span>}
                  {a.pet_friendly && <span className="acc-media-card__pet">🐾 Pet friendly</span>}
                  {a.wifi && <span className="acc-media-card__pet">📶 WiFi</span>}
                </div>
                <h2 className="media-card__title">{a.title}</h2>
                <p className="media-card__meta">📍 {location}</p>
                {a.rating_avg != null && (
                  <p className="media-card__meta">
                    ★ {parseFloat(a.rating_avg).toFixed(1)}
                    {a.rating_count ? <span> ({a.rating_count})</span> : null}
                  </p>
                )}
                <div className="acc-media-card__price">
                  <span className="acc-media-card__from">From</span>
                  <span>${a.price_per_night}</span>
                  <span className="acc-media-card__per"> / night</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {!isLoading && filteredListings.length === 0 && (
        <div className="ev-page__empty">
          <p className="ev-page__empty-title">
            {listings.length > 0 || hasFilters ? 'No stays match these filters' : 'No listings yet'}
          </p>
          <p className="ev-page__empty-text">
            {listings.length > 0 || hasFilters
              ? 'Try adjusting your filters — new properties list here regularly.'
              : 'Boutique hotels, lodges, and apartments will appear here once listed.'}
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary ev-page__empty-btn" onClick={clearAll}>
              Show all stays
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
