import { useEffect, useState } from 'react'
import type { BusinessMemberRole, ProviderEarningsDto, ProviderFinancialReportDto } from '@delve/contracts'
import {
  downloadProviderEarningsCsv,
  fetchProviderEarnings,
  fetchProviderFinancialReport,
} from '../../api/paymentClient'
import { formatMoney } from '../../lib/formatMoney'
import ProviderDisputesView from './ProviderDisputesView'

export default function ProviderEarningsView({
  businessId,
  role,
}: {
  businessId: string
  role: BusinessMemberRole
}) {
  const canExport = role === 'OWNER' || role === 'MANAGER'
  const [tab, setTab] = useState<'overview' | 'transactions'>('overview')
  const [preset, setPreset] = useState('THIS_MONTH')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<ProviderEarningsDto | null>(null)
  const [report, setReport] = useState<ProviderFinancialReportDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchProviderEarnings(businessId)
      .then(row => {
        if (!cancelled) setData(row)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load earnings')
      })
    return () => {
      cancelled = true
    }
  }, [businessId])

  useEffect(() => {
    if (!canExport) return
    let cancelled = false
    void fetchProviderFinancialReport(businessId, { preset, from, to })
      .then(row => {
        if (!cancelled) setReport(row)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load report')
      })
    return () => {
      cancelled = true
    }
  }, [businessId, canExport, preset, from, to])

  const currency = data?.summary.currency || report?.byCurrency[0]?.currency || 'NAD'
  const periodRow = report?.byCurrency.find(r => r.currency === currency) || report?.byCurrency[0]

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <h1 className="font-display text-xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
        Earnings
      </h1>
      <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
        These figures are Delve settlement records. They are not a bank balance and not Stripe available cash.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" className="text-sm" onClick={() => setTab('overview')} style={{ opacity: tab === 'overview' ? 1 : 0.6 }}>
          Overview
        </button>
        <button type="button" className="text-sm" onClick={() => setTab('transactions')} style={{ opacity: tab === 'transactions' ? 1 : 0.6 }}>
          Transactions
        </button>
      </div>
      {canExport ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'LAST_7_DAYS', label: '7 days' },
            { id: 'LAST_30_DAYS', label: '30 days' },
            { id: 'THIS_MONTH', label: 'This month' },
            { id: 'CUSTOM', label: 'Custom' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              className="text-xs rounded-full px-3 py-1"
              style={{ border: '1px solid var(--border)', opacity: preset === opt.id ? 1 : 0.65 }}
              onClick={() => setPreset(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className="text-xs rounded-full px-3 py-1"
            style={{ border: '1px solid var(--border)' }}
            onClick={() => void downloadProviderEarningsCsv(businessId, { preset, from, to })}
          >
            Export
          </button>
        </div>
      ) : (
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
          Period reports and exports are available to owners and managers.
        </p>
      )}
      {preset === 'CUSTOM' && canExport ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm" />
        </div>
      ) : null}
      {error && (
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
      {tab === 'overview' ? (
        <>
          {periodRow ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Traveler booking value', value: periodRow.grossBookingValue },
                { label: 'Delve commission', value: periodRow.platformCommission },
                { label: 'Your net', value: periodRow.businessNet },
                { label: 'Pending', value: periodRow.pending },
                { label: 'Eligible', value: periodRow.eligible },
                { label: 'Transferred', value: periodRow.transferred },
                { label: 'Reversed', value: periodRow.reversed },
                { label: 'Refunded bookings', value: periodRow.refunded },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
                    {card.label}
                  </p>
                  <p className="text-lg font-bold m-0">{formatMoney(periodRow.currency, card.value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Pending earnings', value: data?.summary.pending ?? '0.00' },
                { label: 'Eligible for settlement', value: data?.summary.eligible ?? '0.00' },
                { label: 'Transferred', value: data?.summary.transferred ?? '0.00' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
                    {card.label}
                  </p>
                  <p className="text-lg font-bold m-0">{formatMoney(currency, card.value)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <ul className="list-none m-0 p-0 space-y-3">
          {data?.rows.map(row => (
            <li key={row.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold m-0">{row.listingTitle}</p>
              <p className="text-xs font-mono m-0 mt-1">Booking: {row.bookingReference}</p>
              <p className="text-xs m-0 mt-2">Traveler paid: {formatMoney(row.currency, row.grossAmount)}</p>
              <p className="text-xs m-0">Delve commission: {formatMoney(row.currency, row.platformCommissionAmount)}</p>
              <p className="text-xs m-0 font-semibold">Your amount: {formatMoney(row.currency, row.businessNetAmount)}</p>
              <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
                Status: {row.providerLabel}
              </p>
              {row.originallyTransferred ? (
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                  Originally transferred: {formatMoney(row.currency, row.originallyTransferred)}
                </p>
              ) : null}
              {row.reversedAmount ? (
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                  Settlement reversed: {formatMoney(row.currency, row.reversedAmount)}
                  {row.reversalStatus ? ` · ${row.reversalStatus}` : ''}
                </p>
              ) : null}
            </li>
          ))}
          {data && data.rows.length === 0 ? (
            <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
              No settlement records yet.
            </p>
          ) : null}
        </ul>
      )}
      <div className="mt-6">
        <ProviderDisputesView businessId={businessId} role={role} />
      </div>
    </div>
  )
}
