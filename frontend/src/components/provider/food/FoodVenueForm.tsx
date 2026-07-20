import { useState } from 'react'
import {
  CUISINE_OPTIONS,
  EMPTY_FOOD_VENUE_FORM,
  type FoodVenueFormValues,
} from './foodVenueTypes'
import { FoodVenueStoriesEditor } from './FoodVenueStoriesEditor'
import { FoodVenuePhotoEditor } from './FoodVenuePhotoEditor'

type Props = {
  values: FoodVenueFormValues
  onChange: (values: FoodVenueFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'identity', label: 'Venue' },
  { id: 'location', label: 'Location' },
  { id: 'hours', label: 'Hours & contact' },
  { id: 'service', label: 'Service' },
  { id: 'photos', label: 'Photos' },
  { id: 'stories', label: 'Highlights' },
] as const

const PRICE_OPTIONS = [
  { value: 1, label: '$ Budget' },
  { value: 2, label: '$$ Mid-range' },
  { value: 3, label: '$$$ Upscale' },
  { value: 4, label: '$$$$ Fine dining' },
]

export function FoodVenueForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('identity')

  function patch(partial: Partial<FoodVenueFormValues>) {
    onChange({ ...values, ...partial })
  }

  const canSave = values.name.trim() && values.region.trim() && values.city.trim()

  return (
    <div className="transport-form" role="dialog" aria-modal="true" aria-labelledby="food-form-title">
      <button type="button" className="transport-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="transport-form__panel">
        <header className="transport-form__head">
          <h2 id="food-form-title">{isEdit ? 'Edit venue' : 'Add food venue'}</h2>
          <p>Details travellers see on your public food listing — cuisine, hours, service options, and photos.</p>
        </header>

        <nav className="transport-form__nav" aria-label="Venue sections">
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
          {section === 'identity' && (
            <div className="transport-form__section">
              <label className="transport-form__field">
                Venue name
                <input value={values.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Oryx Grill House" />
              </label>
              <label className="transport-form__field">
                Tagline
                <input value={values.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder="Fresh local plates and dinner favourites" />
              </label>
              <label className="transport-form__field">
                Popular dish
                <input value={values.popular_dish} onChange={(e) => patch({ popular_dish: e.target.value })} placeholder="Flame-grilled oryx steak" />
              </label>
              <label className="transport-form__field">
                Cuisine
                <select value={values.cuisine} onChange={(e) => patch({ cuisine: e.target.value })}>
                  {CUISINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="transport-form__field">
                Price level
                <select value={values.price_level} onChange={(e) => patch({ price_level: Number(e.target.value) })}>
                  {PRICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="transport-form__field">
                Description
                <textarea rows={4} value={values.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What makes your venue special?" />
              </label>
            </div>
          )}

          {section === 'location' && (
            <div className="transport-form__section">
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Region
                  <input value={values.region} onChange={(e) => patch({ region: e.target.value })} placeholder="Khomas" />
                </label>
                <label className="transport-form__field">
                  City
                  <input value={values.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Windhoek" />
                </label>
              </div>
              <label className="transport-form__field">
                Street address
                <input value={values.address} onChange={(e) => patch({ address: e.target.value })} placeholder="123 Independence Ave" />
              </label>
            </div>
          )}

          {section === 'hours' && (
            <div className="transport-form__section">
              <label className="transport-form__field">
                Opening hours
                <textarea rows={3} value={values.opening_hours} onChange={(e) => patch({ opening_hours: e.target.value })} placeholder={'Mon–Fri 08:00–17:00\nSat 09:00–14:00'} />
              </label>
              <label className="transport-form__field">
                Closes at (list card label)
                <input value={values.closes_at} onChange={(e) => patch({ closes_at: e.target.value })} placeholder="9 PM" />
              </label>
              <label className="transport-form__field">
                Open now status
                <select value={values.is_open} onChange={(e) => patch({ is_open: e.target.value as FoodVenueFormValues['is_open'] })}>
                  <option value="">Unknown</option>
                  <option value="true">Open now</option>
                  <option value="false">Closed</option>
                </select>
              </label>
              <label className="transport-form__field">
                Phone
                <input value={values.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+264 61 123 4567" />
              </label>
              <label className="transport-form__field">
                Website
                <input value={values.website} onChange={(e) => patch({ website: e.target.value })} placeholder="https://example.com" />
              </label>
            </div>
          )}

          {section === 'service' && (
            <div className="transport-form__section">
              <fieldset className="transport-form__checks">
                <legend>Service options</legend>
                <label><input type="checkbox" checked={values.dine_in} onChange={(e) => patch({ dine_in: e.target.checked })} /> Dine in</label>
                <label><input type="checkbox" checked={values.takeaway} onChange={(e) => patch({ takeaway: e.target.checked })} /> Takeaway</label>
                <label><input type="checkbox" checked={values.delivery} onChange={(e) => patch({ delivery: e.target.checked })} /> Delivery</label>
                <label><input type="checkbox" checked={values.reservations} onChange={(e) => patch({ reservations: e.target.checked })} /> Reservations</label>
              </fieldset>
              <label className="transport-form__field">
                Extra amenities (comma-separated)
                <input value={values.amenities_text} onChange={(e) => patch({ amenities_text: e.target.value })} placeholder="Outdoor seating, Card accepted" />
              </label>
              <label className="transport-form__field">
                <input type="checkbox" checked={values.is_active} onChange={(e) => patch({ is_active: e.target.checked })} /> Published on DELVE
              </label>
            </div>
          )}

          {section === 'photos' && (
            <FoodVenuePhotoEditor values={values} onChange={patch} />
          )}

          {section === 'stories' && (
            <div className="transport-form__section">
              <FoodVenueStoriesEditor
                channels={values.venue_stories}
                onChange={(venue_stories) => patch({ venue_stories })}
              />
            </div>
          )}
        </div>

        <footer className="transport-form__foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!canSave || saving} onClick={onSubmit}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create venue'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_FOOD_VENUE_FORM }
