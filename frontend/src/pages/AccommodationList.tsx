import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, Building2, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  AccommodationListingCard,
  type AccommodationCardListing,
} from '../components/accommodation/AccommodationListingCard'
import { CommunityComposeModalShell } from '../components/community/CommunityComposeModalShell'
import { EmptyState, ListSkeleton } from '../components/ui'
import { useToggleStaySave } from '../hooks/useStaySave'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { HostStoriesRow } from '../components/HostStoriesRow'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import '../components/accommodation/stay-list.css'

type AccListing = AccommodationCardListing & {
  saves_count?: number
  saved_by_me?: boolean
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
  description?: string
}

type SortId = 'recommended' | 'rating' | 'price_asc' | 'price_desc'

type AmenityId = 'pool' | 'wifi' | 'parking' | 'kitchen' | 'breakfast' | 'pets'

const NEED_CHIPS: { id: AmenityId | 'budget' | 'family' | 'coast'; label: string }[] = [
  { id: 'pool', label: 'Pool' },
  { id: 'wifi', label: 'Wifi' },
  { id: 'parking', label: 'Parking' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'pets', label: 'Pets' },
  { id: 'budget', label: 'Budget' },
  { id: 'family', label: 'Family' },
  { id: 'coast', label: 'Coast' },
]

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'guesthouse', label: 'Guest house' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'villa', label: 'Villa' },
  { value: 'resort', label: 'Resort' },
  { value: 'bed_and_breakfast', label: 'B&B' },
  { value: 'camping_glamping', label: 'Camping' },
]

const PROPERTY_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPES.map((p) => [p.value, p.label]),
)

const TOP_AREAS = [
  'Windhoek',
  'Swakopmund',
  'Walvis Bay',
  'Etosha',
  'Sossusvlei',
  'Lüderitz',
  'Ongwediva',
] as const

/** Cities map to `city=`; destinations without a city use `search=`. */
const CITY_AREAS = new Set(['Windhoek', 'Swakopmund', 'Walvis Bay', 'Lüderitz', 'Ongwediva'])

const COLLECTIONS: { id: string; label: string; amenity?: AmenityId; need?: 'budget' | 'family' | 'coast' }[] = [
  { id: 'pool-picks', label: 'Pool picks', amenity: 'pool' },
  { id: 'pet-friendly', label: 'Pet friendly', amenity: 'pets' },
  { id: 'budget-nights', label: 'Under N$800', need: 'budget' },
]

/** Namibia budget stays often sit under ~N$800/night in demo inventory. */
const BUDGET_MAX_PRICE = 800
const FAMILY_GUESTS = 4
const DISCOVERY_MIN_STAYS = 6
const FALLBACK_STAY_PHOTO = '/images/default-journey.jpg'
const COAST_KEYWORDS = ['erongo', 'swakop', 'walvis', 'coast', 'lüderitz', 'luderitz']

function onStayImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_STAY_PHOTO)) img.src = FALLBACK_STAY_PHOTO
}

function propLabel(v: string | null | undefined) {
  if (!v) return null
  return PROPERTY_LABELS[v] ?? v.replace(/_/g, ' ')
}

function ratingValue(a: AccListing): number {
  const n = a.rating_avg != null && a.rating_avg !== '' ? Number(a.rating_avg) : 0
  return Number.isFinite(n) ? n : 0
}

function nightlyPrice(a: AccListing): number {
  const n = parseFloat(a.price_per_night ?? '')
  return Number.isFinite(n) ? n : Infinity
}

function stayMatchesCoast(a: AccListing): boolean {
  const hay = `${a.region} ${a.city ?? ''} ${a.title} ${a.description ?? ''}`.toLowerCase()
  return COAST_KEYWORDS.some((k) => hay.includes(k))
}

