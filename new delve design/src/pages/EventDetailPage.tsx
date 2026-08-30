import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserPlus,
  Share2,
  Heart,
  Bookmark,
  ExternalLink,
  Shield,
  Crown,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { EventDto, EventAttendeeDto, EventCollaboratorDto } from '@delve/contracts'
import {
  fetchEvent,
  fetchEventAttendees,
  setEventAttendance,
  clearEventAttendance,
  likeEvent,
  unlikeEvent,
  saveItem,
  unsaveItem,
} from '../api/socialClient'
import { getStoredUser } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'
import { eventShareUrl, mapsUrlForEvent } from '../lib/eventLinks'
import EventCollaboratorInviteModal from '../components/events/EventCollaboratorInviteModal'
import EventMediaEditor from '../media/EventMediaEditor'

interface Props {
  eventId: string
  onBack?: () => void
  onOpenProfile?: (username: string) => void
}

export default function EventDetailPage({ eventId, onBack, onOpenProfile }: Props) {
  const [event, setEvent] = useState<EventDto | null>(null)
  const [attendees, setAttendees] = useState<EventAttendeeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const currentUser = getStoredUser()
  const isOrganizerOrHost = Boolean(
    event &&
      currentUser &&
      (event.creator.id === currentUser.id ||
        event.collaborators?.some(c => c.userId === currentUser.id && c.role === 'HOST'))
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const [eventData, attendeesData] = await Promise.all([
          fetchEvent(eventId),
          fetchEventAttendees(eventId).catch(() => []),
        ])
        if (!cancelled) {
          setEvent(eventData)
          setAttendees(attendeesData)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load event')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  async function handleToggleAttendance(status: 'GOING' | 'INTERESTED') {
    if (!event || busy) return
    setBusy(true)
    try {
      if (event.myAttendance === status) {
        const updated = await clearEventAttendance(event.id)
        setEvent(updated)
      } else {
        const updated = await setEventAttendance(event.id, status)
        setEvent(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update RSVP')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleLike() {
    if (!event || busy) return
    setBusy(true)
    try {
      const updated = event.likedByMe ? await unlikeEvent(event.id) : await likeEvent(event.id)
      setEvent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update reaction')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleSave() {
    if (!event || busy) return
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
      setError(err instanceof Error ? err.message : 'Could not save event')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-xs text-neutral-400">Loading expedition details...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Event Unavailable</h3>
        <p className="text-xs text-neutral-400 mb-4">{error || 'Event could not be found'}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
          >
            Back
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Event Co-Hosting & Details
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleSave()}
            className={`p-2 rounded-xl border transition-colors ${
              event.savedByMe
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
          >
            <Bookmark size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title: event.title, url: eventShareUrl(event.id) })
              }
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* Hero Cover */}
      <div className="relative w-full h-72 sm:h-96 max-w-5xl mx-auto mt-4 px-4 sm:px-8">
        <div className="w-full h-full rounded-3xl overflow-hidden relative border border-white/10 bg-neutral-900 shadow-2xl">
          {event.coverUrl ? (
            <img src={event.coverUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-neutral-900 via-neutral-850 to-neutral-800 flex items-center justify-center text-neutral-600">
              <Calendar size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

          {/* Floating Badges */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
            {event.category && (
              <span className="self-start text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full backdrop-blur-md">
                {event.category}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight m-0">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organizer & Co-Hosts, Schedule, Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organizer & Co-Hosts Cluster Card */}
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Creator / Host */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(event.creator.username)}
                  className="flex items-center gap-3 text-left group"
                >
                  {event.creator.avatarUrl ? (
                    <img
                      src={event.creator.avatarUrl}
                      alt={event.creator.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm">
                      {event.creator.displayName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors m-0">
                      {event.creator.displayName}
                    </h4>
                    <p className="text-xs text-neutral-400 m-0">@{event.creator.username} · Organizer</p>
                  </div>
                </button>

                {/* Overlapping Co-Host Avatar Cluster */}
                {event.collaborators && event.collaborators.length > 0 && (
                  <div className="flex items-center pl-3 border-l border-white/10">
                    <div className="flex items-center -space-x-2.5 mr-2.5">
                      {event.collaborators.slice(0, 5).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onOpenProfile?.(c.username)}
                          className="relative group rounded-full hover:scale-110 hover:z-10 transition-transform focus:outline-none"
                          title={`${c.displayName} (@${c.username}) · ${c.role}`}
                        >
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt={c.displayName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-neutral-900"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-neutral-900 flex items-center justify-center text-[10px] font-bold text-amber-300">
                              {c.displayName.charAt(0)}
                            </div>
                          )}
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                            <div className="bg-neutral-950 text-white text-[10px] py-1 px-2.5 rounded-lg border border-white/10 whitespace-nowrap shadow-xl">
                              <span className="font-semibold">{c.displayName}</span>
                              <span className="text-amber-400 ml-1 text-[9px]">({c.role})</span>
                            </div>
                          </div>
                        </button>
                      ))}
                      {event.collaborators.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                          +{event.collaborators.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                      {event.collaborators.length} {event.collaborators.length === 1 ? 'co-host' : 'co-hosts'}
                    </span>
                  </div>
                )}
              </div>

              {/* Invite Co-Host Trigger */}
              {isOrganizerOrHost && (
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus size={14} />
                  <span>+ Invite Co-Host</span>
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 m-0">
              About this Event
            </h3>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line m-0">
              {event.description || 'No description provided for this event.'}
            </p>
          </div>

          {/* Event Media Gallery */}
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <EventMediaEditor
              event={event}
              onChanged={updated => setEvent(updated)}
              onOpenProfile={onOpenProfile}
              editable={Boolean(
                currentUser &&
                  event.status !== 'CANCELLED' &&
                  (isOrganizerOrHost || event.myAttendance === 'GOING')
              )}
            />
          </div>
        </div>

        {/* Right Column: Date, Location, RSVP Actions */}
        <div className="space-y-6">
          {/* Quick Details Card */}
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 m-0">Date & Time</p>
                <p className="text-sm font-bold text-white m-0 mt-0.5">
                  {new Date(event.startAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-400 m-0">Location</p>
                <p className="text-sm font-bold text-white truncate m-0 mt-0.5">
                  {[event.locationName, event.city, event.country].filter(Boolean).join(', ') ||
                    'Location TBA'}
                </p>
              </div>
            </div>

            {/* RSVP Action Buttons */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleToggleAttendance('GOING')}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  event.myAttendance === 'GOING'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                }`}
              >
                {event.myAttendance === 'GOING' ? '✓ Going (Attending)' : 'RSVP Going'}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleToggleAttendance('INTERESTED')}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs border transition-all ${
                  event.myAttendance === 'INTERESTED'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
                }`}
              >
                {event.myAttendance === 'INTERESTED' ? '★ Interested' : 'Mark Interested'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Collaborator Invite Modal */}
      <EventCollaboratorInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        eventId={event.id}
        existingCollaborators={event.collaborators}
        onCollaboratorAdded={newCollab => {
          setEvent(prev => {
            if (!prev) return prev
            const current = prev.collaborators || []
            const exists = current.some(c => c.userId === newCollab.userId)
            return {
              ...prev,
              collaborators: exists ? current : [...current, newCollab],
            }
          })
        }}
      />
    </div>
  )
}
