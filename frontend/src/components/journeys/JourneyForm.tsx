import type { TripCost } from '../../data/mockTrips'
import { ListingPhotoManager } from '../listing/photos'
import type { ListingPhotoDraft } from '../listing/photos/types'
import { JourneyStopMoment, type StopMoment } from '../create/JourneyStopMoment'
import { JourneyStopLinkPicker, type JourneyStopLink } from '../journeys/JourneyStopLinkPicker'
import { HighlightChannelEditor } from '../highlights/HighlightChannelEditor'
import type { HighlightChannelInput } from '../highlights/types'
import { PartyPicker } from '../journeys/PartyPicker'
import {
  FormField,
  FormTextarea,
  FormRow,
  TextInput,
  DateInput,
  ChipSelector,
} from '../create/shared'
import '../journeys/CreateJourneyPageEnhancer.css'

export const JOURNEY_WIZARD_STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Stops' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Details' },
] as const

type Props = {
  title: string
  summary: string
  startsOn: string
  endsOn: string
  party: string
  listingPhotos: ListingPhotoDraft[]
  stops: FormStop[]
  costs: FormCost[]
  selectedTransport: string[]
  selectedTags: string[]
  selectedCountries: string[]
  journeyStories: HighlightChannelInput[]
  onChange: (patch: Partial<JourneyFormPatch>) => void
  step?: number
}

type FormStop = {
  key: string
  place_name: string
  country_code: string
  arrived_on: string
  left_on: string
  notes: string
  cost: string
  moment: StopMoment
  linked: JourneyStopLink
}

type FormCost = {
  key: string
  category: TripCost['category']
  amount: string
  note: string
}

type JourneyFormPatch = {
  title: string
  summary: string
  startsOn: string
  endsOn: string
  party: string
  listingPhotos: ListingPhotoDraft[]
  stops: FormStop[]
  costs: FormCost[]
  selectedTransport: string[]
  selectedTags: string[]
  selectedCountries: string[]
  journeyStories: HighlightChannelInput[]
}

const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'flight', label: 'Flight', icon: '✈️' },
  { value: 'boat', label: 'Boat', icon: '⛵' },
  { value: 'bike', label: 'Bike', icon: '🚲' },
  { value: 'walk', label: 'Walk', icon: '🚶' },
]

