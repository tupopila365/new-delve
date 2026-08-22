import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Calendar, ExternalLink, MapPin, Pencil, Share2, Users, X } from 'lucide-react'
import type { EventAttendeeDto, EventDto } from '@delve/contracts'
import {
  clearEventAttendance,
  fetchEvent,
  fetchEventAttendees,
  saveItem,
  setEventAttendance,
  unsaveItem,
} from '../api/socialClient'
import { eventShareUrl, mapsUrlForEvent } from '../lib/eventLinks'
import { formatUsername } from '../lib/formatUsername'
import EventCoverMedia from './EventCoverMedia'

interface EventDetailSheetProps {
  eventId: string | null
  onClose: () => void
  signedIn?: boolean
  onSignIn?: () => void
  onEdit?: (eventId: string) => void
  onOpenProfile?: (username: string) => void
  onUpdated?: (event: EventDto) => void
}

function statusBadge(status: EventDto['status']) {
  if (status === 'CANCELLED') return { label: 'Cancelled', color: '#C83B3B' }
  if (status === 'COMPLETED') return { label: 'Completed', color: 'var(--fg-muted)' }
  if (status === 'DRAFT') return { label: 'Draft', color: '#B76808' }
  return null
}

function AttendeeRow({
  attendee,
  onOpenProfile,
}: {
  attendee: EventAttendeeDto
  onOpenProfile?: (username: string) => void
}) {
  const name = attendee.user.displayName || formatUsername(attendee.user.username)
  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.(attendee.user.username)}
      className="flex items-center gap-2.5 w-full text-left rounded-xl px-2 py-1.5"
      style={{ background: 'none', border: 'none', cursor: onOpenProfile ? 'pointer' : 'default' }}
    >
      {attendee.user.avatarUrl ? (
        <img src={attendee.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
      )}
      <span className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{name}</span>
      <span
        className="ml-auto text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
        style={{ color: attendee.status === 'GOING' ? 'var(--primary)' : 'var(--fg-muted)' }}
      >
        {attendee.status === 'GOING' ? 'Going' : 'Interested'}
      </span>
    </button>
  )
}

