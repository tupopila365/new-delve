import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  BadgeDollarSign,
  Bookmark,
  Building2,
  Bus,
  CalendarDays,
  Car,
  Clock,
  MapPin,
  Route,
  Search,
  SlidersHorizontal,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { FilterSheet } from '../components/FilterSheet'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace'
import { EmptyState, ListSkeleton } from '../components/ui'
import { mockBusTrips } from '../mocks/mockData'

type TransportTab = 'all' | 'car' | 'bus'

const VEHICLE_TYPE_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: '4x4', label: '4×4 / SUV', Icon: Car },
  { value: 'sedan', label: 'Sedan', Icon: Car },
  { value: 'hatchback', label: 'Hatchback', Icon: Car },
  { value: 'van', label: 'Van / Minibus', Icon: Bus },
  { value: 'pickup', label: 'Pickup', Icon: Truck },
  { value: 'luxury', label: 'Luxury', Icon: Car },
]

const POPULAR_ROUTES: { origin: string; destination: string }[] = [
  { origin: 'Windhoek', destination: 'Swakopmund' },
  { origin: 'Windhoek', destination: 'Walvis Bay' },
  { origin: 'Windhoek', destination: 'Oshakati' },
]

const TOP_PICKUP_AREAS = [
  'Windhoek',
  'Hosea Kutako Airport',
  'Swakopmund',
  'Walvis Bay',
  'Ongwediva',
] as const

const POPULAR_REGIONS = ['Khomas', 'Erongo', 'Oshana'] as const

const EXTRA_TRANSPORT_PLACES = [
  'Walvis Bay',
  'Otjiwarongo',
  'Tsumeb',
  'Rundu',
  'Katima Mulilo',
  'Lüderitz',
  'Mariental',
  'Keetmanshoop',
  'Grootfontein',
  'Gobabis',
  'Outapi',
  'Okahandja',
  'Rehoboth',
  'Ongwediva',
  'Ondangwa',
]

const TRANSPORT_PLACE_OPTIONS: string[] = (() => {
  const set = new Set<string>()
  for (const t of mockBusTrips) {
    set.add(t.route_detail.origin.trim())
    set.add(t.route_detail.destination.trim())
  }
  EXTRA_TRANSPORT_PLACES.forEach((p) => set.add(p))
  return [...set].sort((a, b) => a.localeCompare(b))
})()

function vehicleTypeIcon(type: string | null | undefined): LucideIcon {
  const key = (type || '').toLowerCase()
  if (key === 'van') return Bus
  if (key === 'pickup') return Truck
  return Car
}

function PlaceAutocomplete({
  id,
  label,
  value,
  onChange,
  places,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  places: readonly string[]
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const needle = value.trim().toLowerCase()
    const list = needle ? places.filter((p) => p.toLowerCase().includes(needle)) : [...places]
    return list.slice(0, 100)
  }, [places, value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="tp-bus-search__field tp-place-combo" ref={wrapRef}>
      <label className="tp-bus-search__label" htmlFor={id}>
        {label}
      </label>
      <div className="tp-place-combo__shell">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          className="input tp-bus-search__input tp-place-combo__input"
          placeholder="Search place…"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <ul className="tp-place-combo__list" role="listbox" id={`${id}-listbox`}>
            {filtered.length === 0 ? (
              <li className="tp-place-combo__empty" role="presentation">
                No places match — pick from the list or clear the field.
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p} role="presentation">
                  <button
                    type="button"
                    role="option"
                    className="tp-place-combo__option"
                    aria-selected={value === p}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(p)
                      setOpen(false)
                    }}
                  >
                    {p}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

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
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
}

type Trip = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
  }
  departs_at: string
  arrives_at: string
  price: string
  available_seats: number
  total_seats?: number | null
}

function formatDeparture(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
  }
}

function formatArrival(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Time TBA'
  return d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
}

function tripDurationLabel(depIso: string, arrIso: string): string {
  const ms = new Date(arrIso).getTime() - new Date(depIso).getTime()
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3600000)
  const m = Math.round((ms % 3600000) / 60000)
  if (h <= 0) return `${m} min`
  return m ? `${h}h ${m}m` : `${h}h`
}

function rentalDayCount(pickup: string, dropoff: string): number | null {
  if (!pickup || !dropoff) return null
  const a = new Date(`${pickup}T12:00:00`)
  const b = new Date(`${dropoff}T12:00:00`)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  return diff > 0 ? diff : null
}

