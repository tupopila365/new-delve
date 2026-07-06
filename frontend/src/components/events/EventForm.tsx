import { HighlightChannelEditor } from '../highlights/HighlightChannelEditor'
import { ListingPhotoManager } from '../listing/photos'
import type { ListingPhotoDraft } from '../listing/photos/types'
import { EventCategoryPicker } from './EventCategoryPicker'
import type { EventFormState } from '../../utils/eventForm'
import '../provider/transport/transport-admin.css'

export const EVENT_WIZARD_STEPS = [
  { id: 1, label: 'What' },
  { id: 2, label: 'When' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Review' },
] as const

type Props = {
  state: EventFormState
  onChange: (patch: Partial<EventFormState>) => void
  photos: ListingPhotoDraft[]
  onPhotosChange: (photos: ListingPhotoDraft[]) => void
  /** When set, only that wizard step is rendered. */
  step?: number
}

export function EventForm({
  state,
  onChange,
  photos,
  onPhotosChange,
  step,
}: Props) {
  const show = (id: number) => step == null || step === id

  return (
    <div className="ce-form">
      {show(1) ? (
        <>
          <p className="cj-form__hint">Name your event and add photos for the top of the page.</p>
          <section className="ce-form__section listing-photos-section" aria-labelledby="ce-photos-title">
            <h2 id="ce-photos-title" className="ce-form__section-title">
              Photos
            </h2>
            <ListingPhotoManager
              photos={photos}
              onChange={onPhotosChange}
              hint="First photo is the cover. Tap a photo to edit, or star another to make it cover."
            />
          </section>

          <section className="ce-form__section" aria-labelledby="ce-basics-title">
            <h2 id="ce-basics-title" className="ce-form__section-title">
              Basics
            </h2>

            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-title">
                Event title <span aria-hidden>*</span>
              </label>
              <input
                id="ce-title"
                type="text"
                className="input ce-form__input"
                placeholder="Live jazz night, food market, beach cleanup…"
                value={state.title}
                onChange={(e) => onChange({ title: e.target.value })}
                required
                maxLength={200}
                autoComplete="off"
              />
            </div>

            <EventCategoryPicker value={state.category} onChange={(category) => onChange({ category })} />
          </section>
        </>
      ) : null}

      {show(2) ? (
        <>
          <p className="cj-form__hint">When and where is it happening?</p>
          <section className="ce-form__section" aria-labelledby="ce-when-title">
            <h2 id="ce-when-title" className="ce-form__section-title">
              When
            </h2>

            <div className="ce-form__row">
              <div className="ce-form__field">
                <label className="ce-form__label" htmlFor="ce-starts">
                  Start <span aria-hidden>*</span>
                </label>
                <input
                  id="ce-starts"
                  type="datetime-local"
                  className="input ce-form__input"
                  value={state.startsAt}
                  onChange={(e) => onChange({ startsAt: e.target.value })}
                  required
                />
              </div>
              <div className="ce-form__field">
                <label className="ce-form__label" htmlFor="ce-ends">
                  End <span className="ce-form__label-opt">optional</span>
                </label>
                <input
                  id="ce-ends"
                  type="datetime-local"
                  className="input ce-form__input"
                  value={state.endsAt}
                  min={state.startsAt}
                  onChange={(e) => onChange({ endsAt: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="ce-form__section" aria-labelledby="ce-where-title">
            <h2 id="ce-where-title" className="ce-form__section-title">
              Where
            </h2>

            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-venue">
                Venue
              </label>
              <input
                id="ce-venue"
                type="text"
                className="input ce-form__input"
                placeholder="The Warehouse, community hall, beach…"
                value={state.venue}
                onChange={(e) => onChange({ venue: e.target.value })}
                maxLength={200}
              />
            </div>

            <div className="ce-form__row">
              <div className="ce-form__field">
                <label className="ce-form__label" htmlFor="ce-city">
                  City
                </label>
                <input
                  id="ce-city"
                  type="text"
                  className="input ce-form__input"
                  placeholder="Windhoek"
                  value={state.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                />
              </div>
              <div className="ce-form__field">
                <label className="ce-form__label" htmlFor="ce-region">
                  Region
                </label>
                <input
                  id="ce-region"
                  type="text"
                  className="input ce-form__input"
                  placeholder="Khomas"
                  value={state.region}
                  onChange={(e) => onChange({ region: e.target.value })}
                />
              </div>
            </div>
          </section>
        </>
      ) : null}

      {show(3) ? (
        <>
          <p className="cj-form__hint">Tell people what to expect and how to get in.</p>
          <section className="ce-form__section" aria-labelledby="ce-about-title">
            <h2 id="ce-about-title" className="ce-form__section-title">
              About
            </h2>

            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-desc">
                Description <span className="ce-form__label-opt">optional</span>
              </label>
              <textarea
                id="ce-desc"
                className="input ce-form__textarea"
                placeholder="What should people expect? Dress code, lineup, tickets at door…"
                rows={5}
                value={state.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>
          </section>

          <section className="ce-form__section" aria-labelledby="ce-tickets-title">
            <h2 id="ce-tickets-title" className="ce-form__section-title">
              Tickets &amp; entry
            </h2>

            <fieldset className="ce-form__fieldset">
              <legend className="ce-form__label">How do people get in?</legend>
              <label className="ce-form__radio">
                <input
                  type="radio"
                  name="ticketingMode"
                  checked={state.ticketingMode === 'free'}
                  onChange={() => onChange({ ticketingMode: 'free', price: '', ticketUrl: '' })}
                />
                Free entry — RSVP on DELVE
              </label>
              <label className="ce-form__radio">
                <input
                  type="radio"
                  name="ticketingMode"
                  checked={state.ticketingMode === 'on_platform'}
                  onChange={() => onChange({ ticketingMode: 'on_platform', ticketUrl: '' })}
                />
                Sell on DELVE — mock payment (price required)
              </label>
              <label className="ce-form__radio">
                <input
                  type="radio"
                  name="ticketingMode"
                  checked={state.ticketingMode === 'external'}
                  onChange={() => onChange({ ticketingMode: 'external' })}
                />
                External ticket link — we track clicks
              </label>
            </fieldset>

            {state.ticketingMode === 'on_platform' ? (
              <div className="ce-form__field">
                <label className="ce-form__label" htmlFor="ce-price">
                  Price per ticket <span aria-hidden>*</span>
                </label>
                <input
                  id="ce-price"
                  type="text"
                  inputMode="decimal"
                  className="input ce-form__input"
                  placeholder="150"
                  value={state.price}
                  onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, '') })}
                  maxLength={32}
                  autoComplete="off"
                  required
                />
              </div>
            ) : null}

            {state.ticketingMode === 'external' ? (
              <>
                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor="ce-ticket-url">
                    Ticket link <span aria-hidden>*</span>
                  </label>
                  <input
                    id="ce-ticket-url"
                    type="url"
                    className="input ce-form__input"
                    placeholder="https://tickets.example.com/your-event"
                    value={state.ticketUrl}
                    onChange={(e) => onChange({ ticketUrl: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="ce-form__field">
                  <label className="ce-form__label" htmlFor="ce-price-display">
                    Display price <span className="ce-form__label-opt">optional</span>
                  </label>
                  <input
                    id="ce-price-display"
                    type="text"
                    inputMode="decimal"
                    className="input ce-form__input"
                    placeholder="150"
                    value={state.price}
                    onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, '') })}
                    maxLength={32}
                    autoComplete="off"
                  />
                </div>
              </>
            ) : null}

            <div className="ce-form__field">
              <label className="ce-form__label" htmlFor="ce-capacity">
                Capacity <span className="ce-form__label-opt">optional</span>
              </label>
              <input
                id="ce-capacity"
                type="number"
                min={1}
                className="input ce-form__input"
                placeholder="200"
                value={state.capacity}
                onChange={(e) => onChange({ capacity: e.target.value })}
                inputMode="numeric"
              />
            </div>
          </section>

          <section className="ce-form__section" aria-labelledby="ce-highlights-title">
            <h2 id="ce-highlights-title" className="ce-form__section-title">
              Highlights
            </h2>
            <HighlightChannelEditor
              channels={state.eventStories}
              onChange={(eventStories) => onChange({ eventStories })}
              hint="Story rings on your event page — name each ring yourself. When you add custom highlights, auto-generated rings are hidden."
              emptyCopy="No custom highlight rings yet. Auto-generated rings still use your cover and description."
            />
          </section>
        </>
      ) : null}

      {show(4) ? (
        <section className="ce-form__section" aria-labelledby="ce-review-title">
          <h2 id="ce-review-title" className="ce-form__section-title">
            Review
          </h2>
          <p className="cj-form__hint">Check the details, then publish.</p>
          <div className="cj-preview">
            <div className="cj-preview__card">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt=""
                  className="cj-preview__img"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : null}
              <div className="cj-preview__body">
                <p className="cj-preview__title">{state.title.trim() || 'Your event title'}</p>
                <p className="cj-preview__meta">
                  {[state.venue, state.city, state.region].filter(Boolean).join(' · ') || 'Venue TBA'}
                </p>
                <p className="cj-preview__meta">
                  {state.startsAt
                    ? new Date(state.startsAt).toLocaleString('en-NA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Date TBA'}
                </p>
                <p className="cj-preview__meta">
                  {state.ticketingMode === 'free'
                    ? 'Free entry'
                    : state.ticketingMode === 'on_platform'
                      ? `N$${state.price || '—'} on DELVE`
                      : state.ticketUrl
                        ? 'External tickets'
                        : 'Tickets TBA'}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
