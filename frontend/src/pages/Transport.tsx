import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Bus,
  Car,
  MapPin,
  Route,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { CommunityComposeModalShell } from '../components/community/CommunityComposeModalShell'
import { TransportTripCard } from '../components/transport/TransportTripCard'
import { TransportVehicleCard } from '../components/transport/TransportVehicleCard'
import { EmptyState, ListSkeleton } from '../components/ui'
import { isVideoUrl } from '../components/listing/photos/listingGalleryMedia'
import { vehicleTypeMeta } from '../utils/transportListing'
import '../components/transport/transport-list.css'

type TransportMode = 'all' | 'rent' | 'share'
type SortId = 'recommended' | 'price_asc' | 'price_desc' | 'seats' | 'name'

const NEED_FILTERS: { id: string; label: string }[] = [
  { id: 'family', label: 'Family' },
  { id: 'budget', label: 'Budget' },
  { id: 'luxury', label: 'Luxury' },
  { id: '4x4', label: '4×4 / gravel' },
  { id: 'airport', label: 'Airport pickup' },
  { id: 'solo', label: 'Solo' },
  { id: 'week', label: 'This week' },
  { id: 'coast', label: 'Coast' },
]

const REGIONS = ['Khomas', 'Erongo', 'Oshana', 'Otjozondjupa', 'Hardap', 'Karas'] as const

const TOP_AREAS = [
  'Windhoek',
  'Swakopmund',
  'Walvis Bay',
  'Ongwediva',
  'Hosea Kutako Airport',
] as const

/** Areas that map cleanly to VehicleFilter `city=` (exact). */
const API_CITY_AREAS = new Set<string>(['Windhoek', 'Swakopmund', 'Walvis Bay', 'Ongwediva'])

const POPULAR_ROUTES: { origin: string; destination: string }[] = [
  { origin: 'Windhoek', destination: 'Swakopmund' },
  { origin: 'Windhoek', destination: 'Walvis Bay' },
  { origin: 'Windhoek', destination: 'Oshakati' },
]

const COLLECTIONS: {
  id: string
  label: string
  need: string
  mode?: TransportMode
}[] = [
  { id: 'family-vans', label: 'Family vans', need: 'family', mode: 'rent' },
  { id: 'budget-wheels', label: 'Budget wheels', need: 'budget', mode: 'rent' },
  { id: 'coastal', label: 'Coastal weekenders', need: 'coast' },
]

type Vehicle = {
  id: number
  title: string
  make: string
  model: string
  year?: number | null
  price_per_day: string
  region: string
  city?: string | null
  cover_image: string | null
  cover_kind?: 'image' | 'video' | string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  rating_avg?: string | null
  rating_count?: number | null
}

type Trip = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    cover_kind?: 'image' | 'video' | string | null
    distance_km?: number | null
    duration_minutes?: number | null
  }
  departs_at: string
  arrives_at: string
  price: string
  available_seats: number
  total_seats?: number | null
  rating_avg?: string | null
  rating_count?: number | null
}

function dayRate(v: Vehicle): number {
  const n = Number(v.price_per_day)
  return Number.isFinite(n) ? n : Infinity
}

function seatCount(v: Vehicle): number {
  return v.seats != null && Number.isFinite(v.seats) ? v.seats : 0
}

function tripPrice(t: Trip): number {
  const n = Number(t.price)
  return Number.isFinite(n) ? n : Infinity
}

function ratingValue(v: Vehicle): number {
  const n = v.rating_avg != null && v.rating_avg !== '' ? Number(v.rating_avg) : 0
  return Number.isFinite(n) ? n : 0
}

function matchesVehicleArea(v: Vehicle, area: string): boolean {
  if (!area) return true
  if (area === 'Hosea Kutako Airport') {
    return (
      /airport|kutako/i.test(`${v.title} ${v.region} ${v.city ?? ''}`) ||
      v.region === 'Khomas' ||
      /windhoek/i.test(`${v.city ?? ''} ${v.region}`)
    )
  }
  const needle = area.toLowerCase()
  return [v.city, v.region, v.title].filter(Boolean).some((s) => String(s).toLowerCase().includes(needle))
}