function seatsUrgency(n: number): 'low' | 'mid' | 'high' {
  if (n <= 3) return 'high'
  if (n <= 8) return 'mid'
  return 'low'
}

function isAutoTransmission(t: string | null | undefined): boolean {
  if (!t) return true
  return /auto/i.test(t)
}

function matchesVehicleSearch(v: Vehicle, q: string): boolean {
  const needle = q.toLowerCase()
  return [v.title, v.make, v.model, v.region, v.city, v.vehicle_type]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(needle))
}

function matchesTripSearch(t: Trip, q: string): boolean {
  const needle = q.toLowerCase()
  return [
    t.route_detail.origin,
    t.route_detail.destination,
    t.route_detail.operator_name,
  ].some((s) => s.toLowerCase().includes(needle))
}

function resultsHint(
  vehicleCount: number,
  tripCount: number,
  tab: TransportTab,
  search: string,
  hasFilters: boolean,
): string {
  if (search) {
    const total = tab === 'all' ? vehicleCount + tripCount : tab === 'car' ? vehicleCount : tripCount
    return `${total} result${total === 1 ? '' : 's'} for "${search}"`
  }
  if (tab === 'all') {
    if (hasFilters) {
      return `${vehicleCount} vehicle rental${vehicleCount === 1 ? '' : 's'} and ${tripCount} bus trip${tripCount === 1 ? '' : 's'}`
    }
    const total = vehicleCount + tripCount
    return `${total} transport option${total === 1 ? '' : 's'} available`
  }
  if (tab === 'car') {
    return hasFilters
      ? `${vehicleCount} vehicle${vehicleCount === 1 ? '' : 's'} match your filters`
      : `${vehicleCount} vehicle rental${vehicleCount === 1 ? '' : 's'} available`
  }
  return hasFilters
    ? `${tripCount} bus trip${tripCount === 1 ? '' : 's'} match your filters`
    : `${tripCount} bus trip${tripCount === 1 ? '' : 's'} available`
}