function sortStays(list: AccListing[], sort: SortId): AccListing[] {
  const next = [...list]
  next.sort((a, b) => {
    if (sort === 'price_asc') return nightlyPrice(a) - nightlyPrice(b)
    if (sort === 'price_desc') {
      const ap = nightlyPrice(a)
      const bp = nightlyPrice(b)
      if (ap === Infinity && bp === Infinity) return 0
      if (ap === Infinity) return 1
      if (bp === Infinity) return -1
      return bp - ap
    }
    if (sort === 'rating') {
      const diff = ratingValue(b) - ratingValue(a)
      if (diff !== 0) return diff
      return (b.rating_count ?? 0) - (a.rating_count ?? 0)
    }
    const score = (s: AccListing) =>
      ratingValue(s) * 2 +
      Math.min(s.rating_count ?? 0, 40) / 20 +
      (s.is_featured_partner ? 4 : 0) +
      (s.wifi ? 0.4 : 0) +
      (s.pool ? 0.3 : 0)
    return score(b) - score(a)
  })
  return next
}

export function AccommodationList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const saveMut = useToggleStaySave()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const [guests, setGuests] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [amenities, setAmenities] = useState<Set<AmenityId>>(new Set())
  const [budgetOnly, setBudgetOnly] = useState(false)
  const [familyOnly, setFamilyOnly] = useState(false)
  const [coastOnly, setCoastOnly] = useState(false)
  const [propType, setPropType] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  const effectiveGuests = useMemo(() => {
    if (familyOnly) return String(Math.max(FAMILY_GUESTS, Number(guests) || 0 || FAMILY_GUESTS))
    return guests
  }, [familyOnly, guests])

  const effectiveMaxPrice = useMemo(() => {
    if (budgetOnly) {
      const n = Number(maxPrice)
      if (maxPrice && Number.isFinite(n)) return String(Math.min(n, BUDGET_MAX_PRICE))
      return String(BUDGET_MAX_PRICE)
    }
    return maxPrice
  }, [budgetOnly, maxPrice])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (area) {
      if (CITY_AREAS.has(area)) p.set('city', area)
      else p.set('search', search ? `${search} ${area}` : area)
    }
    if (effectiveGuests) p.set('guests', effectiveGuests)
    if (propType) p.set('property_type', propType)
    if (minPrice) p.set('min_price', minPrice)
    if (effectiveMaxPrice) p.set('max_price', effectiveMaxPrice)
    if (minBedrooms) p.set('min_bedrooms', minBedrooms)
    if (minRating) p.set('min_rating', minRating)
    if (amenities.has('pool')) p.set('pool', 'true')
    if (amenities.has('wifi')) p.set('wifi', 'true')
    if (amenities.has('parking')) p.set('parking', 'true')
    if (amenities.has('kitchen')) p.set('kitchen', 'true')
    if (amenities.has('breakfast')) p.set('breakfast', 'true')
    if (amenities.has('pets')) p.set('pet_friendly', 'true')
    if (sort === 'rating') p.set('ordering', '-rating_avg')
    else if (sort === 'price_asc') p.set('ordering', 'price_per_night')
    else if (sort === 'price_desc') p.set('ordering', '-price_per_night')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [
    search,
    area,
    effectiveGuests,
    propType,
    minPrice,
    effectiveMaxPrice,
    minBedrooms,
    minRating,
    amenities,
    sort,
  ])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accommodation', qs, profile?.username ?? 'anon'],
    queryFn: async () =>
      asArray<AccListing>(
        await apiFetch(`/api/accommodation/listings/${qs}`, { auth: Boolean(profile) }),
      ),
  })

  const { data: featuredStays = [] } = useFeaturedPlacement<AccListing>(
    'stays-featured-rail',
    FEATURED_API.stays,
  )

  const listings = useMemo(() => {
    let list = [...(data ?? [])]
    if (coastOnly) list = list.filter(stayMatchesCoast)
    return sortStays(list, sort)
  }, [data, coastOnly, sort])

  const inventoryCount = data?.length ?? 0
  const featured = useMemo(() => featuredStays.slice(0, 8), [featuredStays])

  const hasFilters = Boolean(
    search ||
      area ||
      guests ||
      propType ||
      minPrice ||
      maxPrice ||
      minBedrooms ||
      minRating ||
      amenities.size ||
      budgetOnly ||
      familyOnly ||
      coastOnly,
  )

  const showDiscovery = !isLoading && !hasFilters && inventoryCount >= DISCOVERY_MIN_STAYS
  const showFeaturedRail = showDiscovery && featured.length > 0

  const moreFilterCount = [propType, minBedrooms, minRating, minPrice, maxPrice && !budgetOnly].filter(
    Boolean,
  ).length

  const clearAll = () => {
    setSearchInput('')
    setSearch('')
    setArea('')
    setGuests('')
    setSort('recommended')
    setAmenities(new Set())
    setBudgetOnly(false)
    setFamilyOnly(false)
    setCoastOnly(false)
    setPropType('')
    setMinBedrooms('')
    setMinRating('')
    setMinPrice('')
    setMaxPrice('')
  }

  const toggleAmenity = (id: AmenityId) => {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyNeedChip = (id: AmenityId | 'budget' | 'family' | 'coast') => {
    if (id === 'budget') {
      setBudgetOnly((v) => !v)
      return
    }
    if (id === 'family') {
      setFamilyOnly((v) => !v)
      return
    }
    if (id === 'coast') {
      setCoastOnly((v) => !v)
      return
    }
    toggleAmenity(id)
  }

  const needChipActive = (id: AmenityId | 'budget' | 'family' | 'coast') => {
    if (id === 'budget') return budgetOnly
    if (id === 'family') return familyOnly
    if (id === 'coast') return coastOnly
    return amenities.has(id)
  }

  const applyCollection = (c: (typeof COLLECTIONS)[number]) => {
    if (c.amenity) {
      setAmenities((prev) => new Set(prev).add(c.amenity!))
    }
    if (c.need === 'budget') setBudgetOnly(true)
    if (c.need === 'family') setFamilyOnly(true)
    if (c.need === 'coast') setCoastOnly(true)
  }

  const likeMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ liked: boolean; likes_count: number }>(`/api/accommodation/listings/${listingId}/like/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accommodation'] })
    },
  })

  const requireAuth = () => {
    if (!profile) {
      navigate('/login')
      return false
    }
    return true
  }

  const onToggleLike = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth()) return
    likeMut.mutate(listingId)
  }

  const onToggleSave = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth()) return
    saveMut.mutate(listingId)
  }

  const shareStay = async (listing: AccListing, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/accommodation/${listing.id}`
    const title = listing.title || 'DELVE stay'
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setShareMsg('Link copied')
      }
    } catch {
      // cancelled share stays quiet
    }
  }

  return (
    <div className="st-market">
      {shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <header className="st-market__hero">
        <div className="st-market__hero-head">
          <p className="st-market__kicker">Places to stay</p>
          <h1 className="st-market__title">Find a stay</h1>
          <p className="st-market__sub">Search by area, needs, and budget — compare nightly rates.</p>
        </div>

        <div className="st-market__find">
          <label className="st-market__search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="acc-search"
              type="search"
              placeholder="City, lodge, hotel…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search stays"
            />
            {searchInput ? (
              <button
                type="button"
                className="st-market__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </label>

          <div className="st-market__find-row">
            <select
              className="st-market__select"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="Area"
            >
              <option value="">All areas</option>
              {TOP_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              className="st-market__select"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              aria-label="Guests"
            >
              <option value="">Any guests</option>
              {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={String(n)}>
                  {n}+ guests
                </option>
              ))}
            </select>

            <select
              className="st-market__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort stays"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        <div className="st-market__needs" role="group" aria-label="Need filters">
          <div className="st-market__rail">
            {NEED_CHIPS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`st-market__chip${needChipActive(id) ? ' is-active' : ''}`}
                aria-pressed={needChipActive(id)}
                onClick={() => applyNeedChip(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`st-market__more${moreFilterCount > 0 ? ' is-active' : ''}`}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={14} strokeWidth={2.25} aria-hidden />
              More filters{moreFilterCount > 0 ? ` (${moreFilterCount})` : ''}
            </button>
          </div>
        </div>

        <div className="st-market__types" role="group" aria-label="Property type">
          <div className="st-market__rail">
            {PROPERTY_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`st-market__chip${propType === value ? ' is-active' : ''}`}
                aria-pressed={propType === value}
                onClick={() => setPropType(propType === value ? '' : value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {hasFilters ? (
        <div className="st-market__active" aria-label="Active filters">
          {search ? (
            <button
              type="button"
              className="st-market__active-pill"
              onClick={() => {
                setSearch('')
                setSearchInput('')
              }}
            >
              “{search}” <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {area ? (
            <button type="button" className="st-market__active-pill" onClick={() => setArea('')}>
              {area} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {guests ? (
            <button type="button" className="st-market__active-pill" onClick={() => setGuests('')}>
              {guests}+ guests <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {propType ? (
            <button type="button" className="st-market__active-pill" onClick={() => setPropType('')}>
              {propLabel(propType)} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {[...amenities].map((id) => (
            <button
              key={id}
              type="button"
              className="st-market__active-pill"
              onClick={() => toggleAmenity(id)}
            >
              {NEED_CHIPS.find((n) => n.id === id)?.label ?? id}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
          {budgetOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setBudgetOnly(false)}>
              Under N${BUDGET_MAX_PRICE} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {familyOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setFamilyOnly(false)}>
              Family <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {coastOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setCoastOnly(false)}>
              Coast <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {minBedrooms ? (
            <button type="button" className="st-market__active-pill" onClick={() => setMinBedrooms('')}>
              {minBedrooms}+ beds <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {minRating ? (
            <button type="button" className="st-market__active-pill" onClick={() => setMinRating('')}>
              {minRating}+ stars <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {minPrice ? (
            <button type="button" className="st-market__active-pill" onClick={() => setMinPrice('')}>
              From N${minPrice} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {maxPrice && !budgetOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setMaxPrice('')}>
              Up to N${maxPrice} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="st-market__clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      {showDiscovery ? (
        <section className="st-market__section st-market__section--tight" aria-label="Collections">
          <div className="st-market__rail" role="group">
            {COLLECTIONS.map((c) => (
              <button key={c.id} type="button" className="st-market__chip" onClick={() => applyCollection(c)}>
                {c.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showDiscovery ? <HostStoriesRow /> : null}

      <div className="st-market__results-bar">
        <p className="st-market__count" role="status">
          {isLoading ? (
            'Loading stays…'
          ) : isError ? (
            'Couldn’t load stays'
          ) : (
            <>
              <strong>{listings.length}</strong> {listings.length === 1 ? 'stay' : 'stays'}
              {hasFilters ? ' match' : ' to explore'}
            </>
          )}
        </p>
      </div>

      {isError ? (
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="We couldn't load stays"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="st-market__empty"
        />
      ) : null}

      {isLoading && !isError ? <ListSkeleton count={6} /> : null}

      {!isLoading && !isError && listings.length > 0 ? (
        <div className="st-market__grid">
          {listings.map((a) => (
            <AccommodationListingCard
              key={a.id}
              listing={a}
              typeLabel={propLabel(a.property_type)}
              liked={Boolean(a.liked_by_me)}
              saved={Boolean(a.saved_by_me)}
              likeCount={a.likes_count ?? 0}
              likeBusy={likeMut.isPending && likeMut.variables === a.id}
              onLike={(e) => onToggleLike(a.id, e)}
              onSave={(e) => onToggleSave(a.id, e)}
              onShare={(e) => void shareStay(a, e)}
            />
          ))}
        </div>
      ) : null}

      {/* Featured after main grid — matches Guides; results stay primary */}
      {showFeaturedRail ? (
        <section className="st-market__section" aria-labelledby="st-featured-title">
          <div className="st-market__section-head">
            <div>
              <h2 id="st-featured-title" className="st-market__section-title">
                Featured stays
              </h2>
              <p className="st-market__section-sub">Promoted places travellers book</p>
            </div>
          </div>
          <div className="st-market__featured-rail">
            {featured.map((a) => {
              const partner = partnerBadgeFields(a, propLabel(a.property_type) || 'Stay')
              const href = promotionHref(`/accommodation/${a.id}`, a.promotion_id)
              const place = a.city ? `${a.city}, ${a.region}` : a.region
              const photo = mediaUrl(a.cover_image)
              return (
                <Link
                  key={`st-feat-${a.id}`}
                  to={href}
                  className="st-market__featured"
                  onClick={() => {
                    if (a.promotion_id) trackPromotion(a.promotion_id, 'click')
                  }}
                >
                  <div className="st-market__featured-media">
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" onError={onStayImgError} />
                    ) : (
                      <div className="st-spot__placeholder" aria-hidden>
                        <BedDouble size={28} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="st-market__featured-body">
                    <span className="st-market__featured-type">
                      {partner.eyebrow ?? partner.partnerLabel ?? 'Stay'}
                    </span>
                    <p className="st-market__featured-title">{a.title}</p>
                    <p className="st-market__featured-meta">
                      <MapPin size={12} strokeWidth={2.25} aria-hidden />
                      {place || 'Namibia'}
                      {a.price_per_night ? (
                        <>
                          <span aria-hidden>·</span>
                          From N${a.price_per_night}/night
                        </>
                      ) : null}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && listings.length === 0 ? (
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title={hasFilters ? 'No stays match those filters' : 'No stays listed yet'}
          sub={
            hasFilters
              ? budgetOnly
                ? `No stays under N$${BUDGET_MAX_PRICE}/night — try another area or clear filters.`
                : 'Try another area, need, or clear filters to see more places.'
              : 'Hotels, lodges, and guest houses will appear here once hosts add listings.'
          }
          cta={hasFilters ? { label: 'Clear filters', onClick: clearAll } : undefined}
          className="st-market__empty"
        />
      ) : null}

      <CommunityComposeModalShell
        open={filtersOpen}
        title="More filters"
        titleId="st-filter-modal-title"
        onClose={() => setFiltersOpen(false)}
      >
        <p className="cm-compose-modal__note">Bedrooms, rating, price, and property type.</p>

        <div className="cm-compose-modal__composer-block">
          <span>Stay</span>
          <div className="st-filter-modal__row">
            <label className="st-filter-modal__field">
              <span>Property type</span>
              <select
                className="cm-compose-modal__select"
                value={propType}
                onChange={(e) => setPropType(e.target.value)}
              >
                <option value="">Any type</option>
                {PROPERTY_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="st-filter-modal__field">
              <span>Min bedrooms</span>
              <select
                className="cm-compose-modal__select"
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </label>
          </div>
          <label className="st-filter-modal__field">
            <span>Minimum rating</span>
            <select
              className="cm-compose-modal__select"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Any</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Price / night (N$)</span>
          <div className="st-filter-modal__row">
            <label className="st-filter-modal__field">
              <span>From</span>
              <input
                className="st-filter-modal__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="No min"
              />
            </label>
            <label className="st-filter-modal__field">
              <span>Up to</span>
              <input
                className="st-filter-modal__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No max"
              />
            </label>
          </div>
        </div>

        <div className="st-filter-modal__actions">
          <button
            type="button"
            className="cm-compose-modal__submit st-filter-modal__apply"
            onClick={() => setFiltersOpen(false)}
          >
            Apply
          </button>
          {moreFilterCount > 0 ? (
            <button
              type="button"
              className="st-filter-modal__clear"
              onClick={() => {
                setPropType('')
                setMinBedrooms('')
                setMinRating('')
                setMinPrice('')
                setMaxPrice('')
                setFiltersOpen(false)
              }}
            >
              Clear advanced
            </button>
          ) : null}
        </div>
      </CommunityComposeModalShell>
    </div>
  )
}
