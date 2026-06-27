import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  BedDouble,
  Bookmark,
  Building,
  Building2,
  Car,
  Coffee,
  Heart,
  Home,
  MapPin,
  Minus,
  PawPrint,
  Plus,
  SlidersHorizontal,
  Star,
  Tent,
  Trees,
  Users,
  Waves,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CategorySpotlightHero } from '../components/CategorySpotlightHero'
import { useToggleStaySave } from '../hooks/useStaySave'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { MarketplaceBadge, MarketplaceHero, QuickFilterChips, SearchPanel } from '../components/marketplace'
import { EmptyState, ListSkeleton } from '../components/ui'

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
  saves_count?: number
  saved_by_me?: boolean
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
}

const PROPERTY_TYPES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'hotel', label: 'Hotel', Icon: Building2 },
  { value: 'guesthouse', label: 'Guest house', Icon: Home },
  { value: 'apartment', label: 'Apartment', Icon: Building },
  { value: 'lodge', label: 'Lodge', Icon: Trees },
  { value: 'hostel', label: 'Hostel', Icon: BedDouble },
  { value: 'villa', label: 'Villa', Icon: Home },
  { value: 'resort', label: 'Resort', Icon: Waves },
  { value: 'bed_and_breakfast', label: 'B&B', Icon: Coffee },
  { value: 'camping_glamping', label: 'Camping', Icon: Tent },
]

