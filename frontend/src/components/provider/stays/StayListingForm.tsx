import { useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import {
  AMENITY_OPTIONS,
  EMPTY_STAY_LISTING_FORM,
  PROPERTY_TYPES,
  ROOM_BADGE_OPTIONS,
  STAY_FORM_STEPS,
  canCreateStayDraft,
  isPresetRoomBadge,
  nextStayFormStep,
  stayFormStepDone,
  type StayFormStepId,
  type StayListingFormValues,
  type StayRoomForm,
} from './stayListingTypes'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'
import { VenueLocationPicker } from '../food/workspace/VenueLocationPicker'
import { ListingSaleEditor } from '../../deals'
import { StayPhotoEditor } from './StayPhotoEditor'

export type StayListingSaveMode = 'exit' | 'continue'

type Props = {
  values: StayListingFormValues
  onChange: (values: StayListingFormValues) => void
  error?: string
  saving?: boolean
  onSave: (mode: StayListingSaveMode) => void
  onCancel: () => void
  isEdit?: boolean
  listingId?: number | null
  step: StayFormStepId
  onStepChange: (step: StayFormStepId) => void
}

function emptyRoom(): StayRoomForm {
  return {
    name: '',
    description: '',
    max_guests: 2,
    bedrooms: 1,
    bed_summary: '',
    price_per_night: '',
    compare_at_price: '',
    badges: [],
    featured: false,
    image: '',
    image_file: null,
    images: '',
    gallery_files: [],
  }
}

const PRESET_AMENITY_SET = new Set(AMENITY_OPTIONS.map((a) => a.toLowerCase()))

export function StayListingForm({
  values,
  onChange,
  error,
  saving,
  onSave,
  onCancel,
  isEdit,
  listingId,
  step,
  onStepChange,
}: Props) {
  const { format, currency } = useDisplayMoney()
  const [customAmenity, setCustomAmenity] = useState('')
  const [houseRuleDraft, setHouseRuleDraft] = useState('')
  const [badgeDrafts, setBadgeDrafts] = useState<Record<number, string>>({})

  useEffect(() => {
    setCustomAmenity('')
    setHouseRuleDraft('')
    setBadgeDrafts({})
  }, [step])

  function patch(partial: Partial<StayListingFormValues>) {
    onChange({ ...values, ...partial })
  }

  function addHouseRule() {
    const rule = houseRuleDraft.trim().replace(/\s+/g, ' ')
    if (!rule) return
    if (values.house_rules.some((r) => r.toLowerCase() === rule.toLowerCase())) {
      setHouseRuleDraft('')
      return
    }
    patch({ house_rules: [...values.house_rules, rule] })
    setHouseRuleDraft('')
  }

  function removeHouseRule(index: number) {
    patch({ house_rules: values.house_rules.filter((_, i) => i !== index) })
  }

  function addRoomBadge(roomIndex: number) {
    const draft = (badgeDrafts[roomIndex] ?? '').trim().replace(/\s+/g, ' ')
    if (!draft) return
    const room = values.room_types[roomIndex]
    if (!room) return
    const preset = ROOM_BADGE_OPTIONS.find((b) => b.toLowerCase() === draft.toLowerCase())
    const label = preset ?? draft
    if (room.badges.some((b) => b.toLowerCase() === label.toLowerCase())) {
      setBadgeDrafts((prev) => ({ ...prev, [roomIndex]: '' }))
      return
    }
    if (room.badges.length >= 8) return
    const room_types = [...values.room_types]
    room_types[roomIndex] = { ...room, badges: [...room.badges, label] }
    patch({ room_types })
    setBadgeDrafts((prev) => ({ ...prev, [roomIndex]: '' }))
  }

  function toggleRoomBadge(roomIndex: number, label: string) {
    const room = values.room_types[roomIndex]
    if (!room) return
    const on = room.badges.some((b) => b.toLowerCase() === label.toLowerCase())
    if (on) {
      removeRoomBadge(
        roomIndex,
        room.badges.findIndex((b) => b.toLowerCase() === label.toLowerCase()),
      )
      return
    }
    if (room.badges.length >= 8) return
    const room_types = [...values.room_types]
    room_types[roomIndex] = { ...room, badges: [...room.badges, label] }
    patch({ room_types })
  }

  function removeRoomBadge(roomIndex: number, badgeIndex: number) {
    const room = values.room_types[roomIndex]
    if (!room || badgeIndex < 0) return
    const room_types = [...values.room_types]
    room_types[roomIndex] = { ...room, badges: room.badges.filter((_, j) => j !== badgeIndex) }
    patch({ room_types })
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
    const amenities = values.amenities.some((a) => a.toLowerCase() === key)
      ? values.amenities.filter((a) => a.toLowerCase() !== key)
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
    return values.amenities.some((a) => a.toLowerCase() === key)
  }

  const customAmenities = values.amenities.filter((a) => !PRESET_AMENITY_SET.has(a.toLowerCase()))

  function addCustomAmenity() {
    const name = customAmenity.trim().replace(/\s+/g, ' ')
    if (!name || name.length > 40) return
    const preset = AMENITY_OPTIONS.find((a) => a.toLowerCase() === name.toLowerCase())
    if (preset) {
      if (!isAmenityOn(preset)) toggleAmenity(preset)
      setCustomAmenity('')
      return
    }
    if (values.amenities.some((a) => a.toLowerCase() === name.toLowerCase())) {
      setCustomAmenity('')
      return
    }
    patch({ amenities: [...values.amenities, name] })
    setCustomAmenity('')
  }

  const canPersist = isEdit || canCreateStayDraft(values)
  const nextStep = nextStayFormStep(step)
  const stepIndex = STAY_FORM_STEPS.findIndex((s) => s.id === step) + 1

  return (
    <div className="stay-form" role="dialog" aria-modal="true" aria-labelledby="stay-form-title">
      <button type="button" className="stay-form__backdrop" aria-label="Close" onClick={onCancel} />
      <div className="stay-form__panel">
        <header className="stay-form__head">
          <h2 id="stay-form-title">{isEdit ? 'Edit stay listing' : 'Create stay listing'}</h2>
          <p>
            Step {stepIndex} of {STAY_FORM_STEPS.length} — finish one step, save, and come back to the rest
            anytime.
          </p>
        </header>

        <nav className="stay-form__nav" aria-label="Listing steps">
          <div className="stay-form__nav-track">
            {STAY_FORM_STEPS.map((s, i) => {
              const done = stayFormStepDone(values, s.id)
              const active = step === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`stay-form__nav-btn${active ? ' stay-form__nav-btn--active' : ''}${
                    done ? ' stay-form__nav-btn--done' : ''
                  }`}
                  onClick={() => onStepChange(s.id)}
                  aria-current={active ? 'step' : undefined}
                >
                  {done && !active ? <Check size={12} strokeWidth={2.5} aria-hidden /> : null}
                  <span className="stay-form__nav-num" aria-hidden>
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              )
            })}
          </div>
        </nav>

        {error ? (
          <p className="stay-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="stay-form__body">
          {step === 'basics' ? (
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
              <label className="stay-form__field">
                <span>From price per night ({currency})</span>
                <input
                  value={values.price_per_night}
                  onChange={(e) => patch({ price_per_night: e.target.value })}
                  placeholder="850"
                  inputMode="decimal"
                />
              </label>
              <p className="stay-form__hint">Needed to create your draft — refine guests and rooms in later steps.</p>
              <p className="stay-form__hint">
                Search Google Maps for your property — no need to type city or region by hand.
              </p>
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
                onChange={(loc) => patch(loc)}
                searchPlaceholder="Search Google Maps for your lodge, hotel, or address"
                hint="Pick a suggestion, then drag the pin if the exact spot needs a nudge."
              />
              <label className="stay-form__check">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => patch({ is_active: e.target.checked })}
                />
                Publish when saved (visible to travellers — needs a verified business)
              </label>
              <p className="stay-form__hint">
                New listings stay drafts by default. Turn this on only when you are ready to go live.
              </p>
            </div>
          ) : null}

          {step === 'pricing' ? (
            <div className="stay-form__section">
              <label className="stay-form__field">
                <span>From price per night ({currency})</span>
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
              {isEdit && listingId ? (
                <ListingSaleEditor vertical="stays" listingId={listingId} canEdit />
              ) : null}
            </div>
          ) : null}

          {step === 'amenities' ? (
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
                {customAmenities.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="stay-form__chip stay-form__chip--on stay-form__chip--custom"
                    onClick={() => toggleAmenity(name)}
                    aria-label={`Remove ${name}`}
                    title="Click to remove"
                  >
                    {name}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
              <div className="stay-form__amenity-add">
                <label className="stay-form__field">
                  <span>Add your own</span>
                  <input
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomAmenity()
                      }
                    }}
                    placeholder="e.g. Braai, Hot tub, EV charger"
                    maxLength={40}
                  />
                </label>
                <button
                  type="button"
                  className="prov-ui__btn prov-ui__btn--ghost stay-form__amenity-add-btn"
                  disabled={!customAmenity.trim()}
                  onClick={addCustomAmenity}
                >
                  <Plus size={16} strokeWidth={2.25} aria-hidden />
                  Add
                </button>
              </div>
            </div>
          ) : null}

          {step === 'policies' ? (
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
              <div className="stay-form__list-block">
                <span className="stay-form__list-label">House rules</span>
                {values.house_rules.length > 0 ? (
                  <ul className="stay-form__rule-list">
                    {values.house_rules.map((rule, i) => (
                      <li key={`${i}-${rule}`} className="stay-form__rule-item">
                        <span>{rule}</span>
                        <button
                          type="button"
                          className="stay-form__icon-btn"
                          aria-label={`Remove rule: ${rule}`}
                          onClick={() => removeHouseRule(i)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="stay-form__hint">No house rules yet — add ones guests should know.</p>
                )}
                <div className="stay-form__amenity-add">
                  <label className="stay-form__field">
                    <span>Add a rule</span>
                    <input
                      value={houseRuleDraft}
                      onChange={(e) => setHouseRuleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addHouseRule()
                        }
                      }}
                      placeholder="e.g. No smoking indoors"
                      maxLength={160}
                    />
                  </label>
                  <button
                    type="button"
                    className="prov-ui__btn prov-ui__btn--ghost stay-form__amenity-add-btn"
                    disabled={!houseRuleDraft.trim()}
                    onClick={addHouseRule}
                  >
                    <Plus size={16} strokeWidth={2.25} aria-hidden />
                    Add
                  </button>
                </div>
              </div>
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

          {step === 'rooms' ? (
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
                  </div>
                  <div className="stay-form__list-block">
                    <span className="stay-form__list-label">Room price ({currency})</span>
                    <div className="stay-form__row">
                      <label className="stay-form__field">
                        <span>Price guests pay / night</span>
                        <input
                          value={room.price_per_night}
                          onChange={(e) => {
                            const room_types = [...values.room_types]
                            room_types[i] = { ...room, price_per_night: e.target.value }
                            patch({ room_types })
                          }}
                          placeholder={values.price_per_night || '850'}
                          inputMode="decimal"
                        />
                      </label>
                      <label className="stay-form__field">
                        <span>Old price (optional)</span>
                        <input
                          value={room.compare_at_price}
                          onChange={(e) => {
                            const room_types = [...values.room_types]
                            room_types[i] = { ...room, compare_at_price: e.target.value }
                            patch({ room_types })
                          }}
                          placeholder="Only if discounted"
                          inputMode="decimal"
                        />
                      </label>
                    </div>
                    <p className="stay-form__hint">
                      Leave old price empty for a normal rate. If you set a higher old price, guests see it
                      crossed out next to the price they pay.
                    </p>
                  </div>
                  <div className="stay-form__list-block">
                    <span className="stay-form__list-label">Sale / special badges</span>
                    <p className="stay-form__hint">Pick common badges, or add your own label.</p>
                    <div className="stay-form__chips">
                      {ROOM_BADGE_OPTIONS.map((label) => {
                        const on = room.badges.some((b) => b.toLowerCase() === label.toLowerCase())
                        return (
                          <button
                            key={label}
                            type="button"
                            className={`stay-form__chip${on ? ' stay-form__chip--on' : ''}`}
                            onClick={() => toggleRoomBadge(i, label)}
                            disabled={!on && room.badges.length >= 8}
                          >
                            {label}
                          </button>
                        )
                      })}
                      {room.badges
                        .filter((b) => !isPresetRoomBadge(b))
                        .map((badge) => (
                          <button
                            key={badge}
                            type="button"
                            className="stay-form__chip stay-form__chip--on stay-form__chip--custom"
                            onClick={() =>
                              removeRoomBadge(
                                i,
                                room.badges.findIndex((b) => b.toLowerCase() === badge.toLowerCase()),
                              )
                            }
                            aria-label={`Remove badge: ${badge}`}
                            title="Click to remove"
                          >
                            {badge}
                            <span aria-hidden>×</span>
                          </button>
                        ))}
                    </div>
                    <div className="stay-form__amenity-add">
                      <label className="stay-form__field">
                        <span>Add your own</span>
                        <input
                          value={badgeDrafts[i] ?? ''}
                          onChange={(e) => setBadgeDrafts((prev) => ({ ...prev, [i]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addRoomBadge(i)
                            }
                          }}
                          placeholder="e.g. Sea view, Weekend special"
                          maxLength={40}
                          disabled={room.badges.length >= 8}
                        />
                      </label>
                      <button
                        type="button"
                        className="prov-ui__btn prov-ui__btn--ghost stay-form__amenity-add-btn"
                        disabled={!(badgeDrafts[i] ?? '').trim() || room.badges.length >= 8}
                        onClick={() => addRoomBadge(i)}
                      >
                        <Plus size={16} strokeWidth={2.25} aria-hidden />
                        Add
                      </button>
                    </div>
                  </div>
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
                  <div className="stay-form__list-block">
                    <span className="stay-form__list-label">Room photos & video</span>
                    <StayPhotoEditor
                      values={{
                        cover_image_url: room.image,
                        cover_image_file: room.image_file ?? null,
                        gallery_urls: room.images,
                        gallery_files: room.gallery_files ?? [],
                      }}
                      onChange={(partial) => {
                        const room_types = [...values.room_types]
                        room_types[i] = {
                          ...room,
                          image:
                            partial.cover_image_url !== undefined
                              ? partial.cover_image_url
                              : room.image,
                          image_file:
                            partial.cover_image_file !== undefined
                              ? partial.cover_image_file
                              : room.image_file,
                          images:
                            partial.gallery_urls !== undefined ? partial.gallery_urls : room.images,
                          gallery_files:
                            partial.gallery_files !== undefined
                              ? partial.gallery_files
                              : room.gallery_files,
                        }
                        patch({ room_types })
                      }}
                      hint="Tap Add to upload. Cover can be a photo or short video of this room."
                    />
                  </div>
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

          {step === 'media' ? (
            <div className="stay-form__section">
              <StayPhotoEditor
                values={{
                  cover_image_url: values.cover_image_url,
                  cover_image_file: values.cover_image_file ?? null,
                  gallery_urls: values.gallery_urls,
                  gallery_files: values.gallery_files ?? [],
                }}
                onChange={(partial) => patch(partial)}
                hint="Tap Add to upload from your device. Cover can be a photo or a short video."
              />
            </div>
          ) : null}

          {step === 'faqs' ? (
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
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onCancel} disabled={saving}>
            Close
          </button>
          <div className="stay-form__foot-actions">
            {!canPersist ? (
              <p className="stay-form__foot-hint">
                Add name, description, from price, and location to create your draft.
              </p>
            ) : null}
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--ghost"
              disabled={!canPersist || saving}
              onClick={() => onSave('exit')}
            >
              {saving ? 'Saving…' : isEdit ? 'Save & exit' : 'Save draft & exit'}
            </button>
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--primary"
              disabled={!canPersist || saving}
              onClick={() => onSave(nextStep ? 'continue' : 'exit')}
            >
              {saving
                ? 'Saving…'
                : nextStep
                  ? isEdit
                    ? 'Save & continue'
                    : 'Save draft & continue'
                  : isEdit
                    ? 'Save & finish'
                    : 'Save draft & finish'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export { EMPTY_STAY_LISTING_FORM }
