import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BusinessPayableDto } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'
import { moneyLabel } from '../../lib/money'
import { BookingFinancialTimeline } from './BookingFinancialTimeline'

export default function SettlementsPanel() {
  const tabs = ['ELIGIBLE', 'PENDING', 'PROCESSING', 'TRANSFERRED', 'REVERSED', 'BLOCKED'] as const
  const [tab, setTab] = useState<(typeof tabs)[number]>('ELIGIBLE')
  const [rows, setRows] = useState<BusinessPayableDto[]>([])
  const [selected, setSelected] = useState<BusinessPayableDto | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadList() {
    const res = await adminFetch(`/admin/settlements?status=${encodeURIComponent(tab)}`)
    const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto[]; error?: { message?: string } }
    if (!res.ok || !body.success) throw new Error(body.error?.message || 'Could not load settlements')
    setRows(body.data || [])
  }

  async function loadDetail(id: string) {
    const res = await adminFetch(`/admin/settlements/${encodeURIComponent(id)}`)
    const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto; error?: { message?: string } }
    if (!res.ok || !body.success || !body.data) throw new Error(body.error?.message || 'Could not load settlement')
    setSelected(body.data)
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void loadList()
      .then(() => {
        if (cancelled) return
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settlements')
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  async function release() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await adminFetch(`/admin/settlements/${encodeURIComponent(selected.id)}/release`, {
        method: 'POST',
        body: '{}',
      })
      const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto; error?: { message?: string } }
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Release failed')
      setConfirm(false)
      if (body.data) setSelected(body.data)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Settlements</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Traveler payment is already collected. Settlement is a Stripe Transfer to the connected account — not a bank
        payout.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {tabs.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setSelected(null)
              setConfirm(false)
              setTab(id)
            }}
            style={{ opacity: tab === id ? 1 : 0.7, minHeight: 36 }}
          >
            {id.charAt(0) + id.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      <ul className="list-none m-0 p-0 space-y-2">
        {rows.map(row => (
          <li key={row.id}>
            <button
              type="button"
              className="w-full text-left rounded-xl p-3"
              style={{
                border: selected?.id === row.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: 'var(--surface)',
              }}
              onClick={() => {
                setConfirm(false)
                void loadDetail(row.id).catch(err => setError(err instanceof Error ? err.message : 'Could not load'))
              }}
            >
              <p className="text-xs font-mono m-0">{row.booking.bookingReference}</p>
              <p className="text-sm font-semibold m-0"><Link to={`/businesses/${row.business.id}`}>{row.business.name}</Link> · {row.status}</p>
              <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                Traveler {moneyLabel(row.currency, row.grossAmount)} · Commission{' '}
                {moneyLabel(row.currency, row.platformCommissionAmount)} · Business{' '}
                {moneyLabel(row.currency, row.businessNetAmount)}
              </p>
              <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                Booking {row.booking.status} · Payment {row.payment.status} · {row.eligibility.reason}
              </p>
            </button>
          </li>
        ))}
        {rows.length === 0 && !error ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No settlements in this section.</p> : null}
      </ul>
      {selected ? (
        <div className="rounded-xl p-4 mt-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold m-0 mb-2">Settlement detail</h3>
          <p className="text-xs m-0">Business: {selected.business.name}</p>
          <p className="text-xs m-0">Connect: {selected.business.stripeAccountStatus} · payouts {selected.business.payoutsEnabled ? 'on' : 'off'}</p>
          <p className="text-xs m-0">Booking: {selected.booking.bookingReference} · {selected.booking.status}</p>
          <p className="text-xs m-0">Payment: {selected.payment.status} · {moneyLabel(selected.currency, selected.payment.amount)}</p>
          <p className="text-xs m-0">Gross {moneyLabel(selected.currency, selected.grossAmount)}</p>
          <p className="text-xs m-0">Delve commission {moneyLabel(selected.currency, selected.platformCommissionAmount)}</p>
          <p className="text-xs m-0">Business net {moneyLabel(selected.currency, selected.businessNetAmount)}</p>
          <p className="text-xs m-0">Stripe fee: {selected.stripeFeeAmount ? moneyLabel(selected.currency, selected.stripeFeeAmount) : 'not retrieved'}</p>
          <p className="text-xs m-0">Paid: {selected.payment.paidAt || '—'}</p>
          <p className="text-xs m-0">Completed: {selected.booking.completedAt || '—'}</p>
          <p className="text-xs m-0 mt-2">{selected.eligibility.reason}</p>
          {selected.attempts && selected.attempts.length > 0 ? (
            <ul className="text-xs m-2 p-0 list-none">
              {selected.attempts.map(a => (
                <li key={a.id}>
                  {a.outcome} · {a.stripeTransferId || a.failureCode || '—'} · {a.createdAt}
                </li>
              ))}
            </ul>
          ) : null}
          {selected.status === 'TRANSFERRED' || selected.stripeTransferId ? (
            <p className="text-xs m-0 mt-2">
              TRANSFERRED {moneyLabel(selected.currency, selected.businessNetAmount)}
              {selected.transferredAt ? ` · ${selected.transferredAt}` : ''}
            </p>
          ) : null}
          {selected.reversal ? (
            <p className="text-xs m-0 mt-1">
              REVERSED {moneyLabel(selected.reversal.currency, selected.reversal.amount)} · {selected.reversal.status}
              {selected.reversal.succeededAt ? ` · ${selected.reversal.succeededAt}` : ''}
              {selected.reversal.failureMessage ? ` · ${selected.reversal.failureMessage}` : ''}
            </p>
          ) : null}
          <BookingFinancialTimeline bookingId={selected.bookingId} />
          {selected.eligibility.code === 'REFUND_IN_PROGRESS' ? (
            <p className="text-xs m-0 mt-2" style={{ color: '#ffb4b4' }}>
              SETTLEMENT BLOCKED — Traveler refund/cancellation in progress.
            </p>
          ) : null}
          {selected.status === 'ELIGIBLE' && selected.eligibility.eligible && selected.eligibility.code !== 'REFUND_IN_PROGRESS' ? (
            confirm ? (
              <div className="mt-3">
                <p className="text-sm font-semibold m-0 mb-2">
                  Release {moneyLabel(selected.currency, selected.businessNetAmount)} to {selected.business.name}?
                </p>
                <p className="text-xs m-0">Traveler paid: {moneyLabel(selected.currency, selected.grossAmount)}</p>
                <p className="text-xs m-0">Delve commission: {moneyLabel(selected.currency, selected.platformCommissionAmount)}</p>
                <p className="text-xs m-0">Business settlement: {moneyLabel(selected.currency, selected.businessNetAmount)}</p>
                <p className="text-xs m-0">Business: {selected.business.name}</p>
                <p className="text-xs m-0 mb-3">Booking: {selected.booking.bookingReference}</p>
                <div className="flex gap-2">
                  <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>
                    Cancel
                  </button>
                  <button type="button" className="admin-btn" disabled={busy} onClick={() => void release()}>
                    {busy ? 'Releasing…' : 'Release Settlement'}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="admin-btn mt-3" onClick={() => setConfirm(true)}>
                Release Settlement
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
