import { useEffect, useState } from 'react'
import type { BusinessMemberRole, ProviderDisputeSummary } from '@delve/contracts'
import { fetchBusinessDisputes, submitProviderDisputeNote } from '../../api/paymentClient'
import { formatMoney } from '../../lib/formatMoney'

export default function ProviderDisputesView({
  businessId,
  role,
}: {
  businessId: string
  role: BusinessMemberRole
}) {
  const canSubmit = role === 'OWNER' || role === 'MANAGER'
  const [rows, setRows] = useState<ProviderDisputeSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [noteById, setNoteById] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    const data = await fetchBusinessDisputes(businessId)
    setRows(data)
  }

  useEffect(() => {
    let cancelled = false
    void reload()
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load disputes')
      })
    return () => {
      cancelled = true
    }
  }, [businessId])

  const open = rows.filter(r => r.status === 'NEEDS_RESPONSE' || r.status === 'UNDER_REVIEW' || r.status === 'WARNING')

  return (
    <div className="mb-6">
      <h2 className="font-display text-lg font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
        Payment disputes
      </h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
        A dispute is a cardholder challenge of a collected payment. It is not an automatic traveler refund. Admin
        reviews information before anything is sent to Stripe.
      </p>
      {error ? (
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      ) : null}
      {open.map(row => (
        <div
          key={row.id}
          className="rounded-2xl p-4 mb-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold m-0">Payment dispute under review</p>
          <p className="text-xs font-mono m-0 mt-1">Booking: {row.bookingReference}</p>
          <p className="text-xs m-0">Amount: {formatMoney(row.currency, row.amount)}</p>
          <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            Settlement: {row.settlementLabel}
          </p>
          {canSubmit ? (
            <div className="mt-3">
              <label className="text-xs block mb-1">Supporting information for Admin review</label>
              <textarea
                className="w-full text-sm rounded-xl p-2"
                rows={3}
                value={noteById[row.id] ?? row.providerEvidenceNote ?? ''}
                onChange={e => setNoteById(prev => ({ ...prev, [row.id]: e.target.value }))}
              />
              <button
                type="button"
                disabled={busyId === row.id}
                className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--primary)', border: 'none' }}
                onClick={() => {
                  const note = (noteById[row.id] ?? '').trim()
                  if (!note) return
                  setBusyId(row.id)
                  void submitProviderDisputeNote(businessId, row.id, note)
                    .then(() => reload())
                    .catch(err => setError(err instanceof Error ? err.message : 'Could not save information'))
                    .finally(() => setBusyId(null))
                }}
              >
                {busyId === row.id ? 'Saving…' : 'Provide information'}
              </button>
            </div>
          ) : (
            <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
              Only Owner or Manager can submit supporting information.
            </p>
          )}
        </div>
      ))}
      {rows.length === 0 ? (
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          No payment disputes for this business.
        </p>
      ) : null}
    </div>
  )
}