const TAG_OPTIONS = [
  { value: '4x4', label: '4×4', icon: '🚙' },
  { value: 'budget', label: 'Budget', icon: '💸' },
  { value: 'wildlife', label: 'Wildlife', icon: '🐘' },
  { value: 'coast', label: 'Coast', icon: '🌊' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' },
  { value: 'photography', label: 'Photography', icon: '📷' },
  { value: 'camping', label: 'Camping', icon: '⛺' },
  { value: 'culture', label: 'Culture', icon: '🎭' },
]

const COUNTRY_OPTIONS = [
  { code: 'NA', label: 'Namibia', icon: '🇳🇦' },
  { code: 'BW', label: 'Botswana', icon: '🇧🇼' },
  { code: 'ZA', label: 'South Africa', icon: '🇿🇦' },
  { code: 'ZM', label: 'Zambia', icon: '🇿🇲' },
  { code: 'ZW', label: 'Zimbabwe', icon: '🇿🇼' },
  { code: 'MZ', label: 'Mozambique', icon: '🇲🇿' },
  { code: 'TZ', label: 'Tanzania', icon: '🇹🇿' },
  { code: 'KE', label: 'Kenya', icon: '🇰🇪' },
]

const COST_CATEGORIES = [
  { value: 'stay', label: 'Accommodation', icon: '🏨' },
  { value: 'food', label: 'Food & drink', icon: '🍽' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'activity', label: 'Activities', icon: '🎯' },
  { value: 'other', label: 'Other', icon: '💼' },
]

export function JourneyForm({
  title,
  summary,
  startsOn,
  endsOn,
  party,
  listingPhotos,
  stops,
  costs,
  selectedTransport,
  selectedTags,
  selectedCountries,
  journeyStories,
  onChange,
  step,
}: Props) {
  const show = (id: number) => step == null || step === id

  const total = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const days = daysBetween(startsOn, endsOn)

  return (
    <div className="cj-compose">
      {show(1) ? (
        <>
          <p className="cj-compose__prompt">Tell people what this journey is about.</p>
          <div className="cj-compose-card">
            <FormField label="Journey title">
              <TextInput
                id="cj-title"
                placeholder="Give your journey a title…"
                value={title}
                onChange={(e) => onChange({ title: e.target.value })}
                maxLength={120}
              />
            </FormField>

            <FormTextarea
              label="Description"
              id="cj-summary"
              placeholder="A short description of the trip…"
              rows={3}
              value={summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              maxLength={400}
            />

            <div className="cj-compose-card__divider" aria-hidden />

            <FormRow>
              <DateInput
                label="Start"
                id="cj-start"
                value={startsOn}
                onChange={(e) => onChange({ startsOn: e.target.value })}
              />
              <DateInput
                label="End"
                id="cj-end"
                value={endsOn}
                min={startsOn}
                onChange={(e) => onChange({ endsOn: e.target.value })}
              />
            </FormRow>

            {days > 0 && <p className="cj-form__calc">{days} {days === 1 ? 'day' : 'days'}</p>}
          </div>

          <PartyPicker value={party} onChange={(party) => onChange({ party })} />

          <ListingPhotoManager
            photos={listingPhotos}
            onChange={(listingPhotos) => onChange({ listingPhotos })}
            hint="Cover must be a photo. Add more photos or short videos (up to 1 min) for the hero gallery."
          />
        </>
      ) : null}

      {show(2) && (
        <>
          <p className="cj-compose__prompt">Add each place you visited, in order. You can always add more later.</p>
          {stops.map((stop, i) => (
            <div key={stop.key} className="cj-stop">
              <div className="cj-stop__header">
                <div className="cj-stop__num" aria-hidden>{i + 1}</div>
                <p className="cj-stop__title">{stop.place_name || `Stop ${i + 1}`}</p>
                {stops.length > 1 && (
                  <button type="button" className="cj-stop__remove" aria-label="Remove stop"
                    onClick={() => onChange({ stops: stops.filter((s) => s.key !== stop.key) })}>×</button>
                )}
              </div>

              <div className="cj-stop__fields">
                <FormField label="Where">
                  <TextInput
                    placeholder="e.g. Swakopmund"
                    value={stop.place_name}
                    onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, place_name: e.target.value } : s) })}
                  />
                </FormField>

                <FormRow>
                  <FormField label="Country">
                    <select
                      className="input ce-form__input"
                      value={stop.country_code}
                      onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, country_code: e.target.value } : s) })}
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Spend">
                    <TextInput
                      type="number"
                      min="0"
                      placeholder="N$ 0"
                      value={stop.cost}
                      onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, cost: e.target.value } : s) })}
                    />
                  </FormField>
                </FormRow>

                <FormRow>
                  <DateInput
                    label="Arrived"
                    value={stop.arrived_on}
                    onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, arrived_on: e.target.value } : s) })}
                  />
                  <DateInput
                    label="Left"
                    value={stop.left_on}
                    min={stop.arrived_on}
                    onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, left_on: e.target.value } : s) })}
                  />
                </FormRow>

                <FormField label="What stood out?">
                  <TextInput
                    placeholder="Memorable moments, tips, highlights…"
                    value={stop.notes}
                    onChange={(e) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, notes: e.target.value } : s) })}
                  />
                </FormField>

                <JourneyStopMoment
                  value={stop.moment}
                  onChange={(moment) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, moment } : s) })}
                />

                <JourneyStopLinkPicker
                  value={stop.linked}
                  onChange={(linked) => onChange({ stops: stops.map((s) => s.key === stop.key ? { ...s, linked } : s) })}
                />
              </div>
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={() => onChange({ stops: [...stops, emptyStop()] })}>
            <span aria-hidden>+</span> Add another stop
          </button>
        </>
      )}

      {show(3) && (
        <>
          <p className="cj-compose__prompt">Log what you spent — every item is optional.</p>
          {costs.map((cost, i) => (
            <div key={cost.key} className="cj-cost-row">
              <select
                className="input cj-cost-row__cat"
                value={cost.category}
                onChange={(e) => onChange({ costs: costs.map((c, idx) => idx === i ? { ...c, category: e.target.value as TripCost['category'] } : c) })}
              >
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>

              <TextInput
                className="cj-cost-row__note"
                placeholder="Description (e.g. Hotel Heinitzburg)"
                value={cost.note}
                onChange={(e) => onChange({ costs: costs.map((c, idx) => idx === i ? { ...c, note: e.target.value } : c) })}
              />

              <div className="cj-cost-row__amount-wrap">
                <span className="cj-cost-row__currency">N$</span>
                <TextInput
                  type="number"
                  min="0"
                  className="cj-cost-row__amount"
                  placeholder="0"
                  value={cost.amount}
                  onChange={(e) => onChange({ costs: costs.map((c, idx) => idx === i ? { ...c, amount: e.target.value } : c) })}
                />
              </div>

              {costs.length > 1 && (
                <button type="button" className="cj-cost-row__del" aria-label={`Remove expense ${i + 1}`}
                  onClick={() => onChange({ costs: costs.filter((_, idx) => idx !== i) })}>×</button>
              )}
            </div>
          ))}

          <button type="button" className="cj-add-btn" onClick={() => onChange({ costs: [...costs, emptyCost()] })}>
            <span aria-hidden>+</span> Add expense
          </button>

          {total > 0 && (
            <div className="cj-budget-total">
              <span>Total estimated spend</span>
              <strong>N${total.toLocaleString()}</strong>
            </div>
          )}
        </>
      )}

      {show(4) && (
        <>
          <p className="cj-compose__prompt">Tag your trip so others can discover it.</p>

          <ChipSelector
            label="Countries visited"
            chips={COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.icon + ' ' + c.label }))}
            selected={selectedCountries}
            onChange={(selectedCountries) => onChange({ selectedCountries })}
          />

          <ChipSelector
            label="How did you get around?"
            chips={TRANSPORT_OPTIONS.map((t) => ({ value: t.value, label: t.icon + ' ' + t.label }))}
            selected={selectedTransport}
            onChange={(selectedTransport) => onChange({ selectedTransport })}
          />

          <ChipSelector
            label="Trip style"
            emptyLabel="optional"
            chips={TAG_OPTIONS.map((t) => ({ value: t.value, label: t.icon + ' ' + t.label }))}
            selected={selectedTags}
            onChange={(selectedTags) => onChange({ selectedTags })}
          />

          <section className="ce-form__section" aria-labelledby="ce-highlights-title">
            <h2 id="ce-highlights-title" className="ce-form__section-title">Highlights</h2>
            <HighlightChannelEditor
              channels={journeyStories}
              onChange={(journeyStories) => onChange({ journeyStories })}
              hint="Story rings on your journey page — name each ring yourself."
              emptyCopy="No custom highlight rings yet."
            />
          </section>

          <div className="cj-preview">
            <p className="cj-preview__label">Preview</p>
            <div className="cj-preview__card">
              {listingPhotos[0]?.src ? (
                <img
                  src={listingPhotos[0].src}
                  alt=""
                  className="cj-preview__img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : null}
              <div className="cj-preview__body">
                <p className="cj-preview__title">{title || 'Your journey title'}</p>
                <p className="cj-preview__meta">
                  {selectedCountries.map((c) => COUNTRY_OPTIONS.find((o) => o.code === c)?.icon).join(' ')}
                  {days > 0 && ` · ${days} days`}
                  {total > 0 && ` · N$${total.toLocaleString()}`}
                </p>
                <p className="cj-preview__meta">
                  {stops.filter((s) => s.place_name).map((s) => s.place_name).join(' → ')}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function emptyStop(): FormStop {
  return {
    key: Math.random().toString(36).slice(2),
    place_name: '',
    country_code: 'NA',
    arrived_on: '',
    left_on: '',
    notes: '',
    cost: '',
    moment: { preview: null, mediaKind: null },
    linked: { kind: 'none' },
  }
}

function emptyCost(): FormCost {
  return { key: Math.random().toString(36).slice(2), category: 'other', amount: '', note: '' }
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}