import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import {
  AdminAttentionList,
  AdminPageHeader,
  AdminQuickActions,
  AdminStatGrid,
  AdminStatusBadge,
} from '../components/admin'
import { ListSkeleton } from '../components/ui'
import {
  DEMO_ADMIN_ACTIVITY,
  DEMO_ADMIN_BOOKINGS,
  DEMO_ADMIN_REPORTS,
  DEMO_ANALYTICS,
  DEMO_CONTENT_REVIEW,
} from '../data/adminData'

type Overview = {
  users: number
  providers: number
  businesses: number
  businesses_pending: number
  listings: number
  bookings: number
  bookings_pending: number
}

type Business = {
  id: number
  business_name: string
  owner_username: string
  verification_status: string
  city: string
  region: string
}

const COMING_SOON = [
  { id: 'reports', title: 'Reports', desc: 'Reported posts, comments, profiles, listings, and safety issues.', anchor: '#reports' },
  { id: 'verifications', title: 'Verifications', desc: 'Business, guide, transport, and venue document review.', anchor: '#verifications' },
  { id: 'content', title: 'Content review', desc: 'Delvers posts, journeys, community, reviews, and events.', anchor: '#content' },
  { id: 'analytics', title: 'Analytics', desc: 'Growth, bookings by category, revenue, and conversion trends.', anchor: '#analytics' },
]

