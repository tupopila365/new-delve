import { useEffect, useState } from 'react'
import type { BusinessMemberRole, ProviderEarningsDto } from '@delve/contracts'
import { fetchProviderEarnings } from '../../api/paymentClient'
import { formatMoney } from '../../lib/formatMoney'

export default function ProviderEarningsView({
  businessId,
}: {
  businessId: string
  role: BusinessMemberRole
}) {
  const [data, setData] = useState<ProviderEarningsDto | null>(null)
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

  const currency = data?.summary.currency || 'NAD'

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <h1 className="font-display text-xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
        Earnings
      </h1>
      <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
        These figures are Delve settlement records. They are not a bank balance and not Stripe available cash.
      </p>
      {error && (
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
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
    </div>
  )
}
