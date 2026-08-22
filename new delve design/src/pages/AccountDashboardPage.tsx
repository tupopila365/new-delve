import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  Bookmark, Building2, Bus, Calendar, ChevronRight, Flame, Heart,
  LogOut, MapPin, MessageCircle, Navigation, Settings, Tag,
  TrendingDown, User,
} from 'lucide-react'
import UsernameSettingsPanel from './UsernameSettingsPanel'
import { formatUsername } from '../lib/formatUsername'
import { fetchOnboarding } from '../api/authClient'
import { computeProfileCompletionPercent } from '../lib/profileCompletion'
import type { TravelerProfileDto, JourneySummary, EventDto } from '@delve/contracts'
import { listMyJourneys } from '../api/journeyClient'
import { fetchEvents } from '../api/socialClient'
import EventCoverMedia from '../components/EventCoverMedia'

export type AccountNavTarget =
  | 'Profile'
  | 'Journeys'
  | 'Events'
  | 'Deals'
  | 'Transport'
  | 'Saved'
  | 'Messages'
  | 'Home'
  | 'Bookings'

interface AccountDashboardPageProps {
  onNavigate: (target: AccountNavTarget) => void
  onOpenBusinessAdmin?: () => void
  onSignOut?: () => void
  /** Opens Account settings (full). */
  onOpenSettings?: () => void
  /** Opens Account settings focused on Profile tab (photo, name, bio). */
  onEditProfile?: () => void
  /** Opens a specific journey detail (Account hub shortcut). */
  onOpenJourney?: (journeyId: string) => void
  /** Opens event detail sheet from account shortcuts. */
  onOpenEvent?: (eventId: string) => void
  travelerName?: string
  /** False while session refresh is still in progress — do not treat as signed-out. */
  authReady?: boolean
  signedIn?: boolean
}

const BOOKINGS = [
  {
    id: 1,
    type: 'Stay',
    name: 'Riad Dar Zitoun',
    location: 'Marrakech, Morocco',
    dates: 'Aug 14 – 18, 2026',
    status: 'Confirmed',
    ref: 'DLV-83421',
    img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=640&h=360&fit=crop&auto=format',
  },
  {
    id: 2,
    type: 'Transport',
    name: 'CMN → RAK Train',
    location: 'ONCF Rail · Coach 4, Seat 12A',
    dates: 'Aug 14, 2026 · 08:40',
    status: 'Confirmed',
    ref: 'DLV-83390',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=640&h=360&fit=crop&auto=format',
  },
]


const ALERTS = [
  {
    id: 1,
    icon: <Flame size={18} />,
    label: 'Deal ending in 6h',
    desc: 'Sahara Trek · was $189 now $129',
    tone: 'warning' as const,
  },
  {
    id: 2,
    icon: <TrendingDown size={18} />,
    label: 'Price dropped',
    desc: 'Hammam Ziani · −18%',
    tone: 'success' as const,
  },
]

const ACTIONS: { label: string; icon: ReactNode; target: AccountNavTarget }[] = [
  { label: 'My Bookings', icon: <Calendar size={20} />, target: 'Bookings' },
  { label: 'Open Journey', icon: <Navigation size={20} />, target: 'Journeys' },
  { label: 'Saved Items', icon: <Heart size={20} />, target: 'Saved' },
  { label: 'Messages', icon: <MessageCircle size={20} />, target: 'Messages' },
  { label: 'Find Deals', icon: <Tag size={20} />, target: 'Deals' },
  { label: 'Transport', icon: <Bus size={20} />, target: 'Transport' },
]

