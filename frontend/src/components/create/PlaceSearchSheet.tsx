import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link2, Search, X } from 'lucide-react'
import { apiFetch, asArray } from '../../api/client'
import type { PlaceLink } from './types'
import './PlaceSearchSheet.css'

type StayOption = { id: number; title: string; city?: string; region?: string }
type EventOption = { id: number; title: string; starts_at?: string }
type VehicleOption = { id: number; title: string; make: string; model: string; city?: string; region?: string }
type BusTripOption = {
  id: number
  route_detail: { origin: string; destination: string }
  departs_at?: string
}
type FoodOption = { id: number; name: string; city?: string; region?: string }

type PlaceHit = {
  kind: Exclude<PlaceLink['kind'], 'none'>
  id: number
  title: string
  subtitle: string
}

type PlaceKind = Exclude<PlaceLink['kind'], 'none'>

type Props = {
  value: PlaceLink
  onChange: (next: PlaceLink) => void
  disabled?: boolean
  /** Limit which listing types appear in search results. */
  allowedKinds?: PlaceKind[]
  triggerLabel?: string
  variant?: 'dark' | 'light'
}

function matches(query: string, ...parts: Array<string | undefined>) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return parts.some((part) => (part ?? '').toLowerCase().includes(q))
}

export function PlaceSearchSheet({
  value,
  onChange,
  disabled = false,
  allowedKinds,
  triggerLabel = 'Link a place',
  variant = 'dark',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const allow = (kind: PlaceKind) => !allowedKinds || allowedKinds.includes(kind)

  const { data: staysRaw } = useQuery({
    queryKey: ['place-link-stays'],
    queryFn: () => apiFetch<StayOption[]>('/api/accommodation/listings/?ordering=-created_at', { auth: false }),
    staleTime: 120_000,
    enabled: open,
  })
  const { data: eventsRaw } = useQuery({
    queryKey: ['place-link-events'],
    queryFn: () => apiFetch<EventOption[]>('/api/events/?ordering=starts_at', { auth: false }),
    staleTime: 120_000,
    enabled: open,
  })
  const { data: vehiclesRaw } = useQuery({
    queryKey: ['place-link-vehicles'],
    queryFn: () => apiFetch<VehicleOption[]>('/api/transport/vehicles/', { auth: false }),
    staleTime: 120_000,
    enabled: open,
  })
  const { data: tripsRaw } = useQuery({
    queryKey: ['place-link-bus-trips'],
    queryFn: () => apiFetch<BusTripOption[]>('/api/transport/bus/trips/', { auth: false }),
    staleTime: 120_000,
    enabled: open,
  })
  const { data: foodRaw } = useQuery({
    queryKey: ['place-link-food'],
    queryFn: () => apiFetch<FoodOption[]>('/api/food/venues/?ordering=-created_at', { auth: false }),
    staleTime: 120_000,
    enabled: open,
  })

  const hits = useMemo(() => {
    const rows: PlaceHit[] = []
    if (allow('accommodation')) {
      for (const stay of asArray<StayOption>(staysRaw)) {
        const place = [stay.city, stay.region].filter(Boolean).join(', ')
        if (!matches(query, stay.title, stay.city, stay.region)) continue
        rows.push({ kind: 'accommodation', id: stay.id, title: stay.title, subtitle: place || 'Stay' })
      }
    }
    if (allow('event')) {
      for (const event of asArray<EventOption>(eventsRaw)) {
        if (!matches(query, event.title)) continue
        rows.push({ kind: 'event', id: event.id, title: event.title, subtitle: 'Event' })
      }
    }
    if (allow('vehicle')) {
      for (const vehicle of asArray<VehicleOption>(vehiclesRaw)) {
        const title = vehicle.title || `${vehicle.make} ${vehicle.model}`
        const place = [vehicle.city, vehicle.region].filter(Boolean).join(', ')
        if (!matches(query, title, vehicle.make, vehicle.model, vehicle.city, vehicle.region)) continue
        rows.push({ kind: 'vehicle', id: vehicle.id, title, subtitle: place || 'Vehicle' })
      }
    }
    if (allow('bus_trip')) {
      for (const trip of asArray<BusTripOption>(tripsRaw)) {
        const title = `${trip.route_detail.origin} → ${trip.route_detail.destination}`
        if (!matches(query, trip.route_detail.origin, trip.route_detail.destination)) continue
        rows.push({ kind: 'bus_trip', id: trip.id, title, subtitle: 'Bus trip' })
      }
    }
    if (allow('food')) {
      for (const venue of asArray<FoodOption>(foodRaw)) {
        const place = [venue.city, venue.region].filter(Boolean).join(', ')
        if (!matches(query, venue.name, venue.city, venue.region)) continue
        rows.push({ kind: 'food', id: venue.id, title: venue.name, subtitle: place || 'Food' })
      }
    }
    return rows.slice(0, 40)
  }, [allowedKinds, eventsRaw, foodRaw, query, staysRaw, tripsRaw, vehiclesRaw])

  const selectedLabel =
    value.kind === 'none' ? null : value.title?.trim() || `${value.kind.replace('_', ' ')} #${value.id}`

  return (
    <div className={`place-search${variant === 'light' ? ' place-search--light' : ''}`}>
      <button
        type="button"
        className={`place-search__trigger${value.kind !== 'none' ? ' is-linked' : ''}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Link2 size={16} strokeWidth={2.25} aria-hidden />
        <span>{selectedLabel ? selectedLabel : triggerLabel}</span>
      </button>
      {value.kind !== 'none' ? (
        <button
          type="button"
          className="place-search__clear"
          disabled={disabled}
          onClick={() => onChange({ kind: 'none' })}
          aria-label="Remove place link"
        >
          <X size={14} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}

      {open ? (
        <div className="place-search-sheet" role="dialog" aria-modal="true" aria-label="Link a place">
          <button
            type="button"
            className="place-search-sheet__backdrop"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="place-search-sheet__panel">
            <div className="place-search-sheet__handle" aria-hidden />
            <header className="place-search-sheet__head">
              <strong>Link a place</strong>
              <button type="button" className="place-search-sheet__close" onClick={() => setOpen(false)}>
                <X size={18} strokeWidth={2.25} aria-hidden />
              </button>
            </header>
            <p className="place-search-sheet__hint">Optional — show this on a stay, food, event, or transport page.</p>
            <label className="place-search-sheet__field">
              <Search size={16} strokeWidth={2.25} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stays, food, events…"
                autoFocus
              />
            </label>
            <ul className="place-search-sheet__list">
              <li>
                <button
                  type="button"
                  className={value.kind === 'none' ? 'is-active' : ''}
                  onClick={() => {
                    onChange({ kind: 'none' })
                    setOpen(false)
                  }}
                >
                  <strong>No place link</strong>
                  <span>Post without a listing</span>
                </button>
              </li>
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    type="button"
                    className={value.kind === hit.kind && value.id === hit.id ? 'is-active' : ''}
                    onClick={() => {
                      onChange({ kind: hit.kind, id: hit.id, title: hit.title })
                      setOpen(false)
                    }}
                  >
                    <strong>{hit.title}</strong>
                    <span>{hit.subtitle}</span>
                  </button>
                </li>
              ))}
              {hits.length === 0 ? (
                <li className="place-search-sheet__empty">No places match “{query.trim() || '…'}”.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
