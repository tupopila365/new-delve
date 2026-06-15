import { useMemo, useState } from 'react'
import { ArrowLeftRight, CalendarDays, MapPin, Route } from 'lucide-react'
import { mockBusTrips } from '../../mocks/mockData'
import './TransportPlanner.css'

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

function setInputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector)
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function tripDays(pickup: string, dropoff: string) {
  if (!pickup || !dropoff) return null
  const a = new Date(`${pickup}T12:00:00`)
  const b = new Date(`${dropoff}T12:00:00`)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  return diff > 0 ? diff : null
}

function PlaceInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  places,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  places: string[]
}) {
  return (
    <label className="tp-step-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="tp-step-field__input"
        list={`${id}-places`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
      <datalist id={`${id}-places`}>
        {places.map((place) => (
          <option key={place} value={place} />
        ))}
      </datalist>
    </label>
  )
}

export function TransportPlanRental() {
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const days = tripDays(pickup, dropoff)
  const minDate = todayString()

  const updatePickup = (value: string) => {
    setPickup(value)
    setInputValue('#tp-pickup', value)
  }

  const updateDropoff = (value: string) => {
    setDropoff(value)
    setInputValue('#tp-dropoff', value)
  }

  return (
    <section className="tp-planner-card" aria-labelledby="tp-plan-rental-title">
      <div className="tp-planner-card__head">
        <span className="tp-planner-card__icon" aria-hidden>
          <CalendarDays size={16} strokeWidth={2.35} />
        </span>
        <div>
          <h2 id="tp-plan-rental-title">Plan your rental</h2>
          <p>Optional dates for vehicle estimates.</p>
        </div>
      </div>
      <div className="tp-planner-card__grid">
        <label className="tp-step-field" htmlFor="tp-rental-pickup-new">
          <span>Pick-up</span>
          <input
            id="tp-rental-pickup-new"
            className="tp-step-field__input"
            type="date"
            min={minDate}
            value={pickup}
            onChange={(event) => updatePickup(event.target.value)}
          />
        </label>
        <label className="tp-step-field" htmlFor="tp-rental-dropoff-new">
          <span>Drop-off</span>
          <input
            id="tp-rental-dropoff-new"
            className="tp-step-field__input"
            type="date"
            min={pickup || minDate}
            value={dropoff}
            onChange={(event) => updateDropoff(event.target.value)}
          />
        </label>
      </div>
      <p className="tp-planner-card__hint">
        {days ? `${days} ${days === 1 ? 'day' : 'days'} selected.` : 'Leave empty to browse without dates.'}
      </p>
    </section>
  )
}

export function TransportRouteSteps() {
  const places = useMemo(() => {
    const set = new Set<string>()
    for (const trip of mockBusTrips) {
      set.add(trip.route_detail.origin.trim())
      set.add(trip.route_detail.destination.trim())
    }
    EXTRA_TRANSPORT_PLACES.forEach((place) => set.add(place))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [])

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const updateFrom = (value: string) => {
    setFrom(value)
    setInputValue('#tp-bus-origin', value)
  }

  const updateTo = (value: string) => {
    setTo(value)
    setInputValue('#tp-bus-dest', value)
  }

  const swap = () => {
    const nextFrom = to
    const nextTo = from
    updateFrom(nextFrom)
    updateTo(nextTo)
  }

  return (
    <section className="tp-planner-card tp-planner-card--route" aria-labelledby="tp-shared-route-title">
      <div className="tp-planner-card__head">
        <span className="tp-planner-card__icon" aria-hidden>
          <Route size={16} strokeWidth={2.35} />
        </span>
        <div>
          <h2 id="tp-shared-route-title">Shared trip route</h2>
          <p>Choose where the shared trip starts and ends.</p>
        </div>
      </div>
      <div className="tp-route-steps">
        <PlaceInput id="tp-route-from-new" label="From" value={from} onChange={updateFrom} placeholder="Windhoek" places={places} />
        <button type="button" className="tp-route-steps__swap" onClick={swap} aria-label="Swap from and to">
          <ArrowLeftRight size={17} strokeWidth={2.35} aria-hidden />
        </button>
        <PlaceInput id="tp-route-to-new" label="To" value={to} onChange={updateTo} placeholder="Swakopmund" places={places} />
      </div>
      <p className="tp-planner-card__hint">
        <MapPin size={12} strokeWidth={2.25} aria-hidden />
        Travel date is hidden for now; routes show all upcoming shared trips.
      </p>
    </section>
  )
}
