import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../../api/client'
import type { PlaceLink } from './types'
import './PlaceLinkPicker.css'

type StayOption = { id: number; title: string; city?: string; region?: string }
type EventOption = { id: number; title: string; starts_at?: string }
type VehicleOption = { id: number; title: string; make: string; model: string; city?: string; region?: string }
type BusTripOption = {
  id: number
  route_detail: { origin: string; destination: string }
  departs_at?: string
}
type FoodOption = { id: number; name: string; city?: string; region?: string }
type GuideOption = { id: number; headline: string; display_name?: string; username?: string }

const TABS = ['none', 'accommodation', 'event', 'vehicle', 'bus_trip', 'food', 'guide'] as const
type TabKind = (typeof TABS)[number]

type Props = {
  value: PlaceLink
  onChange: (next: PlaceLink) => void
  disabled?: boolean
}

function stayLabel(stay: StayOption): string {
  const place = [stay.city, stay.region].filter(Boolean).join(', ')
  return place ? `${stay.title} · ${place}` : stay.title
}

function vehicleLabel(vehicle: VehicleOption): string {
  const title = vehicle.title || `${vehicle.make} ${vehicle.model}`
  const place = [vehicle.city, vehicle.region].filter(Boolean).join(', ')
  return place ? `${title} · ${place}` : title
}

function busTripLabel(trip: BusTripOption): string {
  return `${trip.route_detail.origin} → ${trip.route_detail.destination}`
}

function foodLabel(venue: FoodOption): string {
  const place = [venue.city, venue.region].filter(Boolean).join(', ')
  return place ? `${venue.name} · ${place}` : venue.name
}

function guideLabel(guide: GuideOption): string {
  const name = guide.display_name?.trim() || guide.username?.trim() || guide.headline
  return name && name !== guide.headline ? `${name} · ${guide.headline}` : guide.headline
}

function tabLabel(tab: TabKind): string {
  if (tab === 'none') return 'None'
  if (tab === 'accommodation') return 'Stay'
  if (tab === 'event') return 'Event'
  if (tab === 'vehicle') return 'Vehicle'
  if (tab === 'bus_trip') return 'Bus trip'
  if (tab === 'guide') return 'Guide'
  return 'Food'
}

