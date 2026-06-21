import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  BadgeDollarSign,
  Clock,
  Coffee,
  Croissant,
  Fish,
  Flame,
  MapPin,
  Moon,
  Sandwich,
  SlidersHorizontal,
  Soup,
  Star,
  Truck,
  Users,
  Utensils,
  Wine,
  X,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { CategorySpotlightHero } from '../components/CategorySpotlightHero'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { MarketplaceHero, QuickFilterChips, SearchPanel } from '../components/marketplace'
import { FoodListingCard, VenueSpotlightStories } from '../components/food'
import '../components/Featured.css'
import type { VenueStoryChannelInput } from '../components/food/stories/types'
import { cuisineLabel, priceLevelLabel } from '../utils/foodListing'
import { EmptyState, ListSkeleton } from '../components/ui'
import { foodCoverSrc, foodOpenBadge } from '../utils/foodDisplay'

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
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  tagline?: string | null
  popular_dish?: string | null
  closes_at?: string | null
  venue_stories?: VenueStoryChannelInput[]
  is_featured_partner?: boolean
  partner_label?: string
}

const CUISINE_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'local', label: 'Local', Icon: Utensils },
  { value: 'grill', label: 'Grill', Icon: Flame },
  { value: 'seafood', label: 'Seafood', Icon: Fish },
  { value: 'cafe', label: 'Café', Icon: Coffee },
  { value: 'bakery', label: 'Bakery', Icon: Croissant },
  { value: 'pizza', label: 'Pizza', Icon: Utensils },
  { value: 'asian', label: 'Asian', Icon: Soup },
  { value: 'fast_food', label: 'Fast food', Icon: Sandwich },
  { value: 'bar', label: 'Bar', Icon: Wine },
  { value: 'other', label: 'Other', Icon: Utensils },
]

const MOOD_FILTERS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'open', label: 'Open now', Icon: Clock },
  { id: 'favourites', label: 'Local favourite', Icon: Star },
  { id: 'cheap', label: 'Cheap eats', Icon: BadgeDollarSign },
  { id: 'date', label: 'Date night', Icon: Moon },
  { id: 'family', label: 'Family friendly', Icon: Users },
  { id: 'takeaway', label: 'Takeaway', Icon: Truck },
]

