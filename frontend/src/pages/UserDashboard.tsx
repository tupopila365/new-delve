import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Heart, Sparkles } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { UserBookingCard, bookingNextStep } from '../components/booking'
import type { BookingServiceType } from '../components/booking'
import { DashboardSection, DashboardStatGrid } from '../components/dashboard'
import { EmptyState } from '../components/ui'

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
  const allBookingsCount = (stayBookings?.length ?? 0) + (guideBookings?.length ?? 0)
  const pendingBookings =
    (stayBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length +
    (guideBookings ?? []).filter((b) => ['pending', 'requested'].includes(b.status)).length
  return (
    <div className="udash">
      <div className="udash__top-links">
        <Link to={`/u/${profile.username}`}>Public profile</Link>
        <Link to="/settings">Settings</Link>
      </div>

      <DashboardStatGrid
        stats={[
          { value: allBookingsCount || '0', label: 'Bookings', to: '/dashboard#bookings', accent: pendingBookings > 0 },
          { value: 'Inbox', label: 'Messages', to: '/messages' },
          { value: 'Saved', label: 'Saved', to: '/dashboard#saved' },
          { value: 'Account', label: 'Account', to: '/account' },
        ]}
      />

      {isProvider ? (
        <DashboardSection
          title="Your businesses"
          action={
            <Link to="/provider" className="btn btn-primary">
              Provider dashboard
            </Link>
          }
        >
          <div className="udash__biz-grid">
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="udash__biz-card">
                {b.logo ? <img src={b.logo} alt="" /> : <span>{b.business_name.charAt(0)}</span>}
                <div>
                  <strong>{b.business_name}</strong>
                  <small>
                    {b.city}, {b.region}
                  </small>
                </div>
              </Link>
            ))}
          </div>
          <p className="udash__hint">Provider tools are separate from your traveller dashboard.</p>
        </DashboardSection>
      ) : null}

      <DashboardSection id="bookings" title="My bookings & requests">
        {loadingBookings ? (
          <div className="udash__list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton udash__list-sk" />
            ))}
          </div>
        ) : dashboardBookings.length === 0 ? (
          <EmptyState
            compact
            iconElement={<CalendarDays size={28} strokeWidth={2} aria-hidden />}
            title="No bookings yet"
            sub="Start by exploring stays, guides, events, or transport."
            cta={{ label: 'Explore stays', to: '/accommodation' }}
          />
        ) : (
          <div className="udash__booking-cards">
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
        <div className="udash__links">
          <Link to="/accommodation">Explore stays</Link>
          <Link to="/guides">Browse guides</Link>
          <Link to="/transport">Browse transport</Link>
          <Link to="/events">Browse events</Link>
          <Link to="/community">Ask locals</Link>
        </div>
      </DashboardSection>

      <DashboardSection id="saved" title="Saved places & journeys">
        <EmptyState
          compact
          iconElement={<Heart size={28} strokeWidth={2} aria-hidden />}
          title="No saved places yet"
          sub="Save stays, food spots, guides, events, and journeys to plan later."
          cta={{ label: 'View on profile', to: `/u/${profile.username}` }}
        />
      </DashboardSection>

      <DashboardSection title="Recent activity">
        <EmptyState
          compact
          iconElement={<Sparkles size={28} strokeWidth={2} aria-hidden />}
          title="No recent activity"
          sub="Posts, bookings, and community replies will show up here."
          cta={{ label: 'Create a journey', to: '/journeys/new' }}
        />
      </DashboardSection>

      <DashboardSection title="Quick actions">
        <div className="udash__actions">
          <Link to="/create" className="udash__action">
            + Create Delvers post
          </Link>
          <Link to="/journeys/new" className="udash__action">
            + New journey
          </Link>
          <Link to="/events/new" className="udash__action">
            + Create event
          </Link>
          <Link to="/messages" className="udash__action">
            Open messages
          </Link>
          <Link to="/community" className="udash__action">
            Ask locals
          </Link>
        </div>
      </DashboardSection>
    </div>
  )
}