export function PlaceLinkPicker({ value, onChange, disabled = false }: Props) {
  const { data: staysRaw } = useQuery({
    queryKey: ['place-link-stays'],
    queryFn: () => apiFetch<StayOption[]>('/api/accommodation/listings/?ordering=-created_at', { auth: false }),
    staleTime: 120_000,
  })
  const { data: eventsRaw } = useQuery({
    queryKey: ['place-link-events'],
    queryFn: () => apiFetch<EventOption[]>('/api/events/?ordering=starts_at', { auth: false }),
    staleTime: 120_000,
  })
  const { data: vehiclesRaw } = useQuery({
    queryKey: ['place-link-vehicles'],
    queryFn: () => apiFetch<VehicleOption[]>('/api/transport/vehicles/', { auth: false }),
    staleTime: 120_000,
  })
  const { data: tripsRaw } = useQuery({
    queryKey: ['place-link-bus-trips'],
    queryFn: () => apiFetch<BusTripOption[]>('/api/transport/bus/trips/', { auth: false }),
    staleTime: 120_000,
  })
  const { data: foodRaw } = useQuery({
    queryKey: ['place-link-food'],
    queryFn: () => apiFetch<FoodOption[]>('/api/food/venues/?ordering=-created_at', { auth: false }),
    staleTime: 120_000,
  })
  const { data: guidesRaw } = useQuery({
    queryKey: ['place-link-guides'],
    queryFn: () => apiFetch<GuideOption[]>('/api/guides/profiles/?ordering=-created_at', { auth: false }),
    staleTime: 120_000,
  })

  const stays = asArray<StayOption>(staysRaw).slice(0, 40)
  const events = asArray<EventOption>(eventsRaw).slice(0, 40)
  const vehicles = asArray<VehicleOption>(vehiclesRaw).slice(0, 40)
  const trips = asArray<BusTripOption>(tripsRaw).slice(0, 40)
  const foodVenues = asArray<FoodOption>(foodRaw).slice(0, 40)
  const guides = asArray<GuideOption>(guidesRaw).slice(0, 40)

  const kind = value.kind

  const pickDefault = (tab: TabKind) => {
    if (tab === 'none') return onChange({ kind: 'none' })
    if (tab === 'accommodation') {
      const first = stays[0]
      onChange(first ? { kind: 'accommodation', id: first.id, title: first.title } : { kind: 'none' })
      return
    }
    if (tab === 'event') {
      const first = events[0]
      onChange(first ? { kind: 'event', id: first.id, title: first.title } : { kind: 'none' })
      return
    }
    if (tab === 'vehicle') {
      const first = vehicles[0]
      onChange(
        first
          ? { kind: 'vehicle', id: first.id, title: first.title || `${first.make} ${first.model}` }
          : { kind: 'none' },
      )
      return
    }
    if (tab === 'bus_trip') {
      const first = trips[0]
      onChange(
        first
          ? {
              kind: 'bus_trip',
              id: first.id,
              title: `${first.route_detail.origin} → ${first.route_detail.destination}`,
            }
          : { kind: 'none' },
      )
      return
    }
    if (tab === 'guide') {
      const first = guides[0]
      onChange(first ? { kind: 'guide', id: first.id, title: first.headline } : { kind: 'none' })
      return
    }
    const first = foodVenues[0]
    onChange(first ? { kind: 'food', id: first.id, title: first.name } : { kind: 'none' })
  }

  return (
    <div className="place-link-picker create-panel">
      <p className="create-panel__title">Link to place</p>
      <p className="place-link-picker__hint">Optional — show this post on a stay, event, transport, or food page.</p>
      <div className="place-link-picker__tabs" role="tablist" aria-label="Place link type">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={kind === tab}
            className={kind === tab ? 'is-active' : ''}
            disabled={disabled}
            onClick={() => pickDefault(tab)}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {kind === 'accommodation' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose stay</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || stays.length === 0}
            value={value.kind === 'accommodation' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const stay = stays.find((row) => row.id === id)
              if (stay) onChange({ kind: 'accommodation', id: stay.id, title: stay.title })
            }}
          >
            {stays.length === 0 ? <option value="">No stays available</option> : null}
            {stays.map((stay) => (
              <option key={stay.id} value={stay.id}>
                {stayLabel(stay)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'event' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose event</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || events.length === 0}
            value={value.kind === 'event' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const event = events.find((row) => row.id === id)
              if (event) onChange({ kind: 'event', id: event.id, title: event.title })
            }}
          >
            {events.length === 0 ? <option value="">No events available</option> : null}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'vehicle' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose vehicle</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || vehicles.length === 0}
            value={value.kind === 'vehicle' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const vehicle = vehicles.find((row) => row.id === id)
              if (vehicle) {
                onChange({
                  kind: 'vehicle',
                  id: vehicle.id,
                  title: vehicle.title || `${vehicle.make} ${vehicle.model}`,
                })
              }
            }}
          >
            {vehicles.length === 0 ? <option value="">No vehicles available</option> : null}
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicleLabel(vehicle)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'bus_trip' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose bus trip</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || trips.length === 0}
            value={value.kind === 'bus_trip' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const trip = trips.find((row) => row.id === id)
              if (trip) {
                onChange({
                  kind: 'bus_trip',
                  id: trip.id,
                  title: busTripLabel(trip),
                })
              }
            }}
          >
            {trips.length === 0 ? <option value="">No bus trips available</option> : null}
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {busTripLabel(trip)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'food' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose food venue</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || foodVenues.length === 0}
            value={value.kind === 'food' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const venue = foodVenues.find((row) => row.id === id)
              if (venue) onChange({ kind: 'food', id: venue.id, title: venue.name })
            }}
          >
            {foodVenues.length === 0 ? <option value="">No food venues available</option> : null}
            {foodVenues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {foodLabel(venue)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {kind === 'guide' ? (
        <label className="place-link-picker__field">
          <span className="sr-only">Choose guide</span>
          <select
            className="create-panel__field-input"
            disabled={disabled || guides.length === 0}
            value={value.kind === 'guide' ? value.id : ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              const guide = guides.find((row) => row.id === id)
              if (guide) onChange({ kind: 'guide', id: guide.id, title: guide.headline })
            }}
          >
            {guides.length === 0 ? <option value="">No guides available</option> : null}
            {guides.map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guideLabel(guide)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
