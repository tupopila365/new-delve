import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PaymentDisputeDto, PaymentDisputeListItem } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'
import { moneyLabel } from '../../lib/money'
import { BookingFinancialTimeline } from './BookingFinancialTimeline'

function formatDisputeReason(reason: string) {
  return reason.replace(/_/g, ' ')
}

function evidenceDueLabel(iso: string | null) {
  if (!iso) return 'No Stripe evidence deadline stored'
  const due = new Date(iso)
  const ms = due.getTime() - Date.now()
  const days = Math.ceil(ms / 86400000)
  if (ms < 0) return `Evidence deadline passed · ${due.toLocaleDateString()}`
  if (days <= 2) return `Evidence due in ${days} day${days === 1 ? '' : 's'} · ${due.toLocaleDateString()}`
  return `Evidence due ${due.toLocaleDateString()}`
}

export default function DisputesPanel() {
  const tabs = ['NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED', 'ALL'] as const
  const [tab, setTab] = useState<(typeof tabs)[number]>('NEEDS_RESPONSE')
  const [rows, setRows] = useState<PaymentDisputeListItem[]>([])
  const [selected, setSelected] = useState<PaymentDisputeDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [confirmRecover, setConfirmRecover] = useState(false)

  async function loadList() {
    const res = await adminFetch(`/admin/disputes?status=${encodeURIComponent(tab)}`)
    const body = (await res.json()) as { success: boolean; data?: PaymentDisputeListItem[]; error?: { message?: string } }
    if (!res.ok || !body.success) throw new Error(body.error?.message || 'Could not load disputes')
    setRows(body.data || [])
  }

  async function loadDetail(id: string) {
    const res = await adminFetch(`/admin/disputes/${encodeURIComponent(id)}`)
    const body = (await res.json()) as { success: boolean; data?: PaymentDisputeDto; error?: { message?: string } }
    if (!res.ok || !body.success || !body.data) throw new Error(body.error?.message || 'Could not load dispute')
    setSelected(body.data)
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void loadList().catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load disputes')
    })
    return () => {
      cancelled = true
    }
  }, [tab])

  async function submitEvidence() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await adminFetch(`/admin/disputes/${encodeURIComponent(selected.id)}/submit-evidence`, {
        method: 'POST',
        body: JSON.stringify({ uncategorizedText: note || undefined, includeDerivedFacts: true }),
      })
      const body = (await res.json()) as { success: boolean; data?: PaymentDisputeDto; error?: { message?: string } }
      if (!res.ok || !body.success || !body.data) throw new Error(body.error?.message || 'Evidence submit failed')
      setSelected(body.data)
      setNote('')
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evidence submit failed')
    } finally {
      setBusy(false)
    }
  }

  async function recover() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await adminFetch(`/admin/disputes/${encodeURIComponent(selected.id)}/recover-settlement`, {
        method: 'POST',
        body: '{}',
      })
      const body = (await res.json()) as { success: boolean; data?: PaymentDisputeDto; error?: { message?: string } }
      if (!res.ok || !body.success || !body.data) throw new Error(body.error?.message || 'Recovery failed')
      setSelected(body.data)
      setConfirmRecover(false)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Disputes</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Stripe is authoritative for dispute outcomes. Delve does not automatically refund travelers or reverse
        business settlement when a dispute opens. Settlement cannot be released while an untransferred payable is
        under an active dispute.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {tabs.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setTab(id)
              setSelected(null)
            }}
            style={{ opacity: tab === id ? 1 : 0.7 }}
          >
            {id === 'NEEDS_RESPONSE'
              ? 'Needs Response'
              : id === 'UNDER_REVIEW'
                ? 'Under Review'
                : id === 'ALL'
                  ? 'All'
                  : id.charAt(0) + id.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>
          {error}
        </p>
      ) : null}
      <ul className="list-none m-0 p-0 space-y-2">
        {rows.map(row => (
          <li key={row.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{row.bookingReference}</p>
            <p className="text-sm font-semibold m-0"><Link to={`/businesses/${row.businessId}`}>{row.businessName}</Link></p>
            <p className="text-xs m-0">
              Disputed: {moneyLabel(row.currency, row.amount)} · {formatDisputeReason(row.reason)}
            </p>
            <p className="text-xs m-0">Status: {row.status.replace(/_/g, ' ')}</p>
            <p className="text-xs m-0">{evidenceDueLabel(row.evidenceDueAt)}</p>
            <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
              {row.settlementLabel}
            </p>
            <button
              type="button"
              className="admin-btn-secondary mt-2"
              onClick={() => void loadDetail(row.id).catch(err => setError(err instanceof Error ? err.message : 'Load failed'))}
            >
              Review Dispute
            </button>
          </li>
        ))}
        {rows.length === 0 && !error ? (
          <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>
            No disputes in this tab.
          </p>
        ) : null}
      </ul>
      {selected ? (
        <div className="rounded-xl p-4 mt-4" style={{ border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold m-0 mb-2">Dispute timeline</h3>
          <p className="text-xs font-mono m-0">{selected.bookingReference}</p>
          <p className="text-xs m-0">Traveler: {selected.travelerUsername || '—'}</p>
          <p className="text-xs m-0">Business: {selected.businessName}</p>
          <p className="text-xs m-0 mt-2">
            Payment {selected.paymentStatus} {moneyLabel(selected.currency, selected.paymentAmount)}
          </p>
          <p className="text-xs m-0">
            Settlement: {selected.payableStatus || 'none'}{' '}
            {selected.payableNetAmount ? moneyLabel(selected.currency, selected.payableNetAmount) : ''}
          </p>
          <p className="text-xs m-0">
            Dispute {selected.status} {moneyLabel(selected.currency, selected.amount)}
          </p>
          <p className="text-xs m-0">{evidenceDueLabel(selected.evidenceDueAt)}</p>
          <p className="text-xs m-0">Refunds: {selected.refundStatuses.length ? selected.refundStatuses.join(', ') : 'None'}</p>
          <p className="text-xs m-0">Transfer reversal: {selected.reversalStatus || 'None'}</p>
          <p className="text-xs m-0 font-semibold mt-2">Financial exposure: {selected.settlementLabel}</p>
          <ul className="list-none m-0 p-0 mt-3 space-y-1">
            {selected.timeline.map((item, idx) => (
              <li key={`${item.kind}-${idx}`} className="text-xs m-0">
                {item.kind}: {item.label}
                {item.detail ? ` · ${item.detail}` : ''}
                {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ''}
              </li>
            ))}
          </ul>
          <BookingFinancialTimeline bookingId={selected.bookingId} />
          {selected.providerEvidenceNote ? (
            <p className="text-xs m-0 mt-3">Provider information: {selected.providerEvidenceNote}</p>
          ) : null}
          {selected.evidenceAccepting ? (
            <div className="mt-3">
              <label className="text-xs block mb-1">Admin evidence note (sent to Stripe as uncategorized text)</label>
              <textarea className="w-full text-sm" rows={3} value={note} onChange={e => setNote(e.target.value)} />
              <button type="button" className="admin-btn mt-2" disabled={busy} onClick={() => void submitEvidence()}>
                {busy ? 'Submitting…' : 'Submit evidence to Stripe'}
              </button>
            </div>
          ) : (
            <p className="text-xs m-0 mt-3" style={{ color: 'var(--muted)' }}>
              Stripe is not accepting evidence for this dispute from Delve.
            </p>
          )}
          {selected.status === 'LOST' &&
          (selected.recoveryStatus === 'RECOVERY_REQUIRED' || selected.recoveryStatus === 'RECOVERY_FAILED') ? (
            confirmRecover ? (
              <div className="mt-3">
                <p className="text-xs m-0 mb-2">
                  Reverse the existing business Stripe Transfer. This does not refund the traveler.
                </p>
                <button type="button" className="admin-btn" disabled={busy} onClick={() => void recover()}>
                  Confirm transfer reversal
                </button>
                <button type="button" className="admin-btn-secondary ml-2" disabled={busy} onClick={() => setConfirmRecover(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="admin-btn mt-3" onClick={() => setConfirmRecover(true)}>
                Recover transferred settlement
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
