import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Search, Utensils, X } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useFoodEngagement } from '../hooks/useFoodEngagement'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import { FoodListingCard, VenueSpotlightStories } from '../components/food'
import type { VenueStoryChannelInput } from '../components/food/stories/types'
import { cuisineLabel, priceLevelLabel } from '../utils/foodListing'
import { EmptyState, ListSkeleton } from '../components/ui'
import { foodCoverSrc } from '../utils/foodDisplay'
import '../components/food/food-list.css'

type Venue = {
  id: number
  name: string
  description?: string
  cuisine: string
  region: string
  city?: string | null
  owner_username?: string
  owner_display_name?: string | null
  price_level: number
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  rating_avg?: string | null
  rating_count?: number | null
  saved_by_me?: boolean
  saves_count?: number
  liked_by_me?: boolean
  likes_count?: number
  is_open?: boolean | null
  tagline?: string | null
  popular_dish?: string | null
  closes_at?: string | null
  takeaway?: boolean | null
  delivery?: boolean | null
  reservations?: boolean | null
  dine_in?: boolean | null
  venue_stories?: VenueStoryChannelInput[]
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
}

const CUISINE_OPTIONS: { value: string; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'grill', label: 'Grill' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'asian', label: 'Asian' },
  { value: 'fast_food', label: 'Fast food' },
  { value: 'bar', label: 'Bar' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'international', label: 'International' },
  { value: 'other', label: 'Other' },
]

