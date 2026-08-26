import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type {
  AdminBusinessActivityDto,
  AdminBusinessDetail,
  AdminBusinessFinanceDto,
  AdminBusinessMember,
  BookingDto,
  DealDto,
} from '@delve/contracts'
import { adminListListings } from '../api/listings'
import {
  adminGetBusiness,
  adminGetBusinessActivity,
  adminGetBusinessFinance,
  adminListBusinessBookings,
  adminListBusinessDeals,
  adminListBusinessMembers,
  adminRefreshBusinessConnect,
  adminRejectBusinessVerification,
  adminVerifyBusiness,
} from '../api/businesses'
import { AdvertisedPrice } from '../components/admin/AdvertisedPrice'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminTable } from '../components/admin/AdminTable'
import { AttentionCard } from '../components/admin/AttentionCard'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { MetricCard } from '../components/admin/MetricCard'
import { Money } from '../components/admin/Money'
import { StatusBadge } from '../components/admin/StatusBadge'

const TABS = ['overview', 'members', 'listings', 'deals', 'bookings', 'finance'] as const
type Tab = (typeof TABS)[number]

export default function BusinessDetailPage() {
  const { businessId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [confirmVerify, setConfirmVerify] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      setDetail(await adminGetBusiness(businessId))
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) setNotFound(true)
      else setError(err instanceof Error ? err.message : 'Could not load this business.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [businessId])

  if (loading) return <LoadingSkeleton rows={6} />
  if (notFound) return <EmptyState title="Business not found" detail="This business id does not exist." />
  if (error) return <ErrorState title="Could not load this business." detail={error} onRetry={() => void load()} />
  if (!detail) return null

  return (
    <div>
      <AdminPageHeader
        title={detail.name}
        description={[detail.category, detail.city, detail.countryCode].filter(Boolean).join(' · ') || 'Marketplace business'}
        actions={
          <>
            {detail.canVerify && !confirmVerify ? (
              <button type="button" className="admin-btn" onClick={() => setConfirmVerify(true)}>Verify</button>
            ) : null}
            {detail.canRejectVerification ? (
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void adminRejectBusinessVerification(detail.id)
                    .then(setDetail)
                    .catch(err => setError(err instanceof Error ? err.message : 'Could not reject verification'))
                    .finally(() => setBusy(false))
                }}
              >
                Reject verification
              </button>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge>{detail.status}</StatusBadge>
        <StatusBadge>{detail.connect.label}</StatusBadge>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Created {new Date(detail.createdAt).toLocaleDateString()}</span>
      </div>
      {confirmVerify ? (
        <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold m-0">Verify {detail.name}?</p>
          <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            This business will become eligible for public marketplace features that require verified status. This does not mean Stripe payouts are ready.
          </p>
          <div className="flex gap-2 mt-3">
            <button type="button" className="admin-btn-secondary" onClick={() => setConfirmVerify(false)}>Cancel</button>
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void adminVerifyBusiness(detail.id)
                  .then(row => {
                    setDetail(row)
                    setConfirmVerify(false)
                  })
                  .catch(err => setError(err instanceof Error ? err.message : 'Could not verify business'))
                  .finally(() => setBusy(false))
              }}
            >
              Verify Business
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
              const next = new URLSearchParams(params)
              next.set('tab', id)
              setParams(next)
            }}
          >
            {id}
          </button>
        ))}
      </div>
      {tab === 'overview' ? <OverviewTab detail={detail} onConnect={async () => setDetail(await adminGetBusiness(detail.id))} /> : null}
      {tab === 'members' ? <MembersTab businessId={detail.id} /> : null}
      {tab === 'listings' ? <ListingsTab businessId={detail.id} /> : null}
      {tab === 'deals' ? <DealsTab businessId={detail.id} /> : null}
      {tab === 'bookings' ? <BookingsTab businessId={detail.id} /> : null}
      {tab === 'finance' ? <FinanceTab businessId={detail.id} /> : null}
    </div>
  )
}