const SIDEBAR_CUISINES: { label: string; value: string }[] = [
  { label: 'Café', value: 'cafe' },
  { label: 'Grill', value: 'grill' },
  { label: 'Seafood', value: 'seafood' },
  { label: 'Local food', value: 'local' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Vegetarian', value: 'other' },
  { label: 'Fast food', value: 'fast_food' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Ongwediva', 'Lüderitz'] as const

function cuisineMeta(value: string) {
  return CUISINE_OPTIONS.find((c) => c.value === value) ?? { label: value, Icon: Utensils }
}

function onFoodImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

function resultsSummary(count: number, hasFilters: boolean, search: string) {
  const noun = count === 1 ? 'food spot' : 'food spots'
  if (!hasFilters && !search) {
    return count > 0 ? `${count} ${noun} available` : 'Explore restaurants, cafés, and local food spots.'
  }
  if (search && hasFilters) return `${count} ${noun} for “${search}” match your filters`
  if (search) return `${count} results for “${search}”`
  if (hasFilters) return `${count} ${noun} match your filters`
  return `${count} ${noun} available`
}

export function FoodList() {
  const [cuisine, setCuisine] = useState('')
  const [mood, setMood] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (cuisine) p.set('cuisine', cuisine)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [cuisine, search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['food', qs],
    queryFn: () => apiFetch<Venue[]>(`/api/food/venues/${qs}`, { auth: false }),
  })

  const { data: spotlight = [] } = useFeaturedPlacement<Venue>('food-spotlight', FEATURED_API.spotlight('food'))
  const { data: featuredFood = [] } = useFeaturedPlacement<Venue>('food-featured-rail', FEATURED_API.food)

  const spotlightVenue = spotlight[0]

  const venues = useMemo(() => {
    let list = data ?? []
    if (mood === 'open') list = list.filter((v) => v.is_open === true)
    if (mood === 'cheap') list = list.filter((v) => (v.price_level || 1) <= 1)
    if (mood === 'date') list = list.filter((v) => (v.price_level || 1) >= 3 || v.cuisine === 'bar')
    if (mood === 'family') list = list.filter((v) => (v.price_level || 2) <= 2)
    if (mood === 'favourites') list = list.filter((v) => (v.rating_count ?? 0) >= 80)
    if (mood === 'takeaway') list = list.filter((v) => v.cuisine === 'fast_food' || v.cuisine === 'bakery')
    return list
  }, [data, mood])

  const featured = useMemo(() => featuredFood.slice(0, 5), [featuredFood])
  const showRichSections = featured.length >= 4
  const openNowCount = useMemo(() => (data ?? []).filter((v) => v.is_open === true).length, [data])
  const favouritesCount = useMemo(
    () => (data ?? []).filter((v) => (v.rating_count ?? 0) >= 80).length,
    [data],
  )

  const hasFilters = !!(cuisine || search || mood)

  const clearAll = () => {
    setCuisine('')
    setMood('')
    setSearchInput('')
    setSearch('')
  }

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-cuisines',
        title: 'Popular cuisines',
        type: 'links',
        items: SIDEBAR_CUISINES.map(({ label, value }) => ({
          label,
          active: cuisine === value,
          onClick: () => setCuisine(cuisine === value ? '' : value),
        })),
      },
      {
        id: 'food-pulse',
        title: 'Food pulse',
        type: 'stats',
        items: [
          { value: data?.length ? data.length : '—', label: 'food spots listed' },
          { value: openNowCount ? openNowCount : '—', label: 'open now' },
          { value: favouritesCount ? favouritesCount : '—', label: 'local favourites' },
        ],
      },
      {
        id: 'top-areas',
        title: 'Top areas',
        type: 'links',
        items: TOP_AREAS.map((city) => ({
          label: city,
          onClick: () => {
            setSearchInput(city)
            setSearch(city)
          },
        })),
      },
    ]
  }, [cuisine, data?.length, favouritesCount, openNowCount])

  return (
    <div className="ev-page fd-page acc-page disc-page mk-page">
      <MarketplaceHero
        title="Eat & drink"
        subtitle="Find restaurants, cafés, grills, bars, and local food spots travellers recommend."
        support="Search by cuisine, venue, city, price, or mood."
        action={
          <button
            type="button"
            className={`fd-filter-toggle acc-page__filter-btn btn btn-ghost${showFilters ? ' acc-page__filter-btn--active' : ''}${hasFilters ? ' acc-page__filter-btn--has-filters' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        }
      />

      <SearchPanel
        id="fd-search"
        label="Search food venues"
        placeholder="Search sushi, coffee, Windhoek, grill, café…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
        className="fd-page__search"
      />

      <QuickFilterChips
        ariaLabel="Food mood filters"
        className="fd-page__quick-chips"
        chips={MOOD_FILTERS.map((m) => ({
          id: m.id,
          label: m.label,
          Icon: m.Icon,
          active: mood === m.id,
        }))}
        onChipClick={(id) => setMood(mood === id ? '' : id)}
      />

      {(cuisine || mood) && (
        <div className="fd-active-filters" role="group" aria-label="Active filters">
          {cuisine ? (
            <button type="button" className="fd-active-filter" onClick={() => setCuisine('')}>
              {cuisineMeta(cuisine).label}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          {mood ? (
            <button type="button" className="fd-active-filter" onClick={() => setMood('')}>
              {MOOD_FILTERS.find((m) => m.id === mood)?.label ?? mood}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      )}

      {showFilters && (
        <section className="ev-page__discover card fd-filters-panel fd-page__discover" aria-labelledby="fd-discover-title">
          <h2 id="fd-discover-title" className="ev-page__discover-title">
            Match your taste
          </h2>
          <p className="ev-page__discover-sub">Filter by cuisine — combine with mood chips above.</p>
          <div className="ev-page__discover-chips fd-page__cuisine-chips" role="group" aria-label="Cuisines">
            {CUISINE_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={`fd-discover-${value}`}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip fd-page__cuisine-chip${cuisine === value ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setCuisine(cuisine === value ? '' : value)}
                aria-pressed={cuisine === value}
              >
                <Icon className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="fd-page__layout disc-page__layout">
        <main className="fd-page__main disc-page__main">
          {spotlightVenue?.is_featured_partner ? (
            <CategorySpotlightHero
              title={spotlightVenue.name}
              subtitle={spotlightVenue.tagline || spotlightVenue.popular_dish || cuisineLabel(spotlightVenue.cuisine)}
              href={`/food/${spotlightVenue.id}`}
              image={foodCoverSrc(spotlightVenue.cover_image, spotlightVenue.cuisine)}
              fallbackImage={foodCoverSrc(null, spotlightVenue.cuisine)}
              partnerLabel={spotlightVenue.partner_label || 'Featured Partner'}
              location={spotlightVenue.city ? `${spotlightVenue.city}, ${spotlightVenue.region}` : spotlightVenue.region}
              meta={`From ${priceLevelLabel(spotlightVenue.price_level)} / person`}
              rating={spotlightVenue.rating_avg ? Number.parseFloat(spotlightVenue.rating_avg).toFixed(1) : null}
            />
          ) : null}

          {!isLoading && showRichSections && (
            <VenueSpotlightStories venues={featured} />
          )}

          {!isLoading && featured.length > 0 && (
            <section className="acc-featured fd-featured-section" aria-labelledby="fd-featured-title">
              <div className="acc-featured__head">
                <div>
                  <h2 id="fd-featured-title" className="acc-featured__title">
                    Popular food spots
                  </h2>
                  <p className="acc-featured__sub">
                    Restaurants, cafés, and local favourites people are checking out.
                  </p>
                </div>
              </div>
              <div className="acc-featured__rail">
                {featured.map((f) => {
                  const location = f.city ? `${f.city}, ${f.region}` : f.region
                  const openLabel = foodOpenBadge(f.is_open, f.closes_at)
                  const partner = partnerBadgeFields(f, cuisineLabel(f.cuisine))
                  return (
                    <Link key={`fd-featured-${f.id}`} to={`/food/${f.id}`} className="acc-featured-card">
                      <div className="acc-featured-card__media">
                        <img
                          className="acc-featured-card__img"
                          src={foodCoverSrc(f.cover_image, f.cuisine)}
                          alt={f.name}
                          loading="lazy"
                          onError={(e) => onFoodImgError(e, f.cuisine)}
                        />
                        {partner.isFeaturedPartner && partner.partnerLabel ? (
                          <span className="featured-card__partner" style={{ position: 'absolute', left: 10, top: 10, zIndex: 2 }}>
                            {partner.partnerLabel}
                          </span>
                        ) : openLabel ? (
                          <span
                            className={`fd-card__open-badge${f.is_open === false ? ' fd-card__open-badge--closed' : ''}`}
                            style={{ position: 'absolute', left: 10, bottom: 10, zIndex: 2 }}
                          >
                            {openLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="acc-featured-card__body">
                        <span className="acc-featured-card__type">{partner.eyebrow ?? cuisineLabel(f.cuisine)}</span>
                        <p className="acc-featured-card__title">{f.name}</p>
                        <p className="acc-featured-card__meta">
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          {location}
                        </p>
                        <p className="acc-featured-card__price">
                          From {priceLevelLabel(f.price_level)}
                          <span> / person</span>
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {hasFilters && (
            <div className="ev-page__filter-summary acc-page__filter-summary">
              <span className="ev-page__filter-summary-text acc-page__filter-summary-text">
                Filtered
                {cuisine ? ` · ${cuisineMeta(cuisine).label}` : ''}
                {mood ? ` · ${MOOD_FILTERS.find((m) => m.id === mood)?.label}` : ''}
                {search ? ` · “${search}”` : ''}
              </span>
              <button type="button" className="ev-page__filter-clear acc-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <EmptyState
              iconElement={<Utensils size={28} strokeWidth={1.75} />}
              title="We couldn't load food spots"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
              className="fd-page__empty"
            />
          )}

          {isLoading && !isError && (
            <div className="fd-page__skeleton-wrap">
              <ListSkeleton count={4} />
            </div>
          )}

          {!isLoading && !isError && venues.length > 0 && (
            <p className="acc-page__results-summary fd-page__results-summary" role="status">
              {resultsSummary(venues.length, hasFilters, search)}
            </p>
          )}

          <div className="acc-page__grid ev-page__grid fd-page__grid">
            {venues.map((f) => (
              <FoodListingCard key={f.id} venue={f} saved={savedIds.has(f.id)} onToggleSave={toggleSaved} />
            ))}
          </div>

          {!isLoading && !isError && venues.length === 0 && (
            <EmptyState
              iconElement={<Utensils size={28} strokeWidth={1.75} />}
              title={
                hasFilters || search
                  ? 'No food spots found'
                  : (data?.length ?? 0) > 0
                    ? 'No food spots found'
                    : 'No food spots listed yet'
              }
              sub={
                hasFilters || search
                  ? 'Try changing your cuisine, city, price, or filters.'
                  : 'Restaurants, cafés, bars, and local food places will appear here once added.'
              }
              cta={hasFilters || search ? { label: 'Show all food spots', onClick: clearAll } : undefined}
              className="fd-page__empty"
            />
          )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Food discovery" />
      </div>
    </div>
  )
}
