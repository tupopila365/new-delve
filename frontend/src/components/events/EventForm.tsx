import { Link } from 'react-router-dom'
import { MediaCoverEditor } from '../create'
import { EventCategoryPicker } from './EventCategoryPicker'
import type { EventFormState } from '../../utils/eventForm'

type Props = {
  state: EventFormState
  onChange: (patch: Partial<EventFormState>) => void
  coverPreview: string | null
  onCoverPreviewChange: (value: string | null) => void
  onCoverFileReady: (file: File | null) => void
  onSubmit: () => void
  submitLabel: string
  pendingLabel: string
  cancelTo: string
  err: string | null
  pending: boolean
  canSubmit: boolean
}

export function EventForm({
  state,
  onChange,
  coverPreview,
  onCoverPreviewChange,
  onCoverFileReady,
  onSubmit,
  submitLabel,
  pendingLabel,
  cancelTo,
  err,
  pending,
  canSubmit,
}: Props) {
  return (
    <form
      className="ce-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <section className="ce-form__section" aria-labelledby="ce-cover-title">
        <h2 id="ce-cover-title" className="ce-form__section-title">
          Cover
        </h2>
        <MediaCoverEditor
          label="Event cover photo or video"
          value={coverPreview}
          onChange={onCoverPreviewChange}
          onFileReady={onCoverFileReady}
          defaultAspect="16:9"
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

      {err ? (
        <p className="ce-form__err" role="alert">
          {err}
        </p>
      ) : null}

      <div className="ce-form__actions">
        <button type="submit" className="btn btn-primary ce-form__submit" disabled={!canSubmit || pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link to={cancelTo} className="btn btn-ghost ce-form__cancel">
          Cancel
        </Link>
      </div>
    </form>
  )
}
