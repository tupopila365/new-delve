import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar, Loader2, LogIn, MapPin, Plus, Search, Users,
} from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import { fetchEvents } from '../api/socialClient'
import { formatUsername } from '../lib/formatUsername'
import EventCoverMedia from '../components/EventCoverMedia'

type Tab = 'discover' | 'hosting' | 'attending'

function statusLabel(status: EventDto['status']) {
  if (status === 'DRAFT') return 'Draft'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'COMPLETED') return 'Completed'
  return null
}

function EventCard({
  event,
  onOpen,
}: {
  event: EventDto
  onOpen: (id: string) => void
}) {
  const badge = statusLabel(event.status)
  const place = [event.locationName, event.city].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="overflow-hidden sm:rounded-2xl text-left w-full transition-all active:scale-[0.99]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="relative h-40 bg-black/10">
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
        {event.visibility !== 'PUBLIC' && (
          <span
            className="absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {event.visibility === 'FOLLOWERS' ? 'Followers' : 'Private'}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <p className="text-sm font-bold m-0 leading-snug" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          {event.title}
        </p>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          {new Date(event.startAt).toLocaleString()}
        </p>
        {place && (
          <p className="text-xs m-0 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={12} />
            {place}
          </p>
        )}
        <p className="text-xs m-0 inline-flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-0.5">
            <Users size={11} /> {event.goingCount} going
          </span>
          {event.maxAttendees != null && (
            <span>· {Math.max(0, event.maxAttendees - event.goingCount)} spots left</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {event.creator.avatarUrl ? (
            <img src={event.creator.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {event.creator.displayName || formatUsername(event.creator.username)}
          </span>
        </div>
      </div>
    </button>
  )
}

interface EventsPageProps {
  signedIn?: boolean
  onSignIn?: () => void
  onOpenEvent: (id: string) => void
  onCreateEvent?: () => void
  initialTab?: Tab
}

export default function EventsPage({
  signedIn = false,
  onSignIn,
  onOpenEvent,
  onCreateEvent,
  initialTab = 'discover',
}: EventsPageProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [city, setCity] = useState('')
  const [events, setEvents] = useState<EventDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const load = useCallback(async () => {
    if ((tab === 'hosting' || tab === 'attending') && !signedIn) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchEvents(
        tab === 'discover'
          ? { city: city.trim() || undefined }
          : { mine: tab === 'hosting' ? 'hosting' : 'attending' },
      )
      setEvents(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [tab, city, signedIn])

  useEffect(() => {
    void load()
  }, [load])

  const emptyCopy = useMemo(() => {
    if (tab === 'hosting') return 'You have not created any events yet.'
    if (tab === 'attending') return 'Events you RSVP to will show up here.'
    return city.trim() ? `No upcoming events in ${city.trim()}.` : 'No upcoming events yet.'
  }, [tab, city])

  return (
    <div className="pb-4">
      <div className="px-3 sm:px-0 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
          Events
        </h1>
        {signedIn && onCreateEvent && (
          <button
            type="button"
            onClick={onCreateEvent}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={16} /> Create
          </button>
        )}
      </div>

      <div className="px-3 sm:px-0 py-3 flex gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'discover' as const, label: 'Discover' },
          { key: 'hosting' as const, label: 'Hosting' },
          { key: 'attending' as const, label: 'Going' },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold"
            style={{
              border: `1px solid ${tab === t.key ? 'var(--primary)' : 'var(--border)'}`,
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="px-3 sm:px-0 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void load() }}
              placeholder="Filter by city"
              className="w-full pl-9 pr-3 rounded-xl text-sm min-h-[44px]"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
            />
          </div>
        </div>
      )}

      {(tab === 'hosting' || tab === 'attending') && !signedIn && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--fg)' }}>Sign in to see your events</p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
        </div>
      )}

      {error && !loading && (
        <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
      )}

      {!loading && !error && (tab === 'discover' || signedIn) && events.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Calendar size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>{emptyCopy}</p>
          {tab === 'hosting' && signedIn && onCreateEvent && (
            <button
              type="button"
              onClick={onCreateEvent}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Create event
            </button>
          )}
        </div>
      )}

      {!loading && !error && events.length > 0 && (tab === 'discover' || signedIn) && (
        <div className="flex flex-col gap-3 p-3 sm:p-0 sm:pt-4">
          {events.map(ev => (
            <EventCard key={ev.id} event={ev} onOpen={onOpenEvent} />
          ))}
        </div>
      )}
    </div>
  )
}