function matchesTripArea(t: Trip, area: string): boolean {
  if (!area) return true
  if (area === 'Hosea Kutako Airport') {
    return /windhoek|kutako|airport/i.test(
      `${t.route_detail.origin} ${t.route_detail.destination}`,
    )
  }
  const needle = area.toLowerCase()
  return (
    t.route_detail.origin.toLowerCase().includes(needle) ||
    t.route_detail.destination.toLowerCase().includes(needle)
  )
}

function isCoastalVehicle(v: Vehicle): boolean {
  return (
    /erongo|swakop|walvis|coast/i.test(`${v.region} ${v.city ?? ''} ${v.title}`) ||
    v.region === 'Erongo'
  )
}

function isCoastalTrip(t: Trip): boolean {
  return /swakop|walvis|lüderitz|luderitz/i.test(
    `${t.route_detail.origin} ${t.route_detail.destination}`,
  )
}

function departsThisWeek(iso: string): boolean {
  const dep = new Date(iso).getTime()
  if (Number.isNaN(dep)) return false
  const now = Date.now()
  return dep >= now && dep <= now + 7 * 24 * 60 * 60 * 1000
}

function modeHelper(mode: TransportMode): string | null {
  if (mode === 'rent') {
    return 'You set the schedule — ideal for day trips, luggage, and privacy.'
  }
  if (mode === 'share') {
    return 'Fixed routes and lower per-seat fares — no driving required.'
  }
  return null
}

