import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bookmark,
  CalendarDays,
  Car,
  Compass,
  Hotel,
  MessageCircle,
  PenLine,
  Plus,
  Settings,
  Sparkles,
  Ticket,
  User,
  Utensils,
} from 'lucide-react'
import { cuisineLabel, priceLevelLabel } from '../utils/foodListing'
import { foodCoverSrc } from '../utils/foodDisplay'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { UserBookingCard, bookingNextStep } from '../components/booking'
import { useMySeatBookingGroups, useMyVehicleBookings } from '../hooks/useMyTransportBookings'
import { useMyFoodReservations } from '../hooks/useMyFoodReservations'
import type { BookingServiceType } from '../components/booking'
import '../components/dashboard/user-dashboard.css'

type StayBooking = {
  id: number
  listing: number
  listing_title: string
  check_in: string
  check_out: string
  guests: number
  total_price?: string
  status: string
}

type GuideBooking = {
  id: number
  guide: number
  guide_headline: string
  guide_username?: string
  date: string
  start_time?: string | null
  duration_hours?: number
  group_size: number
  package_id?: string
  package_title?: string
  notes?: string
  total_price?: string
  mock_payment_ref?: string
  status: string
  created_at?: string
}

type EventBooking = {
  id: number
  event: number
  event_title: string
  event_starts_at: string
  event_venue: string
  event_city?: string
  event_region?: string
  organizer_username?: string
  organizer_display_name?: string | null
  tickets: number
  total_price?: string | null
  status: string
  booking_ref: string
}

type DashboardBooking =
  | {
      key: string
      sortDate: string
      serviceType: 'stay'
      title: string
      dateLabel: string
      peopleLabel: string
      status: string
      price?: string
      href: string
      viewLabel: string
      messageLabel: string
    }
  | {
      key: string
      sortDate: string
      serviceType: 'guide' | 'experience'
      title: string
      provider: string
      dateLabel: string
      peopleLabel: string
      status: string
      price?: string
      href: string
      viewLabel: string
      messageLabel: string
    }
  | {
      key: string
      sortDate: string
      serviceType: 'event'
      title: string
      provider: string
      dateLabel: string
      peopleLabel: string
      status: string
      price?: string
      href: string
      viewLabel: string
      messageLabel: string
      messageUsername?: string
    }
  | {
      key: string
      sortDate: string
      serviceType: 'vehicle'
      title: string
      provider: string
      dateLabel: string
      peopleLabel: string
      status: string
      price?: string
      href: string
      viewLabel: string
      messageLabel: string
      messageUsername?: string
    }
  | {
      key: string
      sortDate: string
      serviceType: 'bus'
      title: string
      provider: string
      dateLabel: string
      peopleLabel: string
      status: string
      price?: string
      href: string
      viewLabel: string
      messageLabel: string
      messageUsername?: string
    }
  | {
      key: string
      sortDate: string
      serviceType: 'food'
      title: string
      provider: string
      dateLabel: string
      peopleLabel: string
      status: string
      href: string
      viewLabel: string
      messageLabel: string
      messageUsername?: string
    }

