import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BedDouble,
  Bookmark,
  Building2,
  CalendarDays,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
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
import { listingMatchesExplore } from '../lib/exploreDestination'
import { compareByDistance, formatDistanceKm, listingDistanceKm } from '../lib/geoDistance'
import { listingTrustBoost } from '../lib/listingTrust'
import { listingTasteTags } from '../lib/forYouDeep'
import { useForYouDeep } from '../hooks/useForYouDeep'
import {
  AreaPlacesFilter,
  listingMatchesAreaPoint,
} from '../components/explore/AreaPlacesFilter'
import { ExploreResultsMap } from '../components/explore/ExploreResultsMap'
import { CommunityComposeModalShell } from '../components/community/CommunityComposeModalShell'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import { listingHasActiveDeals } from '../components/deals'
import '../components/accommodation/stay-list.css'
import '../components/explore/market-filters-modal.css'

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

type AppliedTrip = {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
}

type StaySearchResponse = {
  query: {
    destination: string
    check_in: string
    check_out: string
    guests: number
    nights: number
  }
  count: number
  sold_out_count: number
  results: AccListing[]
}

type StayQueryResult = {
  results: AccListing[]
  soldOutCount: number
  count: number
  nights: number | null
}

type SortId = 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'distance'

type AmenityId = 'pool' | 'wifi' | 'parking' | 'kitchen' | 'breakfast' | 'pets'
type GoodForId =
  | 'family'
  | 'couples'
  | 'solo'
  | 'groups'
  | 'work'
  | 'coast'
  | 'nature'
  | 'walkable'
  | 'verified'

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

const GOOD_FOR_OPTIONS: { value: GoodForId; label: string }[] = [
  { value: 'family', label: 'Families' },
  { value: 'couples', label: 'Couples' },
  { value: 'solo', label: 'Solo travellers' },
  { value: 'groups', label: 'Groups' },
  { value: 'work', label: 'Work / remote' },
  { value: 'coast', label: 'On the coast' },
  { value: 'nature', label: 'Nature / safari' },
  { value: 'walkable', label: 'Walkable / city' },
  { value: 'verified', label: 'Verified hosts' },
]

const GOOD_FOR_LABELS: Record<GoodForId, string> = Object.fromEntries(
  GOOD_FOR_OPTIONS.map((o) => [o.value, o.label]),
) as Record<GoodForId, string>

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
const COAST_KEYWORDS = ['erongo', 'swakop', 'walvis', 'coast', 'lüderitz', 'luderitz', 'beach', 'seaside']
const NATURE_KEYWORDS = ['safari', 'etosha', 'desert', 'nature', 'wildlife', 'bush', 'lodge', 'dune', 'canyon']
const WALKABLE_KEYWORDS = ['walkable', 'city', 'cbd', 'downtown', 'centre', 'center', 'promenade', 'harbour']
const WORK_KEYWORDS = ['work', 'remote', 'wifi', 'workspace', 'laptop', 'desk']
const COUPLE_KEYWORDS = ['couple', 'romantic', 'honeymoon', 'intimate']
const SOLO_KEYWORDS = ['solo', 'single', 'backpack']
const GROUP_KEYWORDS = ['group', 'party', 'friends', 'team']

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
  const n = parseFloat(a.lowest_available_room_price ?? a.price_per_night ?? '')
  return Number.isFinite(n) ? n : Infinity
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function formatTripDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  )
}

