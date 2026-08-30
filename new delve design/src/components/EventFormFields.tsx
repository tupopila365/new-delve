import { useEffect, useState } from 'react'
import { Camera, LocateFixed } from 'lucide-react'
import { listMyCommunities } from '../api/communityClient'
import { fetchMyBusinesses } from '../api/businessClient'
import EventCoverMedia from './EventCoverMedia'
import { EVENT_CATEGORIES } from './events/eventCategories'
import { LocationAutocompleteInput, DelveInteractiveMap } from './maps'

export type EventVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

export type EventFormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  city: string
  country: string
  timezone: string
  category: string
  communityId: string
  businessId: string
  locationName: string
  visibility: EventVisibility
  maxAttendees: string
  latitude: string
  longitude: string
  coverMediaId: string | null
  preview: string | null
  previewResourceType: 'image' | 'video' | null
}

export const emptyEventForm = (): EventFormState => ({
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  city: '',
  country: '',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  category: '',
  communityId: '',
  businessId: '',
  locationName: '',
  visibility: 'PUBLIC',
  maxAttendees: '',
  latitude: '',
  longitude: '',
  coverMediaId: null,
  preview: null,
  previewResourceType: null,
})

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EventFormFieldsProps {
  form: EventFormState
  onChange: (patch: Partial<EventFormState>) => void
  onError?: (message: string) => void
  onOpenCoverStudio?: () => void
}

