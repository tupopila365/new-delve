import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, asArray } from '../../api/client'

export type MarketplaceDispute = {
  id: number
  source: string
  record_id: number
  status: string
  status_label: string
  reason_label?: string
  body?: string
  title?: string
}

const REASONS = [
  { id: 'not_received', label: 'Not received / no-show' },
  { id: 'not_as_described', label: 'Not as described' },
  { id: 'damaged', label: 'Damaged / poor condition' },
  { id: 'wrong_item', label: 'Wrong item / booking' },
  { id: 'cancelled_by_seller', label: 'Seller cancelled' },
  { id: 'other', label: 'Other' },
] as const

type Props = {
  source: 'shop' | 'accommodation' | 'guide' | 'vehicle' | 'bus_seat'
  recordId: number
  enabled: boolean
  className?: string
}

export function OpenDisputePanel({ source, recordId, enabled, className = '' }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<(typeof REASONS)[number]['id']>('not_received')
  const [body, setBody] = useState('')

  const { data: myDisputes = [] } = useQuery({
    queryKey: ['my-disputes'],
    queryFn: async () => asArray<MarketplaceDispute>(await apiFetch('/api/accounts/me/disputes/')),
    enabled,
  })

  const existing = myDisputes.find(
    (d) => d.source === source && d.record_id === recordId && (d.status === 'open' || d.status === 'under_review'),
  )

  const mut = useMutation({
    mutationFn: () =>
      apiFetch<MarketplaceDispute>('/api/accounts/me/disputes/', {
        method: 'POST',
        body: JSON.stringify({ source, record_id: recordId, reason, body }),
      }),
    onSuccess: () => {
      setOpen(false)
      setBody('')
      void qc.invalidateQueries({ queryKey: ['my-disputes'] })
    },
  })

  if (!enabled) return null

  if (existing) {
    return (
      <div className={className} role="status">
        <p style={{ margin: 0 }}>
          Dispute open — {existing.status_label}
          {existing.reason_label ? ` (${existing.reason_label})` : ''}. Delve is reviewing before releasing payment.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {!open ? (
        <button type="button" className="shop-detail__btn shop-detail__btn--ghost" onClick={() => setOpen(true)}>
          Open dispute
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mut.mutate()
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>What went wrong?</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              required
              minLength={10}
              placeholder="Describe the issue so Delve can help…"
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="submit" className="shop-detail__btn shop-detail__btn--primary" disabled={mut.isPending}>
              {mut.isPending ? 'Submitting…' : 'Submit dispute'}
            </button>
            <button type="button" className="shop-detail__btn shop-detail__btn--ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {mut.isError ? (
            <p className="checkout__error">
              {mut.error instanceof ApiError ? mut.error.message : 'Could not open dispute.'}
            </p>
          ) : null}
        </form>
      )}
    </div>
  )
}
