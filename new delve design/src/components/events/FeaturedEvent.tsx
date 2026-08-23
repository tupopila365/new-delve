import { Calendar, MapPin } from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import {
  clearEventAttendance,
  setEventAttendance,
} from '../../api/socialClient'
import EventCoverMedia from '../EventCoverMedia'
import { formatEventDateTime, formatGoingLabel } from './eventFilters'

interface FeaturedEventProps {
  event: EventDto
  signedIn?: boolean
  onSignIn?: () => void
  onOpen: (id: string) => void
  onEventUpdated?: (event: EventDto) => void
}

export default function FeaturedEvent({
  event,
  signedIn = false,
  onSignIn,
  onOpen,
  onEventUpdated,
}: FeaturedEventProps) {
  const place = [event.city, event.country].filter(Boolean).join(', ')
  const { combined: when } = formatEventDateTime(event.startAt)
  const atCapacity =
    event.maxAttendees != null
    && event.goingCount >= event.maxAttendees
    && event.myAttendance !== 'GOING'

  async function setStatus(status: 'GOING' | 'INTERESTED') {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    try {
      const next =
        event.myAttendance === status
          ? await clearEventAttendance(event.id)
          : await setEventAttendance(event.id, status)
      onEventUpdated?.(next)
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      className="overflow-hidden rounded-2xl mx-3 sm:mx-0 mb-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-label="Featured event"
    >
      <button
        type="button"
        onClick={() => onOpen(event.id)}
        className="block w-full text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div className="relative h-48 sm:h-52 bg-black/10">
          {event.coverUrl ? (
            <EventCoverMedia
              url={event.coverUrl}
              resourceType={event.coverResourceType}
              className="w-full h-full object-cover"
              controls={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar size={32} style={{ color: 'var(--fg-muted)' }} />
            </div>
          )}
          <span
            className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Featured
          </span>
        </div>
      </button>
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider m-0 mb-1" style={{ color: 'var(--primary)' }}>
          Happening soon
        </p>
        <h2
          className="text-lg font-extrabold m-0 mb-1 leading-snug"
          style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
        >
          {event.title}
        </h2>
        {place && (
          <p className="text-sm m-0 mb-1 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={14} />
            {place}
          </p>
        )}
        <p className="text-sm m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
          {when}
        </p>
        <p className="text-sm font-semibold m-0 mb-3" style={{ color: 'var(--fg)' }}>
          {formatGoingLabel(event.goingCount)}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onOpen(event.id)}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold min-h-[44px]"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            View event
          </button>
          <button
            type="button"
            disabled={atCapacity}
            onClick={() => void setStatus('INTERESTED')}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-60"
            style={{
              border: event.myAttendance === 'INTERESTED' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: event.myAttendance === 'INTERESTED' ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
              color: 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {event.myAttendance === 'INTERESTED' ? 'Interested ✓' : 'Interested'}
          </button>
          <button
            type="button"
            disabled={atCapacity}
            onClick={() => void setStatus('GOING')}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white min-h-[44px] disabled:opacity-60"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            {atCapacity ? 'Event full' : event.myAttendance === 'GOING' ? 'Going ✓' : 'Going'}
          </button>
        </div>
      </div>
    </section>
  )
}
