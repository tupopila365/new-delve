import { useEffect, useState } from 'react'
import type { CancellationRequestDto, RefundDto } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'
import { BookingFinancialTimeline } from './BookingFinancialTimeline'

export default function RefundsPanel() {
  const refundTabs = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'] as const
  const [tab, setTab] = useState<(typeof refundTabs)[number]>('PENDING')
  const [mode, setMode] = useState<'refunds' | 'requests'>('requests')
  const [refunds, setRefunds] = useState<RefundDto[]>([])
  const [requests, setRequests] = useState<CancellationRequestDto[]>([])
  const [selected, setSelected] = useState<RefundDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmReverse, setConfirmReverse] = useState(false)

  async function load() {
    if (mode === 'requests') {
      const res = await adminFetch('/admin/cancellation-requests?status=PENDING')
      const body = (await res.json()) as { success: boolean; data?: CancellationRequestDto[] }
      if (!res.ok || !body.success) throw new Error('Could not load cancellation requests')
      setRequests(body.data || [])
      return
    }
    const res = await adminFetch(`/admin/refunds?status=${encodeURIComponent(tab)}`)
    const body = (await res.json()) as { success: boolean; data?: RefundDto[] }
    if (!res.ok || !body.success) throw new Error('Could not load refunds')
    setRefunds(body.data || [])
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void load().catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load')
    })
    return () => {
      cancelled = true
    }
  }, [tab, mode])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Refunds</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Paid cancellation is a review workflow. If settlement was already transferred, reverse the Stripe Transfer
        before refunding the traveler. A Transfer reversal is not a bank payout reversal.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="admin-btn-secondary" onClick={() => setMode('requests')} style={{ opacity: mode === 'requests' ? 1 : 0.7 }}>
          Requests
        </button>
        {refundTabs.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setMode('refunds')
              setTab(id)
              setSelected(null)
            }}
            style={{ opacity: mode === 'refunds' && tab === id ? 1 : 0.7 }}
          >
            {id.charAt(0) + id.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      {mode === 'requests' ? (
        <ul className="list-none m-0 p-0 space-y-2">
          {requests.map(r => (
            <li key={r.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono m-0">{r.bookingId}</p>
              <p className="text-sm m-0">{r.reason} · {r.requestedByType}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void adminFetch(`/admin/cancellation-requests/${encodeURIComponent(r.id)}/approve`, {
                      method: 'POST',
                      body: '{}',
                    })
                      .then(async res => {
                        const body = (await res.json()) as { success: boolean; error?: { message?: string } }
                        if (!res.ok || !body.success) throw new Error(body.error?.message || 'Approve failed')
                        await load()
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Approve failed'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void adminFetch(`/admin/cancellation-requests/${encodeURIComponent(r.id)}/reject`, {
                      method: 'POST',
                      body: '{}',
                    })
                      .then(async res => {
                        const body = (await res.json()) as { success: boolean; error?: { message?: string } }
                        if (!res.ok || !body.success) throw new Error(body.error?.message || 'Reject failed')
                        await load()
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Reject failed'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {requests.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No pending cancellation requests.</p> : null}
        </ul>
      ) : (
        <ul className="list-none m-0 p-0 space-y-2">
          {refunds.map(row => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full text-left rounded-xl p-3"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                onClick={() => setSelected(row)}
              >
                <p className="text-xs font-mono m-0">{row.booking?.bookingReference}</p>
                <p className="text-sm font-semibold m-0">{row.business?.name} · {row.status}</p>
                <p className="text-xs m-0">
                  Payment {row.payment?.amount} · Refund {row.currency} {row.amount} · {row.reason}
                </p>
                <p className="text-xs m-0">Settlement {row.payable?.status || 'none'}</p>
              </button>
            </li>
          ))}
          {refunds.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No refunds in this section.</p> : null}
        </ul>
      )}
      {selected ? (
        <div className="rounded-xl p-4 mt-4" style={{ border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold m-0 mb-2">Refund detail</h3>
          <p className="text-xs m-0 font-semibold mt-2">PAYMENT</p>
          <p className="text-xs m-0">
            {selected.payment?.status} {selected.payment?.amount} {selected.currency}
          </p>
          <p className="text-xs m-0 font-semibold mt-2">SETTLEMENT</p>
          <p className="text-xs m-0">
            {selected.payable?.status || 'none'}
            {selected.payable?.businessNetAmount
              ? ` ${selected.payable.businessNetAmount} ${selected.currency}`
              : ''}
          </p>
          <p className="text-xs m-0">Booking {selected.booking?.bookingReference} · {selected.booking?.status}</p>
          <p className="text-xs m-0">Traveler {selected.traveler?.displayName}</p>
          <p className="text-xs m-0">Business {selected.business?.name}</p>
          <p className="text-xs m-0 font-semibold mt-2">REVERSAL</p>
          <p className="text-xs m-0">
            {selected.reversal
              ? `${selected.reversal.status} ${selected.reversal.amount} ${selected.reversal.currency}`
              : selected.requiresSettlementReversal
                ? 'Required — not started'
                : 'Not required'}
          </p>
          {selected.reversal?.failureMessage ? (
            <p className="text-xs m-0" style={{ color: '#ffb4b4' }}>
              {selected.reversal.failureCode}: {selected.reversal.failureMessage}
            </p>
          ) : null}
          <p className="text-xs m-0 font-semibold mt-2">REFUND</p>
          <p className="text-xs m-0">
            {selected.status} {selected.amount} {selected.currency}
          </p>
          {selected.failureCode ? (
            <p className="text-xs m-0">
              {selected.failureCode}: {selected.failureMessage}
            </p>
          ) : null}
          {selected.reversal?.status === 'SUCCEEDED' && selected.status === 'FAILED' ? (
            <p className="text-xs m-0 mt-2" style={{ color: '#ffb4b4' }}>
              Business settlement recovered, but traveler refund failed.
            </p>
          ) : null}
          <BookingFinancialTimeline bookingId={selected.bookingId} />
          {selected.requiresSettlementReversal && selected.reversal?.status !== 'PROCESSING' ? (
            confirmReverse ? (
              <div className="mt-3">
                <p className="text-sm font-semibold m-0 mb-2">Settlement reversal required</p>
                <p className="text-xs m-0">Business: {selected.business?.name}</p>
                <p className="text-xs m-0">
                  Traveler originally paid: {selected.payment?.amount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Transferred to Business Stripe account: {selected.payable?.businessNetAmount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Delve commission: {selected.payable?.platformCommissionAmount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Traveler refund: {selected.amount} {selected.currency}
                </p>
                <p className="text-xs m-0 mb-3">
                  Required first step: Reverse {selected.payable?.businessNetAmount} {selected.currency} Stripe Transfer
                </p>
                <div className="flex gap-2">
                  <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirmReverse(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true)
                      void adminFetch(`/admin/refunds/${encodeURIComponent(selected.id)}/reverse-and-continue`, {
                        method: 'POST',
                        body: '{}',
                      })
                        .then(async res => {
                          const body = (await res.json()) as { success: boolean; data?: RefundDto; error?: { message?: string } }
                          if (!res.ok || !body.success) throw new Error(body.error?.message || 'Reversal failed')
                          if (body.data) setSelected(body.data)
                          setConfirmReverse(false)
                          await load()
                        })
                        .catch(err => setError(err instanceof Error ? err.message : 'Reversal failed'))
                        .finally(() => setBusy(false))
                    }}
                  >
                    Reverse Settlement
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="admin-btn mt-3" onClick={() => setConfirmReverse(true)}>
                Reverse Settlement & Continue Refund
              </button>
            )
          ) : null}
          {(selected.status === 'PENDING' || selected.status === 'FAILED') &&
          !selected.requiresSettlementReversal &&
          selected.payable?.status !== 'PROCESSING' &&
          selected.reversal?.status !== 'PROCESSING' ? (
            <button
              type="button"
              className="admin-btn mt-3"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void adminFetch(`/admin/refunds/${encodeURIComponent(selected.id)}/issue`, { method: 'POST', body: '{}' })
                  .then(async res => {
                    const body = (await res.json()) as { success: boolean; data?: RefundDto; error?: { message?: string } }
                    if (!res.ok || !body.success) throw new Error(body.error?.message || 'Issue failed')
                    if (body.data) setSelected(body.data)
                    await load()
                  })
                  .catch(err => setError(err instanceof Error ? err.message : 'Issue failed'))
                  .finally(() => setBusy(false))
              }}
            >
              Issue Refund
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