const SIDEBAR_PROPERTY_TYPES: { label: string; value: string }[] = [
  { label: 'Hotel', value: 'hotel' },
  { label: 'Lodge', value: 'lodge' },
  { label: 'Guest house', value: 'guesthouse' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Resort', value: 'resort' },
  { label: 'B&B', value: 'bed_and_breakfast' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay'] as const

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

function propertyTypeIcon(type: string | null | undefined): LucideIcon {
  const t = (type || '').toLowerCase()
  return PROPERTY_TYPES.find((x) => x.value === t)?.Icon ?? Building2
}

function resultsSummary(count: number, hasFilters: boolean, search: string) {
  const noun = count === 1 ? 'stay' : 'stays'
  if (search && hasFilters) return `${count} ${noun} for “${search}” match your filters`
  if (search) return `${count} ${noun} for “${search}”`
  if (hasFilters) return `${count} ${noun} match your filters`
  return `${count} ${noun} available`
}

function trustBadges(a: AccListing) {
  const badges: ReactNode[] = []
  if ((a.rating_count ?? 0) >= 20) {
    badges.push(
      <MarketplaceBadge key="popular" variant="popular">
        Popular stay
      </MarketplaceBadge>,
    )
  }
  if (a.breakfast) badges.push(<MarketplaceBadge key="breakfast">Breakfast</MarketplaceBadge>)
  if (a.wifi) badges.push(<MarketplaceBadge key="wifi">Free Wi-Fi</MarketplaceBadge>)
  if (a.pet_friendly) badges.push(<MarketplaceBadge key="pet">Pet friendly</MarketplaceBadge>)
  if (a.pool) badges.push(<MarketplaceBadge key="pool">Pool</MarketplaceBadge>)
  if (a.parking) badges.push(<MarketplaceBadge key="parking">Parking</MarketplaceBadge>)
  return badges.slice(0, 3)
}

function StayImagePlaceholder({ type }: { type: string | null | undefined }) {
  const Icon = propertyTypeIcon(type)
  return (
    <div className="acc-media-card__placeholder" aria-hidden>
      <Icon size={32} strokeWidth={1.75} />
    </div>
  )
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
  const [amenityBreakfast, setAmenityBreakfast] = useState(false)
  const [petFriendlyOnly, setPetFriendlyOnly] = useState(false)
  const [budgetOnly, setBudgetOnly] = useState(false)
  const [familyOnly, setFamilyOnly] = useState(false)
  const [coastOnly, setCoastOnly] = useState(false)

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accommodation', qs, profile?.username ?? 'anon'],
    queryFn: async () =>
      asArray<AccListing>(
        await apiFetch(`/api/accommodation/listings/${qs}`, { auth: Boolean(profile) }),
      ),
  })

  const { data: spotlight = [] } = useFeaturedPlacement<AccListing>(
    'stays-spotlight',
    FEATURED_API.spotlight('accommodation'),
  )
  const { data: featuredStays = [] } = useFeaturedPlacement<AccListing>('stays-featured-rail', FEATURED_API.stays)

  const spotlightStay = spotlight[0]
  const featured = useMemo(() => featuredStays.slice(0, 5), [featuredStays])

  useEffect(() => {
    if (spotlightStay?.promotion_id) {
      trackPromotion(spotlightStay.promotion_id, 'impression')
    }
  }, [spotlightStay?.promotion_id])

  const likeMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/accommodation/listings/${listingId}/like/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accommodation'] })
    },
  })

  const saveMut = useToggleStaySave()

  const onToggleLike = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profile) {
      navigate('/login')
      return
    }
    likeMut.mutate(listingId)
  }

  const onToggleSave = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profile) {
      navigate('/login')
      return
    }
    saveMut.mutate(listingId)
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
      if (amenityBreakfast && !a.breakfast) return false
      if (petFriendlyOnly && !a.pet_friendly) return false
      if (budgetOnly && parseFloat(a.price_per_night) > 80) return false
      if (familyOnly && (a.max_guests ?? 0) < 4) return false
      if (coastOnly) {
        const coast = /erongo|swakop|walvis|coast/i.test(`${a.region} ${a.city ?? ''}`)
        if (!coast) return false
      }
      return true
    })
  }, [listings, minGuests, amenityWifi, amenityPool, amenityParking, amenityKitchen, amenityBreakfast, petFriendlyOnly, budgetOnly, familyOnly, coastOnly])

  const hasApiFilters = !!(propType || minPrice || maxPrice || search)
  const hasClientFilters =
    minGuests > 1 ||
    amenityWifi ||
    amenityPool ||
    amenityParking ||
    amenityKitchen ||
    amenityBreakfast ||
    petFriendlyOnly ||
    budgetOnly ||
    familyOnly ||
    coastOnly
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
    setAmenityBreakfast(false)
    setPetFriendlyOnly(false)
    setBudgetOnly(false)
    setFamilyOnly(false)
    setCoastOnly(false)
  }

  const quickChipActive = (id: string) => {
    if (id === 'pool') return amenityPool
    if (id === 'breakfast') return amenityBreakfast
    if (id === 'pet') return petFriendlyOnly
    if (id === 'budget') return budgetOnly
    if (id === 'family') return familyOnly
    if (id === 'coast') return coastOnly
    return false
  }

  const onQuickChip = (id: string) => {
    if (id === 'pool') setAmenityPool((v) => !v)
    if (id === 'breakfast') setAmenityBreakfast((v) => !v)
    if (id === 'pet') setPetFriendlyOnly((v) => !v)
    if (id === 'budget') setBudgetOnly((v) => !v)
    if (id === 'family') setFamilyOnly((v) => !v)
    if (id === 'coast') setCoastOnly((v) => !v)
  }

  const petFriendlyCount = useMemo(
    () => listings.filter((a) => a.pet_friendly).length,
    [listings],
  )

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-stays',
        title: 'Popular stays',
        type: 'links',
        items: SIDEBAR_PROPERTY_TYPES.map(({ label, value }) => ({
          label,
          active: propType === value,
          onClick: () => setPropType(propType === value ? '' : value),
        })),
      },
      {
        id: 'stays-pulse',
        title: 'Stays pulse',
        type: 'stats',
        items: [
          { value: listings.length ? listings.length : '—', label: 'stays available' },
          { value: petFriendlyCount ? petFriendlyCount : '—', label: 'pet-friendly stays' },
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
  }, [listings.length, petFriendlyCount, propType])

  return (
    <div className="ev-page acc-page disc-page mk-page">
      <MarketplaceHero
        title="Find places to stay"
        subtitle="Hotels, lodges, apartments, guesthouses, campsites, and unique stays for every kind of trip."
        support="Compare price, location, amenities, and traveller trust signals."
        action={
          <button
            type="button"
            className={`acc-page__filter-btn btn btn-ghost${showFilters ? ' acc-page__filter-btn--active' : ''}${hasFilters ? ' acc-page__filter-btn--has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        }
      />

      <QuickFilterChips
        ariaLabel="Stay quick filters"
        className="acc-page__quick-chips"
        chips={[
          { id: 'pool', label: 'Pool', Icon: Waves, active: quickChipActive('pool') },
          { id: 'breakfast', label: 'Breakfast', Icon: Coffee, active: quickChipActive('breakfast') },
          { id: 'pet', label: 'Pet friendly', Icon: PawPrint, active: quickChipActive('pet') },
          { id: 'budget', label: 'Budget', Icon: BadgeDollarSign, active: quickChipActive('budget') },
          { id: 'family', label: 'Family friendly', Icon: Users, active: quickChipActive('family') },
          { id: 'coast', label: 'Near coast', Icon: Waves, active: quickChipActive('coast') },
        ]}
        onChipClick={onQuickChip}
      />

      <section className="ev-page__discover acc-page__discover card" aria-labelledby="acc-discover-title">
        <h2 id="acc-discover-title" className="ev-page__discover-title">
          Browse by property style
        </h2>
        <p className="ev-page__discover-sub">
          Pick a stay type, then search or refine with price and amenities.
        </p>
        <div className="ev-page__discover-chips acc-page__property-chips" role="group" aria-label="Property types">
          {PROPERTY_TYPES.map(({ value, label, Icon }) => (
            <button
              key={`acc-disc-${value}`}
              type="button"
              className={`acc-quick-chip ev-page__discover-chip acc-page__property-chip${propType === value ? ' acc-quick-chip--active' : ''}`}
              onClick={() => setPropType(propType === value ? '' : value)}
              aria-pressed={propType === value}
            >
              <Icon className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <SearchPanel
        id="acc-search"
        label="Search stays"
        placeholder="City, region, or listing name…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
      />

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
                  <Minus size={16} strokeWidth={2.25} aria-hidden />
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
                  <Plus size={16} strokeWidth={2.25} aria-hidden />
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
                <Wifi size={15} strokeWidth={2.25} aria-hidden />
                Wi-Fi
              </label>
              <label className="acc-page__check">
                <input type="checkbox" checked={amenityPool} onChange={(e) => setAmenityPool(e.target.checked)} />
                <Waves size={15} strokeWidth={2.25} aria-hidden />
                Pool
              </label>
              <label className="acc-page__check">
                <input
                  type="checkbox"
                  checked={amenityParking}
                  onChange={(e) => setAmenityParking(e.target.checked)}
                />
                <Car size={15} strokeWidth={2.25} aria-hidden />
                Parking
              </label>
              <label className="acc-page__check">
                <input
                  type="checkbox"
                  checked={amenityKitchen}
                  onChange={(e) => setAmenityKitchen(e.target.checked)}
                />
                <Home size={15} strokeWidth={2.25} aria-hidden />
                Kitchen
              </label>
            </div>
          </fieldset>
        </div>
      )}

      <div className="disc-page__layout">
        <main className="disc-page__main">
          {spotlightStay?.is_featured_partner ? (
            <CategorySpotlightHero
              title={spotlightStay.title}
              subtitle={propLabel(spotlightStay.property_type) ?? undefined}
              href={promotionHref(`/accommodation/${spotlightStay.id}`, spotlightStay.promotion_id)}
              image={spotlightStay.cover_image ? mediaUrl(spotlightStay.cover_image) : null}
              fallbackImage="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
              partnerLabel={spotlightStay.partner_label || 'Featured Partner'}
              location={spotlightStay.city ? `${spotlightStay.city}, ${spotlightStay.region}` : spotlightStay.region}
              meta={`From N$${spotlightStay.price_per_night} / night`}
              rating={
                spotlightStay.rating_avg ? Number.parseFloat(spotlightStay.rating_avg).toFixed(1) : null
              }
            />
          ) : null}

          {!isLoading && featured.length > 0 && (
            <section className="acc-featured" aria-labelledby="acc-featured-title">
              <div className="acc-featured__head">
                <div>
                  <h2 id="acc-featured-title" className="acc-featured__title">
                    Featured stays
                  </h2>
                  <p className="acc-featured__sub">Promoted places travellers are booking on DELVE.</p>
                </div>
              </div>
              <div className="acc-featured__rail">
                {featured.map((a) => {
                  const loc = a.city ? `${a.city}, ${a.region}` : a.region
                  const pt = propLabel(a.property_type)
                  const PlaceIcon = propertyTypeIcon(a.property_type)
                  const href = promotionHref(`/accommodation/${a.id}`, a.promotion_id)
                  return (
                    <Link
                      key={`acc-featured-${a.id}`}
                      to={href}
                      className="acc-featured-card"
                      onClick={() => {
                        if (a.promotion_id) trackPromotion(a.promotion_id, 'click')
                      }}
                    >
                      <div className="acc-featured-card__media">
                        {a.cover_image ? (
                          <img
                            className="acc-featured-card__img"
                            src={mediaUrl(a.cover_image) || ''}
                            alt={a.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="acc-featured-card__placeholder">
                            <PlaceIcon size={28} strokeWidth={1.75} aria-hidden />
                          </div>
                        )}
                        {a.is_featured_partner ? (
                          <span className="featured-card__partner acc-featured-card__partner">
                            {a.partner_label || 'Featured Partner'}
                          </span>
                        ) : null}
                      </div>
                      <div className="acc-featured-card__body">
                        {pt ? <span className="acc-featured-card__type">{pt}</span> : null}
                        <p className="acc-featured-card__title">{a.title}</p>
                        <p className="acc-featured-card__meta">
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          {loc}
                        </p>
                        <p className="acc-featured-card__price">
                          From N${a.price_per_night}
                          <span> / night</span>
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
                {propType ? ` · ${propLabel(propType)}` : ''}
                {minPrice ? ` · from $${minPrice}` : ''}
                {maxPrice ? ` · up to $${maxPrice}` : ''}
                {search ? ` · “${search}”` : ''}
                {minGuests > 1 ? ` · ${minGuests}+ guests` : ''}
                {amenityWifi ? ' · Wi-Fi' : ''}
                {amenityPool ? ' · Pool' : ''}
                {amenityParking ? ' · Parking' : ''}
                {amenityKitchen ? ' · Kitchen' : ''}
                {amenityBreakfast ? ' · Breakfast' : ''}
                {petFriendlyOnly ? ' · Pet friendly' : ''}
                {budgetOnly ? ' · Budget' : ''}
                {familyOnly ? ' · Family' : ''}
                {coastOnly ? ' · Near coast' : ''}
              </span>
              <button type="button" className="ev-page__filter-clear acc-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <EmptyState
              iconElement={<Building2 size={28} strokeWidth={1.75} />}
              title="We couldn't load stays"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
              className="acc-page__empty"
            />
          )}

          {isLoading && !isError && (
            <div className="acc-page__skeleton-wrap">
              <ListSkeleton count={3} />
            </div>
          )}

          {!isLoading && !isError && filteredListings.length > 0 && (
            <p className="acc-page__results-summary" role="status">
              {resultsSummary(filteredListings.length, hasFilters, search)}
            </p>
          )}

          <div className="acc-page__grid ev-page__grid">
            {filteredListings.map((a) => {
              const liked = Boolean(a.liked_by_me)
              const saved = Boolean(a.saved_by_me)
              const likeCount = a.likes_count ?? 0
              const location = a.city ? `${a.city}, ${a.region}` : a.region
              const typeLabel = propLabel(a.property_type)
              const likePending = likeMut.isPending && likeMut.variables === a.id
              const savePending = saveMut.isPending && saveMut.variables === a.id
              const badges = trustBadges(a)

              return (
                <Link key={a.id} to={`/accommodation/${a.id}`} className="media-card acc-media-card">
                  <div className="acc-media-card__img-wrap">
                    {a.cover_image ? (
                      <img
                        className="acc-media-card__img"
                        src={mediaUrl(a.cover_image) || ''}
                        alt={a.title}
                        loading="lazy"
                      />
                    ) : (
                      <StayImagePlaceholder type={a.property_type} />
                    )}
                    {likeCount > 0 && (
                      <span className="acc-media-card__like-count" aria-label={`${likeCount} likes`}>
                        <Heart size={12} strokeWidth={2.25} aria-hidden />
                        {likeCount}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`acc-media-card__save${liked ? ' acc-media-card__save--saved' : ''}`}
                      aria-label={liked ? 'Unlike this stay' : 'Like this stay'}
                      disabled={likePending}
                      onClick={(e) => onToggleLike(a.id, e)}
                    >
                      <Heart size={18} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`acc-media-card__bookmark${saved ? ' acc-media-card__bookmark--saved' : ''}`}
                      aria-label={saved ? 'Remove saved stay' : 'Save stay'}
                      disabled={savePending}
                      onClick={(e) => onToggleSave(a.id, e)}
                    >
                      <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
                    </button>
                  </div>
                  <div className="media-card__body">
                    {badges.length > 0 ? <div className="mk-card-trust acc-media-card__trust">{badges}</div> : null}
                    {typeLabel ? (
                      <div className="acc-media-card__type-row">
                        <span className="acc-media-card__type">{typeLabel}</span>
                      </div>
                    ) : null}
                    <h2 className="media-card__title acc-media-card__title">{a.title}</h2>
                    <p className="media-card__meta acc-media-card__location">
                      <MapPin size={13} strokeWidth={2.25} aria-hidden />
                      {location}
                    </p>
                    {a.bedrooms != null || a.max_guests != null ? (
                      <p className="media-card__meta acc-media-card__guests">
                        {a.bedrooms != null ? (
                          <span className="acc-media-card__meta-item">
                            <BedDouble size={13} strokeWidth={2.25} aria-hidden />
                            {a.bedrooms} bed{a.bedrooms === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        {a.max_guests != null ? (
                          <span className="acc-media-card__meta-item">
                            <Users size={13} strokeWidth={2.25} aria-hidden />
                            {a.max_guests} guests
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {a.rating_avg != null && (
                      <p className="media-card__meta acc-media-card__rating-row">
                        <Star size={13} strokeWidth={2.25} aria-hidden className="acc-media-card__star" />
                        {parseFloat(a.rating_avg).toFixed(1)}
                        {a.rating_count ? <span className="acc-media-card__rating-count"> ({a.rating_count})</span> : null}
                      </p>
                    )}
                    <div className="acc-media-card__amenities">
                      {a.pet_friendly ? (
                        <span className="acc-media-card__amenity">
                          <PawPrint size={12} strokeWidth={2.25} aria-hidden />
                          Pet friendly
                        </span>
                      ) : null}
                      {a.wifi ? (
                        <span className="acc-media-card__amenity">
                          <Wifi size={12} strokeWidth={2.25} aria-hidden />
                          Wi-Fi
                        </span>
                      ) : null}
                    </div>
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

          {!isLoading && !isError && filteredListings.length === 0 && (
            <EmptyState
              iconElement={<Building2 size={28} strokeWidth={1.75} />}
              title={listings.length > 0 || hasFilters ? 'No stays found' : 'No stays listed yet'}
              sub={
                listings.length > 0 || hasFilters
                  ? 'Try changing your destination, price, guests, or amenities.'
                  : 'Hotels, lodges, apartments, and guesthouses will appear here once providers add them.'
              }
              cta={hasFilters ? { label: 'Show all stays', onClick: clearAll } : undefined}
              className="acc-page__empty"
            />
          )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Stays discovery" />
      </div>
    </div>
  )
}
