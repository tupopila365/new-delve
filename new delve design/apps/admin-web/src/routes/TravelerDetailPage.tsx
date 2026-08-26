import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type {
  AdminTravelerActivityDto,
  AdminTravelerClaimListDto,
  AdminTravelerCommunityListDto,
  AdminTravelerDetail,
  AdminTravelerEventListDto,
  AdminTravelerFinancialDto,
  AdminTravelerJourneyListDto,
  BookingDto,
} from '@delve/contracts'
import {
  adminGetTraveler,
  adminGetTravelerActivity,
  adminGetTravelerFinancial,
  adminListTravelerBookings,
  adminListTravelerClaims,
  adminListTravelerCommunities,
  adminListTravelerEvents,
  adminListTravelerJourneys,
  adminRestoreTraveler,
  adminRestrictTraveler,
} from '../api/travelers'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { AttentionCard } from '../components/admin/AttentionCard'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { MetricCard } from '../components/admin/MetricCard'
import { Money } from '../components/admin/Money'
import { StatusBadge } from '../components/admin/StatusBadge'

const TABS = ['overview', 'bookings', 'claims', 'journeys', 'events', 'communities', 'activity', 'financial'] as const
type Tab = (typeof TABS)[number]

function usePager() {
  const [params, setParams] = useSearchParams()
  const page = params.get('page') || '1'
  const pageSize = params.get('pageSize') || '25'
  function setPage(next: string) {
    const copy = new URLSearchParams(params)
    copy.set('page', next)
    setParams(copy)
  }
  function setPageSize(next: string) {
    const copy = new URLSearchParams(params)
    copy.set('pageSize', next)
    copy.set('page', '1')
    setParams(copy)
  }
  return { params, setParams, page, pageSize, setPage, setPageSize }
}