function OverviewTab({ detail, onConnect }: { detail: AdminBusinessDetail; onConnect: () => Promise<void> }) {
  const [finance, setFinance] = useState<AdminBusinessFinanceDto | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void adminGetBusinessFinance(detail.id, new URLSearchParams({ preset: 'LAST_30_DAYS' })).then(setFinance).catch(() => setFinance(null))
  }, [detail.id])
  return (
    <div className="flex flex-col gap-5">
      {detail.attention.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {detail.attention.map(item => (
            <AttentionCard key={item.code} label={item.label} value={item.tone === 'critical' ? 'Needs attention' : 'Review'} tone={item.tone === 'info' ? 'default' : item.tone} />
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">About</h2>
        <p className="text-sm m-0">{detail.description || 'No description.'}</p>
        <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>{detail.address || 'No street address stored.'}</p>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Contact / public business data</h2>
        <p className="text-xs m-0">Website {detail.website || '—'}</p>
        <p className="text-xs m-0">Email {detail.email || '—'}</p>
        <p className="text-xs m-0">Phone {detail.phone || '—'}</p>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Marketplace summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Listings" value={detail.marketplace.listingCount} />
          <MetricCard label="Published listings" value={detail.marketplace.publishedListingCount} />
          <MetricCard label="Deals" value={detail.marketplace.dealCount} />
          <MetricCard label="Published deals" value={detail.marketplace.publishedDealCount} />
          <MetricCard label="Bookings" value={detail.marketplace.bookingCount} />
          <MetricCard label="Completed bookings" value={detail.marketplace.completedBookingCount} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Stripe Connect</h2>
        <p className="text-xs m-0">{detail.connect.label} · charges {detail.connect.chargesEnabled ? 'on' : 'off'} · payouts {detail.connect.payoutsEnabled ? 'on' : 'off'}</p>
        <button
          type="button"
          className="admin-btn-secondary mt-2"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void adminRefreshBusinessConnect(detail.id).then(() => onConnect()).finally(() => setBusy(false))
          }}
        >
          {busy ? 'Refreshing…' : 'Refresh Stripe status'}
        </button>
      </section>
      <section>
        <h2 className="text-sm font-semibold m-0 mb-2">Financial summary (last 30 days)</h2>
        <p className="text-xs m-0 mb-2" style={{ color: 'var(--muted)' }}>Currencies are shown separately. Delve commission is not profit.</p>
        {finance?.byCurrency.length ? finance.byCurrency.map(row => (
          <div key={row.currency} className="rounded-xl p-3 mb-2" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold m-0 mb-1">{row.currency}</p>
            <p className="text-xs m-0">Traveler payments <Money currency={row.currency} amount={row.grossPayments} /></p>
            <p className="text-xs m-0">Delve commission <Money currency={row.currency} amount={row.platformCommission} /></p>
            <p className="text-xs m-0">Business payable <Money currency={row.currency} amount={row.businessNetFromPaidPeriod} /></p>
            <p className="text-xs m-0">Transferred <Money currency={row.currency} amount={row.settlementsTransferred} /></p>
            <p className="text-xs m-0">Refunds <Money currency={row.currency} amount={row.refundsSucceeded} /></p>
            <p className="text-xs m-0">Disputed <Money currency={row.currency} amount={row.disputeAmountOpened} /></p>
            <p className="text-xs m-0">Recovery exposure <Money currency={row.currency} amount={row.unresolvedRecoveryExposure} /></p>
          </div>
        )) : <EmptyState title="No financial activity for this period." />}
      </section>
    </div>
  )
}

function MembersTab({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<AdminBusinessMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void adminListBusinessMembers(businessId).then(setRows).catch(err => setError(err instanceof Error ? err.message : 'Could not load members'))
  }, [businessId])
  if (error) return <ErrorState title="Could not load members." detail={error} />
  if (!rows) return <LoadingSkeleton />
  if (!rows.length) return <EmptyState title="No members found." />
  return (
    <AdminTable headers={['Identity', 'Role', 'Joined']}>
      {rows.map(row => (
        <tr key={row.id}>
          <td className="p-1">{row.displayName || row.username}<div className="text-xs" style={{ color: 'var(--muted)' }}>{row.email}</div></td>
          <td className="p-1"><StatusBadge>{row.role}</StatusBadge></td>
          <td className="p-1">{new Date(row.createdAt).toLocaleDateString()}</td>
        </tr>
      ))}
    </AdminTable>
  )
}

function ListingsTab({ businessId }: { businessId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Awaited<ReturnType<typeof adminListListings>> | null>(null)
  useEffect(() => {
    void adminListListings(new URLSearchParams({ businessId, page: '1', pageSize: '25' }))
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load listings'))
  }, [businessId])
  if (error) return <ErrorState title="Could not load listings." detail={error} />
  if (!items) return <LoadingSkeleton />
  if (!items.items.length) return <EmptyState title="This business has no listings yet." />
  return (
    <AdminTable headers={['Listing', 'Status', 'Price', 'Deals', 'Bookings']}>
      {items.items.map(row => (
        <tr key={row.id}>
          <td className="p-1"><Link to={`/listings/${row.id}`}>{row.title}</Link></td>
          <td className="p-1"><StatusBadge>{row.status}</StatusBadge></td>
          <td className="p-1"><AdvertisedPrice pricing={row.pricing} /></td>
          <td className="p-1">{row.dealCount}</td>
          <td className="p-1">{row.bookingCount}</td>
        </tr>
      ))}
    </AdminTable>
  )
}

function DealsTab({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<DealDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void adminListBusinessDeals(businessId, new URLSearchParams({ page: '1', pageSize: '25' }))
      .then(data => setRows(data.items))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load deals'))
  }, [businessId])
  if (error) return <ErrorState title="Could not load deals." detail={error} />
  if (!rows) return <LoadingSkeleton />
  if (!rows.length) return <EmptyState title="No deals found for this business." />
  return (
    <AdminTable headers={['Deal', 'Listing', 'Status', 'Discount', 'Featured']}>
      {rows.map(row => (
        <tr key={row.id}>
          <td className="p-1"><Link to="/deals">{row.title}</Link></td>
          <td className="p-1">{row.listing ? <Link to={`/listings/${row.listing.id}`}>{row.listing.title}</Link> : '—'}</td>
          <td className="p-1"><StatusBadge>{row.status}</StatusBadge></td>
          <td className="p-1">{row.discountSummary}</td>
          <td className="p-1">{row.featured ? 'Yes' : 'No'}</td>
        </tr>
      ))}
    </AdminTable>
  )
}

