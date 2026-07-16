import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  AMENITY_OPTIONS,
  EMPTY_STAY_LISTING_FORM,
  PROPERTY_TYPES,
  type StayListingFormValues,
  type StayRoomForm,
} from './stayListingTypes'

type Props = {
  values: StayListingFormValues
  onChange: (values: StayListingFormValues) => void
  error?: string
  saving?: boolean
  onSubmit: () => void
  onCancel: () => void
  isEdit?: boolean
}

const SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'pricing', label: 'Capacity & pricing' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'policies', label: 'Policies' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'media', label: 'Photos' },
  { id: 'faqs', label: 'FAQs' },
] as const

function emptyRoom(): StayRoomForm {
  return {
    name: '',
    description: '',
    max_guests: 2,
    bedrooms: 1,
    bed_summary: '',
    price_per_night: '',
    compare_at_price: '',
    badge: '',
    featured: false,
    image: '',
    images: '',
  }
}

export function StayListingForm({ values, onChange, error, saving, onSubmit, onCancel, isEdit }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('basics')

  function patch(partial: Partial<StayListingFormValues>) {
    onChange({ ...values, ...partial })
  }

  function toggleAmenity(name: string) {
    const key = name.toLowerCase()
    const map: Record<string, keyof StayListingFormValues> = {
      'wi-fi': 'wifi',
      parking: 'parking',
      pool: 'pool',
      kitchen: 'kitchen',
      breakfast: 'breakfast',
      'pet-friendly': 'pet_friendly',
    }
    const flag = map[key]
    if (flag && typeof values[flag] === 'boolean') {
      patch({ [flag]: !values[flag] } as Partial<StayListingFormValues>)
      return
    }
    const amenities = values.amenities.includes(name)
      ? values.amenities.filter((a) => a !== name)
      : [...values.amenities, name]
    patch({ amenities })
  }

  function isAmenityOn(name: string) {
    const key = name.toLowerCase()
    if (key === 'wi-fi') return values.wifi
    if (key === 'parking') return values.parking
    if (key === 'pool') return values.pool
    if (key === 'kitchen') return values.kitchen
    if (key === 'breakfast') return values.breakfast
    if (key === 'pet-friendly') return values.pet_friendly
    return values.amenities.includes(name)
  }

  const canSave =
    values.title.trim() &&
    values.description.trim() &&
    values.region.trim() &&
    values.city.trim() &&
    values.price_per_night

  return (
    <div className="stay-form" role="dialog" aria-modal="true" aria-labelledby="stay-form-title">
      <div className="stay-form__panel">
        <header className="stay-form__head">
          <h2 id="stay-form-title">{isEdit ? 'Edit stay listing' : 'Create stay listing'}</h2>
          <p>Add everything guests see on your public stay page — photos, rooms, policies, and FAQs.</p>
        </header>

        <nav className="stay-form__nav" aria-label="Form sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`stay-form__nav-btn${section === s.id ? ' stay-form__nav-btn--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {error ? (
          <p className="stay-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="stay-form__body">
          {section === 'basics' ? (
            <div className="stay-form__section">
              <label className="stay-form__field">
                <span>Property name</span>
                <input
                  value={values.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Coastal guesthouse"
                />
              </label>
              <label className="stay-form__field">
                <span>Property type</span>
                <select value={values.property_type} onChange={(e) => patch({ property_type: e.target.value })}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stay-form__field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={values.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Describe the property, neighbourhood, and what makes your stay special."
                />
              </label>
              <div className="stay-form__row">
                <label className="stay-form__field">
                  <span>City</span>
                  <input value={values.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Swakopmund" />
                </label>
                <label className="stay-form__field">
                  <span>Region</span>
                  <input value={values.region} onChange={(e) => patch({ region: e.target.value })} placeholder="Erongo" />
                </label>
              </div>
              <label className="stay-form__check">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => patch({ is_active: e.target.checked })}
                />
                Listing is live (visible to travellers)
              </label>
            </div>
          ) : null}

          {section === 'pricing' ? (
            <div className="stay-form__section">
              <label className="stay-form__field">
                <span>From price per night (N$)</span>
                <input
                  value={values.price_per_night}
                  onChange={(e) => patch({ price_per_night: e.target.value })}
                  placeholder="850"
                />
              </label>
              <div className="stay-form__row">
                <label className="stay-form__field">
                  <span>Max guests</span>
                  <input
                    type="number"
                    min={1}
                    value={values.max_guests}
                    onChange={(e) => patch({ max_guests: Number(e.target.value) })}
                  />
                </label>
                <label className="stay-form__field">
                  <span>Bedrooms</span>
                  <input
                    type="number"
                    min={1}
                    value={values.bedrooms}
                    onChange={(e) => patch({ bedrooms: Number(e.target.value) })}
                  />
                </label>
              </div>
              <p className="stay-form__hint">This is the default “from” price shown on browse cards. Set room-specific prices in the Rooms section.</p>
            </div>
          ) : null}

          {section === 'amenities' ? (
            <div className="stay-form__section">
              <p className="stay-form__hint">These appear on your listing card and detail page.</p>
              <div className="stay-form__chips">
                {AMENITY_OPTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`stay-form__chip${isAmenityOn(name) ? ' stay-form__chip--on' : ''}`}
                    onClick={() => toggleAmenity(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {section === 'policies' ? (
            <div className="stay-form__section">
              <div className="stay-form__row">
                <label className="stay-form__field">
                  <span>Check-in from</span>
                  <input
                    type="time"
                    value={values.check_in_from}
                    onChange={(e) => patch({ check_in_from: e.target.value })}
                  />
                </label>
                <label className="stay-form__field">
                  <span>Check-out by</span>
                  <input
                    type="time"
                    value={values.check_out_until}
                    onChange={(e) => patch({ check_out_until: e.target.value })}
                  />
                </label>
              </div>
              <label className="stay-form__field">
                <span>House rules (one per line)</span>
                <textarea
                  rows={3}
                  value={values.house_rules}
                  onChange={(e) => patch({ house_rules: e.target.value })}
                  placeholder={'No smoking indoors\nQuiet hours after 22:00'}
                />
              </label>
              <label className="stay-form__field">
                <span>Cancellation policy</span>
                <textarea
                  rows={3}
                  value={values.cancellation_policy}
                  onChange={(e) => patch({ cancellation_policy: e.target.value })}
                  placeholder="Free cancellation up to 7 days before check-in."
                />
              </label>
            </div>
          ) : null}

          {section === 'rooms' ? (
            <div className="stay-form__section">
              <p className="stay-form__hint">Room types appear on your detail page so guests can pick and book.</p>
              {values.room_types.map((room, i) => (
                <div key={i} className="stay-form__subcard">
                  <div className="stay-form__subcard-head">
                    <strong>Room {i + 1}</strong>
                    <button
                      type="button"
                      className="stay-form__icon-btn"
                      aria-label="Remove room"
                      onClick={() => patch({ room_types: values.room_types.filter((_, j) => j !== i) })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="stay-form__field">
                    <span>Room name</span>
                    <input
                      value={room.name}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, name: e.target.value }
                        patch({ room_types })
                      }}
                      placeholder="Deluxe double"
                    />
                  </label>
                  <label className="stay-form__field">
                    <span>Description</span>
                    <textarea
                      rows={2}
                      value={room.description}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, description: e.target.value }
                        patch({ room_types })
                      }}
                    />
                  </label>
                  <div className="stay-form__row">
                    <label className="stay-form__field">
                      <span>Guests</span>
                      <input
                        type="number"
                        min={1}
                        value={room.max_guests}
                        onChange={(e) => {
                          const room_types = [...values.room_types]
                          room_types[i] = { ...room, max_guests: Number(e.target.value) }
                          patch({ room_types })
                        }}
                      />
                    </label>
                    <label className="stay-form__field">
                      <span>Bedrooms</span>
                      <input
                        type="number"
                        min={0}
                        value={room.bedrooms}
                        onChange={(e) => {
                          const room_types = [...values.room_types]
                          room_types[i] = { ...room, bedrooms: Number(e.target.value) }
                          patch({ room_types })
                        }}
                      />
                    </label>
                    <label className="stay-form__field">
                      <span>Price / night (N$)</span>
                      <input
                        value={room.price_per_night}
                        onChange={(e) => {
                          const room_types = [...values.room_types]
                          room_types[i] = { ...room, price_per_night: e.target.value }
                          patch({ room_types })
                        }}
                        placeholder={values.price_per_night}
                      />
                    </label>
                  </div>
                  <div className="stay-form__row">
                    <label className="stay-form__field">
                      <span>Compare-at price (N$)</span>
                      <input
                        value={room.compare_at_price}
                        onChange={(e) => {
                          const room_types = [...values.room_types]
                          room_types[i] = { ...room, compare_at_price: e.target.value }
                          patch({ room_types })
                        }}
                        placeholder="Was price, for a sale"
                      />
                    </label>
                    <label className="stay-form__field">
                      <span>Sale / special badge</span>
                      <input
                        value={room.badge}
                        onChange={(e) => {
                          const room_types = [...values.room_types]
                          room_types[i] = { ...room, badge: e.target.value }
                          patch({ room_types })
                        }}
                        placeholder="e.g. Deal, Popular"
                      />
                    </label>
                  </div>
                  <p className="stay-form__hint">
                    Compare-at price shows a strike-through “was” price only when it’s higher than the room
                    price.
                  </p>
                  <label className="stay-form__check">
                    <input
                      type="checkbox"
                      checked={room.featured}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, featured: e.target.checked }
                        patch({ room_types })
                      }}
                    />
                    Feature this room (highlight it on the detail page)
                  </label>
                  <label className="stay-form__field">
                    <span>Bed setup</span>
                    <input
                      value={room.bed_summary}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, bed_summary: e.target.value }
                        patch({ room_types })
                      }}
                      placeholder="1 king bed"
                    />
                  </label>
                  <label className="stay-form__field">
                    <span>Room cover photo URL</span>
                    <input
                      value={room.image}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, image: e.target.value }
                        patch({ room_types })
                      }}
                      placeholder="https://…"
                    />
                  </label>
                  {room.image ? <img src={room.image} alt="" className="stay-form__preview" /> : null}
                  <label className="stay-form__field">
                    <span>More room photos (one URL per line)</span>
                    <textarea
                      rows={3}
                      value={room.images}
                      onChange={(e) => {
                        const room_types = [...values.room_types]
                        room_types[i] = { ...room, images: e.target.value }
                        patch({ room_types })
                      }}
                      placeholder={'https://example.com/room-2.jpg\nhttps://example.com/room-3.jpg'}
                    />
                  </label>
                  <p className="stay-form__hint">
                    Extra photos power the room detail gallery. The cover photo is shown first.
                  </p>
                </div>
              ))}
              <button
                type="button"
                className="stay-form__add"
                onClick={() => patch({ room_types: [...values.room_types, emptyRoom()] })}
              >
                <Plus size={16} aria-hidden />
                Add room type
              </button>
            </div>
          ) : null}

          {section === 'media' ? (
            <div className="stay-form__section">
              <label className="stay-form__field">
                <span>Cover photo URL</span>
                <input
                  value={values.cover_image_url}
                  onChange={(e) => patch({ cover_image_url: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              {values.cover_image_url ? (
                <img src={values.cover_image_url} alt="" className="stay-form__preview" />
              ) : null}
              <label className="stay-form__field">
                <span>Gallery URLs (one per line)</span>
                <textarea
                  rows={4}
                  value={values.gallery_urls}
                  onChange={(e) => patch({ gallery_urls: e.target.value })}
                  placeholder={'https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg'}
                />
              </label>
              <p className="stay-form__hint">Photos power the detail page gallery and “From Delvers” moments.</p>
            </div>
          ) : null}

          {section === 'faqs' ? (
            <div className="stay-form__section">
              {values.faqs.map((faq, i) => (
                <div key={i} className="stay-form__subcard">
                  <div className="stay-form__subcard-head">
                    <strong>FAQ {i + 1}</strong>
                    <button
                      type="button"
                      className="stay-form__icon-btn"
                      aria-label="Remove FAQ"
                      onClick={() => patch({ faqs: values.faqs.filter((_, j) => j !== i) })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="stay-form__field">
                    <span>Question</span>
                    <input
                      value={faq.question}
                      onChange={(e) => {
                        const faqs = [...values.faqs]
                        faqs[i] = { ...faq, question: e.target.value }
                        patch({ faqs })
                      }}
                    />
                  </label>
                  <label className="stay-form__field">
                    <span>Answer</span>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => {
                        const faqs = [...values.faqs]
                        faqs[i] = { ...faq, answer: e.target.value }
                        patch({ faqs })
                      }}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="stay-form__add"
                onClick={() => patch({ faqs: [...values.faqs, { question: '', answer: '' }] })}
              >
                <Plus size={16} aria-hidden />
                Add FAQ
              </button>
            </div>
          ) : null}
        </div>

        <footer className="stay-form__foot">
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={!canSave || saving}
            onClick={onSubmit}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create listing'}
          </button>
        </footer>
      </div>
      <button type="button" className="stay-form__backdrop" aria-label="Close" onClick={onCancel} />
    </div>
  )
}

export { EMPTY_STAY_LISTING_FORM }