const MOOD_FILTERS: { id: string; label: string }[] = [
  { id: 'open', label: 'Open now' },
  { id: 'favourites', label: 'Top rated' },
  { id: 'cheap', label: 'Cheap eats' },
  { id: 'date', label: 'Date night' },
  { id: 'family', label: 'Family' },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'reserve', label: 'Reservations' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Ongwediva', 'Lüderitz'] as const

type SortId = 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'name'

function cuisineMeta(value: string) {
  return CUISINE_OPTIONS.find((c) => c.value === value) ?? { label: value }
}

function ratingValue(v: Venue): number {
  const n = v.rating_avg != null && v.rating_avg !== '' ? Number(v.rating_avg) : 0
  return Number.isFinite(n) ? n : 0
}

function onFoodImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

export function FoodList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [cuisine, setCuisine] = useState('')
  const [city, setCity] = useState('')
  const [mood, setMood] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (cuisine) p.set('cuisine', cuisine)
    if (city) p.set('city', city)
    if (search) p.set('search', search)
    if (mood === 'cheap') p.set('max_price_level', '1')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [cuisine, city, search, mood])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['food', qs, profile?.username ?? 'anon'],
    queryFn: () => apiFetch<Venue[]>(`/api/food/venues/${qs}`, { auth: Boolean(profile) }),
  })

  const { data: featuredFood = [] } = useFeaturedPlacement<Venue>('food-featured-rail', FEATURED_API.food)

  const venues = useMemo(() => {
    let list = [...(data ?? [])]
    if (mood === 'open') list = list.filter((v) => v.is_open === true)
    if (mood === 'date') list = list.filter((v) => (v.price_level || 1) >= 3 || v.cuisine === 'bar')
    if (mood === 'family') list = list.filter((v) => (v.price_level || 2) <= 2 && v.cuisine !== 'bar')
    if (mood === 'favourites') list = list.filter((v) => ratingValue(v) >= 4 || (v.rating_count ?? 0) >= 10)
    if (mood === 'takeaway') list = list.filter((v) => v.takeaway || v.cuisine === 'fast_food' || v.cuisine === 'bakery')
    if (mood === 'delivery') list = list.filter((v) => Boolean(v.delivery))
    if (mood === 'reserve') list = list.filter((v) => Boolean(v.reservations))

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'price_asc') return (a.price_level || 1) - (b.price_level || 1)
      if (sort === 'price_desc') return (b.price_level || 1) - (a.price_level || 1)
      if (sort === 'rating') {
        const diff = ratingValue(b) - ratingValue(a)
        if (diff !== 0) return diff
        return (b.rating_count ?? 0) - (a.rating_count ?? 0)
      }
      // recommended: open + rated + partner-ish signals
      const score = (v: Venue) =>
        (v.is_open === true ? 3 : 0) +
        ratingValue(v) * 2 +
        Math.min(v.rating_count ?? 0, 40) / 20 +
        (v.is_featured_partner ? 4 : 0) +
        (v.popular_dish ? 0.5 : 0)
      return score(b) - score(a)
    })
    return list
  }, [data, mood, sort])

  const engagement = useFoodEngagement(venues)

  const featured = useMemo(() => featuredFood.slice(0, 8), [featuredFood])
  const openNowRail = useMemo(
    () => (data ?? []).filter((v) => v.is_open === true).slice(0, 8),
    [data],
  )
  const hasFilters = Boolean(cuisine || city || search || mood)

  const clearAll = () => {
    setCuisine('')
    setCity('')
    setMood('')
    setSearchInput('')
    setSearch('')
    setSort('recommended')
  }

  const requireAuth = () => {
    if (!profile) {
      navigate('/login')
      return false
    }
    return true
  }

  const toggleLiked = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth()) return
    const venue = venues.find((v) => v.id === id) ?? (data ?? []).find((v) => v.id === id)
    if (!venue) return
    engagement.likeVenue(venue)
  }

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth()) return
    const venue = venues.find((v) => v.id === id) ?? (data ?? []).find((v) => v.id === id)
    if (!venue) return
    engagement.saveVenue(venue)
  }

  const shareVenue = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const venue = venues.find((v) => v.id === id) ?? (data ?? []).find((v) => v.id === id)
    if (!venue) return
    void engagement.shareVenuePlain(venue)
  }

  const moodLabel = MOOD_FILTERS.find((m) => m.id === mood)?.label

  return (
    <div className="fd-market">
      {engagement.shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}
      <header className="fd-market__hero">
        <p className="fd-market__kicker">Food marketplace</p>
        <h1 className="fd-market__title">Find your next bite</h1>
        <p className="fd-market__sub">
          Browse restaurants, cafés, grills, and bars by cuisine, city, price, and what’s open now —
          built for food lovers who know what they want.
        </p>

        <div className="fd-market__find">
          <label className="fd-market__search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="fd-market-search"
              type="search"
              placeholder="Search coffee, sushi, braai, Windhoek…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search food venues"
            />
            {searchInput ? (
              <button
                type="button"
                className="fd-market__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </label>

          <div className="fd-market__find-row">
            <select
              className="fd-market__select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="City"
            >
              <option value="">All cities</option>
              {TOP_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <select
              className="fd-market__select"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              aria-label="Cuisine"
            >
              <option value="">All cuisines</option>
              {CUISINE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="fd-market__select"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              aria-label="Mood"
            >
              <option value="">Any mood</option>
              {MOOD_FILTERS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="fd-market__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort venues"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </header>

      {hasFilters ? (
        <div className="fd-market__active" aria-label="Active filters">
          {search ? (
            <button type="button" className="fd-market__active-pill" onClick={() => { setSearch(''); setSearchInput('') }}>
              “{search}” <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {cuisine ? (
            <button type="button" className="fd-market__active-pill" onClick={() => setCuisine('')}>
              {cuisineMeta(cuisine).label} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {city ? (
            <button type="button" className="fd-market__active-pill" onClick={() => setCity('')}>
              {city} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {mood && moodLabel ? (
            <button type="button" className="fd-market__active-pill" onClick={() => setMood('')}>
              {moodLabel} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="fd-market__clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      {!isLoading && !hasFilters && featured.length > 0 ? (
        <section className="fd-market__section" aria-labelledby="fd-featured-title">
          <div className="fd-market__section-head">
            <div>
              <h2 id="fd-featured-title" className="fd-market__section-title">
                Popular right now
              </h2>
              <p className="fd-market__section-sub">Spots travellers and locals are checking out</p>
            </div>
          </div>
          <div className="fd-market__featured-rail">
            {featured.map((f) => {
              const partner = partnerBadgeFields(f, cuisineLabel(f.cuisine))
              const href = promotionHref(`/food/${f.id}`, f.promotion_id)
              const location = f.city ? `${f.city}, ${f.region}` : f.region
              return (
                <Link
                  key={`fd-feat-${f.id}`}
                  to={href}
                  className="fd-market__featured"
                  onClick={() => {
                    if (f.promotion_id) trackPromotion(f.promotion_id, 'click')
                  }}
                >
                  <div className="fd-market__featured-media">
                    <img
                      src={foodCoverSrc(f.cover_image, f.cuisine)}
                      alt=""
                      loading="lazy"
                      onError={(e) => onFoodImgError(e, f.cuisine)}
                    />
                  </div>
                  <div className="fd-market__featured-body">
                    <span className="fd-market__featured-type">
                      {partner.eyebrow ?? cuisineLabel(f.cuisine)}
                    </span>
                    <p className="fd-market__featured-title">{f.name}</p>
                    <p className="fd-market__featured-meta">
                      <MapPin size={12} strokeWidth={2.25} aria-hidden />
                      {location}
                      <span aria-hidden>·</span>
                      From {priceLevelLabel(f.price_level)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!isLoading && !hasFilters && featured.length >= 3 ? (
        <VenueSpotlightStories venues={featured} />
      ) : null}

      {!isLoading && !hasFilters && openNowRail.length > 0 ? (
        <section className="fd-market__section" aria-labelledby="fd-open-title">
          <div className="fd-market__section-head">
            <div>
              <h2 id="fd-open-title" className="fd-market__section-title">
                Open now
              </h2>
              <p className="fd-market__section-sub">Hungry? These kitchens are serving</p>
            </div>
            <button type="button" className="fd-market__clear" onClick={() => setMood('open')}>
              See all open
            </button>
          </div>
          <div className="fd-market__grid">
            {openNowRail.slice(0, 3).map((v) => (
              <FoodListingCard
                key={`open-${v.id}`}
                venue={v}
                liked={engagement.isLiked(v)}
                saved={engagement.isSaved(v)}
                likeCount={engagement.likeCount(v)}
                likeBusy={engagement.isLikeBusy(v.id)}
                saveBusy={engagement.isSaveBusy(v.id)}
                onToggleLike={toggleLiked}
                onToggleSave={toggleSaved}
                onShare={shareVenue}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fd-market__results-bar">
        <p className="fd-market__count" role="status">
          {isLoading ? (
            'Loading food spots…'
          ) : (
            <>
              <strong>{venues.length}</strong>{' '}
              {venues.length === 1 ? 'place' : 'places'}
              {hasFilters ? ' match' : ' to explore'}
            </>
          )}
        </p>
      </div>

      {isError ? (
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title="We couldn't load food spots"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      ) : null}

      {isLoading && !isError ? <ListSkeleton count={6} /> : null}

      {!isLoading && !isError && venues.length > 0 ? (
        <div className="fd-market__grid">
          {venues.map((v) => (
            <FoodListingCard
              key={v.id}
              venue={v}
              liked={engagement.isLiked(v)}
              saved={engagement.isSaved(v)}
              likeCount={engagement.likeCount(v)}
              likeBusy={engagement.isLikeBusy(v.id)}
              saveBusy={engagement.isSaveBusy(v.id)}
              onToggleLike={toggleLiked}
              onToggleSave={toggleSaved}
              onShare={shareVenue}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && venues.length === 0 ? (
        <EmptyState
          iconElement={<Utensils size={28} strokeWidth={1.75} />}
          title={hasFilters ? 'No matches for that craving' : 'No food spots listed yet'}
          sub={
            hasFilters
              ? 'Try another cuisine, city, or clear filters to see more places.'
              : 'Restaurants, cafés, bars, and local kitchens will appear here once added.'
          }
          cta={hasFilters ? { label: 'Clear filters', onClick: clearAll } : undefined}
        />
      ) : null}
    </div>
  )
}