function stayHaystack(a: AccListing): string {
  return [
    a.region,
    a.city ?? '',
    a.title,
    a.description ?? '',
    a.property_type ?? '',
    ...(a.niche_tags ?? []),
    ...(a.amenities ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function stayMatchesCoast(a: AccListing): boolean {
  return COAST_KEYWORDS.some((k) => stayHaystack(a).includes(k))
}

function stayMatchesGoodFor(a: AccListing, id: GoodForId): boolean {
  const hay = stayHaystack(a)
  const guests = a.max_guests ?? 0
  switch (id) {
    case 'family':
      return guests >= FAMILY_GUESTS || hay.includes('family') || Boolean(a.kitchen)
    case 'couples':
      return COUPLE_KEYWORDS.some((k) => hay.includes(k)) || (guests > 0 && guests <= 2)
    case 'solo':
      return SOLO_KEYWORDS.some((k) => hay.includes(k)) || (guests > 0 && guests <= 2)
    case 'groups':
      return GROUP_KEYWORDS.some((k) => hay.includes(k)) || guests >= 6
    case 'work':
      return Boolean(a.wifi) || WORK_KEYWORDS.some((k) => hay.includes(k))
    case 'coast':
      return stayMatchesCoast(a)
    case 'nature':
      return NATURE_KEYWORDS.some((k) => hay.includes(k))
    case 'walkable':
      return WALKABLE_KEYWORDS.some((k) => hay.includes(k))
    case 'verified':
      return Boolean(a.owner_verified)
    default:
      return true
  }
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
  const { point: nearPoint, clear: clearNearPoint } = useExploreNearPoint()
  const { currency, format, threshold } = useDisplayMoney()
  const { boost } = useForYou()
  const staysAffinity = boost('stays')
  const { itemBoost } = useForYouDeep()
  const queryClient = useQueryClient()
  const saveMut = useToggleStaySave()
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const collections = useMemo(
    () =>
      COLLECTIONS_BASE.map((c) =>
        c.need === 'budget' ? { ...c, label: threshold(BUDGET_MAX_PRICE, 'under') } : c,
      ),
    [threshold],
  )

  const [search, setSearch] = useState('')
  const [destinationDraft, setDestinationDraft] = useState('')
  const [checkInDraft, setCheckInDraft] = useState('')
  const [checkOutDraft, setCheckOutDraft] = useState('')
  const [guests, setGuests] = useState('1')
  const [appliedTrip, setAppliedTrip] = useState<AppliedTrip | null>(null)
  const [tripError, setTripError] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [amenities, setAmenities] = useState<Set<AmenityId>>(new Set())
  const [goodFor, setGoodFor] = useState<Set<GoodForId>>(new Set())
  const [propType, setPropType] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [dealsOnly, setDealsOnly] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (nearPoint) setSort('distance')
    else setSort((s) => (s === 'distance' ? 'recommended' : s))
  }, [nearPoint?.latitude, nearPoint?.longitude, nearPoint?.label])

  const effectiveGuests = useMemo(() => {
    if (goodFor.has('family')) {
      return String(Math.max(FAMILY_GUESTS, Number(guests) || 0 || FAMILY_GUESTS))
    }
    return guests
  }, [goodFor, guests])

  const today = localDateString()
  const datedSearch = Boolean(appliedTrip)

  const submitTripSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const destination = destinationDraft.trim()
    const guestCount = Number(guests)
    if (!checkInDraft || !checkOutDraft) {
      setTripError('Choose both check-in and check-out dates.')
      return
    }
    if (checkInDraft < today) {
      setTripError('Check-in cannot be in the past.')
      return
    }
    if (checkOutDraft <= checkInDraft) {
      setTripError('Check-out must be after check-in.')
      return
    }
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      setTripError('Add at least one guest.')
      return
    }
    setTripError('')
    setSearch(destination)
    setAppliedTrip({
      destination,
      checkIn: checkInDraft,
      checkOut: checkOutDraft,
      guests: guestCount,
    })
  }

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (exploring && exploreRegion) p.set('region', exploreRegion)
    if (exploring && country) p.set('country_code', country)
    if (appliedTrip) {
      p.set('check_in', appliedTrip.checkIn)
      p.set('check_out', appliedTrip.checkOut)
      p.set('guests', String(appliedTrip.guests))
    } else if (effectiveGuests) {
      p.set('guests', effectiveGuests)
    }
    if (propType) p.set('property_type', propType)
    if (minPrice) p.set('min_price', minPrice)
    if (maxPrice) p.set('max_price', maxPrice)
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
    exploreRegion,
    exploring,
    country,
    effectiveGuests,
    appliedTrip,
    propType,
    minPrice,
    maxPrice,
    minBedrooms,
    minRating,
    amenities,
    sort,
  ])

  const { data, isLoading, isError, refetch } = useQuery<StayQueryResult>({
    queryKey: [
      'accommodation',
      qs,
      exploring ? country : 'my-delve',
      exploring ? exploreRegion : '',
      profile?.username ?? 'anon',
    ],
    queryFn: async () => {
      if (appliedTrip) {
        const response = await apiFetch<StaySearchResponse>(
          `/api/accommodation/listings/search/${qs}`,
          { auth: Boolean(profile) },
        )
        return {
          results: response.results,
          soldOutCount: response.sold_out_count,
          count: response.count,
          nights: response.query.nights,
        }
      }
      const results = asArray<AccListing>(
        await apiFetch(`/api/accommodation/listings/${qs}`, { auth: Boolean(profile) }),
      )
      return { results, soldOutCount: 0, count: results.length, nights: null }
    },
  })

  const savedQuery = useQuery({
    queryKey: ['saved-stays', profile?.username ?? 'anon'],
    queryFn: async () =>
      asArray<AccListing>(
        await apiFetch('/api/accommodation/listings/saved/', { auth: true }),
      ),
    enabled: savedOnly && !appliedTrip && Boolean(profile),
  })

  const { data: featuredStays = [] } = useFeaturedPlacement<AccListing>(
    'stays-featured-rail',
    FEATURED_API.stays,
  )

  const listings = useMemo(() => {
    if (savedOnly) {
      if (appliedTrip) {
        let saved = [...(data?.results ?? [])].filter((row) => row.saved_by_me)
        if (nearPoint) saved = saved.filter((row) => listingMatchesAreaPoint(row, nearPoint))
        if (dealsOnly) saved = saved.filter((row) => listingHasActiveDeals(row.deals))
        return sortStays(saved, sort, staysAffinity, nearPoint, itemBoost, exploring)
      }
      let saved = [...(savedQuery.data ?? [])]
      if (nearPoint) saved = saved.filter((row) => listingMatchesAreaPoint(row, nearPoint))
      if (dealsOnly) saved = saved.filter((row) => listingHasActiveDeals(row.deals))
      return sortStays(saved, sort, staysAffinity, nearPoint, itemBoost, exploring)
    }
    let list = [...(data?.results ?? [])]
    if (exploring) {
      if (!exploreRegion) {
        list = list.filter((row) => listingMatchesExplore(row, country, ''))
      }
    }
    if (nearPoint) list = list.filter((row) => listingMatchesAreaPoint(row, nearPoint))
    if (goodFor.size > 0) {
      list = list.filter((row) => [...goodFor].every((id) => stayMatchesGoodFor(row, id)))
    }
    if (dealsOnly) list = list.filter((row) => listingHasActiveDeals(row.deals))
    return sortStays(list, sort, staysAffinity, nearPoint, itemBoost, exploring)
  }, [
    savedOnly,
    savedQuery.data,
    data,
    appliedTrip,
    goodFor,
    dealsOnly,
    sort,
    country,
    exploreRegion,
    exploring,
    staysAffinity,
    itemBoost,
    nearPoint,
  ])

  const activeLoading = savedOnly && !appliedTrip ? savedQuery.isLoading : isLoading
  const activeError = savedOnly && !appliedTrip ? savedQuery.isError : isError
  const inventoryCount = data?.results.length ?? 0
  const featured = useMemo(() => featuredStays.slice(0, 8), [featuredStays])

  const hasFilters = Boolean(
    appliedTrip ||
      search ||
      nearPoint ||
      guests !== '1' ||
      propType ||
      minPrice ||
      maxPrice ||
      minBedrooms ||
      minRating ||
      amenities.size ||
      goodFor.size ||
      dealsOnly,
  )

  const showDiscovery =
    !isLoading && !hasFilters && !savedOnly && inventoryCount >= DISCOVERY_MIN_STAYS
  const showFeaturedRail = showDiscovery && featured.length > 0

  const clearAll = () => {
    setSearch('')
    setDestinationDraft('')
    setCheckInDraft('')
    setCheckOutDraft('')
    setAppliedTrip(null)
    setTripError('')
    clearNearPoint()
    setGuests('1')
    setSort('recommended')
    setAmenities(new Set())
    setGoodFor(new Set())
    setPropType('')
    setMinBedrooms('')
    setMinRating('')
    setMinPrice('')
    setMaxPrice('')
    setDealsOnly(false)
  }

  const clearSheetFilters = () => {
    setGuests('1')
    setAmenities(new Set())
    setGoodFor(new Set())
    setPropType('')
    setMinBedrooms('')
    setMinRating('')
    setMinPrice('')
    setMaxPrice('')
    setDealsOnly(false)
    setFiltersOpen(false)
  }

  const toggleAmenity = (id: AmenityId) => {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGoodFor = (id: GoodForId) => {
    setGoodFor((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pickGuests = (value: string) => {
    setGuests((prev) => (prev === value ? '1' : value))
  }

  const pickBedrooms = (value: string) => {
    setMinBedrooms((prev) => (prev === value ? '' : value))
  }

  const sheetFilterCount = [
    Boolean(propType),
    amenities.size > 0,
    goodFor.size > 0,
    !appliedTrip && guests !== '1',
    Boolean(minBedrooms),
    Boolean(minPrice || maxPrice),
    Boolean(minRating),
    dealsOnly,
  ].filter(Boolean).length

  const applyCollection = (c: (typeof collections)[number]) => {
    if (c.amenity) {
      setAmenities((prev) => new Set(prev).add(c.amenity!))
    }
    if (c.need === 'budget') setMaxPrice(String(BUDGET_MAX_PRICE))
    if (c.need === 'family') {
      setGoodFor((prev) => new Set(prev).add('family'))
    }
    if (c.need === 'coast') {
      setGoodFor((prev) => new Set(prev).add('coast'))
    }
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

  return (
    <div className="st-market">
      <header className="st-market__hero">
        <div className="st-market__hero-head">
          <p className="st-market__kicker">Places to stay</p>
          <h1 className="st-market__title">Find a stay</h1>
          <p className="st-market__explore-hint">
            {exploring ? `Exploring ${exploreLabel}` : 'My Delve · personalized stays'}
          </p>
        </div>

        <form className="st-market__trip-search" onSubmit={submitTripSearch} noValidate>
          <label className="st-market__trip-field st-market__trip-field--destination">
            <span>Destination</span>
            <div>
              <MapPin size={17} aria-hidden />
              <input
                id="acc-search"
                value={destinationDraft}
                onChange={(event) => {
                  setDestinationDraft(event.target.value)
                  setTripError('')
                }}
                placeholder="Where are you going?"
                autoComplete="address-level2"
              />
            </div>
          </label>
          <label className="st-market__trip-field">
            <span>Check in</span>
            <div>
              <CalendarDays size={17} aria-hidden />
              <input
                id="acc-check-in"
                type="date"
                min={today}
                value={checkInDraft}
                onChange={(event) => {
                  const value = event.target.value
                  setCheckInDraft(value)
                  if (checkOutDraft && checkOutDraft <= value) setCheckOutDraft('')
                  setTripError('')
                }}
              />
            </div>
          </label>
          <label className="st-market__trip-field">
            <span>Check out</span>
            <div>
              <CalendarDays size={17} aria-hidden />
              <input
                type="date"
                min={checkInDraft || today}
                value={checkOutDraft}
                onChange={(event) => {
                  setCheckOutDraft(event.target.value)
                  setTripError('')
                }}
              />
            </div>
          </label>
          <label className="st-market__trip-field st-market__trip-field--guests">
            <span>Guests</span>
            <div>
              <Users size={17} aria-hidden />
              <input
                type="number"
                min="1"
                max="30"
                inputMode="numeric"
                value={guests}
                onChange={(event) => {
                  setGuests(event.target.value)
                  setTripError('')
                }}
              />
            </div>
          </label>
          <button type="submit" className="st-market__trip-submit">
            <Search size={18} strokeWidth={2.4} aria-hidden />
            Search
          </button>
        </form>
        {tripError ? (
          <p className="st-market__trip-error" role="alert">{tripError}</p>
        ) : appliedTrip ? (
          <p className="st-market__trip-note st-market__trip-note--applied">
            Live trip · {appliedTrip.destination || exploreLabel} ·{' '}
            {formatTripDate(appliedTrip.checkIn)}–{formatTripDate(appliedTrip.checkOut)} ·{' '}
            {appliedTrip.guests} guest{appliedTrip.guests === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="st-market__trip-note">
            Choose dates to see live room availability and exact totals.
          </p>
        )}

        <div className="st-market__find">

          <div className="st-market__find-row">
            <button
              type="button"
              className={`st-market__more${sheetFilterCount > 0 ? ' is-active' : ''}`}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={14} strokeWidth={2.25} aria-hidden />
              Filters{sheetFilterCount > 0 ? ` (${sheetFilterCount})` : ''}
            </button>

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

        <AreaPlacesFilter
          variant="panel"
          tone="light"
          showSearch={false}
          onPointSet={() => setSort('distance')}
          onCleared={() => setSort('recommended')}
        />
      </header>

      {hasFilters ? (
        <div className="st-market__active" aria-label="Active filters">
          {search ? (
            <button
              type="button"
              className="st-market__active-pill"
              onClick={() => {
                setSearch('')
                setDestinationDraft('')
                setAppliedTrip((trip) => trip ? { ...trip, destination: '' } : null)
              }}
            >
              “{search}” <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {nearPoint ? (
            <button
              type="button"
              className="st-market__active-pill"
              onClick={() => {
                clearNearPoint()
                setSort('recommended')
              }}
            >
              {nearPoint.kind === 'country' ? 'In' : 'Near'} {nearPoint.label}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {!appliedTrip && guests !== '1' ? (
            <button type="button" className="st-market__active-pill" onClick={() => setGuests('1')}>
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
          {[...goodFor].map((id) => (
            <button
              key={id}
              type="button"
              className="st-market__active-pill"
              onClick={() => toggleGoodFor(id)}
            >
              {GOOD_FOR_LABELS[id]} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
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
          {minPrice || maxPrice ? (
            <button
              type="button"
              className="st-market__active-pill"
              onClick={() => {
                setMinPrice('')
                setMaxPrice('')
              }}
            >
              {minPrice && maxPrice
                ? `${format(minPrice)} – ${format(maxPrice)}`
                : minPrice
                  ? `From ${format(minPrice)}`
                  : `Up to ${format(maxPrice)}`}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {dealsOnly ? (
            <button type="button" className="st-market__active-pill" onClick={() => setDealsOnly(false)}>
              Deals <X size={13} strokeWidth={2.5} aria-hidden />
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

      <div className="st-market__results-bar">
        <p className="st-market__count" aria-live="polite">
          {datedSearch && data ? (
            <>
              <strong>{data.count} available stay{data.count === 1 ? '' : 's'}</strong>
              {data.soldOutCount > 0
                ? ` · ${data.soldOutCount} unavailable stay${data.soldOutCount === 1 ? '' : 's'} hidden`
                : ' · live availability checked'}
            </>
          ) : (
            <><strong>{listings.length}</strong> stay{listings.length === 1 ? '' : 's'} to explore</>
          )}
        </p>
        <div className="st-market__results-acts">
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

      {viewMode === 'map' && !activeLoading && !activeError ? (
        <ExploreResultsMap
          origin={nearPoint}
          items={listings.map((a) => ({
            id: a.id,
            title: a.title,
            href: `/accommodation/${a.id}${appliedTrip ? `?check_in=${appliedTrip.checkIn}&check_out=${appliedTrip.checkOut}&guests=${appliedTrip.guests}` : ''}`,
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
              bookingQuery={
                appliedTrip
                  ? `check_in=${appliedTrip.checkIn}&check_out=${appliedTrip.checkOut}&guests=${appliedTrip.guests}`
                  : undefined
              }
              onLike={(e) => onToggleLike(a.id, e)}
              onSave={(e) => onToggleSave(a.id, e)}
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
              : datedSearch
                ? 'No stays are available for this trip'
              : hasFilters
                ? 'No stays match those filters'
                : 'No stays listed yet'
          }
          sub={
            savedOnly
              ? 'Tap the bookmark on any stay to save it here for later.'
              : datedSearch
                ? `Nothing fits ${appliedTrip?.guests ?? 1} guest${appliedTrip?.guests === 1 ? '' : 's'} for those dates. Try shifting your check-in or check-out.`
              : hasFilters
                ? maxPrice
                  ? `No stays up to ${format(maxPrice)}/night — try another budget or clear filters.`
                  : 'Try another area, need, or clear filters to see more places.'
                : 'Hotels, lodges, and guest houses will appear here once hosts add listings.'
          }
          cta={
            savedOnly
              ? { label: 'Browse stays', onClick: () => setSavedOnly(false) }
              : datedSearch
                ? {
                    label: 'Adjust dates',
                    onClick: () => document.getElementById('acc-check-in')?.focus(),
                  }
              : hasFilters
                ? { label: 'Clear filters', onClick: clearAll }
                : undefined
          }
          className="st-market__empty"
        />
      ) : null}

      <CommunityComposeModalShell
        open={filtersOpen}
        title="Filters"
        titleId="st-filter-modal-title"
        onClose={() => setFiltersOpen(false)}
      >
        <p className="cm-compose-modal__note">Narrow stays by type, amenities, guests, and price.</p>

        <div className="cm-compose-modal__composer-block">
          <span>Stay details</span>
          <div className="mk-filter-modal__row">
            <label className="mk-filter-modal__field">
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
            <label className="mk-filter-modal__field">
              <span>Minimum rating</span>
              <select
                className="cm-compose-modal__select"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">Any rating</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
                <option value="5">5 stars</option>
              </select>
            </label>
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Good for</span>
          <div className="mk-filter-modal__checks" role="group" aria-label="Good for">
            {GOOD_FOR_OPTIONS.map(({ value, label }) => {
              const checked = goodFor.has(value)
              return (
                <label
                  key={value}
                  className={`mk-filter-modal__check${checked ? ' is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGoodFor(value)}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Guests</span>
          <div className="mk-filter-modal__chips" role="group" aria-label="Guests">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => {
              const value = String(n)
              const active = guests === value
              return (
                <button
                  key={value}
                  type="button"
                  className={`mk-filter-modal__chip${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => pickGuests(value)}
                >
                  {n}+
                </button>
              )
            })}
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Beds</span>
          <div className="mk-filter-modal__chips" role="group" aria-label="Beds">
            {[
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
            ].map(({ value, label }) => {
              const active = minBedrooms === value
              return (
                <button
                  key={value}
                  type="button"
                  className={`mk-filter-modal__chip${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => pickBedrooms(value)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Budget / night ({currency})</span>
          <div className="mk-filter-modal__row">
            <label className="mk-filter-modal__field">
              <span>From</span>
              <input
                className="mk-filter-modal__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="No min"
              />
            </label>
            <label className="mk-filter-modal__field">
              <span>Up to</span>
              <input
                className="mk-filter-modal__input"
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

        <div className="cm-compose-modal__composer-block">
          <span>Deals</span>
          <div className="mk-filter-modal__checks" role="group" aria-label="Deals">
            <label className={`mk-filter-modal__check${dealsOnly ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={dealsOnly}
                onChange={() => setDealsOnly((v) => !v)}
              />
              <span>Only stays with deals / open rates</span>
            </label>
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Amenities</span>
          <p className="cm-compose-modal__note" style={{ margin: 0 }}>
            Pick as many as you need — stays must match all selected.
          </p>
          <div className="mk-filter-modal__checks" role="group" aria-label="Amenities">
            {AMENITY_OPTIONS.map(({ value, label }) => {
              const checked = amenities.has(value)
              return (
                <label
                  key={value}
                  className={`mk-filter-modal__check${checked ? ' is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAmenity(value)}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="mk-filter-modal__actions">
          <button
            type="button"
            className="cm-compose-modal__submit mk-filter-modal__apply"
            onClick={() => setFiltersOpen(false)}
          >
            Show results
          </button>
          {sheetFilterCount > 0 ? (
            <button type="button" className="mk-filter-modal__clear" onClick={clearSheetFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </CommunityComposeModalShell>
    </div>
  )
}