function resultsCountLabel(
  vehicleCount: number,
  tripCount: number,
  mode: TransportMode,
  loading: boolean,
  hasFilters: boolean,
): ReactNode {
  if (loading) return 'Loading transport…'
  if (mode === 'rent') {
    return (
      <>
        <strong>{vehicleCount}</strong> {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
        {hasFilters ? ' match' : ' to rent'}
      </>
    )
  }
  if (mode === 'share') {
    return (
      <>
        <strong>{tripCount}</strong> shared {tripCount === 1 ? 'ride' : 'rides'}
        {hasFilters ? ' match' : ' leaving'}
      </>
    )
  }
  return (
    <>
      <strong>{vehicleCount}</strong> {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
      <span aria-hidden> · </span>
      <strong>{tripCount}</strong> shared {tripCount === 1 ? 'ride' : 'rides'}
      {hasFilters ? ' match' : ' to compare'}
    </>
  )
}

export function Transport() {
  const [mode, setMode] = useState<TransportMode>('all')
  const [need, setNeed] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [area, setArea] = useState('')
  const [region, setRegion] = useState('')
  const [minP, setMinP] = useState('')
  const [maxP, setMaxP] = useState('')
  const [minSeats, setMinSeats] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const vQs = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (region) p.set('region', region)
    if (area && API_CITY_AREAS.has(area)) p.set('city', area)
    if (minP) p.set('min_price', minP)
    if (maxP) p.set('max_price', maxP)
    if (minSeats) p.set('min_seats', minSeats)
    if (vehicleType) p.append('vehicle_type', vehicleType)
    if (need === '4x4') p.append('vehicle_type', '4x4')
    if (need === 'luxury') p.append('vehicle_type', 'luxury')
    if (need === 'family') p.set('min_seats', minSeats || '5')
    if (need === 'solo') {
      p.append('vehicle_type', 'hatchback')
      p.append('vehicle_type', 'sedan')
      if (!minSeats) p.set('max_seats', '5')
    }
    if (need === 'budget' && !maxP) p.set('max_price', '500')
    if (need === 'airport' && !region) p.set('region', 'Khomas')
    if (need === 'coast' && !region) p.set('region', 'Erongo')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [search, region, area, minP, maxP, minSeats, vehicleType, need])

  const bQs = useMemo(() => {
    const p = new URLSearchParams()
    let o = origin
    let d = dest
    if (need === 'coast' && !origin && !dest) {
      o = 'Windhoek'
      d = 'Swakopmund'
    }
    if (search) p.set('search', search)
    if (o) p.set('route_origin', o)
    if (d) p.set('route_destination', d)
    if (travelDate) p.set('travel_date', travelDate)
    if (minP) p.set('min_price', minP)
    if (maxP) p.set('max_price', maxP)
    else if (need === 'budget') p.set('max_price', '350')
    if (need === 'week') p.set('departing_within_days', '7')
    if (need === 'airport' && !o && !d) p.set('search', search || 'Windhoek')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [search, origin, dest, travelDate, minP, maxP, need])

  const showVehicles = mode === 'all' || mode === 'rent'
  const showTrips = mode === 'all' || mode === 'share'

  const {
    data: vehicles,
    isLoading: vLoading,
    isError: vError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ['veh', vQs],
    enabled: showVehicles,
    queryFn: async () =>
      asArray<Vehicle>(await apiFetch(`/api/transport/vehicles/${vQs}`, { auth: false })),
  })

  const {
    data: trips,
    isLoading: bLoading,
    isError: bError,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['bus', bQs],
    enabled: showTrips,
    queryFn: async () =>
      asArray<Trip>(await apiFetch(`/api/transport/bus/trips/${bQs}`, { auth: false })),
  })

  const displayVehicles = useMemo(() => {
    let list = [...(vehicles ?? [])]
    // Airport (and any non-API city chip) still needs client matching
    if (area && !API_CITY_AREAS.has(area)) {
      list = list.filter((v) => matchesVehicleArea(v, area))
    }

    if (need === 'luxury') {
      list = list.filter(
        (v) => (v.vehicle_type || '').toLowerCase() === 'luxury' || dayRate(v) >= 1200,
      )
    }
    if (need === '4x4') {
      list = list.filter((v) => /4x4|suv/i.test(v.vehicle_type || ''))
    }
    if (need === 'airport') {
      list = list.filter(
        (v) =>
          /airport|kutako/i.test(`${v.title} ${v.region} ${v.city ?? ''}`) ||
          v.region === 'Khomas',
      )
    }
    if (need === 'coast') {
      list = list.filter(isCoastalVehicle)
    }

    list.sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'price_asc') return dayRate(a) - dayRate(b)
      if (sort === 'price_desc') return dayRate(b) - dayRate(a)
      if (sort === 'seats') return seatCount(b) - seatCount(a)
      const score = (v: Vehicle) =>
        ratingValue(v) * 2 +
        Math.min(v.rating_count ?? 0, 40) / 20 +
        (dayRate(v) < Infinity ? Math.max(0, 3 - dayRate(v) / 800) : 0) +
        (v.cover_image ? 0.5 : 0)
      return score(b) - score(a)
    })
    return list
  }, [vehicles, area, need, sort])

  const displayTrips = useMemo(() => {
    let list = [...(trips ?? [])]
    if (area) list = list.filter((t) => matchesTripArea(t, area))

    if (need === 'solo') {
      list = list.filter((t) => t.available_seats >= 1)
    }
    if (need === 'family') {
      list = list.filter((t) => t.available_seats >= 3)
    }
    if (need === 'coast') {
      list = list.filter(isCoastalTrip)
    }
    if (need === 'airport') {
      list = list.filter((t) =>
        /windhoek|kutako|airport/i.test(`${t.route_detail.origin} ${t.route_detail.destination}`),
      )
    }

    list.sort((a, b) => {
      if (sort === 'name') {
        return `${a.route_detail.origin}${a.route_detail.destination}`.localeCompare(
          `${b.route_detail.origin}${b.route_detail.destination}`,
        )
      }
      if (sort === 'price_asc') return tripPrice(a) - tripPrice(b)
      if (sort === 'price_desc') return tripPrice(b) - tripPrice(a)
      if (sort === 'seats') return b.available_seats - a.available_seats
      return new Date(a.departs_at).getTime() - new Date(b.departs_at).getTime()
    })
    return list
  }, [trips, area, need, sort])

  const collectionRail = useMemo(() => {
    const family = (vehicles ?? [])
      .filter((v) => seatCount(v) >= 5 || (v.vehicle_type || '').toLowerCase() === 'van')
      .slice(0, 4)
    const budget = (vehicles ?? []).filter((v) => dayRate(v) <= 500).slice(0, 4)
    const coast = (vehicles ?? []).filter(isCoastalVehicle).slice(0, 3)
    const coastTrips = (trips ?? []).filter(isCoastalTrip).slice(0, 2)
    return { family, budget, coast, coastTrips }
  }, [vehicles, trips])

  const leavingSoon = useMemo(
    () => (trips ?? []).filter((t) => departsThisWeek(t.departs_at)).slice(0, 4),
    [trips],
  )

  const moreFilterCount =
    [region, minP, maxP, minSeats, vehicleType, origin, dest, travelDate].filter(Boolean)
      .length

  const hasFilters = Boolean(
    search ||
      need ||
      area ||
      region ||
      minP ||
      maxP ||
      minSeats ||
      vehicleType ||
      origin ||
      dest ||
      travelDate,
  )
  const hasActiveChrome = hasFilters || mode !== 'all'

  const isLoading = (showVehicles && vLoading) || (showTrips && bLoading)
  const isError =
    (showVehicles && vError && !vehicles) || (showTrips && bError && !trips)

  // Heavy filters hide discovery; mode-only still shows rails for browsing
  const showDiscovery = !isLoading && !hasFilters

  const clearAll = () => {
    setMode('all')
    setNeed('')
    setSort('recommended')
    setArea('')
    setRegion('')
    setMinP('')
    setMaxP('')
    setMinSeats('')
    setVehicleType('')
    setOrigin('')
    setDest('')
    setTravelDate('')
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

  const setNeedWithHints = (id: string) => {
    setNeed(id)
    if (id === 'week') setMode((m) => (m === 'rent' ? 'share' : m))
    if (id === '4x4' || id === 'luxury' || id === 'airport') {
      setMode((m) => (m === 'share' ? 'rent' : m))
    }
  }

  const applyNeed = (id: string) => {
    setNeedWithHints(need === id ? '' : id)
  }

  const applyCollection = (c: (typeof COLLECTIONS)[number]) => {
    setNeed(c.need)
    if (c.mode) setMode(c.mode)
    if (c.need === 'coast') {
      setOrigin('Windhoek')
      setDest('Swakopmund')
    }
  }

  const applyRoute = (r: { origin: string; destination: string }) => {
    setMode('share')
                setOrigin(r.origin)
                setDest(r.destination)
  }

  const needLabel = NEED_FILTERS.find((n) => n.id === need)?.label
  const helper = modeHelper(mode)

  const featuredCollectionItems = useMemo(() => {
    const items: { kind: 'vehicle' | 'trip'; data: Vehicle | Trip; tag: string }[] = []
    const seenVehicles = new Set<number>()
    const seenTrips = new Set<number>()

    const pushVehicle = (v: Vehicle, tag: string) => {
      if (mode === 'share' || seenVehicles.has(v.id)) return
      seenVehicles.add(v.id)
      items.push({ kind: 'vehicle', data: v, tag })
    }
    const pushTrip = (t: Trip, tag: string) => {
      if (mode === 'rent' || seenTrips.has(t.id)) return
      seenTrips.add(t.id)
      items.push({ kind: 'trip', data: t, tag })
    }

    collectionRail.family.slice(0, 2).forEach((v) => pushVehicle(v, 'Family'))
    collectionRail.budget.slice(0, 2).forEach((v) => pushVehicle(v, 'Budget'))
    collectionRail.coast.slice(0, 2).forEach((v) => pushVehicle(v, 'Coast'))
    collectionRail.coastTrips.slice(0, 2).forEach((t) => pushTrip(t, 'Coast'))
    return items.slice(0, 8)
  }, [collectionRail, mode])

  const glanceVehicles = useMemo(() => {
    if (!showVehicles || mode === 'all') return [] as Vehicle[]
    return displayVehicles.slice(0, 3)
  }, [displayVehicles, mode, showVehicles])

  const glanceTrips = useMemo(() => {
    if (!showTrips) return [] as Trip[]
    return leavingSoon.slice(0, 2)
  }, [leavingSoon, showTrips])

  const emptyTitle = hasFilters ? 'No matches for that trip' : 'No transport listed yet'
  const emptySub = hasFilters
    ? 'Try another city, need, or clear filters to see more options.'
    : 'Vehicle rentals and shared rides will appear here once providers add them.'

    return (
    <div className="tp-market">
      <header className="tp-market__hero">
        <p className="tp-market__kicker">Transport marketplace</p>
        <h1 className="tp-market__title">Pick how you move</h1>
        <p className="tp-market__sub">
          Rent privately or take a shared seat — compare what’s better for this trip across Windhoek,
          the coast, and beyond.
        </p>

        <div className="tp-market__find">
          <label className="tp-market__search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="tp-search"
              type="search"
              placeholder="Search Windhoek, airport, Swakop bus, 4×4…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search vehicles and trips"
            />
            {searchInput ? (
          <button
            type="button"
                className="tp-market__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
          ) : null}
          </label>

          <div className="tp-market__find-row">
            <select
              className="tp-market__select"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="City or area"
            >
              <option value="">All cities</option>
              {TOP_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              className="tp-market__select"
              value={mode}
              onChange={(e) => setMode(e.target.value as TransportMode)}
              aria-label="Mode"
            >
              <option value="all">All modes</option>
              <option value="rent">Rent a car</option>
              <option value="share">Shared rides</option>
            </select>

            <select
              className="tp-market__select"
              value={need}
              onChange={(e) => setNeedWithHints(e.target.value)}
              aria-label="Trip need"
            >
              <option value="">Any need</option>
              {NEED_FILTERS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="tp-market__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort results"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="seats">Most seats</option>
              <option value="name">Name A–Z</option>
            </select>
              </div>
          </div>
      </header>

      <div className="tp-market__compare" role="group" aria-label="Rent or share">
            <button
              type="button"
          className={`tp-market__compare-card${mode === 'rent' ? ' is-active' : ''}`}
          aria-pressed={mode === 'rent'}
          onClick={() => setMode((m) => (m === 'rent' ? 'all' : 'rent'))}
        >
          <span className="tp-market__compare-icon" aria-hidden>
            <Car size={18} strokeWidth={2.25} />
          </span>
          <p className="tp-market__compare-title">Rent a car</p>
          <p className="tp-market__compare-sub">Your schedule, day trips, luggage, privacy</p>
            </button>
          <button
            type="button"
          className={`tp-market__compare-card${mode === 'share' ? ' is-active' : ''}`}
          aria-pressed={mode === 'share'}
          onClick={() => setMode((m) => (m === 'share' ? 'all' : 'share'))}
        >
          <span className="tp-market__compare-icon" aria-hidden>
            <Bus size={18} strokeWidth={2.25} />
          </span>
          <p className="tp-market__compare-title">Shared ride</p>
          <p className="tp-market__compare-sub">Fixed routes, lower per seat, no driving</p>
          </button>
      </div>
      {helper ? (
        <p className="tp-market__compare-help">
          <strong>{mode === 'rent' ? 'Renting:' : 'Sharing:'}</strong> {helper}
        </p>
      ) : (
        <p className="tp-market__compare-help">
          Not sure? Browse both — rentals for flexibility, seats for cheaper point-to-point.
        </p>
      )}

      <section className="tp-market__section" aria-label="Trip needs">
        <div className="tp-market__rail" role="group" aria-label="Need filters">
          {NEED_FILTERS.map(({ id, label }) => (
          <button
              key={id}
            type="button"
              className={`tp-market__chip${need === id ? ' is-active' : ''}`}
              aria-pressed={need === id}
              onClick={() => applyNeed(id)}
          >
              {label}
          </button>
          ))}
        <button
          type="button"
            className={`tp-market__more${moreFilterCount > 0 ? ' is-active' : ''}`}
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={14} strokeWidth={2.25} aria-hidden />
            More filters{moreFilterCount > 0 ? ` (${moreFilterCount})` : ''}
        </button>
        </div>
      </section>

      {hasActiveChrome ? (
        <div className="tp-market__active" aria-label="Active filters">
          {search ? (
        <button
          type="button"
              className="tp-market__active-pill"
              onClick={() => {
                setSearch('')
                setSearchInput('')
              }}
            >
              “{search}” <X size={13} strokeWidth={2.5} aria-hidden />
        </button>
          ) : null}
          {area ? (
            <button type="button" className="tp-market__active-pill" onClick={() => setArea('')}>
              {area} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {mode !== 'all' ? (
            <button type="button" className="tp-market__active-pill" onClick={() => setMode('all')}>
              {mode === 'rent' ? 'Rent a car' : 'Shared rides'}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {need && needLabel ? (
            <button type="button" className="tp-market__active-pill" onClick={() => setNeed('')}>
              {needLabel} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {origin || dest ? (
        <button
          type="button"
              className="tp-market__active-pill"
              onClick={() => {
                setOrigin('')
                setDest('')
              }}
            >
              {origin || '…'} → {dest || '…'} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {region ? (
            <button type="button" className="tp-market__active-pill" onClick={() => setRegion('')}>
              {region} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="tp-market__clear" onClick={clearAll}>
            Clear all
        </button>
      </div>
      ) : null}

      {showDiscovery && featuredCollectionItems.length > 0 ? (
        <section className="tp-market__section" aria-labelledby="tp-collections-title">
          <div className="tp-market__section-head">
            <div>
              <h2 id="tp-collections-title" className="tp-market__section-title">
                Collections
              </h2>
              <p className="tp-market__section-sub">Family vans · Budget wheels · Coastal weekenders</p>
            </div>
          </div>
          <div className="tp-market__rail" style={{ marginBottom: 12 }}>
            {COLLECTIONS.map((c) => (
            <button
                key={c.id}
              type="button"
                className="tp-market__chip"
                onClick={() => applyCollection(c)}
            >
                {c.label}
            </button>
            ))}
        </div>
          <div className="tp-market__featured-rail">
            {featuredCollectionItems.map((item) => {
              if (item.kind === 'vehicle') {
                const v = item.data as Vehicle
                const coverSrc = mediaUrl(v.cover_image) || v.cover_image
                const isVideo = v.cover_kind === 'video' || (coverSrc ? isVideoUrl(coverSrc) : false)
                const typeLabel = vehicleTypeMeta(v.vehicle_type).label
                return (
                  <Link
                    key={`feat-v-${v.id}`}
                    to={`/transport/vehicle/${v.id}`}
                    className="tp-market__featured"
                  >
                    <div className={`tp-market__featured-media${coverSrc ? '' : ' tp-market__featured-media--empty'}`}>
                      {isVideo && coverSrc ? (
                        <video src={coverSrc} muted loop playsInline preload="metadata" aria-label={v.title} />
                      ) : coverSrc ? (
                        <img src={coverSrc} alt="" loading="lazy" />
                      ) : (
                        <Car size={32} strokeWidth={1.5} aria-hidden />
                      )}
      </div>
                    <div className="tp-market__featured-body">
                      <span className="tp-market__featured-type">
                        {item.tag} · {typeLabel}
                      </span>
                      <p className="tp-market__featured-title">{v.title}</p>
                      <p className="tp-market__featured-meta">
                        <MapPin size={12} strokeWidth={2.25} aria-hidden />
                        {v.city || v.region}
                        <span aria-hidden>·</span>
                        N${v.price_per_day}/day
                      </p>
                    </div>
                  </Link>
                )
              }
              const t = item.data as Trip
              const coverSrc =
                mediaUrl(t.route_detail.cover_image) || t.route_detail.cover_image || null
              const isVideo =
                t.route_detail.cover_kind === 'video' || (coverSrc ? isVideoUrl(coverSrc) : false)
              return (
                <Link
                  key={`feat-t-${t.id}`}
                  to={`/transport/bus/${t.id}`}
                  className="tp-market__featured"
                >
                  <div className={`tp-market__featured-media${coverSrc ? '' : ' tp-market__featured-media--empty'}`}>
                    {isVideo && coverSrc ? (
                      <video
                        src={coverSrc}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={`${t.route_detail.origin} to ${t.route_detail.destination}`}
                      />
                    ) : coverSrc ? (
                      <img src={coverSrc} alt="" loading="lazy" />
                    ) : (
                      <Bus size={32} strokeWidth={1.5} aria-hidden />
                    )}
                  </div>
                  <div className="tp-market__featured-body">
                    <span className="tp-market__featured-type">{item.tag} · Shared</span>
                    <p className="tp-market__featured-title">
                      {t.route_detail.origin} → {t.route_detail.destination}
                    </p>
                    <p className="tp-market__featured-meta">
                      <Route size={12} strokeWidth={2.25} aria-hidden />
                      {t.route_detail.operator_name}
                      <span aria-hidden>·</span>
                      N${t.price}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {showDiscovery && (mode === 'all' || mode === 'share') ? (
        <section className="tp-market__section" aria-labelledby="tp-routes-title">
          <div className="tp-market__section-head">
            <div>
              <h2 id="tp-routes-title" className="tp-market__section-title">
                Popular routes
              </h2>
              <p className="tp-market__section-sub">Jump a corridor, then compare seats</p>
            </div>
          </div>
          <div className="tp-market__rail" role="group" aria-label="Popular bus routes">
            {POPULAR_ROUTES.map((r) => {
                const active = origin === r.origin && dest === r.destination
                return (
                  <button
                    key={`${r.origin}-${r.destination}`}
                    type="button"
                  className={`tp-market__chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                  onClick={() => applyRoute(r)}
                >
                  <Route size={14} strokeWidth={2.25} aria-hidden />
                  {r.origin} → {r.destination}
                  </button>
                )
            })}
        </div>
      </section>
      ) : null}

      {showDiscovery && (glanceVehicles.length > 0 || glanceTrips.length > 0) ? (
        <section className="tp-market__section" aria-labelledby="tp-glance-title">
          <div className="tp-market__section-head">
            <div>
              <h2 id="tp-glance-title" className="tp-market__section-title">
                {mode === 'share' ? 'Seats leaving soon' : mode === 'rent' ? 'Worth a look' : 'Leaving soon'}
              </h2>
              <p className="tp-market__section-sub">
                {mode === 'rent'
                  ? 'A quick sample of rentals that match the browse'
                  : 'Shared rides departing within the week'}
              </p>
            </div>
            {glanceTrips.length > 0 ? (
              <button type="button" className="tp-market__clear" onClick={() => applyNeed('week')}>
                This week
              </button>
            ) : null}
          </div>
          {glanceVehicles.length > 0 ? (
            <div className="tp-market__grid" style={{ marginBottom: glanceTrips.length > 0 ? 14 : 0 }}>
              {glanceVehicles.map((v) => (
                <TransportVehicleCard
                  key={`glance-v-${v.id}`}
                  vehicle={v}
                  saved={savedIds.has(v.id)}
                  onToggleSave={toggleSaved}
                />
              ))}
            </div>
          ) : null}
          {glanceTrips.length > 0 ? (
            <div className="tp-market__trip-list">
              {glanceTrips.map((t) => (
                <TransportTripCard key={`glance-t-${t.id}`} trip={t} />
              ))}
          </div>
          ) : null}
        </section>
      ) : null}

      <div className="tp-market__results-bar">
        <p className="tp-market__count" role="status">
          {resultsCountLabel(
            displayVehicles.length,
            displayTrips.length,
            mode,
            isLoading,
            hasFilters,
          )}
            </p>
          </div>

      {isError ? (
            <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={1.75} />}
          title="We couldn't load transport"
              sub="Please check your connection and try again."
              cta={{
                label: 'Try again',
                onClick: () => {
                  if (showVehicles) void refetchVehicles()
                  if (showTrips) void refetchTrips()
                },
              }}
            />
      ) : null}

      {isLoading && !isError ? <ListSkeleton count={6} /> : null}

      {!isLoading && !isError && showVehicles && displayVehicles.length > 0 ? (
        <div className={mode === 'all' ? 'tp-market__group' : undefined}>
          {mode === 'all' ? <p className="tp-market__group-label">For rent</p> : null}
          <div className="tp-market__grid">
            {displayVehicles.map((v) => (
              <TransportVehicleCard
                key={v.id}
                vehicle={v}
                saved={savedIds.has(v.id)}
                onToggleSave={toggleSaved}
              />
                        ))}
                      </div>
        </div>
              ) : null}

      {!isLoading && !isError && showTrips && displayTrips.length > 0 ? (
        <div className={mode === 'all' ? 'tp-market__group' : undefined}>
          {mode === 'all' ? <p className="tp-market__group-label">Shared seats</p> : null}
          <div className="tp-market__trip-list">
            {displayTrips.map((t) => (
              <TransportTripCard key={t.id} trip={t} />
                        ))}
                      </div>
        </div>
              ) : null}

          {!isLoading &&
            !isError &&
      ((showVehicles && displayVehicles.length === 0) || !showVehicles) &&
      ((showTrips && displayTrips.length === 0) || !showTrips) ? (
              <EmptyState
          iconElement={<Route size={28} strokeWidth={1.75} />}
          title={emptyTitle}
          sub={emptySub}
          cta={hasFilters ? { label: 'Clear filters', onClick: clearAll } : undefined}
        />
      ) : null}

      <CommunityComposeModalShell
        open={filtersOpen}
        title="More filters"
        titleId="tp-filter-modal-title"
        onClose={() => setFiltersOpen(false)}
      >
        <p className="cm-compose-modal__note">Refine rentals and shared rides for this trip.</p>

        <div className="cm-compose-modal__composer-block">
          <span>Vehicle</span>
          <div className="tp-filter-modal__row">
            <label className="tp-filter-modal__field">
              <span>Pickup region</span>
              <select
                id="tp-filter-region"
                className="cm-compose-modal__select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Any region</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="tp-filter-modal__field">
              <span>Vehicle type</span>
              <select
                id="tp-filter-type"
                className="cm-compose-modal__select"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="">Any type</option>
                <option value="4x4">4×4 / SUV</option>
                <option value="sedan">Sedan</option>
                <option value="hatchback">Hatchback</option>
                <option value="van">Van / Minibus</option>
                <option value="pickup">Pickup</option>
                <option value="luxury">Luxury</option>
              </select>
            </label>
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Price / day (N$)</span>
          <div className="tp-filter-modal__row">
            <label className="tp-filter-modal__field">
              <span>From</span>
              <input
                id="tp-filter-min"
                className="tp-filter-modal__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={minP}
                onChange={(e) => setMinP(e.target.value)}
                placeholder="No min"
              />
            </label>
            <label className="tp-filter-modal__field">
              <span>Up to</span>
              <input
                id="tp-filter-max"
                className="tp-filter-modal__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
                placeholder="No max"
              />
            </label>
          </div>
          <label className="tp-filter-modal__field">
            <span>Minimum seats</span>
            <input
              id="tp-filter-seats"
              className="tp-filter-modal__input"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={minSeats}
              onChange={(e) => setMinSeats(e.target.value)}
              placeholder="e.g. 7 for a family van"
            />
          </label>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Shared route</span>
          <div className="tp-filter-modal__row">
            <label className="tp-filter-modal__field">
              <span>From</span>
              <input
                id="tp-filter-origin"
                className="tp-filter-modal__input"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Windhoek"
              />
            </label>
            <label className="tp-filter-modal__field">
              <span>To</span>
              <input
                id="tp-filter-dest"
                className="tp-filter-modal__input"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="Swakopmund"
              />
            </label>
          </div>
          <label className="tp-filter-modal__field">
            <span>Travel date</span>
            <input
              id="tp-filter-date"
              className="tp-filter-modal__input"
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
          </label>
        </div>

        <div className="tp-filter-modal__actions">
          <button
            type="button"
            className="cm-compose-modal__submit tp-filter-modal__apply"
            onClick={() => setFiltersOpen(false)}
          >
            Apply
          </button>
          {moreFilterCount > 0 ? (
            <button
              type="button"
              className="tp-filter-modal__clear"
              onClick={() => {
                setRegion('')
                setMinP('')
                setMaxP('')
                setMinSeats('')
                setVehicleType('')
                setOrigin('')
                setDest('')
                setTravelDate('')
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