export default function EventFormFields({ form, onChange, onError, onOpenCoverStudio }: EventFormFieldsProps) {
  const [locating, setLocating] = useState(false)
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      listMyCommunities().catch(() => []),
      fetchMyBusinesses().catch(() => []),
    ]).then(([comms, biz]) => {
      if (cancelled) return
      setCommunities(comms.map(c => ({ id: c.id, name: c.name })))
      setBusinesses(biz.map(m => ({ id: m.business.id, name: m.business.name })))
    })
    return () => {
      cancelled = true
    }
  }, [])

  function clearCover() {
    onChange({ coverMediaId: null, preview: null, previewResourceType: null })
  }

  return (
    <>
      {/* Event Title - Floating Label */}
      <div className="relative mb-3">
        <input
          type="text"
          id="event-title"
          value={form.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Event title"
          maxLength={120}
          className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <label
          htmlFor="event-title"
          className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
        >
          Event title
        </label>
      </div>

      {/* Description - Floating Label */}
      <div className="relative mb-3">
        <textarea
          id="event-description"
          value={form.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="What is this meetup about?"
          rows={3}
          maxLength={4000}
          className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
        />
        <label
          htmlFor="event-description"
          className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
        >
          What is this meetup about?
        </label>
      </div>

      {/* Starts Date/Time */}
      <div className="mb-3">
        <label htmlFor="event-start-at" className="block text-xs font-semibold mb-1 text-neutral-400">
          Starts
        </label>
        <input
          id="event-start-at"
          type="datetime-local"
          value={form.startAt}
          onChange={e => onChange({ startAt: e.target.value })}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* Ends Date/Time */}
      <div className="mb-3">
        <label htmlFor="event-end-at" className="block text-xs font-semibold mb-1 text-neutral-400">
          Ends (optional)
        </label>
        <input
          id="event-end-at"
          type="datetime-local"
          value={form.endAt}
          onChange={e => onChange({ endAt: e.target.value })}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* Venue / Location Name - Google Places Autocomplete */}
      <LocationAutocompleteInput
        id="event-location-name"
        value={form.locationName}
        onChange={val => onChange({ locationName: val })}
        onSelectPlace={res => {
          onChange({
            locationName: res.name,
            ...(res.city ? { city: res.city } : {}),
            ...(res.country ? { country: res.country } : {}),
            ...(res.latitude ? { latitude: res.latitude } : {}),
            ...(res.longitude ? { longitude: res.longitude } : {}),
          })
        }}
        label="Venue or meeting point"
        placeholder="Venue, address or place"
      />

      {/* City & Country - Floating Labels in Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="relative">
          <input
            type="text"
            id="event-city"
            value={form.city}
            onChange={e => onChange({ city: e.target.value })}
            placeholder="City"
            className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <label
            htmlFor="event-city"
            className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
          >
            City
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            id="event-country"
            value={form.country}
            onChange={e => onChange({ country: e.target.value })}
            placeholder="Country"
            className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <label
            htmlFor="event-country"
            className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
          >
            Country
          </label>
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <label htmlFor="event-category" className="block text-xs font-semibold mb-1 text-neutral-400">
          Category
        </label>
        <select
          id="event-category"
          value={form.category}
          onChange={e => onChange({ category: e.target.value })}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        >
          <option value="" className="bg-neutral-900 text-neutral-400">Choose a category</option>
          {EVENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat} className="bg-neutral-900 text-white">{cat}</option>
          ))}
        </select>
      </div>

      {/* Timezone - Floating Label */}
      <div className="relative mb-3">
        <input
          type="text"
          id="event-timezone"
          value={form.timezone}
          onChange={e => onChange({ timezone: e.target.value })}
          placeholder="Timezone"
          className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <label
          htmlFor="event-timezone"
          className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
        >
          Timezone (e.g. Africa/Windhoek)
        </label>
      </div>

      {/* Communities Select */}
      {(communities.length > 0 || form.communityId) && (
        <div className="mb-3">
          <label htmlFor="event-community" className="block text-xs font-semibold mb-1 text-neutral-400">
            Community (optional)
          </label>
          <select
            id="event-community"
            value={form.communityId}
            onChange={e => onChange({ communityId: e.target.value })}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">No community</option>
            {communities.map(c => (
              <option key={c.id} value={c.id} className="bg-neutral-900 text-white">{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Businesses Select */}
      {(businesses.length > 0 || form.businessId) && (
        <div className="mb-3">
          <label htmlFor="event-business" className="block text-xs font-semibold mb-1 text-neutral-400">
            Host as business (optional)
          </label>
          <select
            id="event-business"
            value={form.businessId}
            onChange={e => onChange({ businessId: e.target.value })}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">Personal event</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id} className="bg-neutral-900 text-white">{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Visibility */}
      <div className="mb-3">
        <label htmlFor="event-visibility" className="block text-xs font-semibold mb-1 text-neutral-400">
          Who can see this?
        </label>
        <select
          id="event-visibility"
          value={form.visibility}
          onChange={e => onChange({ visibility: e.target.value as EventVisibility })}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        >
          <option value="PUBLIC" className="bg-neutral-900 text-white">Public — anyone on Delve</option>
          <option value="FOLLOWERS" className="bg-neutral-900 text-white">Followers only</option>
          <option value="PRIVATE" className="bg-neutral-900 text-white">Private — only you</option>
        </select>
      </div>

      {/* Max Attendees - Floating Label */}
      <div className="relative mb-3">
        <input
          type="text"
          id="event-max-attendees"
          value={form.maxAttendees}
          onChange={e => onChange({ maxAttendees: e.target.value.replace(/\D/g, '') })}
          placeholder="Max attendees"
          inputMode="numeric"
          className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <label
          htmlFor="event-max-attendees"
          className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
        >
          Max attendees (optional)
        </label>
      </div>

      {/* Map Pin */}
      <label className="block text-xs font-semibold mb-1 text-neutral-400">
        Map pin (optional)
      </label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          disabled={locating}
          onClick={() => {
            if (!navigator.geolocation) {
              onError?.('Location is not available in this browser.')
              return
            }
            setLocating(true)
            navigator.geolocation.getCurrentPosition(
              pos => {
                onChange({
                  latitude: pos.coords.latitude.toFixed(6),
                  longitude: pos.coords.longitude.toFixed(6),
                })
                setLocating(false)
              },
              () => {
                onError?.('Could not read your location.')
                setLocating(false)
              },
              { enableHighAccuracy: true, timeout: 12000 },
            )
          }}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-white/10"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)', cursor: 'pointer' }}
        >
          <LocateFixed size={14} />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
        {(form.latitude || form.longitude) && (
          <button
            type="button"
            onClick={() => onChange({ latitude: '', longitude: '' })}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer' }}
          >
            Clear pin
          </button>
        )}
      </div>

      {/* Latitude & Longitude - Floating Labels in Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="relative">
          <input
            type="text"
            id="event-latitude"
            value={form.latitude}
            onChange={e => onChange({ latitude: e.target.value })}
            placeholder="Latitude"
            inputMode="decimal"
            className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <label
            htmlFor="event-latitude"
            className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
          >
            Latitude
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            id="event-longitude"
            value={form.longitude}
            onChange={e => onChange({ longitude: e.target.value })}
            placeholder="Longitude"
            inputMode="decimal"
            className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <label
            htmlFor="event-longitude"
            className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
          >
            Longitude
          </label>
        </div>
      </div>

      {/* Interactive Map Preview */}
      {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
        <div className="mb-3">
          <DelveInteractiveMap
            latitude={Number(form.latitude)}
            longitude={Number(form.longitude)}
            markerTitle={form.locationName || form.title || 'Event venue'}
            height={160}
          />
        </div>
      )}

      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
        Cover (optional)
      </label>
      {form.preview ? (
        <div className="relative mb-3 overflow-hidden rounded-xl bg-black/5">
          <EventCoverMedia
            url={form.preview}
            resourceType={form.previewResourceType}
            className="w-full max-h-48 object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            {onOpenCoverStudio && (
              <button
                type="button"
                onClick={onOpenCoverStudio}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Replace
              </button>
            )}
            <button
              type="button"
              onClick={clearCover}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenCoverStudio}
          disabled={!onOpenCoverStudio}
          className="mb-3 w-full rounded-xl py-6 inline-flex flex-col items-center gap-2 text-sm font-semibold"
          style={{
            border: '1px dashed var(--border)',
            background: 'var(--surface-subtle)',
            color: 'var(--fg-muted)',
            cursor: onOpenCoverStudio ? 'pointer' : 'not-allowed',
            opacity: onOpenCoverStudio ? 1 : 0.6,
          }}
        >
          <Camera size={20} />
          Open Media Studio
        </button>
      )}
    </>
  )
}

/** Parse datetime-local as the user's local clock (not UTC). */
export function datetimeLocalToIso(value: string): string {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    const local = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0),
    )
    return local.toISOString()
  }
  return new Date(value).toISOString()
}

export function eventFormToBody(form: EventFormState, status: 'DRAFT' | 'PUBLISHED') {
  const lat = form.latitude.trim() ? Number(form.latitude) : null
  const lng = form.longitude.trim() ? Number(form.longitude) : null
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    startAt: datetimeLocalToIso(form.startAt),
    endAt: form.endAt ? datetimeLocalToIso(form.endAt) : null,
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    timezone: form.timezone.trim() || null,
    category: form.category.trim() || null,
    communityId: form.communityId.trim() || null,
    businessId: form.businessId.trim() || null,
    locationName: form.locationName.trim() || null,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    coverMediaId: form.coverMediaId,
    visibility: form.visibility,
    maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
    status,
  }
}

export function validateEventForm(form: EventFormState): string | null {
  if (form.title.trim().length < 2) return 'Add a title for your event.'
  if (!form.startAt) return 'Choose a start date and time.'
  if (form.endAt && new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
    return 'End time must be after the start time.'
  }
  return null
}