export function Transport() {
  const [tab, setTab] = useState<TransportTab>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [region, setRegion] = useState('')
  const [minP, setMinP] = useState('')
  const [maxP, setMaxP] = useState('')
  const [minSeats, setMinSeats] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [pickupDate, setPickupDate] = useState('')
  const [dropoffDate, setDropoffDate] = useState('')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const vQs = useMemo(() => {
    const p = new URLSearchParams()
    if (region) p.set('region', region)
    if (minP) p.set('min_price', minP)
    if (maxP) p.set('max_price', maxP)
    if (minSeats) p.set('min_seats', minSeats)
    vehicleTypes.forEach((t) => p.append('vehicle_type', t))
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [region, minP, maxP, minSeats, vehicleTypes])

  const bQs = useMemo(() => {
    const p = new URLSearchParams()
    if (origin) p.set('route_origin', origin)
    if (dest) p.set('route_destination', dest)
    if (travelDate) p.set('travel_date', travelDate)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [origin, dest, travelDate])

  const showVehicles = tab === 'all' || tab === 'car'
  const showTrips = tab === 'all' || tab === 'bus'

  const { data: vehicles, isLoading: vLoading, isError: vError, refetch: refetchVehicles } = useQuery({
    queryKey: ['veh', vQs],
    enabled: showVehicles,
    queryFn: () => apiFetch<Vehicle[]>(`/api/transport/vehicles/${vQs}`, { auth: false }),
  })

  const { data: trips, isLoading: bLoading, isError: bError, refetch: refetchTrips } = useQuery({
    queryKey: ['bus', bQs],
    enabled: showTrips,
    queryFn: () => apiFetch<Trip[]>(`/api/transport/bus/trips/${bQs}`, { auth: false }),
  })

  const rentalDays = useMemo(() => rentalDayCount(pickupDate, dropoffDate), [pickupDate, dropoffDate])
  const todayStr = new Date().toISOString().split('T')[0]

  const displayVehicles = useMemo(() => {
    let list = vehicles ?? []
    if (search) list = list.filter((v) => matchesVehicleSearch(v, search))
    if (quickFilter === 'airport') {
      list = list.filter(
        (v) =>
          /airport|kutako/i.test(`${v.title} ${v.region} ${v.city ?? ''}`) || v.region === 'Khomas',
      )
    }
    if (quickFilter === 'budget') {
      list = list.filter((v) => {
        const rate = Number(v.price_per_day)
        return !Number.isNaN(rate) && rate <= 500
      })
    }
    return list
  }, [vehicles, search, quickFilter])

  const displayTrips = useMemo(() => {
    let list = trips ?? []
    if (search) list = list.filter((t) => matchesTripSearch(t, search))
    if (quickFilter === 'week') {
      const now = Date.now()
      const weekMs = 7 * 24 * 60 * 60 * 1000
      list = list.filter((t) => {
        const dep = new Date(t.departs_at).getTime()
        return !Number.isNaN(dep) && dep >= now && dep <= now + weekMs
      })
    }
    return list
  }, [trips, search, quickFilter])

  const featuredVehicles = useMemo(() => displayVehicles.slice(0, 3), [displayVehicles])
  const featuredTrips = useMemo(() => displayTrips.slice(0, 3), [displayTrips])

  const toggleType = (value: string) =>
    setVehicleTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )

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

  const clearCarFilters = () => {
    setRegion('')
    setMinP('')
    setMaxP('')
    setMinSeats('')
    setVehicleTypes([])
    setPickupDate('')
    setDropoffDate('')
  }

  const clearBusFilters = () => {
    setOrigin('')
    setDest('')
    setTravelDate('')
  }

  const clearAllFilters = () => {
    clearCarFilters()
    clearBusFilters()
    setSearchInput('')
    setSearch('')
    setQuickFilter('')
  }

  const swapRoute = () => {
    const o = origin
    setOrigin(dest)
    setDest(o)
  }

  const carFilterCount =
    [region, minP, maxP, minSeats].filter(Boolean).length + vehicleTypes.length
  const busFilterCount = [origin, dest, travelDate].filter(Boolean).length
  const hasFilters =
    carFilterCount > 0 || busFilterCount > 0 || !!search || !!quickFilter

  const isLoading = (showVehicles && vLoading) || (showTrips && bLoading)
  const isError =
    (showVehicles && vError && !vehicles) || (showTrips && bError && !trips)

  const handleQuickChip = (id: string) => {
    if (id === 'bus-trips') {
      setTab('bus')
      setQuickFilter('')
      return
    }
    if (id === 'today') {
      setTravelDate((d) => (d === todayStr ? '' : todayStr))
      setTab((t) => (t === 'car' ? 'bus' : t === 'all' ? 'all' : 'bus'))
      return
    }
    if (id === 'week') {
      setQuickFilter((v) => (v === 'week' ? '' : 'week'))
      return
    }
    setQuickFilter((v) => (v === id ? '' : id))
  }

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    const vehicleCount = vehicles?.length ?? 0
    const tripCount = trips?.length ?? 0
    const providerNames = new Set([
      ...(vehicles ?? []).map(() => 'rental'),
      ...(trips ?? []).map((t) => t.route_detail.operator_name),
    ])
    return [
      {
        id: 'popular-routes',
        title: 'Popular routes',
        type: 'links',
        items: [
          ...POPULAR_ROUTES.map((r) => {
            const label = `${r.origin} to ${r.destination}`
            const active = origin === r.origin && dest === r.destination
            return {
              label,
              active,
              onClick: () => {
                setTab('bus')
                setOrigin(r.origin)
                setDest(r.destination)
              },
            }
          }),
          {
            label: 'Airport pickup',
            onClick: () => {
              setTab('car')
              setRegion('Khomas')
            },
          },
          {
            label: 'City transfers',
            onClick: () => {
              setTab('car')
              setRegion('Khomas')
            },
          },
        ],
      },
      {
        id: 'transport-pulse',
        title: 'Transport pulse',
        type: 'stats',
        items: [
          { value: vehicleCount || '—', label: 'vehicle rentals' },
          { value: tripCount || '—', label: 'bus trips' },
          { value: providerNames.size || '—', label: 'providers' },
        ],
      },
      {
        id: 'top-pickup',
        title: 'Top pickup areas',
        type: 'links',
        items: TOP_PICKUP_AREAS.map((area) => ({
          label: area,
          active: region === area || origin === area,
          onClick: () => {
            if (tab === 'bus' || tab === 'all') {
              setOrigin(area === 'Hosea Kutako Airport' ? 'Windhoek' : area)
            }
            if (tab === 'car' || tab === 'all') {
              setRegion(area === 'Hosea Kutako Airport' ? 'Khomas' : area)
            }
          },
        })),
      },
    ]
  }, [vehicles, trips, origin, dest, region, tab])

  const renderVehicleCard = (v: Vehicle) => {
    const rate = parseFloat(v.price_per_day)
    const totalEst =
      rentalDays != null && !Number.isNaN(rate) ? (rate * rentalDays).toFixed(0) : null
    const TypeIcon = vehicleTypeIcon(v.vehicle_type)
    const saved = savedIds.has(v.id)
    return (
      <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="media-card tp-vehicle-card">
        <div className="tp-vehicle-card__img-wrap">
          {v.cover_image ? (
            <img
              className="media-card__img tp-vehicle-card__img"
              src={mediaUrl(v.cover_image) || ''}
              alt={`${v.title} rental vehicle`}
              loading="lazy"
            />
          ) : (
            <div className="media-card__img tp-vehicle-card__img tp-vehicle-card__placeholder" aria-hidden>
              <TypeIcon size={40} strokeWidth={1.5} />
            </div>
          )}
          <button
            type="button"
            className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
            onClick={(e) => toggleSaved(v.id, e)}
          >
            <Bookmark size={17} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          {v.vehicle_type ? (
            <span className="tp-vehicle-card__type-badge">
              <TypeIcon size={11} strokeWidth={2.5} aria-hidden />
              {v.vehicle_type}
            </span>
          ) : null}
        </div>
        <div className="media-card__body tp-vehicle-card__body">
          <p className="tp-vehicle-card__make">
            {v.make} {v.model}
            {v.year ? ` · ${v.year}` : ''}
          </p>
          <h3 className="media-card__title">{v.title}</h3>
          <p className="tp-vehicle-card__region">
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            <span>{v.city || v.region}</span>
          </p>
          {(v.seats != null || v.transmission) && (
            <p className="tp-vehicle-card__specs">
              {v.seats != null ? (
                <span className="tp-vehicle-card__spec-pill">
                  <Users size={12} strokeWidth={2.25} aria-hidden />
                  {v.seats} seats
                </span>
              ) : null}
              {v.transmission ? (
                <span
                  className={`tp-vehicle-card__trans-badge tp-vehicle-card__trans-badge--${
                    isAutoTransmission(v.transmission) ? 'auto' : 'manual'
                  }`}
                  title={v.transmission}
                >
                  {isAutoTransmission(v.transmission) ? 'Automatic' : 'Manual'}
                </span>
              ) : null}
            </p>
          )}
          <p className="media-card__price tp-vehicle-card__price">
            <BadgeDollarSign size={13} strokeWidth={2.25} aria-hidden />
            N${v.price_per_day}
            <span className="tp-vehicle-card__per"> / day</span>
          </p>
          {totalEst ? (
            <p className="tp-vehicle-card__total-est">
              Est. N${totalEst} for {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
            </p>
          ) : null}
          <span className="tp-page__card-cta">
            View vehicle
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </span>
        </div>
      </Link>
    )
  }

  const renderTripCard = (t: Trip) => {
    const { date, time } = formatDeparture(t.departs_at)
    const arrival = formatArrival(t.arrives_at)
    const urgency = seatsUrgency(t.available_seats)
    const dur = tripDurationLabel(t.departs_at, t.arrives_at)
    return (
      <Link key={t.id} to={`/transport/bus/${t.id}`} className="tp-trip-card card">
        <div className="tp-trip-card__media">
          {t.route_detail.cover_image ? (
            <img
              className="tp-trip-card__img"
              src={mediaUrl(t.route_detail.cover_image) || ''}
              alt={`${t.route_detail.origin} to ${t.route_detail.destination} bus route`}
              loading="lazy"
            />
          ) : (
            <div className="tp-trip-card__media-placeholder" aria-hidden>
              <Bus size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="tp-trip-card__body">
          <div className="tp-trip-card__route">
            <span className="tp-trip-card__city">{t.route_detail.origin}</span>
            <ArrowRight size={14} strokeWidth={2.5} className="tp-trip-card__route-arrow" aria-hidden />
            <span className="tp-trip-card__city">{t.route_detail.destination}</span>
          </div>
          <p className="tp-trip-card__operator">
            <Building2 size={12} strokeWidth={2.25} aria-hidden />
            {t.route_detail.operator_name}
          </p>
          <div className="tp-trip-card__meta">
            <div className="tp-trip-card__time-block">
              <span className="tp-trip-card__time-date">
                <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
                {date}
              </span>
              <span className="tp-trip-card__time-clock">
                <Clock size={12} strokeWidth={2.25} aria-hidden />
                {time}
                {arrival !== 'Time TBA' ? ` – ${arrival}` : ''}
              </span>
              {dur ? <span className="tp-trip-card__duration">Journey ~ {dur}</span> : null}
            </div>
            <div className="tp-trip-card__right">
              <span className="tp-trip-card__price">
                <BadgeDollarSign size={12} strokeWidth={2.25} aria-hidden />
                N${t.price}
              </span>
              <span className={`tp-trip-card__seats tp-trip-card__seats--${urgency}`}>
                <Users size={11} strokeWidth={2.25} aria-hidden />
                {t.available_seats} {t.available_seats === 1 ? 'seat' : 'seats'} left
              </span>
            </div>
          </div>
          <span className="tp-page__card-cta tp-page__card-cta--trip">
            View trip
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </span>
        </div>
      </Link>
    )
  }

  const renderFeaturedStory = (item: { kind: 'vehicle' | 'trip'; data: Vehicle | Trip }) => {
    if (item.kind === 'vehicle') {
      const v = item.data as Vehicle
      const TypeIcon = vehicleTypeIcon(v.vehicle_type)
      return (
        <Link key={`feat-v-${v.id}`} to={`/transport/vehicle/${v.id}`} className="ev-story tp-page__featured-card">
          <div className="ev-story__img-wrap">
            {v.cover_image ? (
              <img
                className="ev-story__img"
                src={mediaUrl(v.cover_image) || ''}
                alt={`${v.title} rental vehicle`}
              />
            ) : (
              <div className="ev-story__img ev-story__img--placeholder" aria-hidden>
                <TypeIcon size={32} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="ev-story__meta">
            <p className="ev-story__title">{v.title}</p>
            <p className="ev-story__sub">
              <Car size={12} strokeWidth={2.5} aria-hidden />
              {v.region} · N${v.price_per_day}/day
            </p>
          </div>
        </Link>
      )
    }
    const t = item.data as Trip
    const { date, time } = formatDeparture(t.departs_at)
    return (
      <Link key={`feat-t-${t.id}`} to={`/transport/bus/${t.id}`} className="ev-story tp-page__featured-card">
        <div className="ev-story__img-wrap">
          {t.route_detail.cover_image ? (
            <img
              className="ev-story__img"
              src={mediaUrl(t.route_detail.cover_image) || ''}
              alt={`${t.route_detail.origin} to ${t.route_detail.destination} bus route`}
            />
          ) : (
            <div className="ev-story__img ev-story__img--placeholder" aria-hidden>
              <Bus size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="ev-story__meta">
          <p className="ev-story__title">
            {t.route_detail.origin} to {t.route_detail.destination}
          </p>
          <p className="ev-story__sub">
            <Bus size={12} strokeWidth={2.5} aria-hidden />
            {t.route_detail.operator_name} · {date} {time}
          </p>
        </div>
      </Link>
    )
  }

  const featuredItems = useMemo(() => {
    const items: { kind: 'vehicle' | 'trip'; data: Vehicle | Trip }[] = []
    if (tab === 'all') {
      featuredVehicles.slice(0, 2).forEach((v) => items.push({ kind: 'vehicle', data: v }))
      featuredTrips.slice(0, 2).forEach((t) => items.push({ kind: 'trip', data: t }))
    } else if (tab === 'car') {
      featuredVehicles.forEach((v) => items.push({ kind: 'vehicle', data: v }))
    } else {
      featuredTrips.forEach((t) => items.push({ kind: 'trip', data: t }))
    }
    return items
  }, [tab, featuredVehicles, featuredTrips])

  return (
    <div className="tp-page ev-page acc-page disc-page mk-page">
      <MarketplaceHero
        title="Find transport"
        subtitle="Compare vehicle rentals, bus trips, routes, pickup points, and trusted local transport providers."
        support="Choose how you want to move around Namibia and beyond."
        action={
          tab === 'car' || tab === 'all' ? (
            <button
              type="button"
              className={`btn acc-page__filter-btn${carFilterCount > 0 ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
              {carFilterCount > 0 ? `Filters (${carFilterCount})` : 'Filters'}
            </button>
          ) : null
        }
      >
        <div className="tp-page__hero-actions" role="group" aria-label="Transport options">
          <button
            type="button"
            className={`tp-page__hero-chip${tab === 'car' ? ' tp-page__hero-chip--active' : ''}`}
            onClick={() => setTab('car')}
          >
            <Car size={18} strokeWidth={2.25} aria-hidden />
            Rent a vehicle
          </button>
          <button
            type="button"
            className={`tp-page__hero-chip${tab === 'bus' ? ' tp-page__hero-chip--active' : ''}`}
            onClick={() => setTab('bus')}
          >
            <Bus size={18} strokeWidth={2.25} aria-hidden />
            Find a bus trip
          </button>
        </div>
      </MarketplaceHero>

      <div className="tp-page__mode-bar" role="tablist" aria-label="Transport mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`tp-mode-btn${tab === 'all' ? ' tp-mode-btn--active' : ''}`}
          onClick={() => setTab('all')}
        >
          <Route size={16} strokeWidth={2.25} aria-hidden />
          All transport
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'car'}
          className={`tp-mode-btn${tab === 'car' ? ' tp-mode-btn--active' : ''}`}
          onClick={() => setTab('car')}
        >
          <Car size={16} strokeWidth={2.25} aria-hidden />
          Vehicle rentals
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bus'}
          className={`tp-mode-btn${tab === 'bus' ? ' tp-mode-btn--active' : ''}`}
          onClick={() => setTab('bus')}
        >
          <Bus size={16} strokeWidth={2.25} aria-hidden />
          Bus trips
        </button>
      </div>

      <QuickFilterChips
        ariaLabel="Transport quick filters"
        chips={[
          { id: 'airport', label: 'Airport pickup', Icon: MapPin, active: quickFilter === 'airport' },
          { id: 'self-drive', label: 'Self-drive', Icon: Car, active: quickFilter === 'self-drive' },
          { id: 'budget', label: 'Budget friendly', Icon: BadgeDollarSign, active: quickFilter === 'budget' },
          { id: 'bus-trips', label: 'Bus trips', Icon: Bus, active: tab === 'bus' },
          { id: 'today', label: 'Today', Icon: CalendarDays, active: travelDate === todayStr },
          { id: 'week', label: 'This week', Icon: CalendarDays, active: quickFilter === 'week' },
        ]}
        onChipClick={handleQuickChip}
      />

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="tp-search">
          Search transport
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon acc-page__search-icon--graphic" aria-hidden>
            <Search size={18} strokeWidth={2.25} />
          </span>
          <input
            id="tp-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="Search Windhoek, airport pickup, Etosha, bus route…"
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
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <section className="ev-page__discover card" aria-labelledby="tp-discover-title">
        <h2 id="tp-discover-title" className="ev-page__discover-title">
          {tab === 'bus' ? 'Popular routes' : tab === 'car' ? 'Vehicle types' : 'Browse transport'}
        </h2>
        <p className="ev-page__discover-sub">
          {tab === 'bus'
            ? 'Jump to a corridor, then set your travel date and browse departures.'
            : tab === 'car'
              ? 'Filter by vehicle type, pickup area, dates, and price.'
              : 'Explore rentals and bus routes by type, area, or corridor.'}
        </p>
        <div
          className="ev-page__discover-chips"
          role="group"
          aria-label={tab === 'bus' ? 'Popular bus routes' : 'Vehicle types'}
        >
          {tab === 'bus' || tab === 'all'
            ? POPULAR_ROUTES.map((r) => {
                const active = origin === r.origin && dest === r.destination
                return (
                  <button
                    key={`${r.origin}-${r.destination}`}
                    type="button"
                    className={`acc-quick-chip ev-page__discover-chip${active ? ' acc-quick-chip--active' : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      setTab(tab === 'all' ? 'bus' : tab)
                      setOrigin(r.origin)
                      setDest(r.destination)
                    }}
                  >
                    <Route size={15} strokeWidth={2.25} aria-hidden />
                    {r.origin} to {r.destination}
                  </button>
                )
              })
            : null}
          {tab === 'car' || tab === 'all'
            ? VEHICLE_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={`tp-disc-${value}`}
                  type="button"
                  className={`acc-quick-chip ev-page__discover-chip${
                    vehicleTypes.includes(value) ? ' acc-quick-chip--active' : ''
                  }`}
                  aria-pressed={vehicleTypes.includes(value)}
                  onClick={() => toggleType(value)}
                >
                  <Icon className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                  {label}
                </button>
              ))
            : null}
        </div>
      </section>

      {(showVehicles && (tab === 'car' || tab === 'all')) && (
        <div className="tp-page__rental-dates card">
          <p className="tp-page__rental-dates-label">
            <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
            Plan your rental (optional)
          </p>
          <div className="tp-page__rental-dates-row">
            <div className="field tp-page__rental-field">
              <label className="label" htmlFor="tp-pickup">
                Pick-up
              </label>
              <input
                id="tp-pickup"
                className="input"
                type="date"
                min={todayStr}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div className="field tp-page__rental-field">
              <label className="label" htmlFor="tp-dropoff">
                Drop-off
              </label>
              <input
                id="tp-dropoff"
                className="input"
                type="date"
                min={pickupDate || todayStr}
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
              />
            </div>
          </div>
          {rentalDays != null && pickupDate && dropoffDate ? (
            <p className="tp-page__rental-hint">
              {rentalDays} {rentalDays === 1 ? 'day' : 'days'} — estimates on cards use this range when set.
            </p>
          ) : (
            <p className="tp-page__rental-hint tp-page__rental-hint--muted">
              Add dates to see an estimated trip total on each vehicle card.
            </p>
          )}
        </div>
      )}

      {(showTrips && (tab === 'bus' || tab === 'all')) && (
        <>
          <div className="tp-page__bus-travel-date field">
            <label className="label" htmlFor="tp-bus-date">
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
              Travel date
            </label>
            <input
              id="tp-bus-date"
              className="input tp-page__bus-date-input"
              type="date"
              min={todayStr}
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
            <p className="tp-page__bus-date-hint">
              Show departures on this day only — leave empty to see all upcoming trips.
            </p>
          </div>

          <div className="tp-page__bus-search">
            <div className="tp-bus-search__row">
              <PlaceAutocomplete
                id="tp-bus-origin"
                label="From"
                value={origin}
                onChange={setOrigin}
                places={TRANSPORT_PLACE_OPTIONS}
              />
              <button
                type="button"
                className="tp-bus-search__swap"
                onClick={swapRoute}
                aria-label="Swap origin and destination"
                title="Swap from / to"
              >
                <ArrowLeftRight size={18} strokeWidth={2.25} aria-hidden />
              </button>
              <PlaceAutocomplete
                id="tp-bus-dest"
                label="To"
                value={dest}
                onChange={setDest}
                places={TRANSPORT_PLACE_OPTIONS}
              />
            </div>
          </div>
        </>
      )}

      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {search ? ` · "${search}"` : ''}
            {region ? ` · ${region}` : ''}
            {origin ? ` · From ${origin}` : ''}
            {dest ? ` · To ${dest}` : ''}
            {travelDate ? ` · ${travelDate}` : ''}
            {vehicleTypes.length > 0 ? ` · ${vehicleTypes.join(', ')}` : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      )}

      <div className="disc-page__layout">
        <main className="disc-page__main">
          {isError && (
            <EmptyState
              iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
              title="We couldn't load transport options"
              sub="Please check your connection and try again."
              cta={{
                label: 'Try again',
                onClick: () => {
                  if (showVehicles) void refetchVehicles()
                  if (showTrips) void refetchTrips()
                },
              }}
            />
          )}

          {isLoading && !isError && <ListSkeleton count={tab === 'all' ? 4 : 3} />}

          {!isLoading && !isError && featuredItems.length > 0 && (
            <section className="ev-page__stories tp-page__featured" aria-labelledby="tp-featured-title">
              <div className="ev-page__stories-head">
                <h2 id="tp-featured-title" className="ev-page__stories-title">
                  Popular transport options
                </h2>
                <span className="ev-page__stories-sub">Vehicle rentals and routes travellers are checking out</span>
              </div>
              <div className="ev-page__stories-row">
                {featuredItems.map((item) => renderFeaturedStory(item))}
              </div>
            </section>
          )}

          {!isLoading && !isError && (displayVehicles.length > 0 || displayTrips.length > 0) && (
            <p className="tp-page__results-hint ev-page__results-hint" role="status">
              {resultsHint(displayVehicles.length, displayTrips.length, tab, search, hasFilters)}
            </p>
          )}

          {showVehicles && !isLoading && !isError && (
            <section className="tp-page__section" aria-labelledby="tp-vehicles-title">
              {(tab === 'all' || displayVehicles.length > 0 || displayTrips.length === 0) && (
                <div className="tp-page__section-head">
                  <div>
                    <h2 id="tp-vehicles-title" className="tp-page__section-title">
                      Vehicle rentals
                    </h2>
                    <p className="tp-page__section-sub">
                      Cars, SUVs, vans, and local rental options for flexible trips.
                    </p>
                  </div>
                </div>
              )}
              {displayVehicles.length > 0 ? (
                <div className="tp-page__car-grid">{displayVehicles.map(renderVehicleCard)}</div>
              ) : tab !== 'all' ? (
                <EmptyState
                  iconElement={<Car size={28} strokeWidth={2} aria-hidden />}
                  title={hasFilters ? 'No transport options found' : 'No transport options listed yet'}
                  sub={
                    hasFilters
                      ? 'Try changing your route, pickup area, date, price, or filters.'
                      : 'Vehicle rentals, transfers, and bus trips will appear here once providers add them.'
                  }
                  action={
                    hasFilters ? (
                      <div className="tp-page__empty-chips">
                        {POPULAR_REGIONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className="acc-quick-chip"
                            onClick={() => {
                              clearCarFilters()
                              setRegion(r)
                            }}
                          >
                            <MapPin size={14} strokeWidth={2.25} aria-hidden />
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : undefined
                  }
                  cta={
                    hasFilters
                      ? { label: 'Show all transport', onClick: clearAllFilters }
                      : undefined
                  }
                />
              ) : null}
            </section>
          )}

          {showTrips && !isLoading && !isError && (
            <section className="tp-page__section" aria-labelledby="tp-trips-title">
              {(tab === 'all' || displayTrips.length > 0 || displayVehicles.length === 0) && (
                <div className="tp-page__section-head">
                  <div>
                    <h2 id="tp-trips-title" className="tp-page__section-title">
                      Bus trips
                    </h2>
                    <p className="tp-page__section-sub">
                      Scheduled routes, departure times, operators, and fares.
                    </p>
                  </div>
                </div>
              )}
              {displayTrips.length > 0 ? (
                <div className="tp-page__trip-list">{displayTrips.map(renderTripCard)}</div>
              ) : tab !== 'all' ? (
                <EmptyState
                  iconElement={<Bus size={28} strokeWidth={2} aria-hidden />}
                  title={hasFilters ? 'No transport options found' : 'No transport options listed yet'}
                  sub={
                    hasFilters
                      ? 'Try changing your route, pickup area, date, price, or filters.'
                      : 'Vehicle rentals, transfers, and bus trips will appear here once providers add them.'
                  }
                  action={
                    hasFilters ? (
                      <div className="tp-page__empty-chips tp-page__empty-chips--routes">
                        {POPULAR_ROUTES.map((r) => (
                          <button
                            key={`${r.origin}-${r.destination}`}
                            type="button"
                            className="acc-quick-chip"
                            onClick={() => {
                              clearBusFilters()
                              setOrigin(r.origin)
                              setDest(r.destination)
                            }}
                          >
                            <Route size={14} strokeWidth={2.25} aria-hidden />
                            {r.origin} to {r.destination}
                          </button>
                        ))}
                      </div>
                    ) : undefined
                  }
                  cta={
                    hasFilters
                      ? { label: 'Show all transport', onClick: clearAllFilters }
                      : undefined
                  }
                />
              ) : null}
            </section>
          )}

          {!isLoading &&
            !isError &&
            tab === 'all' &&
            displayVehicles.length === 0 &&
            displayTrips.length === 0 && (
              <EmptyState
                iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
                title={hasFilters ? 'No transport options found' : 'No transport options listed yet'}
                sub={
                  hasFilters
                    ? 'Try changing your route, pickup area, date, price, or filters.'
                    : 'Vehicle rentals, transfers, and bus trips will appear here once providers add them.'
                }
                cta={
                  hasFilters
                    ? { label: 'Show all transport', onClick: clearAllFilters }
                    : undefined
                }
              />
            )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Transport discovery" />
      </div>

      <FilterSheet open={filtersOpen} title="Vehicle rental filters" onClose={() => setFiltersOpen(false)}>
        <div className="field">
          <label className="label" htmlFor="tp-filter-region">
            Pickup region
          </label>
          <input
            id="tp-filter-region"
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Khomas, Erongo"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="tp-filter-min">
            Min price / day (N$)
          </label>
          <input
            id="tp-filter-min"
            className="input"
            type="number"
            min={0}
            value={minP}
            onChange={(e) => setMinP(e.target.value)}
            placeholder="No minimum"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="tp-filter-max">
            Max price / day (N$)
          </label>
          <input
            id="tp-filter-max"
            className="input"
            type="number"
            min={0}
            value={maxP}
            onChange={(e) => setMaxP(e.target.value)}
            placeholder="No maximum"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="tp-filter-seats">
            Minimum seats
          </label>
          <input
            id="tp-filter-seats"
            className="input"
            type="number"
            min={1}
            max={20}
            value={minSeats}
            onChange={(e) => setMinSeats(e.target.value)}
            placeholder="e.g. 7 for a full family van"
          />
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setFiltersOpen(false)}>
          Apply
        </button>
        {carFilterCount > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              clearCarFilters()
              setFiltersOpen(false)
            }}
          >
            Clear all
          </button>
        )}
      </FilterSheet>
    </div>
  )
}
