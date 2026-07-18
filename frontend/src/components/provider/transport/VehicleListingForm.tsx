import { useState } from 'react'
import {
  EMPTY_VEHICLE_LISTING_FORM,
  RENTER_DOCUMENT_OPTIONS,
  VEHICLE_FEATURE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  type VehicleListingFormValues,
} from './vehicleListingTypes'
import { TransportPhotoEditor } from './TransportPhotoEditor'

type Props = {
  values: VehicleListingFormValues
  onChange: (values: VehicleListingFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'identity', label: 'Vehicle' },
  { id: 'specs', label: 'Specs' },
  { id: 'pricing', label: 'Rate & pickup' },
  { id: 'details', label: 'Description' },
  { id: 'renter_docs', label: 'Renter docs' },
  { id: 'photos', label: 'Media' },
] as const

export function VehicleListingForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('identity')

  function patch(partial: Partial<VehicleListingFormValues>) {
    onChange({ ...values, ...partial })
  }

  function toggleFeature(name: string) {
    const included_features = values.included_features.includes(name)
      ? values.included_features.filter((f) => f !== name)
      : [...values.included_features, name]
    patch({ included_features })
  }

  function toggleRenterDoc(id: string) {
    const required_renter_documents = values.required_renter_documents.includes(id)
      ? values.required_renter_documents.filter((d) => d !== id)
      : [...values.required_renter_documents, id]
    patch({ required_renter_documents })
  }

  const canSave =
    values.title.trim() &&
    values.make.trim() &&
    values.model.trim() &&
    values.price_per_day.trim() &&
    values.region.trim() &&
    values.city.trim()

  return (
    <div className="transport-form" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title">
      <button type="button" className="transport-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="transport-form__panel">
        <header className="transport-form__head">
          <h2 id="vehicle-form-title">{isEdit ? 'Edit rental vehicle' : 'Add rental vehicle'}</h2>
          <p>Fields match your public vehicle page — specs, daily rate, pickup, photos, and included features.</p>
        </header>

        <nav className="transport-form__nav" aria-label="Vehicle sections">
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
                Listing title
                <input value={values.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Toyota Hilux 4x4" />
              </label>
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Make
                  <input value={values.make} onChange={(e) => patch({ make: e.target.value })} placeholder="Toyota" />
                </label>
                <label className="transport-form__field">
                  Model
                  <input value={values.model} onChange={(e) => patch({ model: e.target.value })} placeholder="Hilux" />
                </label>
              </div>
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Year
                  <input type="number" min={1990} max={2030} value={values.year} onChange={(e) => patch({ year: Number(e.target.value) })} />
                </label>
                <label className="transport-form__field">
                  Vehicle type
                  <select value={values.vehicle_type} onChange={(e) => patch({ vehicle_type: e.target.value })}>
                    {VEHICLE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="transport-form__check">
                <input type="checkbox" checked={values.is_active} onChange={(e) => patch({ is_active: e.target.checked })} />
                Listing visible to travellers
              </label>
            </div>
          )}

          {section === 'specs' && (
            <div className="transport-form__section">
              <div className="transport-form__row">
                <label className="transport-form__field">
                  Seats
                  <input type="number" min={1} max={20} value={values.seats} onChange={(e) => patch({ seats: Number(e.target.value) })} />
                </label>
                <label className="transport-form__field">
                  Transmission
                  <select value={values.transmission} onChange={(e) => patch({ transmission: e.target.value })}>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </select>
                </label>
              </div>
              <label className="transport-form__field">
                Fuel type
                <select value={values.fuel_type} onChange={(e) => patch({ fuel_type: e.target.value })}>
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Petrol</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                </select>
              </label>
            </div>
          )}

          {section === 'pricing' && (
            <div className="transport-form__section">
              <label className="transport-form__field">
                Daily rate (N$)
                <input value={values.price_per_day} onChange={(e) => patch({ price_per_day: e.target.value })} placeholder="780" />
              </label>
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
                Pickup location
                <textarea rows={3} value={values.pickup_location} onChange={(e) => patch({ pickup_location: e.target.value })} placeholder="Windhoek CBD — exact street shared on confirmation." />
                <span className="transport-form__hint">Shown on the vehicle detail page and booking sidebar.</span>
              </label>
            </div>
          )}

          {section === 'details' && (
            <div className="transport-form__section">
              <label className="transport-form__field">
                Description
                <textarea rows={5} value={values.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What travellers should know about this vehicle." />
              </label>
              <p className="transport-form__hint">Included features appear in the detail page highlights.</p>
              <div className="transport-form__chips">
                {VEHICLE_FEATURE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`transport-form__chip${values.included_features.includes(opt) ? ' transport-form__chip--on' : ''}`}
                    onClick={() => toggleFeature(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <label className="transport-form__field">
                Highlights
                <textarea
                  rows={4}
                  value={values.highlights}
                  onChange={(e) => patch({ highlights: e.target.value })}
                  placeholder={'One selling point per line\ne.g. Great on gravel roads\nAutomatic transmission'}
                />
              </label>
              <p className="transport-form__hint">One highlight per line — shown under “About this vehicle”.</p>
              <label className="transport-form__field">
                Rental rules
                <textarea
                  rows={4}
                  value={values.rental_rules}
                  onChange={(e) => patch({ rental_rules: e.target.value })}
                  placeholder={'One rule per line\ne.g. Valid licence required\nReturn with the same fuel level'}
                />
              </label>
              <p className="transport-form__hint">One rule per line — shown in the “Rental rules” section.</p>
            </div>
          )}

          {section === 'renter_docs' && (
            <div className="transport-form__section">
              <p className="transport-form__hint">
                Choose what travellers must photograph and upload when they request this vehicle — the same kinds of
                documents major rental companies ask for (license, ID, etc.).
              </p>
              <div className="transport-form__chips">
                {RENTER_DOCUMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`transport-form__chip${values.required_renter_documents.includes(opt.id) ? ' transport-form__chip--on' : ''}`}
                    onClick={() => toggleRenterDoc(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {values.required_renter_documents.length > 0 ? (
                <ul className="transport-form__doc-hints">
                  {values.required_renter_documents.map((id) => {
                    const opt = RENTER_DOCUMENT_OPTIONS.find((d) => d.id === id)
                    return opt ? (
                      <li key={id}>
                        <strong>{opt.label}</strong> — {opt.hint}
                      </li>
                    ) : null
                  })}
                </ul>
              ) : (
                <p className="transport-form__hint">No renter documents selected — travellers can book without uploads.</p>
              )}
            </div>
          )}

          {section === 'photos' && (
            <TransportPhotoEditor
              values={values}
              onChange={(partial) => patch(partial)}
              title="Vehicle media"
              hint="Lead with a clean exterior shot or a short walk-around video. Gallery photos help renters compare seats, cargo room, and condition."
            />
          )}
        </div>

        <footer className="transport-form__foot">
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" disabled={!canSave || saving} onClick={onSubmit}>
            {saving ? 'Saving…' : 'Save vehicle'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_VEHICLE_LISTING_FORM }
