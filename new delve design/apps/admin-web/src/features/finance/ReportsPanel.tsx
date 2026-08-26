import { useEffect, useState } from 'react'
import type {
  BusinessPerformanceRow,
  CurrencyFinancialSummary,
  FinancialTrendDto,
  PaginatedBookingFinancialReportDto,
  PlatformFinancialReportDto,
} from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'
import { moneyLabel, moneyOrUnknown } from '../../lib/money'

function reportQuery(preset: string, currency: string, from: string, to: string) {
  const params = new URLSearchParams({ preset })
  if (currency !== 'ALL') params.set('currency', currency)
  if (preset === 'CUSTOM') {
    params.set('from', from)
    params.set('to', to)
  }
  return params.toString()
}

function MiniTrend({ points, currency, field }: { points: FinancialTrendDto['points']; currency: string; field: 'grossPayments' | 'platformCommission' | 'refundsSucceeded' | 'settlementsTransferred' }) {
  const series = points.filter(p => p.currency === currency)
  const max = Math.max(...series.map(p => Number(p[field])), 1)
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {series.map(p => (
        <div
          key={`${p.date}-${field}`}
          title={`${p.date} ${p[field]}`}
          style={{
            flex: 1,
            height: `${Math.max(4, (Number(p[field]) / max) * 100)}%`,
            background: 'var(--accent, #8C52FF)',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}

export default function ReportsPanel() {
  const [preset, setPreset] = useState('LAST_30_DAYS')
  const [currency, setCurrency] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<PlatformFinancialReportDto | null>(null)
  const [trend, setTrend] = useState<FinancialTrendDto | null>(null)
  const [businesses, setBusinesses] = useState<BusinessPerformanceRow[]>([])
  const [bookings, setBookings] = useState<PaginatedBookingFinancialReportDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const qs = reportQuery(preset, currency, from, to)

  async function load() {
    setError(null)
    try {
      const [s, t, b, bk] = await Promise.all([
        adminFetch(`/admin/reports/summary?${qs}`),
        adminFetch(`/admin/reports/trend?${qs}`),
        adminFetch(`/admin/reports/businesses?${qs}`),
        adminFetch(`/admin/reports/bookings?${qs}&page=${page}&pageSize=25`),
      ])
      const sBody = (await s.json()) as { success: boolean; data?: PlatformFinancialReportDto; error?: { message?: string } }
      const tBody = (await t.json()) as { success: boolean; data?: FinancialTrendDto }
      const bBody = (await b.json()) as { success: boolean; data?: BusinessPerformanceRow[] }
      const bkBody = (await bk.json()) as { success: boolean; data?: PaginatedBookingFinancialReportDto }
      if (!s.ok || !sBody.success || !sBody.data) throw new Error(sBody.error?.message || 'Could not load reports')
      setSummary(sBody.data)
      setTrend(tBody.data || null)
      setBusinesses(bBody.data || [])
      setBookings(bkBody.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, page])

  async function exportKind(kind: string) {
    const res = await adminFetch(`/admin/reports/export/${kind}?${qs}`)
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delve-${kind}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currencies = summary ? ['ALL', ...summary.byCurrency.map(r => r.currency)] : ['ALL']
  const cards: CurrencyFinancialSummary[] = summary?.byCurrency || []
  const chartCurrency = currency === 'ALL' ? cards[0]?.currency : currency

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Reports</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Operational marketplace reporting from persisted financial records. Currencies are never combined. This page
        does not move money. Net marketplace revenue is before operating expenses and is not profit.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'].map(id => (
          <button key={id} type="button" className="admin-btn-secondary" onClick={() => setPreset(id)} style={{ opacity: preset === id ? 1 : 0.7 }}>
            {id.replace(/_/g, ' ')}
          </button>
        ))}
        <select value={currency} onChange={e => setCurrency(e.target.value)} className="text-sm">
          {currencies.map(code => (
            <option key={code} value={code}>
              {code === 'ALL' ? 'All currencies' : code}
            </option>
          ))}
        </select>
      </div>
      {preset === 'CUSTOM' ? (
        <div className="flex gap-2 mb-3">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      ) : null}
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      {summary && summary.unmatchedOpenCount > 0 ? (
        <p className="text-sm m-0 mb-3" style={{ color: '#ffb4b4' }}>
          {summary.unmatchedOpenCount} unmatched Stripe financial events require review.
        </p>
      ) : null}
      {summary && summary.openCriticalReconciliationIssueCount > 0 ? (
        <p className="text-xs m-0 mb-3">Needs financial review: {summary.openCriticalReconciliationIssueCount} open critical issues.</p>
      ) : null}
      {summary?.stripePlatformBalance?.length ? (
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
          Stripe platform balance (operational, not Delve ledger):{' '}
          {summary.stripePlatformBalance.map(b => `${b.currency} available ${b.available} / pending ${b.pending}`).join(' · ')}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {cards.map(row => (
          <div key={row.currency} className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold m-0 mb-2">{row.currency}</p>
            <p className="text-xs m-0">Gross traveler payments {moneyLabel(row.currency, row.grossPayments)} ({row.successfulPaymentCount})</p>
            <p className="text-xs m-0">Delve commission {moneyLabel(row.currency, row.platformCommission)}</p>
            <p className="text-xs m-0">Stripe fees {moneyOrUnknown(row.currency, row.stripeProcessingFees, row.stripeFeesUnknownCount > 0 && row.stripeFeesKnownCount === 0)}</p>
            {row.stripeFeesUnknownCount > 0 ? <p className="text-xs m-0">{row.stripeFeesUnknownCount} payments not reconciled for fees</p> : null}
            <p className="text-xs m-0">Business settlements transferred {moneyLabel(row.currency, row.settlementsTransferred)}</p>
            <p className="text-xs m-0">Outstanding to settle {moneyLabel(row.currency, row.outstandingBusinessAmount)}</p>
            <p className="text-xs m-0">Refunds succeeded {moneyLabel(row.currency, row.refundsSucceeded)}</p>
            <p className="text-xs m-0">Unresolved financial exposure {moneyLabel(row.currency, row.unresolvedRecoveryExposure)} ({row.unresolvedRecoveryCaseCount} cases)</p>
            <p className="text-xs m-0">
              Net marketplace revenue before operating expenses{' '}
              {row.marketplaceContributionComplete && row.marketplaceContributionBeforeOperatingExpenses
                ? moneyLabel(row.currency, row.marketplaceContributionBeforeOperatingExpenses)
                : 'incomplete (unknown Stripe fees)'}
            </p>
          </div>
        ))}
      </div>
      {chartCurrency && trend ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {(['grossPayments', 'platformCommission', 'refundsSucceeded', 'settlementsTransferred'] as const).map(field => (
            <div key={field} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
              <p className="text-xs m-0 mb-2">{field} · {chartCurrency}</p>
              <MiniTrend points={trend.points} currency={chartCurrency} field={field} />
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-4">
        {['payments', 'settlements', 'refunds', 'disputes', 'businesses', 'bookings'].map(kind => (
          <button key={kind} type="button" className="admin-btn-secondary" onClick={() => void exportKind(kind)}>
            Export {kind} CSV
          </button>
        ))}
      </div>
      <h3 className="text-sm font-bold m-0 mb-2">Business performance</h3>
      <div className="overflow-x-auto mb-4">
        <table className="text-xs w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Business', 'Currency', 'Gross', 'Bookings', 'Commission', 'Net', 'Transferred', 'Pending', 'Refunds', 'Disputes', 'Exposure'].map(h => (
                <th key={h} className="text-left p-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map(row => (
              <tr key={`${row.businessId}-${row.currency}`}>
                <td className="p-1">{row.businessName}</td>
                <td className="p-1">{row.currency}</td>
                <td className="p-1">{row.grossBookingValue}</td>
                <td className="p-1">{row.bookingCount}</td>
                <td className="p-1">{row.platformCommission}</td>
                <td className="p-1">{row.businessNet}</td>
                <td className="p-1">{row.transferred}</td>
                <td className="p-1">{row.pending}</td>
                <td className="p-1">{row.refundAmount}</td>
                <td className="p-1">{row.disputeAmount}</td>
                <td className="p-1">{row.unresolvedRecoveryExposure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="text-sm font-bold m-0 mb-2">Booking financial report</h3>
      <div className="overflow-x-auto">
        <table className="text-xs w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Reference', 'Business', 'Traveler', 'Gross', 'Fee', 'Commission', 'Net', 'Payment', 'Settlement', 'Refund', 'Dispute'].map(h => (
                <th key={h} className="text-left p-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings?.rows.map(row => (
              <tr key={row.bookingId}>
                <td className="p-1 font-mono">{row.bookingReference}{row.needsFinancialReview ? ' · review' : ''}</td>
                <td className="p-1">{row.businessName}</td>
                <td className="p-1">{row.travelerUsername || '—'}</td>
                <td className="p-1">{row.grossAmount} {row.currency}</td>
                <td className="p-1">{row.stripeFeeUnknown ? '—' : row.stripeFeeAmount}</td>
                <td className="p-1">{row.platformCommissionAmount}</td>
                <td className="p-1">{row.businessNetAmount}</td>
                <td className="p-1">{row.paymentStatus}</td>
                <td className="p-1">{row.settlementStatus}</td>
                <td className="p-1">{row.refundAmount}</td>
                <td className="p-1">{row.disputeStatus || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bookings && bookings.total > bookings.pageSize ? (
        <div className="flex gap-2 mt-2">
          <button type="button" className="admin-btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button type="button" className="admin-btn-secondary" disabled={page * bookings.pageSize >= bookings.total} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      ) : null}
    </section>
  )
}