export default function EventDetailSheet({
  eventId,
  onClose,
  signedIn = false,
  onSignIn,
  onEdit,
  onOpenProfile,
}: EventDetailSheetProps) {
  const [event, setEvent] = useState<EventDto | null>(null)
  const [attendees, setAttendees] = useState<EventAttendeeDto[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [showAllAttendees, setShowAllAttendees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setEvent(null)
      setAttendees([])
      setShowAllAttendees(false)
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

  useEffect(() => {
    if (!eventId || !event) {
      setAttendees([])
      return
    }
    let cancelled = false
    setAttendeesLoading(true)
    void fetchEventAttendees(eventId)
      .then(rows => {
        if (!cancelled) setAttendees(rows)
      })
      .catch(() => {
        if (!cancelled) setAttendees([])
      })
      .finally(() => {
        if (!cancelled) setAttendeesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId, event?.goingCount, event?.interestedCount])

  const goingAttendees = useMemo(
    () => attendees.filter(a => a.status === 'GOING'),
    [attendees],
  )
  const interestedAttendees = useMemo(
    () => attendees.filter(a => a.status === 'INTERESTED'),
    [attendees],
  )
  const visibleAttendees = showAllAttendees ? attendees : attendees.slice(0, 8)
  const mapsUrl = event ? mapsUrlForEvent(event) : null

  if (!eventId) return null

  async function setStatus(status: 'GOING' | 'INTERESTED') {
    if (!event || busy) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
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

  async function toggleSave() {
    if (!event || !signedIn) {
      onSignIn?.()
      return
    }
    setBusy(true)
    try {
      if (event.savedByMe) {
        await unsaveItem({ targetType: 'EVENT', targetId: event.id })
        setEvent({ ...event, savedByMe: false })
      } else {
        await saveItem({ targetType: 'EVENT', targetId: event.id })
        setEvent({ ...event, savedByMe: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update save')
    } finally {
      setBusy(false)
    }
  }

  async function shareEvent() {
    if (!event) return
    const url = eventShareUrl(event.id)
    const text = `${event.title} — ${new Date(event.startAt).toLocaleString()}\n${url}`
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url })
      } else {
        await navigator.clipboard.writeText(text)
        setShareNote('Link copied to clipboard')
        window.setTimeout(() => setShareNote(null), 2000)
      }
    } catch {
      /* user dismissed */
    }
  }

  const place = [event?.locationName, event?.city, event?.country].filter(Boolean).join(' · ')
  const badge = event ? statusBadge(event.status) : null
  const rsvpOpen = event?.status === 'PUBLISHED'
  const atCapacity = event?.maxAttendees != null && event.goingCount >= event.maxAttendees
    && event.myAttendance !== 'GOING'

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
          <EventCoverMedia
            url={event.coverUrl}
            resourceType={event.coverResourceType}
            className="w-full h-40 object-cover"
          />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              {badge && (
                <span
                  className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-2"
                  style={{ background: 'rgba(140,82,255,0.12)', color: badge.color }}
                >
                  {badge.label}
                </span>
              )}
              <h2 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
                {event?.title || 'Event'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {event && (
            <button
              type="button"
              onClick={() => onOpenProfile?.(event.creator.username)}
              className="flex items-center gap-2 mb-3 text-left"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {event.creator.avatarUrl ? (
                <img src={event.creator.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
              )}
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                {event.creator.displayName || formatUsername(event.creator.username)}
              </span>
            </button>
          )}

          {error && (
            <p className="text-sm mb-2" style={{ color: 'var(--auth-danger)' }} role="alert">
              {error}
            </p>
          )}
          {shareNote && (
            <p className="text-xs mb-2" style={{ color: 'var(--primary)' }} role="status">{shareNote}</p>
          )}
          {event && (
            <>
              <p className="text-sm mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Calendar size={14} />
                {new Date(event.startAt).toLocaleString()}
                {event.endAt ? ` — ${new Date(event.endAt).toLocaleString()}` : ''}
              </p>

              {place && (
                <div className="mb-3">
                  <p className="text-sm m-0 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                    <MapPin size={14} />
                    {place}
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold"
                      style={{ color: 'var(--primary)' }}
                    >
                      <ExternalLink size={12} />
                      Open in Maps
                    </a>
                  )}
                </div>
              )}

              {event.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg)' }}>
                  {event.description}
                </p>
              )}

              <p className="text-xs mb-3 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                <Users size={12} />
                {event.goingCount} going · {event.interestedCount} interested
                {event.maxAttendees != null && ` · ${event.maxAttendees} max`}
                {atCapacity && ' · Full'}
              </p>

              {(attendeesLoading || attendees.length > 0) && (
                <div
                  className="mb-4 rounded-xl px-2 py-2"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wide px-2 mb-1" style={{ color: 'var(--fg-muted)' }}>
                    Who&apos;s going
                  </p>
                  {attendeesLoading ? (
                    <p className="text-xs px-2 py-2 m-0" style={{ color: 'var(--fg-muted)' }}>Loading attendees…</p>
                  ) : (
                    <>
                      {visibleAttendees.map(a => (
                        <AttendeeRow key={`${a.user.id}-${a.status}`} attendee={a} onOpenProfile={onOpenProfile} />
                      ))}
                      {attendees.length > 8 && !showAllAttendees && (
                        <button
                          type="button"
                          onClick={() => setShowAllAttendees(true)}
                          className="w-full text-xs font-semibold py-2"
                          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Show all {attendees.length} ({goingAttendees.length} going, {interestedAttendees.length} interested)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleSave()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  style={{
                    border: `1px solid ${event.savedByMe ? 'var(--primary)' : 'var(--border)'}`,
                    background: event.savedByMe ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                  }}
                >
                  <Bookmark size={16} /> {event.savedByMe ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => void shareEvent()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
                >
                  <Share2 size={16} /> Share
                </button>
                {event.isOwner && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(event.id)}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
                    aria-label="Edit event"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>

              {rsvpOpen ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || atCapacity}
                    onClick={() => void setStatus('GOING')}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                    style={{
                      border: event.myAttendance === 'GOING' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: event.myAttendance === 'GOING' ? 'var(--primary)' : 'var(--surface)',
                      color: event.myAttendance === 'GOING' ? '#fff' : 'var(--fg)',
                      cursor: atCapacity ? 'not-allowed' : 'pointer',
                      opacity: atCapacity ? 0.6 : 1,
                    }}
                  >
                    {atCapacity ? 'Full' : 'Going'}
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
              ) : (
                <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
                  {event.status === 'CANCELLED'
                    ? 'This event was cancelled.'
                    : event.status === 'COMPLETED'
                      ? 'This event has ended.'
                      : 'RSVP opens when the event is published.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
