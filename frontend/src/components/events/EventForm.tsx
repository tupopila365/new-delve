import { Play } from 'lucide-react'
import { HighlightChannelEditor } from '../highlights/HighlightChannelEditor'
import { ListingPhotoManager } from '../listing/photos'
import { photoKind } from '../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../listing/photos/types'
import { EventCategoryPicker } from './EventCategoryPicker'
import type { EventFormState } from '../../utils/eventForm'
import {
  FormField,
  FormTextarea,
  FormRow,
  TextInput,
  DateInput,
} from '../create/shared'

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

  const coverPhoto = photos[0]
  const coverIsVideo = coverPhoto ? photoKind(coverPhoto) === 'video' : false
  const coverPreview = coverPhoto?.posterSrc || coverPhoto?.src || ''
  const galleryPreview = photos.slice(0, 6)

  return (
    <div className="ce-form">
      {show(1) ? (
        <>
          <p className="cj-form__hint">
            Name your event and add a cover — photo or short video. Tap any tile to preview and edit.
          </p>
          <section className="ce-form__section listing-photos-section" aria-labelledby="ce-photos-title">
            <h2 id="ce-photos-title" className="ce-form__section-title">
              Photos & videos
            </h2>
            <ListingPhotoManager
              photos={photos}
              onChange={onPhotosChange}
              allowVideoCover
              hint="Cover can be a photo or short clip. Extra media goes in the gallery — clips autoplay on the feed."
            />
          </section>

          <section className="ce-form__section" aria-labelledby="ce-basics-title">
            <h2 id="ce-basics-title" className="ce-form__section-title">
              Basics
            </h2>

            <FormField label="Event title" id="ce-title">
              <TextInput
                placeholder="Live jazz night, food market, beach cleanup…"
                value={state.title}
                onChange={(e) => onChange({ title: e.target.value })}
                required
                maxLength={200}
                autoComplete="off"
              />
            </FormField>

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

            <FormRow>
              <DateInput
                label="Start"
                id="ce-starts"
                value={state.startsAt}
                onChange={(e) => onChange({ startsAt: e.target.value })}
                required
              />
              <DateInput
                label="End"
                id="ce-ends"
                value={state.endsAt}
                min={state.startsAt}
                onChange={(e) => onChange({ endsAt: e.target.value })}
              />
            </FormRow>
          </section>

          <section className="ce-form__section" aria-labelledby="ce-where-title">
            <h2 id="ce-where-title" className="ce-form__section-title">
              Where
            </h2>

            <FormField label="Venue" id="ce-venue">
              <TextInput
                placeholder="The Warehouse, community hall, beach…"
                value={state.venue}
                onChange={(e) => onChange({ venue: e.target.value })}
                maxLength={200}
              />
            </FormField>

            <FormRow>
              <FormField label="City" id="ce-city">
                <TextInput
                  placeholder="Windhoek"
                  value={state.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                />
              </FormField>
              <FormField label="Region" id="ce-region">
                <TextInput
                  placeholder="Khomas"
                  value={state.region}
                  onChange={(e) => onChange({ region: e.target.value })}
                />
              </FormField>
            </FormRow>
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

            <FormTextarea
              label="Description"
              id="ce-desc"
              placeholder="What should people expect? Dress code, lineup, tickets at door…"
              rows={5}
              value={state.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ description: e.target.value })}
            />
          </section>

          <section className="ce-form__section" aria-labelledby="ce-tickets-title">
            <h2 id="ce-tickets-title" className="ce-form__section-title">
              Tickets & entry
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
              <FormField label="Price per ticket" id="ce-price">
                <TextInput
                  type="text"
                  inputMode="decimal"
                  placeholder="150"
                  value={state.price}
                  onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, '') })}
                  maxLength={32}
                  autoComplete="off"
                  required
                />
              </FormField>
            ) : null}

            {state.ticketingMode === 'external' ? (
              <>
                <FormField label="Ticket link" id="ce-ticket-url">
                  <TextInput
                    type="url"
                    placeholder="https://tickets.example.com/your-event"
                    value={state.ticketUrl}
                    onChange={(e) => onChange({ ticketUrl: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </FormField>
                <FormField label="Display price" id="ce-price-display">
                  <TextInput
                    type="text"
                    inputMode="decimal"
                    placeholder="150"
                    value={state.price}
                    onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, '') })}
                    maxLength={32}
                    autoComplete="off"
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="Capacity" id="ce-capacity">
              <TextInput
                type="number"
                min={1}
                placeholder="200"
                value={state.capacity}
                onChange={(e) => onChange({ capacity: e.target.value })}
                inputMode="numeric"
              />
            </FormField>
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
          <p className="cj-form__hint">Check the details and media, then publish.</p>
          <div className="cj-preview">
            <div className="cj-preview__card">
              {coverPreview ? (
                coverIsVideo ? (
                  <video
                    className="cj-preview__img"
                    src={coverPhoto?.src}
                    poster={coverPhoto?.posterSrc}
                    muted
                    playsInline
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={coverPreview}
                    alt=""
                    className="cj-preview__img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )
              ) : null}
              {galleryPreview.length > 1 ? (
                <div className="ce-preview__media-strip" aria-label="Gallery preview">
                  {galleryPreview.map((photo, index) => {
                    const video = photoKind(photo) === 'video'
                    return (
                      <div
                        key={photo.id}
                        className={`ce-preview__thumb${index === 0 ? ' is-cover' : ''}${video ? ' is-video' : ''}`}
                      >
                        {video && !photo.posterSrc ? (
                          <video src={photo.src} muted playsInline preload="metadata" aria-hidden />
                        ) : (
                          <img src={photo.posterSrc || photo.src} alt="" />
                        )}
                        {video ? (
                          <span className="ce-preview__thumb-play" aria-hidden>
                            <Play size={12} strokeWidth={2.5} fill="currentColor" />
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
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
                {photos.some((p) => photoKind(p) === 'video') ? (
                  <p className="cj-preview__meta">Includes video preview in gallery</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}