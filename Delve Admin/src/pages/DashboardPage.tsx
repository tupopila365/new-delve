import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { ActivityItem, AdminBusiness, AttentionItem, PlatformOverview, StatItem } from '../api/types'
import {
  DelveAdminActivityFeed,
  DelveAdminAttentionList,
  DelveAdminError,
  DelveAdminLoading,
  DelveAdminMiniTable,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminQuickActions,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'
import { DEMO_REPORTS, statusVariant } from '../data/demoData'

export function DashboardPage() {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => apiFetch<PlatformOverview>('/api/accounts/admin/overview/'),
  })

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => apiFetch<AdminBusiness[]>('/api/accounts/admin/businesses/'),
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['activity'],
    queryFn: () => apiFetch<ActivityItem[]>('/api/accounts/admin/activity/'),
  })

  const pendingBiz = businesses.filter((b) => b.verification_status === 'pending')
  const newReports = DEMO_REPORTS.filter((r) => r.status === 'new' || r.status === 'escalated')

  const attention = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = []
    if (overview && overview.businesses_pending > 0) {
      items.push({
        id: 'verify',
        label: `${overview.businesses_pending} business${overview.businesses_pending === 1 ? '' : 'es'} awaiting verification`,
        count: overview.businesses_pending,
        priority: 'high',
        actionLabel: 'Review',
        actionTo: '/admin/verifications',
      })
    }
    if ((overview?.reports_open ?? newReports.length) > 0) {
      items.push({
        id: 'reports',
        label: `${overview?.reports_open ?? newReports.length} reports need review`,
        count: overview?.reports_open ?? newReports.length,
        priority: 'high',
        actionLabel: 'Open reports',
        actionTo: '/admin/reports',
      })
    }
    if ((overview?.bookings_pending ?? 0) > 0) {
      items.push({
        id: 'bookings',
        label: `${overview!.bookings_pending} pending booking${overview!.bookings_pending === 1 ? '' : 's'}`,
        count: overview!.bookings_pending,
        priority: 'medium',
        actionLabel: 'View bookings',
        actionTo: '/admin/bookings',
      })
    }
    if ((overview?.users_unverified_email ?? 0) > 0) {
      items.push({
        id: 'email',
        label: `${overview!.users_unverified_email} unverified email${overview!.users_unverified_email === 1 ? '' : 's'}`,
        count: overview!.users_unverified_email,
        priority: 'medium',
        actionLabel: 'Review',
        actionTo: '/admin/email-verification',
      })
    }
    return items
  }, [overview, newReports.length])

  const stats = useMemo((): StatItem[] => {
    if (!overview) return []
    return [
      { value: overview.users, label: 'Total users' },
      { value: overview.providers, label: 'Providers' },
      { value: overview.businesses_pending, label: 'Pending verifications', accent: overview.businesses_pending > 0 },
      { value: overview.listings, label: 'Listings (all)' },
      { value: overview.bookings, label: 'Bookings (all)' },
      { value: overview.bookings_pending, label: 'Pending bookings', warn: overview.bookings_pending > 0 },
      { value: overview.reports_open ?? 0, label: 'Open reports' },
    ]
  }, [overview])

  const verticalStats = useMemo((): StatItem[] => {
    if (!overview) return []
    return [
      { value: overview.listings_stays, label: 'Stay listings' },
      { value: overview.listings_guides, label: 'Guide listings' },
      { value: overview.listings_transport, label: 'Transport listings' },
      { value: overview.listings_food, label: 'Food listings' },
      { value: overview.listings_events ?? 0, label: 'Events' },
      { value: overview.listings_posts ?? 0, label: 'Posts & community' },
      { value: overview.bookings_stays, label: 'Stay bookings' },
      { value: overview.bookings_guides, label: 'Guide bookings' },
      { value: overview.bookings_transport, label: 'Transport bookings' },
      { value: overview.bookings_food ?? 0, label: 'Food bookings' },
    ]
  }, [overview])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Dashboard" subtitle="What needs your attention?" />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Dashboard" subtitle="What needs your attention?" />
        <DelveAdminError message="Could not load dashboard data." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Dashboard"
        subtitle="Monitor users, providers, verifications, reports, and platform health."
      />

      <DelveAdminStatGrid stats={stats} />
      <DelveAdminAttentionList items={attention} />

      <DelveAdminPanel title="Listings & bookings by vertical">
        <DelveAdminStatGrid stats={verticalStats} />
      </DelveAdminPanel>

      <div className="da-page__split">
        <DelveAdminPanel title="Recent activity">
          <DelveAdminActivityFeed items={activity} limit={8} title="" />
        </DelveAdminPanel>

        <DelveAdminPanel title="Pending verification" actionLabel="View all" actionTo="/admin/verifications">
          <DelveAdminMiniTable
            emptyMessage="No businesses awaiting verification."
            rows={pendingBiz.slice(0, 5).map((b) => ({
              id: b.id,
              primary: b.business_name,
              secondary: `@${b.owner_username} · ${b.city}`,
              badge: (
                <DelveAdminStatusBadge status={b.verification_status} variant={statusVariant(b.verification_status)} />
              ),
              action: (
                <Link to="/admin/verifications" className="da-link-btn">
                  Review
                </Link>
              ),
            }))}
          />
        </DelveAdminPanel>
      </div>

      <DelveAdminPanel title="Quick actions">
        <DelveAdminQuickActions
          actions={[
            { label: 'Review verifications', to: '/admin/verifications' },
            { label: 'Manage users', to: '/admin/users' },
            { label: 'All businesses', to: '/admin/businesses' },
            { label: 'All listings', to: '/admin/listings' },
            { label: 'Bookings', to: '/admin/bookings' },
            { label: 'Reports', to: '/admin/reports' },
            { label: 'Analytics', to: '/admin/analytics' },
            { label: 'Activity feed', to: '/admin/activity' },
            { label: 'Platform settings', to: '/admin/settings' },
          ]}
        />
      </DelveAdminPanel>
    </div>
  )
}
