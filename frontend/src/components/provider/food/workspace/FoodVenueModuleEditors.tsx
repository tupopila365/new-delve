import { CUISINE_OPTIONS, type FoodVenueFormValues } from '../foodVenueTypes'
import { VenueLocationPicker } from './VenueLocationPicker'

const PRICE_OPTIONS = [
  { value: 1, label: '$', hint: 'Budget' },
  { value: 2, label: '$$', hint: 'Mid-range' },
  { value: 3, label: '$$$', hint: 'Upscale' },
  { value: 4, label: '$$$$', hint: 'Fine dining' },
]

type Props = {
  values: FoodVenueFormValues
  onChange: (partial: Partial<FoodVenueFormValues>) => void
}

export function FoodVenueIdentityModule({ values, onChange }: Props) {
  return (
    <div className="fv-module">
      <header className="fv-module__head">
        <h3>Venue identity</h3>
        <p>Name, cuisine, and how travellers will discover you.</p>
      </header>
      <label className="fv-field">
        <span>Venue name</span>
        <input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Oryx Grill House"
          autoFocus
        />
      </label>
      <label className="fv-field">
        <span>Tagline</span>
        <input
          value={values.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="Fresh local plates and dinner favourites"
        />
      </label>
      <label className="fv-field">
        <span>Popular dish</span>
        <input
          value={values.popular_dish}
          onChange={(e) => onChange({ popular_dish: e.target.value })}
          placeholder="Flame-grilled oryx steak"
        />
      </label>
      <fieldset className="fv-field">
        <legend>Cuisine</legend>
        <div className="fv-chips">
          {CUISINE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`fv-chip${values.cuisine === opt.value ? ' fv-chip--on' : ''}`}
              onClick={() => onChange({ cuisine: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="fv-field">
        <legend>Price level</legend>
        <div className="fv-price-row">
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`fv-price${values.price_level === opt.value ? ' fv-price--on' : ''}`}
              onClick={() => onChange({ price_level: opt.value })}
            >
              <strong>{opt.label}</strong>
              <small>{opt.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="fv-field">
        <span>Description</span>
        <textarea
          rows={4}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What makes your venue special? Two or three sentences is perfect."
        />
      </label>
    </div>
  )
}

export function FoodVenueLocationModule({ values, onChange }: Props) {
  return (
    <div className="fv-module">
      <header className="fv-module__head">
        <h3>Location</h3>
        <p>Search on the map or drop a pin — saves independently from other sections.</p>
      </header>
      <VenueLocationPicker
        value={{
          latitude: values.latitude,
          longitude: values.longitude,
          google_place_id: values.google_place_id,
          formatted_address: values.formatted_address,
          region: values.region,
          city: values.city,
          address: values.address,
        }}
        onChange={(patch) => onChange(patch)}
      />
    </div>
  )
}

export function FoodVenueContactModule({ values, onChange }: Props) {
  return (
    <div className="fv-module">
      <header className="fv-module__head">
        <h3>Contact</h3>
        <p>How guests can reach you — separate from opening hours.</p>
      </header>
      <label className="fv-field">
        <span>Phone</span>
        <input
          type="tel"
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+264 61 123 4567"
        />
      </label>
      <label className="fv-field">
        <span>Website</span>
        <input
          type="url"
          value={values.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="https://example.com"
        />
      </label>
      <label className="fv-field">
        <span>Open now (optional override)</span>
        <select
          value={values.is_open}
          onChange={(e) => onChange({ is_open: e.target.value as FoodVenueFormValues['is_open'] })}
        >
          <option value="">Use hours schedule</option>
          <option value="true">Show as open now</option>
          <option value="false">Show as closed now</option>
        </select>
      </label>
    </div>
  )
}

const AMENITY_SUGGESTIONS = ['Outdoor seating', 'Card accepted', 'Wi‑Fi', 'Live music', 'Parking']

export function FoodVenueServiceModule({ values, onChange }: Props) {
  const amenities = values.amenities_text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  function toggleAmenity(label: string) {
    const set = new Set(amenities)
    if (set.has(label)) set.delete(label)
    else set.add(label)
    onChange({ amenities_text: [...set].join(', ') })
  }

  return (
    <div className="fv-module">
      <header className="fv-module__head">
        <h3>Service options</h3>
        <p>How guests can dine with you — dine-in, takeaway, delivery, and amenities.</p>
      </header>
      <div className="fv-toggle-row">
        {(
          [
            ['dine_in', 'Dine in'],
            ['takeaway', 'Takeaway'],
            ['delivery', 'Delivery'],
            ['reservations', 'Reservations'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`fv-toggle${values[key] ? ' fv-toggle--on' : ''}`}
            onClick={() => onChange({ [key]: !values[key] })}
          >
            {label}
          </button>
        ))}
      </div>
      <fieldset className="fv-field">
        <legend>Amenities</legend>
        <div className="fv-chips">
          {AMENITY_SUGGESTIONS.map((label) => (
            <button
              key={label}
              type="button"
              className={`fv-chip${amenities.includes(label) ? ' fv-chip--on' : ''}`}
              onClick={() => toggleAmenity(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
