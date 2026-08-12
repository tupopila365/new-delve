import { useEffect, useState } from 'react'
import { Calendar, MapPin, X } from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import { clearEventAttendance, fetchEvent, setEventAttendance } from '../api/socialClient'

interface EventDetailSheetProps {
  eventId: string | null
  onClose: () => void
}

export default function EventDetailSheet({ eventId, onClose }: EventDetailSheetProps) {
  const [event, setEvent] = useState<EventDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setEvent(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchEvent(eventId)
        if (!cancelled) {
          setEvent(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load event')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (!eventId) return null

  async function setStatus(status: 'GOING' | 'INTERESTED') {
    if (!event || busy) return
    setBusy(true)
    try {
      const next =
        event.myAttendance === status
          ? await clearEventAttendance(event.id)
          : await setEventAttendance(event.id, status)
      setEvent(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update attendance')
    } finally {
      setBusy(false)
    }
  }

  const place = [event?.locationName, event?.city, event?.country].filter(Boolean).join(' · ')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {event?.coverUrl && (
          <img src={event.coverUrl} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              {event?.title || 'Event'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
          {error && (
            <p className="text-sm mb-2" style={{ color: 'var(--auth-danger)' }} role="alert">
              {error}
            </p>
          )}
          {event && (
            <>
              <p className="text-sm mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Calendar size={14} />
                {new Date(event.startAt).toLocaleString()}
              </p>
              {place && (
                <p className="text-sm mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                  <MapPin size={14} />
                  {place}
                </p>
              )}
              {event.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg)' }}>
                  {event.description}
                </p>
              )}
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                {event.goingCount} going · {event.interestedCount} interested
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setStatus('GOING')}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{
                    border: event.myAttendance === 'GOING' ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: event.myAttendance === 'GOING' ? 'var(--primary)' : 'var(--surface)',
                    color: event.myAttendance === 'GOING' ? '#fff' : 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  Going
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setStatus('INTERESTED')}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{
                    border: event.myAttendance === 'INTERESTED' ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: event.myAttendance === 'INTERESTED' ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  Interested
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