function Pager({
  hasPrevious,
  hasNext,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  hasPrevious: boolean
  hasNext: boolean
  page: string
  pageSize: string
  onPage: (page: string) => void
  onPageSize: (size: string) => void
}) {
  return (
    <div className="flex gap-2 mt-3">
      <button type="button" className="admin-btn-secondary" disabled={!hasPrevious} onClick={() => onPage(String(Number(page) - 1))}>
        Previous
      </button>
      <button type="button" className="admin-btn-secondary" disabled={!hasNext} onClick={() => onPage(String(Number(page) + 1))}>
        Next
      </button>
      <select className="admin-input" style={{ maxWidth: 100 }} value={pageSize} onChange={e => onPageSize(e.target.value)}>
        {['25', '50', '100'].map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function TravelerDetailPage() {
  const { userId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab
  const [detail, setDetail] = useState<AdminTravelerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [confirmRestrict, setConfirmRestrict] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      setDetail(await adminGetTraveler(userId))
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) setNotFound(true)
      else setError(err instanceof Error ? err.message : 'Could not load this traveler.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [userId])

  if (loading) return <LoadingSkeleton rows={6} />
  if (notFound) return <EmptyState title="Traveler not found" detail="This traveler id does not exist." />
  if (error) return <ErrorState title="Could not load this traveler." detail={error} onRetry={() => void load()} />
  if (!detail) return null

  return (
    <div>
      <AdminPageHeader
        title={detail.displayName || detail.username}
        description={[detail.username, detail.email, [detail.homeCity, detail.homeCountryCode].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        actions={
          <>
            {detail.canRestrict && !confirmRestrict ? (
              <button type="button" className="admin-btn" onClick={() => setConfirmRestrict(true)}>
                Restrict Account
              </button>
            ) : null}
            {detail.canRestore ? (
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void adminRestoreTraveler(detail.id)
                    .then(setDetail)
                    .catch(err => setError(err instanceof Error ? err.message : 'Could not restore account'))
                    .finally(() => setBusy(false))
                }}
              >
                Restore Account
              </button>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge>{detail.accountStatus}</StatusBadge>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          Joined {new Date(detail.createdAt).toLocaleDateString()}
        </span>
      </div>
      {confirmRestrict ? (
        <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold m-0">Restrict this traveler account?</p>
          <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            This prevents sign-in and blocks protected Delve API access such as bookings, claims, listings, and payments.
            Existing bookings, claims, payments, refunds, and disputes are preserved. Active sessions will be revoked.
          </p>
          <div className="flex gap-2 mt-3">
            <button type="button" className="admin-btn-secondary" onClick={() => setConfirmRestrict(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void adminRestrictTraveler(detail.id)
                  .then(row => {
                    setDetail(row)
                    setConfirmRestrict(false)
                  })
                  .catch(err => setError(err instanceof Error ? err.message : 'Could not restrict account'))
                  .finally(() => setBusy(false))
              }}
            >
              Restrict Account
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            style={{ opacity: tab === id ? 1 : 0.7, textTransform: 'capitalize' }}
            onClick={() => {
              const next = new URLSearchParams()
              next.set('tab', id)
              next.set('page', '1')
              next.set('pageSize', params.get('pageSize') || '25')
              setParams(next)
            }}
          >
            {id}
          </button>
        ))}
      </div>
      {tab === 'overview' ? <OverviewTab detail={detail} /> : null}
      {tab === 'bookings' ? <BookingsTab userId={detail.id} /> : null}
      {tab === 'claims' ? <ClaimsTab userId={detail.id} /> : null}
      {tab === 'journeys' ? <JourneysTab userId={detail.id} /> : null}
      {tab === 'events' ? <EventsTab userId={detail.id} /> : null}
      {tab === 'communities' ? <CommunitiesTab userId={detail.id} /> : null}
      {tab === 'activity' ? <ActivityTab userId={detail.id} /> : null}
      {tab === 'financial' ? <FinancialTab userId={detail.id} /> : null}
    </div>
  )
}

function OverviewTab({ detail }: { detail: AdminTravelerDetail }) {
  return (
    <div className="flex flex-col gap-5">
      {detail.attention.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {detail.attention.map(item => (
            <AttentionCard
              key={item.code}
              label={item.label}
              value={item.tone === 'critical' ? 'Needs attention' : 'Review'}
              tone={item.tone === 'info' ? 'default' : item.tone}
            />
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Profile</h2>
        <div className="flex gap-3 items-start">
          {detail.avatarUrl ? (
            <img src={detail.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: 12, objectFit: 'cover' }} />
          ) : null}
          <div>
            <p className="text-sm m-0">{detail.displayName || detail.username}</p>
            <p className="text-xs m-0">@{detail.username}</p>
            <p className="text-xs m-0 mt-2">{detail.bio || 'No bio.'}</p>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
              {[detail.homeCity, detail.homeCountryCode].filter(Boolean).join(', ') || 'No location'} · language {detail.preferredLanguage}
            </p>
          </div>
        </div>
        {detail.coverUrl ? (
          <img src={detail.coverUrl} alt="" className="mt-3" style={{ maxHeight: 140, width: '100%', objectFit: 'cover', borderRadius: 12 }} />
        ) : null}
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Account</h2>
        <p className="text-xs m-0">Status {detail.accountStatus.replace(/_/g, ' ')}</p>
        <p className="text-xs m-0">Role {detail.role}</p>
        <p className="text-xs m-0">Email verified {detail.emailVerified ? 'yes' : 'no'}</p>
        <p className="text-xs m-0">Last seen {detail.lastSeenAt ? new Date(detail.lastSeenAt).toLocaleString() : '—'}</p>
        <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>
          Login and device session tokens are not shown. Restricting an account revokes active sessions without exposing them.
        </p>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Marketplace summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Bookings" value={detail.marketplace.bookingCount} />
          <MetricCard label="Completed bookings" value={detail.marketplace.completedBookingCount} />
          <MetricCard label="Deal claims" value={detail.marketplace.claimCount} />
          <MetricCard label="Redeemed claims" value={detail.marketplace.redeemedClaimCount} />
          <MetricCard label="Journeys" value={detail.marketplace.journeyCount} />
          <MetricCard label="Events created" value={detail.marketplace.eventCreatedCount} />
          <MetricCard label="Events attending" value={detail.marketplace.eventAttendingCount} />
          <MetricCard label="Communities" value={detail.marketplace.communityCount} />
          <MetricCard label="Posts" value={detail.marketplace.postCount} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Trust & Safety</h2>
        <p className="text-xs m-0">Open reports against authored content: {detail.safety.openReportsAgainstContent}</p>
        <p className="text-xs m-0">Hidden or removed content: {detail.safety.removedContentCount}</p>
        <p className="text-xs m-0">Resolved reports against content: {detail.safety.resolvedReportCount}</p>
        <p className="text-xs m-0 mt-2">
          <Link to={`/moderation/reports?q=${encodeURIComponent(detail.username)}`}>View moderation history</Link>
        </p>
        <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>
          Reporter identities are not shown here. Removing content does not restrict this account.
        </p>
      </section>
    </div>
  )
}

function BookingsTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<{ items: BookingDto[]; hasNext: boolean; hasPrevious: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminListTravelerBookings(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load bookings'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load bookings." detail={error} />
  if (!data) return <LoadingSkeleton />
  if (!data.items.length) return <EmptyState title="No bookings for this traveler." />
  return (
    <>
      <AdminTable headers={['Reference', 'Business', 'Listing', 'Dates', 'Amount', 'Status', 'Payment', 'Deal', '']}>
        {data.items.map(row => (
          <tr key={row.id}>
            <td className="p-1 font-mono">{row.bookingReference}</td>
            <td className="p-1">
              <Link to={`/businesses/${row.business.id}`}>{row.business.name}</Link>
            </td>
            <td className="p-1">
              <Link to={`/listings/${row.listing.id}`}>{row.listing.title}</Link>
            </td>
            <td className="p-1">
              {row.startDateTime ? new Date(row.startDateTime).toLocaleDateString() : '—'}
              {row.endDateTime ? ` – ${new Date(row.endDateTime).toLocaleDateString()}` : ''}
            </td>
            <td className="p-1">
              <Money currency={row.pricing.currency} amount={row.pricing.finalAmount} />
            </td>
            <td className="p-1">
              <StatusBadge>{row.status}</StatusBadge>
            </td>
            <td className="p-1">{row.payment.status || '—'}</td>
            <td className="p-1">{row.dealId ? <Link to="/deals">Deal used</Link> : '—'}</td>
            <td className="p-1">
              <Link to={`/bookings/${row.id}`}>Open booking</Link>
            </td>
          </tr>
        ))}
      </AdminTable>
      <Pager hasPrevious={data.hasPrevious} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}

function ClaimsTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerClaimListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminListTravelerClaims(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load claims'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load claims." detail={error} />
  if (!data) return <LoadingSkeleton />
  if (!data.items.length) return <EmptyState title="No deal claims for this traveler." />
  return (
    <>
      <AdminTable headers={['Code', 'Deal', 'Business', 'Status', 'Claimed', 'Redeemed', 'Snapshot', 'Booking']}>
        {data.items.map(row => (
          <tr key={row.id}>
            <td className="p-1 font-mono">{row.code}</td>
            <td className="p-1">
              <Link to="/deals">{row.titleSnapshot || row.dealTitle}</Link>
            </td>
            <td className="p-1">
              {row.businessId ? <Link to={`/businesses/${row.businessId}`}>{row.businessName}</Link> : '—'}
            </td>
            <td className="p-1">
              <StatusBadge>{row.status}</StatusBadge>
            </td>
            <td className="p-1">{new Date(row.claimedAt).toLocaleDateString()}</td>
            <td className="p-1">{row.redeemedAt ? new Date(row.redeemedAt).toLocaleDateString() : '—'}</td>
            <td className="p-1">
              <div>Original {row.originalPriceSnapshot ? <Money currency={row.currencySnapshot} amount={row.originalPriceSnapshot} /> : '—'}</div>
              <div>Deal {row.dealPriceSnapshot ? <Money currency={row.currencySnapshot} amount={row.dealPriceSnapshot} /> : '—'}</div>
              <div>Saving {row.savingAmountSnapshot ? <Money currency={row.currencySnapshot} amount={row.savingAmountSnapshot} /> : '—'}</div>
              <div style={{ color: 'var(--muted)' }}>{row.discountSummarySnapshot}</div>
            </td>
            <td className="p-1">
              {row.bookingId ? <Link to={`/bookings/${row.bookingId}`}>{row.bookingReference}</Link> : '—'}
            </td>
          </tr>
        ))}
      </AdminTable>
      <Pager hasPrevious={data.hasPrevious} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}

function JourneysTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerJourneyListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminListTravelerJourneys(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load journeys'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load journeys." detail={error} />
  if (!data) return <LoadingSkeleton />
  if (!data.items.length) return <EmptyState title="No journeys authored by this traveler." />
  return (
    <>
      <p className="text-xs m-0 mb-2" style={{ color: 'var(--muted)' }}>
        Owned journeys only. There is no collaborative journey membership model in the current domain.
      </p>
      <AdminTable headers={['Journey', 'Destination', 'Dates', 'Privacy', 'Stops', 'Linked bookings']}>
        {data.items.map(row => (
          <tr key={row.id}>
            <td className="p-1 font-semibold">{row.title}</td>
            <td className="p-1">
              {row.startPlace} → {row.endPlace}
            </td>
            <td className="p-1">
              {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'}
              {row.endDate ? ` – ${new Date(row.endDate).toLocaleDateString()}` : ''}
            </td>
            <td className="p-1">
              <StatusBadge>{row.visibility}</StatusBadge>
            </td>
            <td className="p-1">{row.stopCount}</td>
            <td className="p-1">{row.linkedBookingCount}</td>
          </tr>
        ))}
      </AdminTable>
      <Pager hasPrevious={data.hasPrevious} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}

function EventsTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerEventListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminListTravelerEvents(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load events'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load events." detail={error} />
  if (!data) return <LoadingSkeleton />
  if (!data.items.length) return <EmptyState title="No created or attending events." />
  return (
    <>
      <AdminTable headers={['Event', 'Relation', 'Status', 'Location', 'Date']}>
        {data.items.map(row => (
          <tr key={`${row.id}-${row.relation}`}>
            <td className="p-1 font-semibold">{row.title}</td>
            <td className="p-1">
              <StatusBadge>{row.relation}</StatusBadge>
            </td>
            <td className="p-1">
              <StatusBadge>{row.status}</StatusBadge>
            </td>
            <td className="p-1">{[row.locationName, row.city].filter(Boolean).join(', ') || '—'}</td>
            <td className="p-1">{new Date(row.startAt).toLocaleString()}</td>
          </tr>
        ))}
      </AdminTable>
      <Pager hasPrevious={data.hasPrevious} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}

function CommunitiesTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerCommunityListDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminListTravelerCommunities(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load communities'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load communities." detail={error} />
  if (!data) return <LoadingSkeleton />
  if (!data.items.length) return <EmptyState title="This traveler has not joined any communities." />
  return (
    <>
      <AdminTable headers={['Community', 'Role', 'Membership', 'Joined']}>
        {data.items.map(row => (
          <tr key={row.id}>
            <td className="p-1 font-semibold">{row.name}</td>
            <td className="p-1">
              <StatusBadge>{row.role}</StatusBadge>
            </td>
            <td className="p-1">
              <StatusBadge>{row.membershipStatus}</StatusBadge>
            </td>
            <td className="p-1">{new Date(row.joinedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </AdminTable>
      <Pager hasPrevious={data.hasPrevious} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}

function ActivityTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerActivityDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminGetTravelerActivity(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load activity'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load activity." detail={error} />
  if (!data) return <LoadingSkeleton />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Public posts" value={data.posts.total} />
        <MetricCard label="Comments" value={data.commentCount} />
        <MetricCard label="Saves" value={data.saveCount} />
        <MetricCard label="Following / followers" value={`${data.followingCount} / ${data.followerCount}`} />
      </div>
      <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
        Public Delvers posts only. Private messages are not available in Traveler Admin.
      </p>
      {!data.posts.items.length ? (
        <EmptyState title="No public posts." />
      ) : (
        <>
          <AdminTable headers={['Preview', 'Created', 'Media', 'Reactions', 'Comments']}>
            {data.posts.items.map(row => (
              <tr key={row.id}>
                <td className="p-1">{row.captionPreview || '—'}</td>
                <td className="p-1">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-1">{row.mediaCount}</td>
                <td className="p-1">{row.reactionCount}</td>
                <td className="p-1">{row.commentCount}</td>
              </tr>
            ))}
          </AdminTable>
          <Pager
            hasPrevious={data.posts.hasPrevious}
            hasNext={data.posts.hasNext}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </>
      )}
    </div>
  )
}

function FinancialTab({ userId }: { userId: string }) {
  const { page, pageSize, setPage, setPageSize } = usePager()
  const [data, setData] = useState<AdminTravelerFinancialDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    void adminGetTravelerFinancial(userId, new URLSearchParams({ page, pageSize }))
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load financial records'))
  }, [userId, page, pageSize])
  if (error) return <ErrorState title="Could not load financial records." detail={error} />
  if (!data) return <LoadingSkeleton />
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
        Traveler payments, refunds, and disputes only. Business settlement amounts are not included.
      </p>
      {data.byCurrency.length ? (
        data.byCurrency.map(row => (
          <div key={row.currency} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold m-0 mb-1">{row.currency}</p>
            <p className="text-xs m-0">
              Payments <Money currency={row.currency} amount={row.paymentsPaid} /> ({row.paymentCount})
            </p>
            <p className="text-xs m-0">
              Refunds <Money currency={row.currency} amount={row.refundsSucceeded} /> ({row.refundCount})
            </p>
            <p className="text-xs m-0">
              Open disputes <Money currency={row.currency} amount={row.disputesOpenAmount} /> ({row.openDisputeCount})
            </p>
          </div>
        ))
      ) : (
        <EmptyState title="No traveler financial activity." />
      )}
      <h2 className="text-sm font-semibold m-0">Payments</h2>
      {data.payments.length ? (
        <AdminTable headers={['Booking', 'Amount', 'Status', 'Paid', 'Dispute', '']}>
          {data.payments.map(row => (
            <tr key={row.id}>
              <td className="p-1">
                <Link to={`/bookings/${row.bookingId}`}>{row.bookingReference}</Link>
              </td>
              <td className="p-1">
                <Money currency={row.currency} amount={row.amount} />
              </td>
              <td className="p-1">
                <StatusBadge>{row.status}</StatusBadge>
              </td>
              <td className="p-1">{row.paidAt ? new Date(row.paidAt).toLocaleString() : '—'}</td>
              <td className="p-1">{row.hasOpenDispute ? 'Open' : '—'}</td>
              <td className="p-1">
                <Link to="/payments">Payments</Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState title="No payments." />
      )}
      <h2 className="text-sm font-semibold m-0">Refunds</h2>
      {data.refunds.length ? (
        <AdminTable headers={['Booking', 'Amount', 'Status', 'Reason', 'Requested', 'Succeeded', '']}>
          {data.refunds.map(row => (
            <tr key={row.id}>
              <td className="p-1">
                {row.bookingId ? <Link to={`/bookings/${row.bookingId}`}>{row.bookingReference}</Link> : '—'}
              </td>
              <td className="p-1">
                <Money currency={row.currency} amount={row.amount} />
              </td>
              <td className="p-1">
                <StatusBadge>{row.status}</StatusBadge>
              </td>
              <td className="p-1">{row.reason || '—'}</td>
              <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
              <td className="p-1">{row.succeededAt ? new Date(row.succeededAt).toLocaleDateString() : '—'}</td>
              <td className="p-1">
                <Link to="/payments/refunds">Open Refund in Finance</Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState title="No refunds." />
      )}
      <h2 className="text-sm font-semibold m-0">Disputes</h2>
      {data.disputes.length ? (
        <AdminTable headers={['Booking', 'Amount', 'Status', 'Evidence due', '']}>
          {data.disputes.map(row => (
            <tr key={row.id}>
              <td className="p-1">{row.bookingReference || '—'}</td>
              <td className="p-1">
                <Money currency={row.currency} amount={row.amount} />
              </td>
              <td className="p-1">
                <StatusBadge>{row.status}</StatusBadge>
              </td>
              <td className="p-1">{row.evidenceDueAt ? new Date(row.evidenceDueAt).toLocaleString() : '—'}</td>
              <td className="p-1">
                <Link to="/payments/disputes">Open Dispute</Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState title="No payment disputes." />
      )}
      <Pager hasPrevious={page !== '1'} hasNext={data.hasNext} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
    </div>
  )
}
