import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark, Calendar, ExternalLink, Flag, Heart, MapPin, Navigation, Pencil, Share2, UserPlus, Users, X,
} from 'lucide-react'
import type { EventAttendeeDto, EventDto } from '@delve/contracts'
import {
  clearEventAttendance,
  createPost,
  fetchEvent,
  fetchEventAttendees,
  likeEvent,
  saveItem,
  setEventAttendance,
  unlikeEvent,
  unsaveItem,
} from '../api/socialClient'
import { eventShareUrl, mapsUrlForEvent } from '../lib/eventLinks'
import { formatUsername } from '../lib/formatUsername'
import EventCoverMedia from './EventCoverMedia'
import AddToJourneySheet from './events/AddToJourneySheet'
import EventCollaboratorInviteModal from './events/EventCollaboratorInviteModal'
import EventMediaEditor from '../media/EventMediaEditor'
import { DoubleTapLike } from './delvers/DoubleTapLike'
import ContentReportSheet from './safety/ContentReportSheet'

interface EventDetailSheetProps {
  eventId: string | null
  onClose: () => void
  signedIn?: boolean
  onSignIn?: () => void
  onEdit?: (eventId: string) => void
  onOpenProfile?: (username: string) => void
  onUpdated?: (event: EventDto) => void
  onSharedToDelvers?: () => void
}

function statusBadge(status: EventDto['status']) {
  if (status === 'CANCELLED') return { label: 'Cancelled', color: '#EF4444' }
  if (status === 'COMPLETED') return { label: 'Completed', color: '#9CA3AF' }
  if (status === 'DRAFT') return { label: 'Draft', color: '#F59E0B' }
  return null
}

