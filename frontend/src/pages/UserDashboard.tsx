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
  User,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { UserBookingCard, bookingNextStep } from '../components/booking'
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
  date: string
  group_size: number
  package_id?: string
  notes?: string
  total_price?: string
  status: string
  created_at?: string
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
    queryFn: () => apiFetch<StayBooking[]>('/api/accommodation/bookings/').catch(() => [] as StayBooking[]),
    enabled: Boolean(profile),
  })

  const { data: guideBookings, isLoading: loadingGuides } = useQuery({
    queryKey: ['my-bookings', 'guides'],
    queryFn: () => apiFetch<GuideBooking[]>('/api/guides/bookings/').catch(() => [] as GuideBooking[]),
    enabled: Boolean(profile),
  })

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
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .map((b) => {
        const isExperience = Boolean(b.package_id?.trim())
        const serviceType: BookingServiceType = isExperience ? 'experience' : 'guide'
        return {
          key: `guide-${b.id}`,
          sortDate: b.date,
          serviceType,
          title: isExperience ? humanizePackageId(b.package_id!) : b.guide_headline,
          provider: b.guide_headline,
          dateLabel: b.date,
          peopleLabel: `${b.group_size} ${b.group_size === 1 ? 'traveller' : 'travellers'}`,
          status: b.status,
          price: b.total_price ? `N$${b.total_price}` : undefined,
          href: `/dashboard/bookings/guide/${b.id}`,
          viewLabel: isExperience ? 'View experience' : 'View guide',
          messageLabel: 'Message guide',
        }
      })

    return [...stays, ...guides]
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
      .slice(0, 6)
  }, [stayBookings, guideBookings])

  if (!profile) return <Navigate to="/login" replace />

  const isProvider = profile.user_type === 'service_provider' || businesses.length > 0
  const loadingBookings = loadingStays || loadingGuides
  const activeBookings = dashboardBookings.length
  const pendingBookings =
    (stayBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length +
    (guideBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length

  const displayName = profile.display_name?.trim() || profile.username
  const avatar = mediaUrl(profile.avatar) || profile.avatar
  const where = locationLine(profile.city, profile.region)

  return (
    <div className="t-dash">
      <div className="t-dash__welcome">
        {avatar ? (
          <img src={avatar} alt="" className="t-dash__avatar" />
        ) : (
          <span className="t-dash__avatar t-dash__avatar--init" aria-hidden>
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
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
            <p>Explore stays, guides, or transport to plan your next trip.</p>
            <Link to="/accommodation" className="t-dash__empty-btn">
              Explore stays
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
                messageTo="/messages"
                viewLabel={b.viewLabel}
                messageLabel={b.messageLabel}
                onCancel={() => {}}
                cancelDisabled
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
          <Link to="/transport">
            <Car size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
            Transport
          </Link>
          <Link to="/community">Ask locals</Link>
        </div>
      </section>

      <div className="t-dash__split">
        <section className="t-dash__section" id="saved">
          <h2 className="t-dash__section-title">Saved</h2>
          <div className="t-dash__empty">
            <span className="t-dash__empty-icon" aria-hidden>
              <Bookmark size={22} strokeWidth={2.25} />
            </span>
            <h3>Nothing saved yet</h3>
            <p>Bookmark stays, guides, and places from your profile.</p>
            <Link to={`/u/${profile.username}`} className="t-dash__empty-btn">
              View profile
            </Link>
          </div>
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