function greetingForNow() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function SectionHeader({
  label,
  action,
  onAction,
}: {
  label: string
  action: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="font-display text-lg font-bold" style={{ color: 'var(--fg)' }}>{label}</h2>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-semibold active:opacity-70"
          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

export default function AccountDashboardPage({
  onNavigate,
  onOpenBusinessAdmin,
  onSignOut,
  onOpenSettings,
  onEditProfile,
  onOpenJourney,
  onOpenEvent,
  travelerName = 'Amara',
  authReady = true,
  signedIn = true,
}: AccountDashboardPageProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFailed, setCoverFailed] = useState(false)
  const [myJourneys, setMyJourneys] = useState<JourneySummary[]>([])
  const [journeysLoading, setJourneysLoading] = useState(false)
  const [goingEvents, setGoingEvents] = useState<EventDto[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  /** null = not resolved yet — never show a fake 0% while loading */
  const [completionPercent, setCompletionPercent] = useState<number | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!authReady) {
      setProfileLoading(true)
      return
    }
    if (!signedIn) {
      setProfileLoading(false)
      setCompletionPercent(null)
      setCoverUrl(null)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    void (async () => {
      try {
        const profile = await fetchOnboarding()
        if (cancelled) return
        setCoverUrl(profile.coverUrl?.trim() || null)
        setCoverFailed(false)
        setCompletionPercent(computeProfileCompletionPercent(profile as TravelerProfileDto))
      } catch {
        if (!cancelled) {
          setCoverUrl(null)
          setCoverFailed(false)
          // Keep completion unknown — do not flash 0% on a transient failure.
          setCompletionPercent(null)
        }
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn])

  useEffect(() => {
    if (!authReady || !signedIn) {
      setMyJourneys([])
      return
    }
    let cancelled = false
    setJourneysLoading(true)
    void listMyJourneys()
      .then(rows => {
        if (!cancelled) setMyJourneys(rows.slice(0, 2))
      })
      .catch(() => {
        if (!cancelled) setMyJourneys([])
      })
      .finally(() => {
        if (!cancelled) setJourneysLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn])

  useEffect(() => {
    if (!authReady || !signedIn) {
      setGoingEvents([])
      return
    }
    let cancelled = false
    setEventsLoading(true)
    void fetchEvents({ mine: 'attending' })
      .then(rows => {
        if (!cancelled) setGoingEvents(rows.slice(0, 2))
      })
      .catch(() => {
        if (!cancelled) setGoingEvents([])
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn])

  const showCover = Boolean(coverUrl) && !coverFailed
  const showCompletionBanner =
    !profileLoading && completionPercent !== null && completionPercent < 100

  function handleFinish() {
    if (onEditProfile) {
      onEditProfile()
      return
    }
    if (onOpenSettings) {
      onOpenSettings()
      return
    }
    onNavigate('Profile')
  }

  const headerBtnStyle = {
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
  } as const

  return (
    <div className="pb-4">
      {/* Greeting banner — coverUrl from traveler profile, else purple gradient */}
      <section className="relative overflow-hidden px-4 pt-7 pb-10 sm:rounded-2xl sm:mx-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #8C52FF 55%, #C7ACFF 100%)',
          }}
          aria-hidden
        />
        {showCover && coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        )}
        {showCover && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(95,47,201,0.72) 0%, rgba(140,82,255,0.55) 55%, rgba(40,20,80,0.65) 100%)',
            }}
            aria-hidden
          />
        )}
        {!showCover && (
          <>
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div
              className="pointer-events-none absolute right-6 -bottom-12 h-28 w-28 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
          </>
        )}

        <div className="relative z-[1]">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Your account
          </p>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {greetingForNow()}
          </p>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-4 break-words [overflow-wrap:anywhere]">
            {formatUsername(travelerName) || travelerName}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('Profile')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] transition-transform"
              style={headerBtnStyle}
              aria-label="View your profile"
            >
              <User size={16} />
              View profile
            </button>
            {(onEditProfile || onOpenSettings) && (
              <button
                type="button"
                onClick={() => (onEditProfile ? onEditProfile() : onOpenSettings?.())}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] transition-transform"
                style={headerBtnStyle}
                aria-label="Edit profile"
              >
                Edit profile
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] transition-transform"
                style={headerBtnStyle}
                aria-label="Open account settings"
              >
                <Settings size={16} />
                Settings
              </button>
            )}
          </div>
        </div>

        {profileLoading && (
          <div
            className="relative z-[1] flex items-center gap-3 rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)' }}
            aria-busy="true"
            aria-label="Loading profile completion"
          >
            <div className="flex-1 min-w-0">
              <div className="h-3 w-36 rounded mb-1.5" style={{ background: 'rgba(255,255,255,0.35)' }} />
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.28)' }}>
                <div className="h-full w-1/3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.55)' }} />
              </div>
            </div>
          </div>
        )}
        {showCompletionBanner && (
          <div
            className="relative z-[1] flex items-center gap-3 rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white mb-1.5">
                Profile · {completionPercent}% complete
              </p>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.28)' }}>
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white flex-shrink-0 active:opacity-80"
              style={{ background: 'rgba(255,255,255,0.22)', border: 'none', cursor: 'pointer' }}
            >
              Finish
            </button>
          </div>
        )}
      </section>

      <div className="px-3 sm:px-0 -mt-4 relative z-[1]">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {ACTIONS.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.target)}
              className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 active:scale-[0.97] transition-transform"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
              >
                {action.icon}
              </span>
              <span className="text-[11px] font-semibold text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Alerts */}
        <div className="flex flex-col gap-2.5 mb-6">
          {ALERTS.map(alert => {
            const toneColor = alert.tone === 'warning' ? 'var(--auth-warning)' : 'var(--auth-success)'
            return (
              <div
                key={alert.id}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid color-mix(in srgb, ${toneColor} 35%, var(--border))`,
                }}
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${toneColor} 14%, transparent)`, color: toneColor }}
                >
                  {alert.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: toneColor }}>{alert.label}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--fg)' }}>{alert.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('Deals')}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white flex-shrink-0 active:opacity-90"
                  style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                >
                  View
                </button>
              </div>
            )
          })}
        </div>

        {/* Upcoming bookings */}
        <SectionHeader label="Upcoming" action="See all" onAction={() => onNavigate('Bookings')} />
        <div className="flex flex-col gap-3 mb-6">
          {BOOKINGS.map(booking => (
            <article
              key={booking.id}
              className="overflow-hidden rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="relative h-28 overflow-hidden">
                <img src={booking.img} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--primary)' }}
                    >
                      {booking.type}
                    </p>
                    <h3 className="font-display text-[15px] font-bold truncate" style={{ color: 'var(--fg)' }}>
                      {booking.name}
                    </h3>
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold flex-shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--auth-success) 14%, transparent)', color: 'var(--auth-success)' }}
                  >
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--fg-muted)' }}>{booking.location}</p>
                <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>{booking.dates}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl py-2 text-sm font-semibold text-white active:opacity-90"
                    style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl py-2 text-sm font-semibold active:opacity-80"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                    }}
                  >
                    Contact
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Your journeys */}
        <SectionHeader label="Your journeys" action="See all" onAction={() => onNavigate('Journeys')} />
        {journeysLoading ? (
          <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>Loading journeys…</p>
        ) : myJourneys.length === 0 ? (
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>No journeys yet</p>
            <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
              Share a route you traveled to help other Delvers plan.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('Journeys')}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              Create journey
            </button>
          </div>
        ) : (
          myJourneys.map(journey => (
            <article
              key={journey.id}
              className="overflow-hidden rounded-2xl mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="relative h-36 overflow-hidden">
                {journey.coverUrl ? (
                  <img src={journey.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
                    <MapPin size={28} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }}
                />
                <h3 className="absolute bottom-3 left-3.5 right-3.5 font-display text-lg font-bold text-white m-0">
                  {journey.title}
                </h3>
                {journey.visibility !== 'PUBLIC' && (
                  <span
                    className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                  >
                    {journey.visibility === 'DRAFT' ? 'Draft' : 'Private'}
                  </span>
                )}
              </div>
              <div className="p-3.5">
                <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
                  {journey.startPlace} → {journey.endPlace} · {journey.stopCount} stops · {journey.durationDays} days
                </p>
                <button
                  type="button"
                  onClick={() => (onOpenJourney ? onOpenJourney(journey.id) : onNavigate('Journeys'))}
                  className="w-full rounded-xl py-2 text-sm font-semibold text-white active:opacity-90"
                  style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                >
                  Open journey
                </button>
              </div>
            </article>
          ))
        )}

        {/* Events you're going to */}
        <SectionHeader label="Events you're going to" action="See all" onAction={() => onNavigate('Events')} />
        {eventsLoading ? (
          <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>Loading events…</p>
        ) : goingEvents.length === 0 ? (
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>No upcoming events</p>
            <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
              RSVP to meetups and activities to see them here.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('Events')}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              Discover events
            </button>
          </div>
        ) : (
          goingEvents.map(event => {
            const place = [event.locationName, event.city].filter(Boolean).join(' · ')
            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-2xl mb-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="relative h-36 overflow-hidden">
                  {event.coverUrl ? (
                    <EventCoverMedia
                      url={event.coverUrl}
                      resourceType={event.coverResourceType}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
                      <Calendar size={28} style={{ color: 'var(--fg-muted)' }} />
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }}
                  />
                  <h3 className="absolute bottom-3 left-3.5 right-3.5 font-display text-lg font-bold text-white m-0">
                    {event.title}
                  </h3>
                </div>
                <div className="p-3.5">
                  <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
                    {new Date(event.startAt).toLocaleString()}
                    {place ? ` · ${place}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => (onOpenEvent ? onOpenEvent(event.id) : onNavigate('Events'))}
                    className="w-full rounded-xl py-2 text-sm font-semibold text-white active:opacity-90"
                    style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                  >
                    View event
                  </button>
                </div>
              </article>
            )
          })
        )}

        {/* Account settings */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform mb-2.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
            >
              <Settings size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Account settings</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Email, password, sessions, and more
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
          </button>
        )}
        {(onEditProfile || onOpenSettings) && (
          <button
            type="button"
            onClick={() => (onEditProfile ? onEditProfile() : onOpenSettings?.())}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform mb-2.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
            >
              <User size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Edit profile</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Photo, display name, bio, and interests
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
          </button>
        )}
        <UsernameSettingsPanel />

        {/* Business admin entry */}
        {onOpenBusinessAdmin && (
          <button
            type="button"
            onClick={onOpenBusinessAdmin}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform mb-2.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
            >
              <Building2 size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Business dashboard</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Create or manage your business profile
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
          </button>
        )}

        {/* Shortcut to public profile */}
        <button
          type="button"
          onClick={() => onNavigate('Profile')}
          className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
          >
            <User size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>View profile</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Cover, posts, events, and how others see you
            </p>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform mt-2.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(224,92,26,0.1)', color: 'var(--danger, #c2410c)' }}
            >
              <LogOut size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Sign out</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                End this session on this device
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