function formatEventDateTime(startAt: string, endAt?: string | null): string {
  const start = new Date(startAt)
  if (isNaN(start.getTime())) return startAt
  const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

  if (!endAt) {
    return `${dateFormatter.format(start)} • ${timeFormatter.format(start)}`
  }

  const end = new Date(endAt)
  if (isNaN(end.getTime())) {
    return `${dateFormatter.format(start)} • ${timeFormatter.format(start)}`
  }

  const isSameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  if (isSameDay) {
    return `${dateFormatter.format(start)} • ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
  }

  return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} – ${dateFormatter.format(end)}, ${timeFormatter.format(end)}`
}

function cleanLocationString(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>()
  const clean: string[] = []
  for (const part of parts) {
    if (!part) continue
    const segments = part.split(/[,·•|]/).map(s => s.trim()).filter(Boolean)
    for (const seg of segments) {
      const lower = seg.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        clean.push(seg)
      }
    }
  }
  return clean.join(' · ')
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
      className="flex items-center gap-2.5 w-full text-left rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors"
      style={{ background: 'none', border: 'none', cursor: onOpenProfile ? 'pointer' : 'default' }}
    >
      {attendee.user.avatarUrl ? (
        <img src={attendee.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
      ) : (
        <div className="w-8 h-8 rounded-full shrink-0 bg-white/10" />
      )}
      <span className="text-sm font-medium truncate text-neutral-200">{name}</span>
      <span
        className={`ml-auto text-[10px] font-bold uppercase tracking-wide shrink-0 px-2 py-0.5 rounded-full ${
          attendee.status === 'GOING' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-neutral-400'
        }`}
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
  onUpdated,
  onSharedToDelvers,
}: EventDetailSheetProps) {
  const [event, setEvent] = useState<EventDto | null>(null)
  const [attendees, setAttendees] = useState<EventAttendeeDto[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [showAllAttendees, setShowAllAttendees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [addToJourneyOpen, setAddToJourneyOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

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
      onUpdated?.(next)
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
        const next = { ...event, savedByMe: false }
        setEvent(next)
        onUpdated?.(next)
      } else {
        await saveItem({ targetType: 'EVENT', targetId: event.id })
        const next = { ...event, savedByMe: true }
        setEvent(next)
        onUpdated?.(next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update save')
    } finally {
      setBusy(false)
    }
  }

  async function toggleLike() {
    if (!event || !signedIn) {
      onSignIn?.()
      return
    }
    setBusy(true)
    try {
      const next = event.likedByMe ? await unlikeEvent(event.id) : await likeEvent(event.id)
      setEvent(next)
      onUpdated?.(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update like')
    } finally {
      setBusy(false)
    }
  }

  async function likeFromDoubleTap() {
    if (!event) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (event.likedByMe) return
    const optimistic = { ...event, likedByMe: true, likeCount: (event.likeCount ?? 0) + 1 }
    setEvent(optimistic)
    try {
      const next = await likeEvent(event.id)
      setEvent(next)
      onUpdated?.(next)
    } catch {
      setEvent(event)
    }
  }

  async function shareEvent() {
    if (!event) return
    const url = eventShareUrl(event.id)
    const text = `${event.title} — ${formatEventDateTime(event.startAt, event.endAt)}\n${url}`
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

  async function shareToDelvers() {
    if (!event || busy) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createPost({ eventId: event.id })
      setShareNote('Shared to Delvers feed')
      onSharedToDelvers?.()
      window.setTimeout(() => setShareNote(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share to Delvers')
    } finally {
      setBusy(false)
    }
  }

  const place = event ? cleanLocationString([event.locationName, event.city, event.country]) : ''
  const badge = event ? statusBadge(event.status) : null
  const rsvpOpen = event?.status === 'PUBLISHED'
  const atCapacity = event?.maxAttendees != null && event.goingCount >= event.maxAttendees
    && event.myAttendance !== 'GOING'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(10, 8, 20, 0.75)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl text-white scrollbar-thin"
      >
        {event?.coverUrl && (
          <DoubleTapLike onDoubleLike={() => void likeFromDoubleTap()}>
            <EventCoverMedia
              url={event.coverUrl}
              resourceType={event.coverResourceType}
              className="w-full h-56 object-cover"
            />
          </DoubleTapLike>
        )}
        <div className="p-5">
          {/* Header & Title (Task 1: Normalized Typography) */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              {badge && (
                <span
                  className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2 border border-white/10"
                  style={{ background: 'rgba(140,82,255,0.12)', color: badge.color }}
                >
                  {badge.label}
                </span>
              )}
              <h2 className="text-2xl font-bold tracking-tight text-white m-0">
                {event?.title || 'Event'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Host & Co-Hosts Info */}
          {event && (
            <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Creator */}
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(event.creator.username)}
                  className="flex items-center gap-2.5 text-left group"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenProfile ? 'pointer' : 'default' }}
                >
                  {event.creator.avatarUrl ? (
                    <img src={event.creator.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold border border-amber-500/30">
                      {event.creator.username[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors leading-tight">
                      {event.business?.name
                        || event.creator.displayName
                        || formatUsername(event.creator.username)}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Organizer</span>
                  </div>
                  {event.business && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      Business
                    </span>
                  )}
                </button>

                {/* Co-Hosts Overlapping Avatar Cluster */}
                {event.collaborators && event.collaborators.length > 0 && (
                  <div className="flex items-center pl-2.5 border-l border-white/10">
                    <div className="flex items-center -space-x-2 mr-2">
                      {event.collaborators.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onOpenProfile?.(c.username)}
                          className="relative group/collab rounded-full transition-transform hover:scale-110 hover:z-10 focus:outline-none"
                          title={`${c.displayName} (@${c.username}) · ${c.role.replace('_', ' ')}`}
                        >
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt={c.displayName}
                              className="w-7 h-7 rounded-full object-cover border-2 border-neutral-900 shadow-sm"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-500/20 border-2 border-neutral-900 flex items-center justify-center text-[10px] font-bold text-amber-300 shadow-sm">
                              {c.displayName.charAt(0) || c.username.charAt(0)}
                            </div>
                          )}
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/collab:flex flex-col items-center pointer-events-none z-30">
                            <div className="bg-neutral-950 text-white text-[10px] py-1 px-2.5 rounded-lg border border-white/10 whitespace-nowrap shadow-xl">
                              <span className="font-semibold">{c.displayName}</span>
                              <span className="text-amber-400 ml-1 text-[9px]">({c.role.replace('_', ' ')})</span>
                            </div>
                          </div>
                        </button>
                      ))}
                      {event.collaborators.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-[9px] font-bold text-neutral-400 shadow-sm">
                          +{event.collaborators.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                      {event.collaborators.length} {event.collaborators.length === 1 ? 'co-host' : 'co-hosts'}
                    </span>
                  </div>
                )}
              </div>

              {/* Invite Co-Host Trigger for Organizer / Host */}
              {signedIn && (event.isOwner || event.collaborators?.some(c => c.role === 'HOST')) && (
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus size={13} />
                  <span>+ Invite Co-Host</span>
                </button>
              )}
            </div>
          )}

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {event?.community && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-neutral-400">
                Community · {event.community.name}
              </span>
            )}
            {event?.category && (
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {event.category}
              </span>
            )}
          </div>

          {/* Alerts / Error Messages */}
          {error && (
            <p className="text-xs mb-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400" role="alert">
              {error}
            </p>
          )}
          {shareNote && (
            <p className="text-xs mb-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" role="status">
              {shareNote}
            </p>
          )}

          {event && (
            <>
              {/* Task 2: Formatted Date & Time */}
              <div className="mb-2">
                <p className="text-sm m-0 inline-flex items-center gap-2 text-neutral-300">
                  <Calendar size={15} className="text-indigo-400 shrink-0" />
                  <span>{formatEventDateTime(event.startAt, event.endAt)}</span>
                </p>
              </div>

              {/* Task 3: Deduplicated Location */}
              {place && (
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm m-0 inline-flex items-center gap-2 text-neutral-300">
                    <MapPin size={15} className="text-indigo-400 shrink-0" />
                    <span>{place}</span>
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Open in Maps
                    </a>
                  )}
                </div>
              )}

              {/* Task 4: Elevated RSVP Section (Top Placement) */}
              {rsvpOpen ? (
                <div className="flex gap-2.5 my-4 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <button
                    type="button"
                    disabled={busy || atCapacity}
                    onClick={() => void setStatus('GOING')}
                    className={`flex-1 rounded-xl py-2.5 px-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      event.myAttendance === 'GOING'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white'
                    } ${atCapacity ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                  >
                    <span>{atCapacity ? 'Full' : 'Going'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-mono">
                      {event.goingCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setStatus('INTERESTED')}
                    className={`flex-1 rounded-xl py-2.5 px-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      event.myAttendance === 'INTERESTED'
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white'
                    } active:scale-[0.98]`}
                  >
                    <span>Interested</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-mono">
                      {event.interestedCount}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="my-3.5 py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <p className="text-xs m-0 text-neutral-400">
                    {event.status === 'CANCELLED'
                      ? 'This event was cancelled.'
                      : event.status === 'COMPLETED'
                        ? 'This event has ended.'
                        : 'RSVP opens when the event is published.'}
                  </p>
                </div>
              )}

              {/* Task 4: Consolidated Secondary Actions Toolbar */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleLike()}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors border ${
                    event.likedByMe
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                      : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <Heart size={14} fill={event.likedByMe ? 'currentColor' : 'none'} className={event.likedByMe ? 'text-rose-400' : ''} />
                  <span>{event.likeCount ?? 0}</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleSave()}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors border ${
                    event.savedByMe
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                      : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <Bookmark size={14} fill={event.savedByMe ? 'currentColor' : 'none'} />
                  <span>{event.savedByMe ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void shareEvent()}
                  className="flex-1 rounded-xl py-2 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] transition-colors"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!signedIn) {
                      onSignIn?.()
                      return
                    }
                    setAddToJourneyOpen(true)
                  }}
                  className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] transition-colors"
                  title="Add to Journey"
                  aria-label="Add to Journey"
                >
                  <Navigation size={14} />
                </button>

                {onSharedToDelvers && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void shareToDelvers()}
                    className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] transition-colors"
                    title="Post to Delvers feed"
                    aria-label="Post to Delvers feed"
                  >
                    <Share2 size={14} className="text-indigo-400" />
                  </button>
                )}

                {event.isOwner && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(event.id)}
                    className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] transition-colors"
                    title="Edit event"
                    aria-label="Edit event"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!signedIn) {
                      onSignIn?.()
                      return
                    }
                    setReportOpen(true)
                  }}
                  className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-rose-400 hover:bg-white/[0.08] transition-colors"
                  title="Report event"
                  aria-label="Report event"
                >
                  <Flag size={14} />
                </button>
              </div>

              {/* Event Description */}
              {event.description && (
                <p className="text-sm leading-relaxed mb-4 text-neutral-300">
                  {event.description}
                </p>
              )}

              {/* Task 5: Conditional Media Uploads (Going / Host Only) */}
              <div className="mb-4">
                <EventMediaEditor
                  event={event}
                  onChanged={next => {
                    setEvent(next)
                    onUpdated?.(next)
                  }}
                  onOpenProfile={onOpenProfile}
                  editable={Boolean(
                    signedIn
                    && event.status !== 'CANCELLED'
                    && (event.isOwner || event.myAttendance === 'GOING'),
                  )}
                />
              </div>

              {/* Attendees Summary */}
              <p className="text-xs mb-3 inline-flex items-center gap-1.5 text-neutral-400">
                <Users size={13} className="text-indigo-400" />
                <span>
                  {event.goingCount} going · {event.interestedCount} interested
                  {event.maxAttendees != null && ` · ${event.maxAttendees} max`}
                  {atCapacity && ' · Full'}
                </span>
              </p>

              {/* Attendees List */}
              {(attendeesLoading || attendees.length > 0) && (
                <div
                  className="mb-2 rounded-2xl p-3 bg-white/[0.03] border border-white/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider px-1 mb-2 text-neutral-400">
                    Who&apos;s going
                  </p>
                  {attendeesLoading ? (
                    <p className="text-xs px-1 py-2 m-0 text-neutral-500">Loading attendees…</p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {visibleAttendees.map(a => (
                          <AttendeeRow key={`${a.user.id}-${a.status}`} attendee={a} onOpenProfile={onOpenProfile} />
                        ))}
                      </div>
                      {attendees.length > 8 && !showAllAttendees && (
                        <button
                          type="button"
                          onClick={() => setShowAllAttendees(true)}
                          className="w-full text-xs font-semibold pt-2 text-indigo-400 hover:text-indigo-300 text-center transition-colors"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Show all {attendees.length} ({goingAttendees.length} going, {interestedAttendees.length} interested)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {event && (
        <AddToJourneySheet
          open={addToJourneyOpen}
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setAddToJourneyOpen(false)}
        />
      )}
      {event && (
        <EventCollaboratorInviteModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          eventId={event.id}
          existingCollaborators={event.collaborators}
          onCollaboratorAdded={newCollab => {
            setEvent(prev => {
              if (!prev) return prev
              const currentList = prev.collaborators || []
              const exists = currentList.some(c => c.userId === newCollab.userId)
              const nextCollabs = exists ? currentList : [...currentList, newCollab]
              const updated = { ...prev, collaborators: nextCollabs }
              onUpdated?.(updated)
              return updated
            })
          }}
        />
      )}
      <ContentReportSheet open={reportOpen && Boolean(event)} targetType="EVENT" targetId={event?.id || ''} onClose={() => setReportOpen(false)} />
    </div>
  )
}
