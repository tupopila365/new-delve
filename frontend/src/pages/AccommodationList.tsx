import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, Bookmark, Building2, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  AccommodationListingCard,
  type AccommodationCardListing,
} from '../components/accommodation/AccommodationListingCard'
import { EmptyState, ListSkeleton } from '../components/ui'
import { useToggleStaySave } from '../hooks/useStaySave'
import { useAccountActionGate } from '../hooks/useAccountActionGate'
import { useExploreDestination } from '../hooks/useExploreDestination'
import { useExploreNearPoint } from '../hooks/useExploreNearPoint'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import { useForYou } from '../hooks/useForYou'
import { formatDisplayMoney } from '../lib/displayMoney'
import { listingMatchesExplore } from '../lib/exploreDestination'
import { compareByDistance, formatDistanceKm, listingDistanceKm } from '../lib/geoDistance'
import { listingTrustBoost } from '../lib/listingTrust'
import { listingTasteTags } from '../lib/forYouDeep'
import { useForYouDeep } from '../hooks/useForYouDeep'
import { ExploreNearPointControl } from '../components/explore/ExploreNearPointControl'
import { ExploreResultsMap } from '../components/explore/ExploreResultsMap'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { HostStoriesRow } from '../components/HostStoriesRow'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import '../components/accommodation/stay-list.css'

type AccListing = AccommodationCardListing & {
  saves_count?: number
  saved_by_me?: boolean
  liked_by_me?: boolean
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
  description?: string
  latitude?: number | string | null
  longitude?: number | string | null
  owner_verified?: boolean
  niche_tags?: string[] | null
  amenities?: string[] | null
}

type SortId = 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'distance'

type AmenityId = 'pool' | 'wifi' | 'parking' | 'kitchen' | 'breakfast' | 'pets'
type GoodForId = 'budget' | 'family' | 'coast' | 'verified'

const AMENITY_OPTIONS: { value: AmenityId; label: string }[] = [
  { value: 'pool', label: 'Pool' },
  { value: 'wifi', label: 'Wifi' },
  { value: 'parking', label: 'Parking' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'pets', label: 'Pets' },
]

const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  AMENITY_OPTIONS.map((a) => [a.value, a.label]),
)

const GOOD_FOR_OPTIONS_BASE: { value: GoodForId; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'family', label: 'Family-friendly' },
  { value: 'coast', label: 'On the coast' },
  { value: 'verified', label: 'Verified hosts' },
]

