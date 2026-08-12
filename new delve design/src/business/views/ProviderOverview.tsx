import type { BusinessDashboardDto, BusinessDto, BusinessMembershipDto } from '@delve/contracts'
import { BarChart2, Calendar, List, Tag } from 'lucide-react'

function statusLabel(status: BusinessDto['status']) {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'PENDING_VERIFICATION':
      return 'Pending verification'
    case 'VERIFIED':
      return 'Verified'
    case 'REJECTED':
      return 'Rejected'
    case 'SUSPENDED':
      return 'Suspended'
    default:
      return status
  }
}

interface ProviderOverviewProps {
  dashboard: BusinessDashboardDto
  membership: BusinessMembershipDto
  onNavigate: (section: string) => void
  onViewPublicProfile?: (slug: string) => void
}

export default function ProviderOverview({
  dashboard,
  membership,
  onNavigate,
  onViewPublicProfile,
}: ProviderOverviewProps) {
  const business = membership.business
  const completion = dashboard.profileCompletionPercent

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto h-full">
      <div
        className="relative overflow-hidden rounded-2xl min-h-[160px]"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {business.coverUrl ? (
          <img src={business.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #2a2140, var(--primary))' }}
          />
        )}
        <div
          className="relative z-[1] flex items-end gap-4 px-4 py-5 sm:px-6"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', minHeight: 160 }}
        >
          <div
            className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: '#fff', border: '2px solid rgba(255,255,255,0.8)' }}
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                {business.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 pb-1 flex-1">
            <h1 className="font-display text-2xl font-extrabold m-0 text-white truncate">{business.name}</h1>
            <p className="text-sm m-0 mt-1 text-white/90">
              {statusLabel(business.status)} · {membership.role.replace('_', ' ')}
            </p>
            {business.status === 'VERIFIED' && onViewPublicProfile && (
              <button
                type="button"
                onClick={() => onViewPublicProfile(business.slug)}
                className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
              >
                View public profile
              </button>
            )}
          </div>
        </div>
      </div>

      {completion < 100 && (
        <div
          className="rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold m-0 mb-1.5" style={{ color: 'var(--fg)' }}>
              Profile · {completion}% complete
            </p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completion}%`, background: 'var(--primary)' }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white flex-shrink-0"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            Finish profile
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Listings', value: dashboard.listingCount, icon: List, section: 'listings' },
          { label: 'Deals', value: dashboard.dealCount, icon: Tag, section: 'deals' },
          { label: 'Posts', value: dashboard.postCount, icon: BarChart2, section: 'posts' },
          { label: 'Bookings', value: dashboard.bookingCount, icon: Calendar, section: 'bookings' },
        ].map(card => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigate(card.section)}
            className="rounded-2xl p-4 text-left active:scale-[0.99] transition-transform"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <card.icon size={16} style={{ color: 'var(--primary)', marginBottom: 10 }} />
            <p className="font-display text-2xl font-bold m-0" style={{ color: 'var(--fg)' }}>
              {card.value}
            </p>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
              {card.label}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div
          className="rounded-2xl px-4 py-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Bookings
          </h2>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Booking management will appear here once bookings are available. Current count:{' '}
            {dashboard.bookingCount}.
          </p>
        </div>
        <div
          className="rounded-2xl px-4 py-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Analytics
          </h2>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Performance charts and revenue insights are coming later. No placeholder metrics are shown.
          </p>
        </div>
      </div>
    </div>
  )
}