export function PlatformAdmin() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => apiFetch<Overview>('/api/accounts/admin/overview/'),
  })

  const { data: businesses = [] } = useQuery({
    queryKey: ['platform-businesses'],
    queryFn: () => apiFetch<Business[]>('/api/accounts/admin/businesses/'),
  })

  const pendingBiz = businesses.filter((b) => b.verification_status === 'pending')
  const issueBookings = DEMO_ADMIN_BOOKINGS.filter((b) => b.issue)
  const newReports = DEMO_ADMIN_REPORTS.filter((r) => r.status === 'new' || r.status === 'escalated')

  const attention = [
    ...(data && data.businesses_pending > 0
      ? [{
          id: 'verify',
          label: `${data.businesses_pending} business${data.businesses_pending === 1 ? '' : 'es'} awaiting verification`,
          count: data.businesses_pending,
          priority: 'high' as const,
          actionLabel: 'Review businesses',
          actionTo: '/admin/businesses',
        }]
      : []),
    ...(newReports.length > 0
      ? [{
          id: 'reports',
          label: `${newReports.length} reported item${newReports.length === 1 ? '' : 's'} need review`,
          count: newReports.length,
          priority: 'high' as const,
          actionLabel: 'View reports',
          actionTo: '/admin#reports',
        }]
      : []),
    ...(issueBookings.length > 0
      ? [{
          id: 'bookings',
          label: `${issueBookings.length} booking issue${issueBookings.length === 1 ? '' : 's'} flagged`,
          count: issueBookings.length,
          priority: 'medium' as const,
          actionLabel: 'Check bookings',
          actionTo: '/admin/bookings',
        }]
      : []),
    {
      id: 'content',
      label: `${DEMO_CONTENT_REVIEW.filter((c) => c.status === 'reported' || c.status === 'needs_review').length} content items need review`,
      priority: 'medium' as const,
      actionLabel: 'Content review',
      actionTo: '/admin#content',
    },
  ]

  if (isLoading) {
    return (
      <div className="adm-page">
        <AdminPageHeader title="Platform admin" subtitle="Monitor users, providers, bookings, reports, and platform health." />
        <ListSkeleton count={4} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="adm-page">
        <AdminPageHeader title="Platform admin" subtitle="Monitor users, providers, bookings, reports, and platform health." />
        <p className="adm-page__error" role="alert">
          We couldn&apos;t load platform admin data.{' '}
          <button type="button" className="adm-page__retry" onClick={() => void refetch()}>
            Try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Platform admin"
        subtitle="Monitor users, providers, bookings, reports, and platform health."
      />

      <AdminStatGrid
        stats={[
          { value: data.users, label: 'Total users' },
          { value: data.providers, label: 'Active providers' },
          { value: data.businesses_pending, label: 'Pending verifications', accent: data.businesses_pending > 0 },
          { value: data.bookings, label: 'Bookings this month' },
          { value: newReports.length, label: 'Reported content', warn: newReports.length > 0 },
          { value: issueBookings.length, label: 'Booking issues', warn: issueBookings.length > 0 },
          { value: `N$${DEMO_ANALYTICS.revenueMonth.toLocaleString()}`, label: 'Revenue (demo)' },
          { value: DEMO_ANALYTICS.newUsersWeek, label: 'New signups (7d)' },
        ]}
      />

      <AdminAttentionList items={attention} />

      <div className="adm-page__grid">
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>Recent activity</h2>
          </div>
          <ul className="adm-activity">
            {DEMO_ADMIN_ACTIVITY.map((a) => (
              <li key={a.id} className={`adm-activity__item adm-activity__item--${a.type}`}>
                <span>{a.text}</span>
                <time>{a.time}</time>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-panel" id="verifications">
          <div className="adm-panel__head">
            <h2>Pending verification</h2>
            <Link to="/admin/businesses">View all</Link>
          </div>
          {pendingBiz.length === 0 ? (
            <p className="adm-panel__empty">No businesses awaiting verification.</p>
          ) : (
            <ul className="adm-mini-table">
              {pendingBiz.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>{b.business_name}</strong>
                    <span>@{b.owner_username} · {b.city}</span>
                  </div>
                  <AdminStatusBadge status={b.verification_status} variant="warning" />
                  <Link to="/admin/businesses" className="adm-panel__action">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="adm-panel" id="reports">
        <div className="adm-panel__head">
          <h2>Reports preview</h2>
          <span className="adm-panel__soon">Full reports — coming soon</span>
        </div>
        <ul className="adm-mini-table">
          {DEMO_ADMIN_REPORTS.slice(0, 3).map((r) => (
            <li key={r.id}>
              <div>
                <strong>{r.type}: {r.item}</strong>
                <span>{r.reason} · {r.reporter}</span>
              </div>
              <AdminStatusBadge
                status={r.severity}
                variant={r.severity === 'critical' || r.severity === 'high' ? 'danger' : r.severity === 'medium' ? 'warning' : 'neutral'}
              />
              <button type="button" className="adm-panel__action adm-panel__action--btn" disabled title="Review coming soon">
                Review
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>Booking issues preview</h2>
          <Link to="/admin/bookings">All bookings</Link>
        </div>
        <ul className="adm-mini-table">
          {issueBookings.map((b) => (
            <li key={b.id}>
              <div>
                <strong>{b.id} · {b.customer}</strong>
                <span>{b.provider} · {b.service}</span>
              </div>
              <AdminStatusBadge status={b.status} variant={b.status === 'disputed' ? 'danger' : 'warning'} />
              <span className="adm-panel__muted">{b.issue}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="adm-panel" id="content">
        <div className="adm-panel__head">
          <h2>Content review preview</h2>
          <span className="adm-panel__soon">Full moderation — coming soon</span>
        </div>
        <ul className="adm-mini-table">
          {DEMO_CONTENT_REVIEW.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.type}: {c.title}</strong>
                <span>{c.author} · {c.date}</span>
              </div>
              <AdminStatusBadge status={c.status} variant={c.status === 'reported' ? 'danger' : 'warning'} />
              <button type="button" className="adm-panel__action adm-panel__action--btn" disabled title="View coming soon">
                View
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="adm-panel" id="analytics">
        <div className="adm-panel__head">
          <h2>Analytics preview</h2>
          <span className="adm-panel__soon">Full analytics — coming soon</span>
        </div>
        <div className="adm-analytics">
          <div className="adm-analytics__row">
            <span>New users (7d)</span>
            <strong>{DEMO_ANALYTICS.newUsersWeek}</strong>
          </div>
          <div className="adm-analytics__row">
            <span>Active users</span>
            <strong>{DEMO_ANALYTICS.activeUsers}</strong>
          </div>
          <div className="adm-analytics__row">
            <span>Provider growth (month)</span>
            <strong>+{DEMO_ANALYTICS.providerGrowth}</strong>
          </div>
          <p className="adm-analytics__label">Bookings by category</p>
          {DEMO_ANALYTICS.bookingsByCategory.map((c) => (
            <div key={c.label} className="adm-analytics__bar-row">
              <span>{c.label}</span>
              <div className="adm-analytics__bar" aria-hidden>
                <i style={{ width: `${c.pct}%` }} />
              </div>
              <span>{c.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-panel" id="settings">
        <div className="adm-panel__head">
          <h2>Platform settings</h2>
          <span className="adm-panel__soon">Coming soon</span>
        </div>
        <p className="adm-panel__empty">Platform configuration, roles, and feature flags will be managed here.</p>
      </section>

      <section className="adm-panel">
        <h2>Quick admin actions</h2>
        <AdminQuickActions
          actions={[
            { label: 'Review businesses', to: '/admin/businesses' },
            { label: 'View users', to: '/admin/users' },
            { label: 'Check bookings', to: '/admin/bookings' },
            { label: 'Reports preview', to: '/admin#reports' },
            { label: 'Content review', to: '/admin#content' },
            { label: 'Analytics', to: '/admin#analytics' },
          ]}
        />
      </section>

      <section className="adm-panel">
        <h2>Admin sections</h2>
        <div className="adm-section-grid">
          {COMING_SOON.map((s) => (
            <Link key={s.id} to={`/admin${s.anchor}`} className="adm-section-card">
              <strong>{s.title}</strong>
              <span>{s.desc}</span>
            </Link>
          ))}
          <Link to="/admin/users" className="adm-section-card">
            <strong>Users</strong>
            <span>Accounts, roles, and status</span>
          </Link>
          <Link to="/admin/businesses" className="adm-section-card">
            <strong>Businesses</strong>
            <span>Verification and providers</span>
          </Link>
          <Link to="/admin/bookings" className="adm-section-card">
            <strong>Bookings</strong>
            <span>Cross-platform oversight</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
