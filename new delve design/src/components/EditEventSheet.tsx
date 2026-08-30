import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { EventDto, MediaAssetDto } from '@delve/contracts'
import { fetchEvent, updateEvent } from '../api/socialClient'
import { coverPatchFromStudioAsset } from '../media-studio/publishPostMedia'
import MediaStudio from '../pages/MediaStudio'
import EventFormFields, {
  emptyEventForm,
  eventFormToBody,
  toDatetimeLocal,
  validateEventForm,
  type EventFormState,
} from './EventFormFields'

interface EditEventSheetProps {
  eventId: string | null
  onClose: () => void
  onUpdated?: (event: EventDto) => void
}

export default function EditEventSheet({ eventId, onClose, onUpdated }: EditEventSheetProps) {
  const [form, setForm] = useState<EventFormState>(emptyEventForm)
  const [status, setStatus] = useState<EventDto['status']>('DRAFT')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverStudioOpen, setCoverStudioOpen] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setForm(emptyEventForm())
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchEvent(eventId)
      .then(event => {
        if (cancelled) return
        setStatus(event.status)
        setForm({
          title: event.title,
          description: event.description,
          startAt: toDatetimeLocal(event.startAt),
          endAt: toDatetimeLocal(event.endAt),
          city: event.city || '',
          country: event.country || '',
          timezone: event.timezone || '',
          category: event.category || '',
          communityId: event.communityId || '',
          businessId: event.businessId || '',
          locationName: event.locationName || '',
          visibility: event.visibility,
          maxAttendees: event.maxAttendees != null ? String(event.maxAttendees) : '',
          latitude: event.latitude != null ? String(event.latitude) : '',
          longitude: event.longitude != null ? String(event.longitude) : '',
          coverMediaId: event.coverMediaId ?? null,
          preview: event.coverUrl,
          previewResourceType: event.coverResourceType ?? (event.coverUrl ? 'image' : null),
        })
        setError(null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load event')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (!eventId) return null

  function patch(patch: Partial<EventFormState>) {
    setForm(prev => ({ ...prev, ...patch }))
  }

  async function save(nextStatus?: EventDto['status']) {
    if (submitting || !eventId) return
    const validation = validateEventForm(form)
    if (validation) {
      setError(validation)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const publishStatus: 'DRAFT' | 'PUBLISHED' = status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
      const base = eventFormToBody(form, nextStatus === 'DRAFT' || nextStatus === 'PUBLISHED' ? nextStatus : publishStatus)
      const body = {
        ...base,
        coverMediaId: form.coverMediaId,
        ...(nextStatus ? { status: nextStatus } : {}),
      }
      const updated = await updateEvent(eventId, body)
      setStatus(updated.status)
      onUpdated?.(updated)
      if (nextStatus === 'CANCELLED' || nextStatus === 'COMPLETED') onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
      aria-label="Edit event"
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-white m-0">
            Edit event
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
        ) : (
          <>
            <EventFormFields
              form={form}
              onChange={patch}
              onError={setError}
              onOpenCoverStudio={() => setCoverStudioOpen(true)}
            />
            {error && (
              <p className="text-sm mb-3 m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void save('PUBLISHED')}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                  style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                >
                  Publish event
                </button>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void save()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                style={{ background: status === 'DRAFT' ? 'var(--surface-subtle)' : 'var(--primary)', border: '1px solid var(--border)', color: status === 'DRAFT' ? 'var(--fg)' : '#fff', cursor: 'pointer' }}
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              {(status === 'PUBLISHED' || status === 'DRAFT') && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void save('COMPLETED')}
                    className="w-full rounded-xl py-3 text-sm font-semibold"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
                  >
                    Mark completed
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void save('CANCELLED')}
                    className="w-full rounded-xl py-3 text-sm font-semibold"
                    style={{ border: '1px solid rgba(200,59,59,0.35)', background: 'rgba(200,59,59,0.08)', color: '#C83B3B', cursor: 'pointer' }}
                  >
                    Cancel event
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <MediaStudio
        open={coverStudioOpen}
        onClose={() => setCoverStudioOpen(false)}
        initialContext="event"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const asset = assets[0]
          if (asset) patch(coverPatchFromStudioAsset(asset))
          setCoverStudioOpen(false)
        }}
      />
    </div>
  )
}
