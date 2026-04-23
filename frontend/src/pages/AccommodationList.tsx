import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { FilterSheet } from '../components/FilterSheet'
import { HostStoriesRow } from '../components/HostStoriesRow'
import { MiniRating } from '../components/MiniRating'

const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'guesthouse', label: 'Guest house' },
  { value: 'bed_and_breakfast', label: 'B&B' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'villa', label: 'Villa / house' },
  { value: 'resort', label: 'Resort' },
  { value: 'camping_glamping', label: 'Camping / glamping' },
  { value: 'other', label: 'Other' },
]

const RATING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3+ stars' },
  { value: '4', label: '4+ stars' },
  { value: '4.5', label: '4.5+ stars' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Newest first' },
  { value: '-rating_avg', label: 'Highest rated' },
  { value: 'price_per_night', label: 'Price: low to high' },
  { value: '-price_per_night', label: 'Price: high to low' },
]

function propertyTypeLabel(value: string) {
  return PROPERTY_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

type Listing = {
  id: number
  title: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  cover_image: string | null
  property_type: string
  pet_friendly: boolean
  rating_avg: string
  rating_count: number
}

function toggleType(prev: string[], value: string) {
  return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
}

export function AccommodationList() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [minP, setMinP] = useState('')
  const [maxP, setMaxP] = useState('')
  const [guests, setGuests] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [maxBedrooms, setMaxBedrooms] = useState('')
  const [propertyTypes, setPropertyTypes] = useState<string[]>([])
  const [minRating, setMinRating] = useState('')
  const [petFriendlyOnly, setPetFriendlyOnly] = useState(false)
  const [featWifi, setFeatWifi] = useState(false)
  const [featParking, setFeatParking] = useState(false)
  const [featPool, setFeatPool] = useState(false)
  const [featKitchen, setFeatKitchen] = useState(false)
  const [featBreakfast, setFeatBreakfast] = useState(false)
  const [ordering, setOrdering] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (region) p.set('region', region)
    if (city) p.set('city', city)
    if (minP) p.set('min_price', minP)
    if (maxP) p.set('max_price', maxP)
    if (guests) p.set('guests', guests)
    if (minBedrooms) p.set('min_bedrooms', minBedrooms)
    if (maxBedrooms) p.set('max_bedrooms', maxBedrooms)
    propertyTypes.forEach((t) => p.append('property_type', t))
    if (minRating) p.set('min_rating', minRating)
    if (petFriendlyOnly) p.set('pet_friendly', 'true')
    if (featWifi) p.set('wifi', 'true')
    if (featParking) p.set('parking', 'true')
    if (featPool) p.set('pool', 'true')
    if (featKitchen) p.set('kitchen', 'true')
    if (featBreakfast) p.set('breakfast', 'true')
    if (ordering) p.set('ordering', ordering)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [
    region,
    city,
    minP,
    maxP,
    guests,
    minBedrooms,
    maxBedrooms,
    propertyTypes,
    minRating,
    petFriendlyOnly,
    featWifi,
    featParking,
    featPool,
    featKitchen,
    featBreakfast,
    ordering,
    search,
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['acc', qs],
    queryFn: () => apiFetch<Listing[]>(`/api/accommodation/listings/${qs}`, { auth: false }),
  })

  const clearAllFilters = () => {
    setRegion('')
    setCity('')
    setMinP('')
    setMaxP('')
    setGuests('')
    setMinBedrooms('')
    setMaxBedrooms('')
    setPropertyTypes([])
    setMinRating('')
    setPetFriendlyOnly(false)
    setFeatWifi(false)
    setFeatParking(false)
    setFeatPool(false)
    setFeatKitchen(false)
    setFeatBreakfast(false)
    setOrdering('')
    setSearchInput('')
    setSearch('')
  }

  return (
    <div className="acc-page acc-page--list">
      <header className="page-header acc-page__header">
        <div>
          <h1 className="display acc-page__title">Places to stay</h1>
          <p className="page-sub acc-page__sub">
            Compare stays from local hosts — prices are per night. Use filters to narrow your search.
          </p>
        </div>
        <button type="button" className="btn btn-ghost acc-page__filter-btn" onClick={() => setFiltersOpen(true)}>
          Filters
        </button>
      </header>

      <HostStoriesRow />

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="acc-search-q">
          Search stays
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>
            ⌕
          </span>
          <input
            id="acc-search-q"
            type="search"
            className="acc-page__search-input input"
            placeholder="Search name, town, or region…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchInput ? (
            <button type="button" className="acc-page__search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">
              ×
            </button>
          ) : null}
        </div>
      </div>

      <FilterSheet open={filtersOpen} title="Narrow your options" onClose={() => setFiltersOpen(false)}>
        <p className="acc-page__sheet-intro">All fields are optional. Combine place type, rating, and amenities.</p>

        <fieldset className="acc-page__filter-fieldset">
          <legend className="acc-page__filter-legend">Place type</legend>
          <div className="acc-page__filter-chip-grid" role="group" aria-label="Accommodation types">
            {PROPERTY_TYPE_OPTIONS.map(({ value, label }) => (
              <label key={value} className="acc-filter-chip">
                <input
                  type="checkbox"
                  checked={propertyTypes.includes(value)}
                  onChange={() => setPropertyTypes((prev) => toggleType(prev, value))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="label" htmlFor="acc-filter-min-rating">
            Minimum guest rating
          </label>
          <select id="acc-filter-min-rating" className="input" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
            {RATING_OPTIONS.map((o) => (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="acc-page__filter-fieldset">
          <legend className="acc-page__filter-legend">Amenities &amp; policies</legend>
          <div className="acc-page__filter-toggle-row" role="group" aria-label="Amenities">
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={petFriendlyOnly} onChange={(e) => setPetFriendlyOnly(e.target.checked)} />
              <span>Pet-friendly</span>
            </label>
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={featWifi} onChange={(e) => setFeatWifi(e.target.checked)} />
              <span>Wi‑Fi</span>
            </label>
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={featParking} onChange={(e) => setFeatParking(e.target.checked)} />
              <span>Parking</span>
            </label>
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={featPool} onChange={(e) => setFeatPool(e.target.checked)} />
              <span>Pool</span>
            </label>
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={featKitchen} onChange={(e) => setFeatKitchen(e.target.checked)} />
              <span>Kitchen</span>
            </label>
            <label className="acc-filter-chip acc-filter-chip--solo">
              <input type="checkbox" checked={featBreakfast} onChange={(e) => setFeatBreakfast(e.target.checked)} />
              <span>Breakfast</span>
            </label>
          </div>
        </fieldset>

        <div className="field">
          <label className="label" htmlFor="acc-filter-region">
            Region
          </label>
          <input
            id="acc-filter-region"
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Khomas, Erongo"
            autoComplete="address-level1"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="acc-filter-city">
            Town / city
          </label>
          <input
            id="acc-filter-city"
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Windhoek, Swakopmund"
            autoComplete="address-level2"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="acc-filter-min">
            From (N$ / night)
          </label>
          <input id="acc-filter-min" className="input" type="number" min={0} value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="No minimum" />
        </div>
        <div className="field">
          <label className="label" htmlFor="acc-filter-max">
            Up to (N$ / night)
          </label>
          <input id="acc-filter-max" className="input" type="number" min={0} value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="No maximum" />
        </div>
        <div className="field">
          <label className="label" htmlFor="acc-filter-guests">
            Guests (minimum capacity)
          </label>
          <input
            id="acc-filter-guests"
            className="input"
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            placeholder="e.g. 2"
          />
        </div>
        <div className="acc-page__filter-two">
          <div className="field">
            <label className="label" htmlFor="acc-filter-bed-min">
              Bedrooms (min)
            </label>
            <input
              id="acc-filter-bed-min"
              className="input"
              type="number"
              min={0}
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(e.target.value)}
              placeholder="Any"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-filter-bed-max">
              Bedrooms (max)
            </label>
            <input
              id="acc-filter-bed-max"
              className="input"
              type="number"
              min={0}
              value={maxBedrooms}
              onChange={(e) => setMaxBedrooms(e.target.value)}
              placeholder="Any"
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="acc-filter-sort">
            Sort results
          </label>
          <select id="acc-filter-sort" className="input" value={ordering} onChange={(e) => setOrdering(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value || 'default'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={() => setFiltersOpen(false)}>
          Show results
        </button>
      </FilterSheet>

      {isLoading && (
        <div className="acc-page__skeleton-wrap" aria-hidden>
          <div className="skeleton acc-page__skeleton-card" />
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <p className="acc-page__results-hint" aria-live="polite">
          {data.length} {data.length === 1 ? 'place' : 'places'} — tap one to read more. No rush.
        </p>
      )}

      <div className="acc-page__grid">
        {data?.map((l) => (
          <Link key={l.id} to={`/accommodation/${l.id}`} className="media-card acc-media-card">
            {l.cover_image ? (
              <img className="media-card__img acc-media-card__img" src={mediaUrl(l.cover_image) || ''} alt="" />
            ) : (
              <div className="media-card__img acc-media-card__img acc-media-card__placeholder">
                <span>Photo coming from host</span>
              </div>
            )}
            <div className="media-card__body">
              <p className="acc-media-card__type-row">
                <span className="acc-media-card__type">{propertyTypeLabel(l.property_type)}</span>
                {l.pet_friendly ? <span className="acc-media-card__pet">Pet-friendly</span> : null}
              </p>
              <h2 className="media-card__title">{l.title}</h2>
              <MiniRating rating={l.rating_avg} count={l.rating_count} />
              <p className="media-card__meta">
                {l.city ? `${l.city}, ` : ''}
                {l.region} · up to {l.max_guests} guests
              </p>
              <p className="media-card__price acc-media-card__price">
                <span className="acc-media-card__from">From</span> N${l.price_per_night}
                <span className="acc-media-card__per"> / night</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && data?.length === 0 && (
        <div className="acc-page__empty">
          <p className="acc-page__empty-title">No matches for now</p>
          <p className="acc-page__empty-text">Try widening your filters or clearing a few — new listings appear often.</p>
          <button type="button" className="btn btn-primary acc-page__empty-btn" onClick={clearAllFilters}>
            Clear search &amp; filters
          </button>
        </div>
      )}
    </div>
  )
}
