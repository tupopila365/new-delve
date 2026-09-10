import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Bookmark, Calendar, Heart, MapPin, User, Users } from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import {
  clearEventAttendance,
  likeEvent,
  saveItem,
  setEventAttendance,
  unlikeEvent,
  unsaveItem,
} from '../../api/socialClient'
import { formatUsername } from '../../lib/formatUsername'
import { timeAgoShort } from '../../lib/timeAgoShort'
import { DoubleTapLike } from '../delvers/DoubleTapLike'
import ExpandableCaption from '../mobile/ExpandableCaption'
import EventCoverMedia from '../EventCoverMedia'
import { formatEventDateTime } from './eventFilters'

function statusLabel(status: EventDto['status']) {
  if (status === 'DRAFT') return 'Draft'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'COMPLETED') return 'Completed'
  return null
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
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
  const [busy, setBusy] = useState(false)
  const badge = statusLabel(event.status)
  const place = [event.locationName, event.city, event.country].filter(Boolean).join(' · ')
  const { combined: when } = formatEventDateTime(event.startAt)
  const rsvpOpen = event.status === 'PUBLISHED'
  const likeCount = event.likeCount ?? 0
  const likedByMe = Boolean(event.likedByMe)
  const atCapacity =
    event.maxAttendees != null
    && event.goingCount >= event.maxAttendees
    && event.myAttendance !== 'GOING'
  const caption = [event.title, event.description].filter(Boolean).join(' — ')
  const hostName = event.business?.name || event.creator.displayName || formatUsername(event.creator.username)

  async function toggleLike(e?: MouseEvent) {
    e?.stopPropagation()
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const next = likedByMe ? await unlikeEvent(event.id) : await likeEvent(event.id)
      onEventUpdated?.(next)
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  async function likeFromDoubleTap() {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (likedByMe) return
    onEventUpdated?.({ ...event, likedByMe: true, likeCount: likeCount + 1 })
    try {
      const next = await likeEvent(event.id)
      onEventUpdated?.(next)
    } catch {
      onEventUpdated?.({ ...event, likedByMe: false, likeCount })
    }
  }

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
    <article className="overflow-hidden w-full min-w-0 rounded-none border-b border-[var(--border)] sm:rounded-2xl sm:border sm:border-[var(--border)] bg-[var(--surface)]">
      {/* Header: Host profile & time */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenProfile?.(event.creator.username)}
          className={`flex items-center gap-2.5 min-w-0 bg-transparent border-0 p-0 text-left ${
            onOpenProfile ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-[var(--primary)]/12">
            {event.creator.avatarUrl ? (
              <img src={event.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={18} className="text-[var(--fg-muted)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold m-0 truncate text-[var(--fg)]">
              {hostName}
            </p>
            {place ? (
              <p className="text-xs m-0 truncate inline-flex items-center gap-1 text-[var(--fg-muted)]">
                <MapPin size={11} className="shrink-0" />
                {place}
              </p>
            ) : null}
          </div>
        </button>
        <span className="ml-auto text-xs shrink-0 text-[var(--fg-muted)]">
          {timeAgoShort(event.createdAt)}
        </span>
      </div>

      {/* Media: Strictly enforcing aspect-[4/5] without drop shadows */}
      <DoubleTapLike
        onDoubleLike={() => void likeFromDoubleTap()}
        onSingleTap={() => onOpen(event.id)}
        className="relative w-full overflow-hidden bg-black/10"
      >
        <div className="relative w-full aspect-[4/5] overflow-hidden">
          {event.coverUrl ? (
            <EventCoverMedia
              url={event.coverUrl}
              resourceType={event.coverResourceType}
              className="absolute inset-0 w-full h-full object-cover"
              controls={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar size={36} className="text-[var(--fg-muted)]" />
            </div>
          )}
          {badge && (
            <span className="absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white">
              {badge}
            </span>
          )}
          {event.category && (
            <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-[var(--primary)] text-white">
              {event.category}
            </span>
          )}
        </div>
      </DoubleTapLike>

      {/* Footer: Social actions, counts & RSVP */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            disabled={busy}
            onClick={e => void toggleLike(e)}
            className={`bg-transparent border-0 p-0 cursor-pointer transition-colors ${
              likedByMe ? 'text-[var(--primary)]' : 'text-[var(--fg)]'
            }`}
            aria-label="Like event"
          >
            <Heart size={22} fill={likedByMe ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => onOpen(event.id)}
            className="bg-transparent border-0 p-0 text-[var(--fg)] cursor-pointer"
            aria-label="Event details"
          >
            <Users size={22} />
          </button>
          <button
            type="button"
            onClick={toggleSave}
            className={`ml-auto bg-transparent border-0 p-0 cursor-pointer transition-colors ${
              event.savedByMe ? 'text-[var(--primary)]' : 'text-[var(--fg)]'
            }`}
            aria-label={event.savedByMe ? 'Unsave event' : 'Save event'}
          >
            <Bookmark size={22} fill={event.savedByMe ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-sm font-semibold m-0 mb-1 text-[var(--fg)]">
          {formatCount(likeCount)} likes · {formatCount(event.goingCount)} going
        </p>

        {caption ? (
          <ExpandableCaption authorFirstName={hostName} caption={caption} />
        ) : null}

        <p className="text-xs m-0 mt-2 text-[var(--fg-muted)]">
          {when}
        </p>

        {!compact && rsvpOpen && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={atCapacity && event.myAttendance !== 'INTERESTED'}
              onClick={e => void setStatus(e, 'INTERESTED')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold min-h-[44px] transition-all duration-150 ${
                event.myAttendance === 'INTERESTED'
                  ? 'border border-[var(--primary)] bg-[var(--primary)]/12 text-[var(--primary)]'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-subtle)]'
              } ${
                atCapacity && event.myAttendance !== 'INTERESTED'
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer active:scale-[0.99]'
              }`}
            >
              {event.myAttendance === 'INTERESTED' ? 'Interested ✓' : 'Interested'}
            </button>
            <button
              type="button"
              disabled={atCapacity}
              onClick={e => void setStatus(e, 'GOING')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold min-h-[44px] transition-all duration-150 ${
                event.myAttendance === 'GOING'
                  ? 'border-0 bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-subtle)]'
              } ${
                atCapacity
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer active:scale-[0.99]'
              }`}
            >
              {atCapacity ? 'Event full' : event.myAttendance === 'GOING' ? 'Going ✓' : 'Going'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
