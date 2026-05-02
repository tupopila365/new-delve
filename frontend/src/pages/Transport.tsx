import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { FilterSheet } from '../components/FilterSheet'
import { mockBusTrips } from '../mocks/mockData'

const VEHICLE_TYPE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: '4x4', label: '4×4 / SUV', emoji: '🚙' },
  { value: 'sedan', label: 'Sedan', emoji: '🚗' },
  { value: 'hatchback', label: 'Hatchback', emoji: '🚘' },
  { value: 'van', label: 'Van / Minibus', emoji: '🚐' },
  { value: 'pickup', label: 'Pickup', emoji: '🛻' },
  { value: 'luxury', label: 'Luxury', emoji: '✨' },
]

const TYPE_EMOJI: Record<string, string> = Object.fromEntries(
  VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.emoji]),
)

const POPULAR_REGIONS = ['Khomas', 'Erongo', 'Oshana'] as const

const POPULAR_BUS_ROUTES: { origin: string; destination: string }[] = [
  { origin: 'Windhoek', destination: 'Swakopmund' },
  { origin: 'Windhoek', destination: 'Oshakati' },
  { origin: 'Swakopmund', destination: 'Walvis Bay' },
]

/** Namibia-focused stops for searchable From / To (routes in mock data + common towns). */
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
    const list = needle
      ? places.filter((p) => p.toLowerCase().includes(needle))
      : [...places]
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
  const date = d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
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

