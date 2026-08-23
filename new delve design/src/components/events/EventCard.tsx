import type { MouseEvent } from 'react'
import { Bookmark, Calendar, MapPin, Users } from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import {
  clearEventAttendance,
  saveItem,
  setEventAttendance,
  unsaveItem,
} from '../../api/socialClient'
import { formatUsername } from '../../lib/formatUsername'
import EventCoverMedia from '../EventCoverMedia'
import { formatEventDateTime } from './eventFilters'

function statusLabel(status: EventDto['status']) {
  if (status === 'DRAFT') return 'Draft'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'COMPLETED') return 'Completed'
  return null
}

interface EventCardProps {
  event: EventDto
  signedIn?: boolean
  onSignIn?: () => void
  onOpen: (id: string) => void
  onOpenProfile?: (username: string) => void
  onEventUpdated?: (event: EventDto) => void
  compact?: boolean
}

export default function EventCard({
  event,
  signedIn = false,
  onSignIn,
  onOpen,
  onOpenProfile,
  onEventUpdated,
  compact = false,
}: EventCardProps) {
  const badge = statusLabel(event.status)
  const place = [event.locationName, event.city, event.country].filter(Boolean).join(' · ')
  const { combined: when } = formatEventDateTime(event.startAt)
  const rsvpOpen = event.status === 'PUBLISHED'
  const atCapacity =
    event.maxAttendees != null
    && event.goingCount >= event.maxAttendees
    && event.myAttendance !== 'GOING'

  async function toggleSave(e: MouseEvent) {
    e.stopPropagation()
    if (!signedIn) {
      onSignIn?.()
      return
    }
    try {
      if (event.savedByMe) {
        await unsaveItem({ targetType: 'EVENT', targetId: event.id })
        onEventUpdated?.({ ...event, savedByMe: false })
      } else {
        await saveItem({ targetType: 'EVENT', targetId: event.id })
        onEventUpdated?.({ ...event, savedByMe: true })
      }
    } catch {
      /* ignore */
    }
  }

  async function setStatus(e: MouseEvent, status: 'GOING' | 'INTERESTED') {
    e.stopPropagation()
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (!rsvpOpen) return
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
    <article
      className="overflow-hidden sm:rounded-2xl w-full min-w-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => onOpen(event.id)}
        className="block w-full text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div className="relative h-36 sm:h-40 bg-black/10">
          {event.coverUrl ? (
            <EventCoverMedia
              url={event.coverUrl}
              resourceType={event.coverResourceType}
              className="w-full h-full object-cover"
              controls={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar size={28} style={{ color: 'var(--fg-muted)' }} />
            </div>
          )}
          {badge && (
            <span
              className="absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
            >
              {badge}
            </span>
          )}
          {event.category && (
            <span
              className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: 'rgba(140,82,255,0.85)', color: '#fff' }}
            >
              {event.category}
            </span>
          )}
        </div>
      </button>

      <div className="px-4 py-3 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onOpen(event.id)}
            className="flex-1 min-w-0 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <p
              className="text-sm font-bold m-0 leading-snug truncate"
              style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
            >
              {event.title}
            </p>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
              {when}
            </p>
            {place && (
              <p className="text-xs m-0 mt-0.5 flex items-center gap-1 truncate" style={{ color: 'var(--fg-muted)' }}>
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate">{place}</span>
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={toggleSave}
            className="flex-shrink-0 p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{
              background: 'none',
              border: 'none',
              color: event.savedByMe ? 'var(--primary)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
            aria-label={event.savedByMe ? 'Unsave event' : 'Save event'}
          >
            <Bookmark size={18} fill={event.savedByMe ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-xs m-0 inline-flex items-center gap-2 flex-wrap" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-0.5">
            <Users size={11} /> {event.goingCount} going
          </span>
          {event.interestedCount > 0 && (
            <span>· {event.interestedCount} interested</span>
          )}
          {event.maxAttendees != null && (
            <span>
              · {Math.min(event.goingCount, event.maxAttendees)}/{event.maxAttendees} spots
            </span>
          )}
        </p>

        <button
          type="button"
          onClick={() => onOpenProfile?.(event.creator.username)}
          className="flex items-center gap-2 mt-0.5 text-left min-w-0"
          style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenProfile ? 'pointer' : 'default' }}
        >
          {event.creator.avatarUrl ? (
            <img src={event.creator.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <span className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            {event.business?.name
              || event.creator.displayName
              || formatUsername(event.creator.username)}
          </span>
        </button>

        {!compact && rsvpOpen && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={atCapacity}
              onClick={e => void setStatus(e, 'INTERESTED')}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold min-h-[44px]"
              style={{
                border: event.myAttendance === 'INTERESTED' ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: event.myAttendance === 'INTERESTED' ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                color: 'var(--fg)',
                cursor: atCapacity && event.myAttendance !== 'INTERESTED' ? 'not-allowed' : 'pointer',
                opacity: atCapacity && event.myAttendance !== 'INTERESTED' ? 0.6 : 1,
              }}
            >
              {event.myAttendance === 'INTERESTED' ? 'Interested ✓' : 'Interested'}
            </button>
            <button
              type="button"
              disabled={atCapacity}
              onClick={e => void setStatus(e, 'GOING')}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold min-h-[44px]"
              style={{
                border: event.myAttendance === 'GOING' ? 'none' : '1px solid var(--border)',
                background: event.myAttendance === 'GOING' ? 'var(--primary)' : 'var(--surface)',
                color: event.myAttendance === 'GOING' ? '#fff' : 'var(--fg)',
                cursor: atCapacity ? 'not-allowed' : 'pointer',
                opacity: atCapacity ? 0.6 : 1,
              }}
            >
              {atCapacity ? 'Event full' : event.myAttendance === 'GOING' ? 'Going ✓' : 'Going'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