function BookingsTab({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<BookingDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void adminListBusinessBookings(businessId, new URLSearchParams({ page: '1', pageSize: '25' }))
      .then(data => setRows(data.items))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load bookings'))
  }, [businessId])
  if (error) return <ErrorState title="Could not load bookings." detail={error} />
  if (!rows) return <LoadingSkeleton />
  if (!rows.length) return <EmptyState title="No bookings found for this business." />
  return (
    <AdminTable headers={['Reference', 'Traveler', 'Listing', 'Status', 'Dates', 'Amount']}>
      {rows.map(row => (
        <tr key={row.id}>
          <td className="p-1 font-mono"><Link to="/bookings">{row.bookingReference}</Link></td>
          <td className="p-1">{row.traveler?.displayName || '—'}</td>
          <td className="p-1"><Link to={`/listings/${row.listingId}`}>{row.listing.title}</Link></td>
          <td className="p-1"><StatusBadge>{row.status}</StatusBadge></td>
          <td className="p-1">{row.startDateTime ? new Date(row.startDateTime).toLocaleDateString() : '—'}</td>
          <td className="p-1"><Money currency={row.pricing.currency} amount={row.pricing.finalAmount} /></td>
        </tr>
      ))}
    </AdminTable>
  )
}

function FinanceTab({ businessId }: { businessId: string }) {
  const [preset, setPreset] = useState('LAST_30_DAYS')
  const [finance, setFinance] = useState<AdminBusinessFinanceDto | null>(null)
  const [activity, setActivity] = useState<AdminBusinessActivityDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setError(null)
    void Promise.all([
      adminGetBusinessFinance(businessId, new URLSearchParams({ preset })),
      adminGetBusinessActivity(businessId),
    ])
      .then(([f, a]) => {
        setFinance(f)
        setActivity(a)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load finance'))
  }, [businessId, preset])
  if (error) return <ErrorState title="Could not load finance." detail={error} />
  if (!finance) return <LoadingSkeleton />
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH'].map(id => (
          <button key={id} type="button" className="admin-btn-secondary" onClick={() => setPreset(id)} style={{ opacity: preset === id ? 1 : 0.7 }}>{id.replace(/_/g, ' ')}</button>
        ))}
      </div>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Authoritative backend aggregates. Currencies are never combined. Delve platform commission is not profit.
      </p>
      {finance.byCurrency.length === 0 ? <EmptyState title="No financial activity for this period." /> : finance.byCurrency.map(row => (
        <div key={row.currency} className="rounded-xl p-3 mb-3" style={{ border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold m-0 mb-2">{row.currency}</p>
          <p className="text-xs m-0">Gross traveler payments <Money currency={row.currency} amount={row.grossPayments} /></p>
          <p className="text-xs m-0">Stripe fees {row.stripeProcessingFees == null || (row.stripeFeesUnknownCount > 0 && row.stripeFeesKnownCount === 0) ? 'Not reconciled' : <Money currency={row.currency} amount={row.stripeProcessingFees} />}</p>
          <p className="text-xs m-0">Delve platform commission <Money currency={row.currency} amount={row.platformCommission} /></p>
          <p className="text-xs m-0">Business net payable <Money currency={row.currency} amount={row.businessNetFromPaidPeriod} /></p>
          <p className="text-xs m-0">Pending settlement <Money currency={row.currency} amount={row.settlementsPending} /></p>
          <p className="text-xs m-0">Eligible settlement <Money currency={row.currency} amount={row.settlementsEligible} /></p>
          <p className="text-xs m-0">Transferred <Money currency={row.currency} amount={row.settlementsTransferred} /></p>
          <p className="text-xs m-0">Refunded <Money currency={row.currency} amount={row.refundsSucceeded} /></p>
          <p className="text-xs m-0">Disputed <Money currency={row.currency} amount={row.disputeAmountOpened} /></p>
          <p className="text-xs m-0">Recovery exposure <Money currency={row.currency} amount={row.unresolvedRecoveryExposure} /></p>
        </div>
      ))}
      <h3 className="text-sm font-bold m-0 mt-4 mb-2">Recent activity</h3>
      <ul className="list-none m-0 p-0 space-y-2">
        {activity?.items.map(item => (
          <li key={`${item.kind}-${item.id}`} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs m-0">{item.label} · {item.status} {item.amount && item.currency ? <Money currency={item.currency} amount={item.amount} /> : null}</p>
            {item.href ? <Link to={item.href} className="text-xs">Open related finance page</Link> : null}
          </li>
        ))}
        {activity && activity.items.length === 0 ? <EmptyState title="No financial activity for this period." /> : null}
      </ul>
    </div>
  )
}