export function Transport() {
  const [tab, setTab] = useState<'car' | 'bus'>('car')
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
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

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

  const { data: vehicles, isLoading: vLoading } = useQuery({
    queryKey: ['veh', vQs],
    enabled: tab === 'car',
    queryFn: () => apiFetch<Vehicle[]>(`/api/transport/vehicles/${vQs}`, { auth: false }),
  })

  const { data: trips, isLoading: bLoading } = useQuery({
    queryKey: ['bus', bQs],
    enabled: tab === 'bus',
    queryFn: () => apiFetch<Trip[]>(`/api/transport/bus/trips/${bQs}`, { auth: false }),
  })

  const rentalDays = useMemo(() => rentalDayCount(pickupDate, dropoffDate), [pickupDate, dropoffDate])

  const featuredVehicles = useMemo(() => (vehicles ?? []).slice(0, 5), [vehicles])
  const featuredTrips = useMemo(() => (trips ?? []).slice(0, 5), [trips])

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

  const swapRoute = () => {
    const o = origin
    setOrigin(dest)
    setDest(o)
  }

  const carFilterCount =
    [region, minP, maxP, minSeats].filter(Boolean).length + vehicleTypes.length

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="tp-page ev-page acc-page">
      <header className="page-header tp-page__header ev-page__header acc-page__header">
        <div>
          <h1 className="display tp-page__title ev-page__title">Transport</h1>
          <p className="page-sub tp-page__sub ev-page__sub">
            {tab === 'car'
              ? 'Rent 4×4s and city cars from local providers'
              : 'Buses & coaches — search routes by place and travel date'}
          </p>
        </div>
        {tab === 'car' ? (
          <button
            type="button"
            className={`btn acc-page__filter-btn${carFilterCount > 0 ? ' btn-primary' : ' btn-ghost'}`}
            onClick={() => setFiltersOpen(true)}
          >
            {carFilterCount > 0 ? `Filters (${carFilterCount})` : 'Filters'}
          </button>
        ) : null}
      </header>

      <div className="tp-page__mode-bar" role="tablist" aria-label="Transport mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'car'}
          className={`tp-mode-btn${tab === 'car' ? ' tp-mode-btn--active' : ''}`}
          onClick={() => setTab('car')}
        >
          <span aria-hidden>🚗</span> Car rental
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bus'}
          className={`tp-mode-btn${tab === 'bus' ? ' tp-mode-btn--active' : ''}`}
          onClick={() => setTab('bus')}
        >
          <span aria-hidden>🚌</span> Public transportation
        </button>
      </div>

      <section className="ev-page__discover card" aria-labelledby="tp-discover-title">
        <h2 id="tp-discover-title" className="ev-page__discover-title">
          {tab === 'car' ? 'Choose a ride style' : 'Popular routes'}
        </h2>
        <p className="ev-page__discover-sub">
          {tab === 'car'
            ? 'Tap a type to filter — combine with region search and filters below.'
            : 'Jump to a corridor — then set travel date and browse departures.'}
        </p>
        <div
          className="ev-page__discover-chips"
          role="group"
          aria-label={tab === 'car' ? 'Vehicle types' : 'Popular bus routes'}
        >
          {tab === 'car'
            ? VEHICLE_TYPE_OPTIONS.map(({ value, label, emoji }) => (
                <button
                  key={`tp-disc-${value}`}
                  type="button"
                  className={`acc-quick-chip ev-page__discover-chip${
                    vehicleTypes.includes(value) ? ' acc-quick-chip--active' : ''
                  }`}
                  aria-pressed={vehicleTypes.includes(value)}
                  onClick={() => toggleType(value)}
                >
                  <span aria-hidden>{emoji}</span> {label}
                </button>
              ))
            : POPULAR_BUS_ROUTES.map((r) => {
                const active = origin === r.origin && dest === r.destination
                return (
                  <button
                    key={`${r.origin}-${r.destination}`}
                    type="button"
                    className={`acc-quick-chip ev-page__discover-chip${active ? ' acc-quick-chip--active' : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      setOrigin(r.origin)
                      setDest(r.destination)
                    }}
                  >
                    {r.origin} → {r.destination}
                  </button>
                )
              })}
        </div>
      </section>

      {tab === 'car' && (
        <>
          <div className="tp-page__rental-dates card">
            <p className="tp-page__rental-dates-label">Plan your rental (optional)</p>
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
                Add dates to see an estimated trip total (rate × days) on each vehicle.
              </p>
            )}
          </div>

          <div className="acc-page__search">
            <label className="visually-hidden" htmlFor="tp-car-region-search">
              Search by region
            </label>
            <div className="acc-page__search-inner">
              <span className="acc-page__search-icon" aria-hidden>
                ⌕
              </span>
              <input
                id="tp-car-region-search"
                type="search"
                className="acc-page__search-input input"
                placeholder="Search by region…"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
              />
              {region ? (
                <button
                  type="button"
                  className="acc-page__search-clear"
                  onClick={() => setRegion('')}
                  aria-label="Clear region search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          {carFilterCount > 0 && (
            <div className="ev-page__filter-summary">
              <span className="ev-page__filter-summary-text">
                Filtered
                {region ? ` · ${region}` : ''}
                {minP || maxP ? ` · N$${minP || '…'}–${maxP || '…'}/day` : ''}
                {minSeats ? ` · ${minSeats}+ seats` : ''}
                {vehicleTypes.length > 0 ? ` · ${vehicleTypes.join(', ')}` : ''}
              </span>
              <button type="button" className="ev-page__filter-clear" onClick={clearCarFilters}>
                Clear all
              </button>
            </div>
          )}

          {!vLoading && featuredVehicles.length > 0 && (
            <>
              <section className="ev-page__stories" aria-labelledby="tp-car-trending-title">
                <div className="ev-page__stories-head">
                  <h2 id="tp-car-trending-title" className="ev-page__stories-title">
                    Trending now
                  </h2>
                  <span className="ev-page__stories-sub">Swipe to explore</span>
                </div>
                <div className="ev-page__stories-row">
                  {featuredVehicles.map((v) => {
                    const typeKey = (v.vehicle_type || '').toLowerCase()
                    const badgeEmoji = TYPE_EMOJI[typeKey] || '🚗'
                    return (
                      <Link key={`tp-trend-${v.id}`} to={`/transport/vehicle/${v.id}`} className="ev-story">
                        <div className="ev-story__img-wrap">
                          {v.cover_image ? (
                            <img className="ev-story__img" src={mediaUrl(v.cover_image) || ''} alt="" />
                          ) : (
                            <div className="ev-story__img ev-story__img--placeholder">
                              <span aria-hidden>{badgeEmoji}</span>
                            </div>
                          )}
                        </div>
                        <div className="ev-story__meta">
                          <p className="ev-story__title">{v.title}</p>
                          <p className="ev-story__sub">
                            {v.region} · N${v.price_per_day}/day
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            </>
          )}

          {vLoading && (
            <div className="tp-page__skeleton-wrap ev-page__skeleton-wrap" aria-hidden>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton tp-page__skeleton-card" />
              ))}
            </div>
          )}

          {!vLoading && vehicles && vehicles.length > 0 && (
            <p className="tp-page__results-hint ev-page__results-hint">
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} available
            </p>
          )}

          <div className="tp-page__car-grid">
            {vehicles?.map((v) => {
              const rate = parseFloat(v.price_per_day)
              const totalEst =
                rentalDays != null && !Number.isNaN(rate) ? (rate * rentalDays).toFixed(0) : null
              const typeKey = (v.vehicle_type || '').toLowerCase()
              const badgeEmoji = TYPE_EMOJI[typeKey] || '🚗'
              return (
                <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="media-card tp-vehicle-card">
                  <div className="tp-vehicle-card__img-wrap">
                    {v.cover_image ? (
                      <img
                        className="media-card__img tp-vehicle-card__img"
                        src={mediaUrl(v.cover_image) || ''}
                        alt=""
                      />
                    ) : (
                      <div className="media-card__img tp-vehicle-card__img tp-vehicle-card__placeholder">
                        <span aria-hidden>{badgeEmoji}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className={`acc-media-card__save${savedIds.has(v.id) ? ' acc-media-card__save--saved' : ''}`}
                      aria-label={savedIds.has(v.id) ? 'Remove from saved' : 'Save'}
                      onClick={(e) => toggleSaved(v.id, e)}
                    >
                      <IconHeart filled={savedIds.has(v.id)} />
                    </button>
                    {v.vehicle_type ? (
                      <span className="tp-vehicle-card__type-badge">
                        <span aria-hidden>{badgeEmoji}</span> {v.vehicle_type}
                      </span>
                    ) : null}
                  </div>
                  <div className="media-card__body tp-vehicle-card__body">
                    <p className="tp-vehicle-card__make">
                      {v.make} {v.model}
                      {v.year ? ` · ${v.year}` : ''}
                    </p>
                    <h2 className="media-card__title">{v.title}</h2>
                    <p className="tp-vehicle-card__region">
                      <span className="tp-vehicle-card__region-pin" aria-hidden>
                        📍
                      </span>
                      {v.region}
                    </p>
                    {(v.seats != null || v.transmission) && (
                      <p className="tp-vehicle-card__specs">
                        {v.seats != null ? (
                          <span className="tp-vehicle-card__spec-pill">{v.seats} seats</span>
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
                      N${v.price_per_day}
                      <span className="tp-vehicle-card__per"> / day</span>
                    </p>
                    {totalEst ? (
                      <p className="tp-vehicle-card__total-est">
                        ≈ N${totalEst} for {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>

          {!vLoading && vehicles?.length === 0 && (
            <div className="tp-page__empty ev-page__empty">
              <p className="tp-page__empty-title ev-page__empty-title">No vehicles match</p>
              <p className="tp-page__empty-text ev-page__empty-text">
                Try another region or loosen filters — or explore these popular areas on DELVE.
              </p>
              <div className="tp-page__empty-suggestions">
                <span className="tp-page__empty-suggestions-label">Popular regions</span>
                <div className="tp-page__empty-chips">
                  {POPULAR_REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="acc-quick-chip"
                      onClick={() => {
                        setRegion(r)
                        setVehicleTypes([])
                        setMinSeats('')
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary tp-page__empty-cta ev-page__empty-btn"
                onClick={clearCarFilters}
              >
                Clear all filters
              </button>
            </div>
          )}

          <FilterSheet open={filtersOpen} title="Car rental filters" onClose={() => setFiltersOpen(false)}>
            <div className="field">
              <label className="label" htmlFor="tp-filter-region">
                Region
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
        </>
      )}

      {tab === 'bus' && (
        <>
          <div className="tp-page__bus-travel-date field">
            <label className="label" htmlFor="tp-bus-date">
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
            <p className="tp-page__bus-date-hint">Show departures on this day only — leave empty to see all upcoming trips.</p>
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
                ⇄
              </button>
              <PlaceAutocomplete
                id="tp-bus-dest"
                label="To"
                value={dest}
                onChange={setDest}
                places={TRANSPORT_PLACE_OPTIONS}
              />
            </div>
            <p className="tp-place-combo__row-hint">
              Choose from {TRANSPORT_PLACE_OPTIONS.length} places — search by typing or open the list when you tap the field.
            </p>
          </div>

          {(origin || dest || travelDate) && (
            <div className="ev-page__filter-summary">
              <span className="ev-page__filter-summary-text">
                Filtered
                {origin ? ` · From ${origin}` : ''}
                {dest ? ` · To ${dest}` : ''}
                {travelDate ? ` · ${travelDate}` : ''}
              </span>
              <button
                type="button"
                className="ev-page__filter-clear"
                onClick={() => {
                  setOrigin('')
                  setDest('')
                  setTravelDate('')
                }}
              >
                Clear all
              </button>
            </div>
          )}

          {!bLoading && featuredTrips.length > 0 && (
            <>
              <section className="ev-page__stories" aria-labelledby="tp-bus-trending-title">
                <div className="ev-page__stories-head">
                  <h2 id="tp-bus-trending-title" className="ev-page__stories-title">
                    Trending now
                  </h2>
                  <span className="ev-page__stories-sub">Swipe to explore</span>
                </div>
                <div className="ev-page__stories-row">
                  {featuredTrips.map((t) => {
                    const { date, time } = formatDeparture(t.departs_at)
                    return (
                      <Link key={`tp-bus-trend-${t.id}`} to={`/transport/bus/${t.id}`} className="ev-story">
                        <div className="ev-story__img-wrap">
                          {t.route_detail.cover_image ? (
                            <img
                              className="ev-story__img"
                              src={mediaUrl(t.route_detail.cover_image) || ''}
                              alt=""
                            />
                          ) : (
                            <div className="ev-story__img ev-story__img--placeholder">
                              <span aria-hidden>🚌</span>
                            </div>
                          )}
                        </div>
                        <div className="ev-story__meta">
                          <p className="ev-story__title">
                            {t.route_detail.origin} → {t.route_detail.destination}
                          </p>
                          <p className="ev-story__sub">
                            {t.route_detail.operator_name} · {date} {time} · N${t.price}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            </>
          )}

          {bLoading && (
            <div className="tp-page__skeleton-wrap ev-page__skeleton-wrap" aria-hidden>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton tp-page__skeleton-trip" />
              ))}
            </div>
          )}

          {!bLoading && trips && trips.length > 0 && (
            <p className="tp-page__results-hint ev-page__results-hint">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'} available
            </p>
          )}

          <div className="tp-page__trip-list">
            {trips?.map((t) => {
              const { date, time } = formatDeparture(t.departs_at)
              const urgency = seatsUrgency(t.available_seats)
              const dur = tripDurationLabel(t.departs_at, t.arrives_at)
              return (
                <Link key={t.id} to={`/transport/bus/${t.id}`} className="tp-trip-card card">
                  <div className="tp-trip-card__media">
                    {t.route_detail.cover_image ? (
                      <img
                        className="tp-trip-card__img"
                        src={mediaUrl(t.route_detail.cover_image) || ''}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="tp-trip-card__media-placeholder" aria-hidden>
                        🚌
                      </div>
                    )}
                  </div>
                  <div className="tp-trip-card__body">
                    <div className="tp-trip-card__route">
                      <span className="tp-trip-card__city">{t.route_detail.origin}</span>
                      <span className="tp-trip-card__route-arrow" aria-hidden>
                        →
                      </span>
                      <span className="tp-trip-card__city">{t.route_detail.destination}</span>
                    </div>
                    <p className="tp-trip-card__operator">{t.route_detail.operator_name}</p>
                    <div className="tp-trip-card__meta">
                      <div className="tp-trip-card__time-block">
                        <span className="tp-trip-card__time-date">{date}</span>
                        <span className="tp-trip-card__time-clock">{time}</span>
                        {dur ? <span className="tp-trip-card__duration">Journey ~ {dur}</span> : null}
                      </div>
                      <div className="tp-trip-card__right">
                        <span className="tp-trip-card__price">N${t.price}</span>
                        <span className={`tp-trip-card__seats tp-trip-card__seats--${urgency}`}>
                          {t.available_seats} {t.available_seats === 1 ? 'seat' : 'seats'} left
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {!bLoading && trips?.length === 0 && (
            <div className="tp-page__empty ev-page__empty">
              <p className="tp-page__empty-title ev-page__empty-title">
                {origin || dest || travelDate ? 'No trips match' : 'No trips listed yet'}
              </p>
              <p className="tp-page__empty-text ev-page__empty-text">
                {origin || dest || travelDate
                  ? 'Adjust the date or route — operators add departures regularly.'
                  : 'Pick a travel date and route, or try a popular connection below.'}
              </p>
              <div className="tp-page__empty-suggestions">
                <span className="tp-page__empty-suggestions-label">Popular routes</span>
                <div className="tp-page__empty-chips tp-page__empty-chips--routes">
                  {POPULAR_BUS_ROUTES.map((r) => (
                    <button
                      key={`${r.origin}-${r.destination}`}
                      type="button"
                      className="acc-quick-chip"
                      onClick={() => {
                        setOrigin(r.origin)
                        setDest(r.destination)
                        setTravelDate('')
                      }}
                    >
                      {r.origin} → {r.destination}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary tp-page__empty-cta ev-page__empty-btn"
                onClick={() => {
                  setOrigin('')
                  setDest('')
                  setTravelDate('')
                }}
              >
                Show all trips
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
