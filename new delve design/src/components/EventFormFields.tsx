import { useState } from 'react'
import { Camera, LocateFixed } from 'lucide-react'
import EventCoverMedia from './EventCoverMedia'

export type EventVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

export type EventFormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  city: string
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

const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm mb-3'
const inputStyle = { border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }

interface EventFormFieldsProps {
  form: EventFormState
  onChange: (patch: Partial<EventFormState>) => void
  onError?: (message: string) => void
  onOpenCoverStudio?: () => void
}

export default function EventFormFields({ form, onChange, onError, onOpenCoverStudio }: EventFormFieldsProps) {
  const [locating, setLocating] = useState(false)

  function clearCover() {
    onChange({ coverMediaId: null, preview: null, previewResourceType: null })
  }

  return (
    <>
      <input
        value={form.title}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Event title"
        maxLength={120}
        className={inputClass}
        style={inputStyle}
      />
      <textarea
        value={form.description}
        onChange={e => onChange({ description: e.target.value })}
        placeholder="What is this meetup about?"
        rows={3}
        maxLength={4000}
        className={`${inputClass} resize-none`}
        style={inputStyle}
      />
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
        Starts
      </label>
      <input
        type="datetime-local"
        value={form.startAt}
        onChange={e => onChange({ startAt: e.target.value })}
        className={inputClass}
        style={inputStyle}
      />
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
        Ends (optional)
      </label>
      <input
        type="datetime-local"
        value={form.endAt}
        onChange={e => onChange({ endAt: e.target.value })}
        className={inputClass}
        style={inputStyle}
      />
      <input
        value={form.locationName}
        onChange={e => onChange({ locationName: e.target.value })}
        placeholder="Venue or meeting point"
        className={inputClass}
        style={inputStyle}
      />
      <input
        value={form.city}
        onChange={e => onChange({ city: e.target.value })}
        placeholder="City"
        className={inputClass}
        style={inputStyle}
      />
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
        Who can see this?
      </label>
      <select
        value={form.visibility}
        onChange={e => onChange({ visibility: e.target.value as EventVisibility })}
        className={inputClass}
        style={inputStyle}
      >
        <option value="PUBLIC">Public — anyone on Delve</option>
        <option value="FOLLOWERS">Followers only</option>
        <option value="PRIVATE">Private — only you</option>
      </select>
      <input
        value={form.maxAttendees}
        onChange={e => onChange({ maxAttendees: e.target.value.replace(/\D/g, '') })}
        placeholder="Max attendees (optional)"
        inputMode="numeric"
        className={inputClass}
        style={inputStyle}
      />

      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
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
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)', cursor: 'pointer' }}
        >
          <LocateFixed size={14} />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
        {(form.latitude || form.longitude) && (
          <button
            type="button"
            onClick={() => onChange({ latitude: '', longitude: '' })}
            className="rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer' }}
          >
            Clear pin
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          value={form.latitude}
          onChange={e => onChange({ latitude: e.target.value })}
          placeholder="Latitude"
          inputMode="decimal"
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={inputStyle}
        />
        <input
          value={form.longitude}
          onChange={e => onChange({ longitude: e.target.value })}
          placeholder="Longitude"
          inputMode="decimal"
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={inputStyle}
        />
      </div>

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

export function eventFormToBody(form: EventFormState, status: 'DRAFT' | 'PUBLISHED') {
  const lat = form.latitude.trim() ? Number(form.latitude) : null
  const lng = form.longitude.trim() ? Number(form.longitude) : null
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    startAt: new Date(form.startAt).toISOString(),
    endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    city: form.city.trim() || null,
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
