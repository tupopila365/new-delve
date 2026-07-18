import { useState } from 'react'
import {
  BUS_AMENITY_OPTIONS,
  EMPTY_BUS_TRIP_FORM,
  type BusTripListingFormValues,
} from './busTripListingTypes'
import { TransportPhotoEditor } from './TransportPhotoEditor'

type Props = {
  values: BusTripListingFormValues
  onChange: (values: BusTripListingFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'route', label: 'Route' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'capacity', label: 'Seats & fare' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'photos', label: 'Media' },
] as const

export function BusTripListingForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('route')

  function patch(partial: Partial<BusTripListingFormValues>) {
    onChange({ ...values, ...partial })
  }

  function toggleAmenity(name: string) {
    const amenities = values.amenities.includes(name)
      ? values.amenities.filter((a) => a !== name)
      : [...values.amenities, name]
    patch({ amenities })
  }

  const canSave =
    values.origin.trim() &&
    values.destination.trim() &&
    values.operator_name.trim() &&
    values.departs_at &&
    values.arrives_at &&
    values.price.trim() &&
    values.total_seats > 0

  return (
    <div className="transport-form" role="dialog" aria-modal="true" aria-labelledby="bus-form-title">
      <button type="button" className="transport-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="transport-form__panel">
        <header className="transport-form__head">
          <h2 id="bus-form-title">{isEdit ? 'Edit shared trip' : 'Add shared trip'}</h2>
          <p>Route, schedule, fare, and amenities travellers see on the bus trip detail page.</p>
        </header>

        <nav className="transport-form__nav" aria-label="Trip sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`transport-form__nav-btn${section === s.id ? ' transport-form__nav-btn--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {error ? <p className="transport-form__error">{error}</p> : null}

        <div className="transport-form__body">
          {section === 'route' && (
            <div className="transport-form__section">
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Origin
                  <input value={values.origin} onChange={(e) => patch({ origin: e.target.value })} placeholder="Windhoek" />
                </label>
                <label className="transport-form__field">
                  Destination
                  <input value={values.destination} onChange={(e) => patch({ destination: e.target.value })} placeholder="Swakopmund" />
                </label>
              </div>
              <label className="transport-form__field">
                Operator / business name
                <input value={values.operator_name} onChange={(e) => patch({ operator_name: e.target.value })} placeholder="Namibia Link Coaches" />
              </label>
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Distance (km)
                  <input value={values.distance_km} onChange={(e) => patch({ distance_km: e.target.value })} placeholder="360" />
                </label>
                <label className="transport-form__field">
                  Duration (minutes)
                  <input type="number" min={30} value={values.duration_minutes} onChange={(e) => patch({ duration_minutes: Number(e.target.value) })} />
                </label>
              </div>
              <label className="transport-form__check">
                <input type="checkbox" checked={values.is_active} onChange={(e) => patch({ is_active: e.target.checked })} />
                Trip visible for seat bookings
              </label>
            </div>
          )}

          {section === 'schedule' && (
            <div className="transport-form__section">
              <label className="transport-form__field">
                Departure
                <input type="datetime-local" value={values.departs_at} onChange={(e) => patch({ departs_at: e.target.value })} />
              </label>
              <label className="transport-form__field">
                Arrival
                <input type="datetime-local" value={values.arrives_at} onChange={(e) => patch({ arrives_at: e.target.value })} />
              </label>
            </div>
          )}

          {section === 'capacity' && (
            <div className="transport-form__section">
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Total seats
                  <input type="number" min={8} max={60} value={values.total_seats} onChange={(e) => patch({ total_seats: Number(e.target.value) })} />
                </label>
                <label className="transport-form__field">
                  Fare per passenger (N$)
                  <input value={values.price} onChange={(e) => patch({ price: e.target.value })} placeholder="180" />
                </label>
              </div>
            </div>
          )}

          {section === 'amenities' && (
            <div className="transport-form__section">
              <p className="transport-form__hint">Onboard amenities shown on the trip detail page.</p>
              <div className="transport-form__chips">
                {BUS_AMENITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`transport-form__chip${values.amenities.includes(opt) ? ' transport-form__chip--on' : ''}`}
                    onClick={() => toggleAmenity(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <label className="transport-form__field">
                Stops along the way
                <textarea
                  rows={3}
                  value={values.stops}
                  onChange={(e) => patch({ stops: e.target.value })}
                  placeholder={'One stop per line, in order\ne.g. Rehoboth\nMariental'}
                />
              </label>
              <p className="transport-form__hint">
                Ordered pick-up/drop points between origin and destination — shown on the route timeline.
              </p>
              <label className="transport-form__field">
                Travel tips
                <textarea
                  rows={3}
                  value={values.travel_tips}
                  onChange={(e) => patch({ travel_tips: e.target.value })}
                  placeholder={'One tip per line\ne.g. Arrive 20 minutes before departure'}
                />
              </label>
              <p className="transport-form__hint">One tip per line — shown in the “Travel tips” section.</p>
            </div>
          )}

          {section === 'photos' && (
            <TransportPhotoEditor
              values={values}
              onChange={(partial) => patch(partial)}
              title="Route media"
              hint="Show the coach or route highlight — a cover photo or short boarding video helps travellers pick with confidence."
            />
          )}
        </div>

        <footer className="transport-form__foot">
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" disabled={!canSave || saving} onClick={onSubmit}>
            {saving ? 'Saving…' : 'Save trip'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_BUS_TRIP_FORM }