const PRICE_BUCKETS_BASE: { value: string; min: string; max: string }[] = [
  { value: 'lt500', min: '', max: '500' },
  { value: '500-1000', min: '500', max: '1000' },
  { value: '1000-2000', min: '1000', max: '2000' },
  { value: 'gt2000', min: '2000', max: '' },
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

const COLLECTIONS_BASE: { id: string; label: string; amenity?: AmenityId; need?: 'budget' | 'family' | 'coast' }[] = [
  { id: 'pool-picks', label: 'Pool picks', amenity: 'pool' },
  { id: 'pet-friendly', label: 'Pet friendly', amenity: 'pets' },
  { id: 'budget-nights', label: 'Budget nights', need: 'budget' },
]

/** Local-currency budget ceiling for demo inventory / filters. */
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

function sortStays(
  list: AccListing[],
  sort: SortId,
  forYouAffinity = 0,
  nearPoint: { latitude: number; longitude: number } | null = null,
  itemBoost: (vertical: 'stays', id: number, tags: string[]) => number = () => 0,
  exploring = true,
): AccListing[] {
  const next = [...list]
  const personalWeight = exploring ? 1 : 1.65
  next.sort((a, b) => {
    if (sort === 'distance' && nearPoint) {
      return compareByDistance(listingDistanceKm(nearPoint, a), listingDistanceKm(nearPoint, b))
    }
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
      listingTrustBoost(s) +
      itemBoost('stays', s.id, listingTasteTags(s)) * personalWeight +
      (s.wifi ? 0.4 : 0) +
      (s.pool ? 0.3 : 0) +
      forYouAffinity * (exploring ? 2.5 : 1.1) +
      (s.saved_by_me ? 1.5 : 0) +
      (s.liked_by_me ? 0.8 : 0)
    return score(b) - score(a)
  })
  return next
}

export function AccommodationList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const gate = useAccountActionGate()
  const { country, region: exploreRegion, label: exploreLabel, exploring } = useExploreDestination()
  const { point: nearPoint } = useExploreNearPoint()
  const { currency, format, threshold } = useDisplayMoney()
  const { boost } = useForYou()
  const staysAffinity = boost('stays')
  const { itemBoost } = useForYouDeep()
  const queryClient = useQueryClient()
  const saveMut = useToggleStaySave()
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const goodForOptions = useMemo(
    () =>
      GOOD_FOR_OPTIONS_BASE.map((o) =>
        o.value === 'budget'
          ? { ...o, label: `Budget (${threshold(BUDGET_MAX_PRICE, 'under').toLowerCase()})` }
          : o,
      ),
    [threshold],
  )

  const priceBuckets = useMemo(
    () =>
      PRICE_BUCKETS_BASE.map((b) => {
        if (b.value === 'lt500') {
          return { ...b, label: threshold(500, 'under') }
        }
        if (b.value === '500-1000') {
          return {
            ...b,
            label: `${formatDisplayMoney(500, currency)} – ${formatDisplayMoney(1000, currency).replace(/^[^\d]+/, '')}`,
          }
        }
        if (b.value === '1000-2000') {
          return {
            ...b,
            label: `${formatDisplayMoney(1000, currency)} – ${formatDisplayMoney(2000, currency).replace(/^[^\d]+/, '')}`,
          }
        }
        return { ...b, label: `${formatDisplayMoney(2000, currency)}+` }
      }),
    [currency, threshold],
  )

  const collections = useMemo(
    () =>
      COLLECTIONS_BASE.map((c) =>
        c.need === 'budget' ? { ...c, label: threshold(BUDGET_MAX_PRICE, 'under') } : c,
      ),
    [threshold],
  )

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const [guests, setGuests] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [amenities, setAmenities] = useState<Set<AmenityId>>(new Set())
  const [budgetOnly, setBudgetOnly] = useState(false)
  const [familyOnly, setFamilyOnly] = useState(false)
  const [coastOnly, setCoastOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [propType, setPropType] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceBucket, setPriceBucket] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (nearPoint) setSort('distance')
    else setSort((s) => (s === 'distance' ? 'recommended' : s))
  }, [nearPoint?.latitude, nearPoint?.longitude, nearPoint?.label])

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
    if (exploring && exploreRegion) p.set('region', exploreRegion)
    if (exploring && country) p.set('country_code', country)
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
    exploreRegion,
    exploring,
    country,
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
    queryKey: [
      'accommodation',
      qs,
      exploring ? country : 'my-delve',
      exploring ? exploreRegion : '',
      profile?.username ?? 'anon',
    ],
    queryFn: async () =>
      asArray<AccListing>(
        await apiFetch(`/api/accommodation/listings/${qs}`, { auth: Boolean(profile) }),
      ),
  })

  const savedQuery = useQuery({
    queryKey: ['saved-stays', profile?.username ?? 'anon'],
    queryFn: async () =>
      asArray<AccListing>(
        await apiFetch('/api/accommodation/listings/saved/', { auth: true }),
      ),
    enabled: savedOnly && Boolean(profile),
  })

  const { data: featuredStays = [] } = useFeaturedPlacement<AccListing>(
    'stays-featured-rail',
    FEATURED_API.stays,
  )

  const listings = useMemo(() => {
    if (savedOnly) {
      return sortStays(
        [...(savedQuery.data ?? [])],
        sort,
        staysAffinity,
        nearPoint,
        itemBoost,
        exploring,
      )
    }
    let list = [...(data ?? [])]
    if (exploring) {
      if (!exploreRegion) {
        list = list.filter((row) => listingMatchesExplore(row, country, ''))
      }
    }
    if (coastOnly) list = list.filter(stayMatchesCoast)
    if (verifiedOnly) list = list.filter((s) => Boolean(s.owner_verified))
    return sortStays(list, sort, staysAffinity, nearPoint, itemBoost, exploring)
  }, [
    savedOnly,
    savedQuery.data,
    data,
    coastOnly,
    verifiedOnly,
    sort,
    country,
    exploreRegion,
    exploring,
    staysAffinity,
    itemBoost,
    nearPoint,
  ])

  const activeLoading = savedOnly ? savedQuery.isLoading : isLoading
  const activeError = savedOnly ? savedQuery.isError : isError
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
      coastOnly ||
      verifiedOnly,
  )

  const showDiscovery =
    !isLoading && !hasFilters && !savedOnly && inventoryCount >= DISCOVERY_MIN_STAYS
  const showFeaturedRail = showDiscovery && featured.length > 0

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
    setVerifiedOnly(false)
    setPropType('')
    setMinBedrooms('')
    setMinRating('')
    setMinPrice('')
    setMaxPrice('')
    setPriceBucket('')
  }

  const toggleAmenity = (id: AmenityId) => {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Single-select amenity dropdown value (empty when 0 or many selected). */
  const amenityValue = amenities.size === 1 ? [...amenities][0] : ''
  const goodForValue: GoodForId | '' = budgetOnly
    ? 'budget'
    : familyOnly
      ? 'family'
      : coastOnly
        ? 'coast'
        : verifiedOnly
          ? 'verified'
          : ''

  const onAmenityChange = (value: string) => {
    setAmenities(value ? new Set([value as AmenityId]) : new Set())
  }

  const onGoodForChange = (value: string) => {
    setBudgetOnly(value === 'budget')
    setFamilyOnly(value === 'family')
    setCoastOnly(value === 'coast')
    setVerifiedOnly(value === 'verified')
  }

  const onPriceBucketChange = (value: string) => {
    setPriceBucket(value)
    const bucket = priceBuckets.find((b) => b.value === value)
    setMinPrice(bucket?.min ?? '')
    setMaxPrice(bucket?.max ?? '')
  }

  const applyCollection = (c: (typeof collections)[number]) => {
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

  const requireAuth = (action = 'continue') => gate(action)

  const onToggleLike = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth('like this stay')) return
    likeMut.mutate(listingId)
  }

  const onToggleSave = (listingId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth('save this stay')) return
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
          <p className="st-market__explore-hint">
            {exploring ? `Exploring ${exploreLabel}` : 'My Delve · personalized stays'}
          </p>
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
              value={propType}
              onChange={(e) => setPropType(e.target.value)}
              aria-label="Property type"
            >
              <option value="">Any type</option>
              {PROPERTY_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="st-market__select"
              value={amenityValue}
              onChange={(e) => onAmenityChange(e.target.value)}
              aria-label="Amenity"
            >
              <option value="">Any amenity</option>
              {AMENITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="st-market__select"
              value={goodForValue}
              onChange={(e) => onGoodForChange(e.target.value)}
              aria-label="Good for"
            >
              <option value="">Good for…</option>
              {goodForOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
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
              className="st-market__select"
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(e.target.value)}
              aria-label="Bedrooms"
            >
              <option value="">Any beds</option>
              <option value="1">1+ beds</option>
              <option value="2">2+ beds</option>
              <option value="3">3+ beds</option>
            </select>

            <select
              className="st-market__select"
              value={priceBucket}
              onChange={(e) => onPriceBucketChange(e.target.value)}
              aria-label="Price per night"
            >
              <option value="">Any price</option>
              {priceBuckets.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="st-market__select"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              aria-label="Minimum rating"
            >
              <option value="">Any rating</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
              <option value="5">5 stars</option>
            </select>

            <select
              className="st-market__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort stays"
            >
              <option value="recommended">Recommended</option>
              <option value="distance" disabled={!nearPoint}>
                Distance{nearPoint ? ` · ${nearPoint.label}` : ''}
              </option>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {exploring ? <ExploreNearPointControl onPointSet={() => setSort('distance')} /> : null}
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
              {AMENITY_LABELS[id] ?? id}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
          {budgetOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setBudgetOnly(false)}>
              {threshold(BUDGET_MAX_PRICE, 'under')} <X size={13} strokeWidth={2.5} aria-hidden />
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
          {verifiedOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setVerifiedOnly(false)}>
              Verified hosts <X size={13} strokeWidth={2.5} aria-hidden />
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
          {priceBucket ? (
            <button
              type="button"
              className="st-market__active-pill"
              onClick={() => onPriceBucketChange('')}
            >
              {priceBuckets.find((b) => b.value === priceBucket)?.label ?? 'Price'}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
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
            {collections.map((c) => (
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
          {activeLoading ? (
            savedOnly ? 'Loading saved stays…' : 'Loading stays…'
          ) : activeError ? (
            'Couldn’t load stays'
          ) : (
            <>
              <strong>{listings.length}</strong> {listings.length === 1 ? 'stay' : 'stays'}
              {savedOnly ? ' saved' : hasFilters ? ' match' : ' to explore'}
              {nearPoint && sort === 'distance' ? ` · nearest to ${nearPoint.label}` : ''}
            </>
          )}
        </p>
        <div className="st-market__results-acts">
          {nearPoint ? (
            <div className="st-market__view-toggle" role="group" aria-label="Results view">
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : undefined}
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List size={14} strokeWidth={2.25} aria-hidden />
                List
              </button>
              <button
                type="button"
                className={viewMode === 'map' ? 'is-active' : undefined}
                aria-pressed={viewMode === 'map'}
                onClick={() => setViewMode('map')}
              >
                <MapIcon size={14} strokeWidth={2.25} aria-hidden />
                Map
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={`st-market__saved-toggle${savedOnly ? ' is-active' : ''}`}
            aria-pressed={savedOnly}
            onClick={() => {
              if (!profile) {
                navigate('/login')
                return
              }
              setSavedOnly((v) => !v)
            }}
          >
            <Bookmark
              size={15}
              strokeWidth={2.25}
              fill={savedOnly ? 'currentColor' : 'none'}
              aria-hidden
            />
            {savedOnly ? 'Saved' : 'Saved stays'}
          </button>
        </div>
      </div>

      {nearPoint && viewMode === 'map' && !activeLoading && !activeError ? (
        <ExploreResultsMap
          origin={nearPoint}
          items={listings.map((a) => ({
            id: a.id,
            title: a.title,
            href: `/accommodation/${a.id}`,
            latitude: a.latitude,
            longitude: a.longitude,
            subtitle: a.city ? `${a.city}, ${a.region}` : a.region,
          }))}
        />
      ) : null}

      {activeError ? (
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="We couldn't load stays"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void (savedOnly ? savedQuery.refetch() : refetch()) }}
          className="st-market__empty"
        />
      ) : null}

      {activeLoading && !activeError ? <ListSkeleton count={6} /> : null}

      {!activeLoading && !activeError && listings.length > 0 && viewMode === 'list' ? (
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
              distanceLabel={
                nearPoint ? formatDistanceKm(listingDistanceKm(nearPoint, a)) : null
              }
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
                          {format(a.price_per_night, { suffix: '/night', from: true })}
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

      {!activeLoading && !activeError && listings.length === 0 ? (
        <EmptyState
          iconElement={
            savedOnly ? <Bookmark size={28} strokeWidth={1.75} /> : <Building2 size={28} strokeWidth={1.75} />
          }
          title={
            savedOnly
              ? 'No saved stays yet'
              : hasFilters
                ? 'No stays match those filters'
                : 'No stays listed yet'
          }
          sub={
            savedOnly
              ? 'Tap the bookmark on any stay to save it here for later.'
              : hasFilters
                ? budgetOnly
                  ? `No stays ${threshold(BUDGET_MAX_PRICE, 'under').toLowerCase()}/night — try another area or clear filters.`
                  : 'Try another area, need, or clear filters to see more places.'
                : 'Hotels, lodges, and guest houses will appear here once hosts add listings.'
          }
          cta={
            savedOnly
              ? { label: 'Browse stays', onClick: () => setSavedOnly(false) }
              : hasFilters
                ? { label: 'Clear filters', onClick: clearAll }
                : undefined
          }
          className="st-market__empty"
        />
      ) : null}

    </div>
  )
}