function humanizePackageId(packageId: string): string {
  const trimmed = packageId.trim()
  if (!trimmed) return 'Guide experience'
  return trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function locationLine(city?: string | null, region?: string | null) {
  return [city, region].filter(Boolean).join(', ')
}

export function UserDashboard() {
  const { profile } = useAuth()

  const { data: stayBookings, isLoading: loadingStays } = useQuery({
    queryKey: ['my-bookings', 'stays'],
    queryFn: async () => {
      try {
        return asArray<StayBooking>(await apiFetch('/api/accommodation/bookings/'))
      } catch {
        return []
      }
    },
    enabled: Boolean(profile),
  })

  type SavedStay = {
    id: number
    title: string
    region: string
    city?: string
    price_per_night: string
    cover_image: string | null
    property_type?: string | null
  }

  const { data: savedStays = [], isLoading: loadingSavedStays } = useQuery({
    queryKey: ['saved-stays'],
    queryFn: async () => {
      try {
        return asArray<SavedStay>(await apiFetch('/api/accommodation/listings/saved/'))
      } catch {
        return []
      }
    },
    enabled: Boolean(profile),
  })

  type SavedFoodVenue = {
    id: number
    name: string
    region: string
    city?: string | null
    cuisine: string
    price_level: number
    cover_image: string | null
  }

  const { data: savedFood = [], isLoading: loadingSavedFood } = useQuery({
    queryKey: ['saved-food'],
    queryFn: async () => {
      try {
        return asArray<SavedFoodVenue>(await apiFetch('/api/food/venues/saved/'))
      } catch {
        return []
      }
    },
    enabled: Boolean(profile),
  })

  type SavedGuide = {
    id: number
    headline: string
    photo: string | null
    username: string
    display_name?: string | null
    regions?: string[]
    hourly_rate?: string | null
  }

  const { data: savedGuides = [], isLoading: loadingSavedGuides } = useQuery({
    queryKey: ['saved-guides'],
    queryFn: async () => {
      try {
        return asArray<SavedGuide>(await apiFetch('/api/guides/profiles/saved/'))
      } catch {
        return []
      }
    },
    enabled: Boolean(profile),
  })

  const { data: guideBookings, isLoading: loadingGuides } = useQuery({
    queryKey: ['my-bookings', 'guides'],
    queryFn: () => apiFetch<GuideBooking[]>('/api/guides/bookings/').catch(() => [] as GuideBooking[]),
    enabled: Boolean(profile),
  })

  const { data: eventBookings, isLoading: loadingEvents } = useQuery({
    queryKey: ['my-bookings', 'events'],
    queryFn: () => apiFetch<EventBooking[]>('/api/events/bookings/').catch(() => [] as EventBooking[]),
    enabled: Boolean(profile),
  })

  const { data: vehicleBookings = [], isLoading: loadingVehicles } = useMyVehicleBookings(Boolean(profile))
  const { groups: seatBookingGroups = [], isLoading: loadingSeats } = useMySeatBookingGroups(Boolean(profile))
  const { data: foodReservations = [], isLoading: loadingFood } = useMyFoodReservations(Boolean(profile))

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  const dashboardBookings = useMemo((): DashboardBooking[] => {
    const stays: DashboardBooking[] = (stayBookings ?? [])
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .map((b) => ({
        key: `stay-${b.id}`,
        sortDate: b.check_in,
        serviceType: 'stay' as const,
        title: b.listing_title,
        dateLabel: `${b.check_in} – ${b.check_out}`,
        peopleLabel: `${b.guests} ${b.guests === 1 ? 'guest' : 'guests'}`,
        status: b.status,
        price: b.total_price ? `N$${b.total_price}` : undefined,
        href: `/dashboard/bookings/stay/${b.id}`,
        viewLabel: 'View stay',
        messageLabel: 'Message host',
      }))

    const guides: DashboardBooking[] = (guideBookings ?? [])
      .filter((b) => !['cancelled', 'declined', 'refunded'].includes(b.status))
      .map((b) => {
        const isExperience = Boolean(b.package_id?.trim() || b.package_title?.trim())
        const serviceType: BookingServiceType = isExperience ? 'experience' : 'guide'
        const title =
          b.package_title?.trim() ||
          (b.package_id?.trim() ? humanizePackageId(b.package_id) : b.guide_headline)
        const dateLabel = [
          b.date,
          b.start_time ? String(b.start_time).slice(0, 5) : null,
          b.duration_hours ? `${b.duration_hours}h` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        return {
          key: `guide-${b.id}`,
          sortDate: b.date,
          serviceType,
          title,
          provider: b.guide_headline,
          dateLabel,
          peopleLabel: `${b.group_size} ${b.group_size === 1 ? 'traveller' : 'travellers'}`,
          status: b.status,
          price: b.total_price ? `N$${b.total_price}` : undefined,
          href: `/dashboard/bookings/guide/${b.id}`,
          viewLabel: isExperience ? 'View experience' : 'View guide',
          messageLabel: 'Message guide',
          messageUsername: b.guide_username,
        }
      })

    const events: DashboardBooking[] = (eventBookings ?? [])
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .map((b) => {
        const d = new Date(b.event_starts_at)
        const dateLabel = Number.isNaN(d.getTime())
          ? 'Date TBA'
          : d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        return {
          key: `event-${b.id}`,
          sortDate: b.event_starts_at,
          serviceType: 'event' as const,
          title: b.event_title,
          provider: b.organizer_display_name?.trim() || b.organizer_username || 'Organizer',
          dateLabel,
          peopleLabel: `${b.tickets} ${b.tickets === 1 ? 'ticket' : 'tickets'}`,
          status: b.status,
          price: b.total_price ? `N$${b.total_price}` : undefined,
          href: `/events/${b.event}`,
          viewLabel: 'View event',
          messageLabel: 'Message organizer',
          messageUsername: b.organizer_username,
        }
      })

    const vehicles: DashboardBooking[] = vehicleBookings
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .map((b) => ({
        key: `vehicle-${b.id}`,
        sortDate: b.start_date,
        serviceType: 'vehicle' as const,
        title: b.listing_title,
        provider: b.owner_display_name?.trim() || b.listing_owner_username,
        dateLabel: `${b.start_date} – ${b.end_date}`,
        peopleLabel: 'Vehicle rental',
        status: b.status,
        price: b.total_price ? `N$${b.total_price}` : undefined,
        href: `/dashboard/bookings/vehicle/${b.id}`,
        viewLabel: 'View rental',
        messageLabel: 'Message provider',
        messageUsername: b.listing_owner_username,
      }))

    const buses: DashboardBooking[] = seatBookingGroups
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .map((b) => {
        const d = new Date(b.trip_departs_at)
        const dateLabel = Number.isNaN(d.getTime())
          ? b.trip_departs_at
          : d.toLocaleDateString('en-NA', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
        return {
          key: b.key,
          sortDate: b.trip_departs_at,
          serviceType: 'bus' as const,
          title: b.route_label,
          provider: b.operator_name || 'Bus operator',
          dateLabel,
          peopleLabel: `${b.seat_numbers.length} seat${b.seat_numbers.length === 1 ? '' : 's'} · ${b.seat_numbers.join(', ')}`,
          status: b.status,
          price: b.total_price,
          href: `/dashboard/bookings/bus/${b.reservation_ids[0]}`,
          viewLabel: 'View trip',
          messageLabel: 'Message operator',
          messageUsername: b.operator_owner_username,
        }
      })

    const food: DashboardBooking[] = foodReservations
      .filter((b) => !['cancelled', 'declined', 'checked_out'].includes(b.status))
      .map((b) => {
        const d = new Date(b.reserved_for)
        const dateLabel = Number.isNaN(d.getTime())
          ? b.reserved_for
          : d.toLocaleString('en-NA', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
        return {
          key: `food-${b.id}`,
          sortDate: b.reserved_for,
          serviceType: 'food' as const,
          title: b.venue_name,
          provider: b.owner_display_name?.trim() || b.owner_username,
          dateLabel,
          peopleLabel: `${b.party_size} ${b.party_size === 1 ? 'guest' : 'guests'}`,
          status: b.status,
          href: `/dashboard/bookings/food/${b.id}`,
          viewLabel: 'View reservation',
          messageLabel: 'Message venue',
          messageUsername: b.owner_username,
        }
      })

    return [...stays, ...guides, ...events, ...vehicles, ...buses, ...food]
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
      .slice(0, 8)
  }, [stayBookings, guideBookings, eventBookings, vehicleBookings, seatBookingGroups, foodReservations])

  if (!profile) return <Navigate to="/login" replace />

  const isProvider = profile.user_type === 'service_provider' || businesses.length > 0
  const loadingBookings = loadingStays || loadingGuides || loadingEvents || loadingVehicles || loadingSeats || loadingFood
  const activeBookings = dashboardBookings.length
  const upcomingEvents = (eventBookings ?? []).filter(
    (b) => !['cancelled', 'declined'].includes(b.status) && new Date(b.event_starts_at).getTime() >= Date.now(),
  ).length
  const pendingBookings =
    (stayBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length +
    (guideBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length +
    (eventBookings ?? []).filter((b) => b.status === 'pending').length

  const displayName = profile.display_name?.trim() || profile.username
  const where = locationLine(profile.city, profile.region)

  return (
    <div className="t-dash">
      <div className="t-dash__welcome">
        <UserAvatar
          src={profile.avatar}
          name={displayName}
          shape="rounded"
          className="t-dash__avatar"
          fill
        />
        <div className="t-dash__welcome-body">
          <p className="t-dash__welcome-name">Hi, {displayName}</p>
          {where ? <p className="t-dash__welcome-meta">{where}</p> : null}
          <div className="t-dash__welcome-links">
            <Link to={`/u/${profile.username}`}>Public profile</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </div>
      </div>

      <nav className="t-dash__nav" aria-label="Dashboard shortcuts">
        <Link
          to="#bookings"
          className={`t-dash__nav-item${pendingBookings > 0 ? ' t-dash__nav-item--accent' : ''}`}
        >
          <span className="t-dash__nav-icon" aria-hidden>
            <CalendarDays size={20} strokeWidth={2.25} />
          </span>
          <span className="t-dash__nav-value">{activeBookings}</span>
          <span className="t-dash__nav-label">Bookings</span>
        </Link>
        <Link to="/messages" className="t-dash__nav-item">
          <span className="t-dash__nav-icon" aria-hidden>
            <MessageCircle size={20} strokeWidth={2.25} />
          </span>
          <span className="t-dash__nav-value t-dash__nav-value--text">Open</span>
          <span className="t-dash__nav-label">Inbox</span>
        </Link>
        <Link to="#saved" className="t-dash__nav-item">
          <span className="t-dash__nav-icon" aria-hidden>
            <Bookmark size={20} strokeWidth={2.25} />
          </span>
          <span className="t-dash__nav-value">0</span>
          <span className="t-dash__nav-label">Saved</span>
        </Link>
        <Link to="/account" className="t-dash__nav-item">
          <span className="t-dash__nav-icon" aria-hidden>
            <User size={20} strokeWidth={2.25} />
          </span>
          <span className="t-dash__nav-value">
            <Settings size={18} strokeWidth={2.25} />
          </span>
          <span className="t-dash__nav-label">Account</span>
        </Link>
      </nav>

      {isProvider ? (
        <section className="t-dash__section">
          <div className="t-dash__section-head">
            <h2 className="t-dash__section-title">Your businesses</h2>
            <Link to="/provider" className="t-dash__btn-primary">
              Provider dashboard
            </Link>
          </div>
          <div className="t-dash__biz-list">
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="t-dash__biz-card">
                {b.logo ? (
                  <img src={b.logo} alt="" className="t-dash__biz-logo" />
                ) : (
                  <span className="t-dash__biz-logo t-dash__biz-logo--init" aria-hidden>
                    {b.business_name.charAt(0)}
                  </span>
                )}
                <div>
                  <span className="t-dash__biz-name">{b.business_name}</span>
                  <span className="t-dash__biz-meta">{locationLine(b.city, b.region)}</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="t-dash__hint">Provider tools live separately from your traveller bookings.</p>
        </section>
      ) : null}

      <section className="t-dash__section" id="bookings">
        <div className="t-dash__section-head">
          <h2 className="t-dash__section-title">My bookings & requests</h2>
        </div>

        {loadingBookings ? (
          <div className="t-dash__bookings">
            {[1, 2].map((i) => (
              <div key={i} className="t-dash__sk" />
            ))}
          </div>
        ) : dashboardBookings.length === 0 ? (
          <div className="t-dash__empty">
            <span className="t-dash__empty-icon" aria-hidden>
              <CalendarDays size={22} strokeWidth={2.25} />
            </span>
            <h3>No bookings yet</h3>
            <p>Explore stays, guides, events, or transport to plan your next trip.</p>
            <Link to="/events" className="t-dash__empty-btn">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="t-dash__bookings">
            {dashboardBookings.map((b) => (
              <UserBookingCard
                key={b.key}
                serviceType={b.serviceType}
                title={b.title}
                provider={'provider' in b ? b.provider : undefined}
                dateLabel={b.dateLabel}
                peopleLabel={b.peopleLabel}
                status={b.status}
                price={b.price}
                nextStep={bookingNextStep(b.status, b.serviceType)}
                href={b.href}
                messageUsername={'messageUsername' in b ? b.messageUsername : undefined}
                viewLabel={b.viewLabel}
                messageLabel={b.messageLabel}
              />
            ))}
          </div>
        )}

        <div className="t-dash__explore">
          <Link to="/accommodation">
            <Hotel size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
            Stays
          </Link>
          <Link to="/guides">
            <Compass size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
            Guides
          </Link>
          <Link to="/events">
            <Ticket size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
            Events
          </Link>
          <Link to="/transport">
            <Car size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
            Transport
          </Link>
          <Link to="/community">Ask locals</Link>
        </div>
      </section>

      <section className="t-dash__section" id="my-events">
        <div className="t-dash__section-head">
          <h2 className="t-dash__section-title">My events</h2>
          {upcomingEvents > 0 ? (
            <span className="t-dash__section-meta">{upcomingEvents} upcoming</span>
          ) : null}
        </div>
        {loadingEvents ? (
          <div className="t-dash__bookings">
            <div className="t-dash__sk" />
          </div>
        ) : (eventBookings ?? []).filter((b) => !['cancelled', 'declined'].includes(b.status)).length === 0 ? (
          <div className="t-dash__empty t-dash__empty--compact">
            <span className="t-dash__empty-icon" aria-hidden>
              <Ticket size={22} strokeWidth={2.25} />
            </span>
            <h3>No event RSVPs yet</h3>
            <p>Discover markets, gigs, and gatherings near you.</p>
            <Link to="/events" className="t-dash__empty-btn">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="t-dash__bookings">
            {(eventBookings ?? [])
              .filter((b) => !['cancelled', 'declined'].includes(b.status))
              .slice(0, 4)
              .map((b) => {
                const d = new Date(b.event_starts_at)
                const dateLabel = Number.isNaN(d.getTime())
                  ? 'Date TBA'
                  : d.toLocaleDateString('en-NA', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                return (
                  <UserBookingCard
                    key={`event-only-${b.id}`}
                    serviceType="event"
                    title={b.event_title}
                    provider={b.organizer_display_name?.trim() || b.organizer_username || 'Organizer'}
                    dateLabel={dateLabel}
                    peopleLabel={`${b.tickets} ${b.tickets === 1 ? 'ticket' : 'tickets'} · ${b.booking_ref}`}
                    status={b.status}
                    price={b.total_price ? `N$${b.total_price}` : undefined}
                    nextStep={bookingNextStep(b.status, 'event')}
                    href={`/events/${b.event}`}
                    messageUsername={b.organizer_username}
                    viewLabel="View event"
                    messageLabel="Message organizer"
                  />
                )
              })}
          </div>
        )}

      </section>

      <div className="t-dash__split">
        <section className="t-dash__section" id="saved">
          <h2 className="t-dash__section-title">Saved</h2>
          {loadingSavedStays || loadingSavedFood || loadingSavedGuides ? (
            <p className="t-dash__hint">Loading saved places…</p>
          ) : savedStays.length === 0 && savedFood.length === 0 && savedGuides.length === 0 ? (
            <div className="t-dash__empty">
              <span className="t-dash__empty-icon" aria-hidden>
                <Bookmark size={22} strokeWidth={2.25} />
              </span>
              <h3>Nothing saved yet</h3>
              <p>Bookmark stays, food spots, and guides from list or detail pages to find them here.</p>
              <Link to="/accommodation" className="t-dash__empty-btn">
                Browse stays
              </Link>
            </div>
          ) : (
            <>
              {savedStays.length > 0 ? (
                <div className="t-dash__saved-grid">
                  {savedStays.map((stay) => {
                    const location = stay.city ? `${stay.city}, ${stay.region}` : stay.region
                    return (
                      <Link key={`stay-${stay.id}`} to={`/accommodation/${stay.id}`} className="t-dash__saved-card">
                        <div className="t-dash__saved-thumb">
                          {stay.cover_image ? (
                            <img src={mediaUrl(stay.cover_image) || ''} alt="" loading="lazy" />
                          ) : (
                            <span className="t-dash__saved-thumb-fallback" aria-hidden>
                              <Hotel size={20} strokeWidth={2} />
                            </span>
                          )}
                        </div>
                        <div className="t-dash__saved-copy">
                          <strong>{stay.title}</strong>
                          <span>{location}</span>
                          <span>From N${stay.price_per_night} / night</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
              {savedFood.length > 0 ? (
                <div className={`t-dash__saved-grid${savedStays.length > 0 ? ' t-dash__saved-grid--food' : ''}`}>
                  {savedFood.map((venue) => {
                    const location = venue.city ? `${venue.city}, ${venue.region}` : venue.region
                    const cover = foodCoverSrc(venue.cover_image, venue.cuisine)
                    return (
                      <Link key={`food-${venue.id}`} to={`/food/${venue.id}`} className="t-dash__saved-card">
                        <div className="t-dash__saved-thumb">
                          <img src={cover} alt="" loading="lazy" />
                        </div>
                        <div className="t-dash__saved-copy">
                          <strong>{venue.name}</strong>
                          <span>{location}</span>
                          <span>
                            {cuisineLabel(venue.cuisine)} · {priceLevelLabel(venue.price_level)}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
              {savedGuides.length > 0 ? (
                <div
                  className={`t-dash__saved-grid${
                    savedStays.length > 0 || savedFood.length > 0 ? ' t-dash__saved-grid--food' : ''
                  }`}
                >
                  {savedGuides.map((guide) => {
                    const location = (guide.regions ?? []).slice(0, 2).join(' · ')
                    const name = guide.display_name?.trim() || guide.username
                    const photo = mediaUrl(guide.photo)
                    return (
                      <Link key={`guide-${guide.id}`} to={`/guides/${guide.id}`} className="t-dash__saved-card">
                        <div className="t-dash__saved-thumb">
                          {photo ? (
                            <img src={photo} alt="" loading="lazy" />
                          ) : (
                            <span className="t-dash__saved-thumb-fallback" aria-hidden>
                              <Compass size={20} strokeWidth={2} />
                            </span>
                          )}
                        </div>
                        <div className="t-dash__saved-copy">
                          <strong>{guide.headline}</strong>
                          <span>{location || name}</span>
                          <span>
                            {guide.hourly_rate ? `From N$${guide.hourly_rate} / hr` : 'Rates on profile'}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="t-dash__section">
          <h2 className="t-dash__section-title">Recent activity</h2>
          <div className="t-dash__empty">
            <span className="t-dash__empty-icon" aria-hidden>
              <Sparkles size={22} strokeWidth={2.25} />
            </span>
            <h3>Quiet for now</h3>
            <p>Posts, bookings, and replies will show up here.</p>
            <Link to="/journeys/new" className="t-dash__empty-btn">
              Plan a journey
            </Link>
          </div>
        </section>
      </div>

      <section className="t-dash__section">
        <h2 className="t-dash__section-title">Quick actions</h2>
        <div className="t-dash__shortcuts">
          <Link to="/create" className="t-dash__shortcut">
            <PenLine size={18} strokeWidth={2.25} aria-hidden />
            Create post
          </Link>
          <Link to="/journeys/new" className="t-dash__shortcut">
            <Plus size={18} strokeWidth={2.25} aria-hidden />
            New journey
          </Link>
          <Link to="/messages" className="t-dash__shortcut">
            <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
            Messages
          </Link>
          <Link to="/accommodation" className="t-dash__shortcut">
            <Hotel size={18} strokeWidth={2.25} aria-hidden />
            Find stays
          </Link>
          <Link to="/guides" className="t-dash__shortcut">
            <Compass size={18} strokeWidth={2.25} aria-hidden />
            Find guides
          </Link>
          <Link to="/transport" className="t-dash__shortcut">
            <Car size={18} strokeWidth={2.25} aria-hidden />
            Transport
          </Link>
        </div>
      </section>
    </div>
  )
}
