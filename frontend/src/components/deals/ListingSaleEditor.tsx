import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Tag } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { friendlyApiMessage } from '../../utils/friendlyError'
import './deals.css'

export type ListingSaleVertical =
  | 'stays'
  | 'food'
  | 'guides'
  | 'transport'
  | 'events'
  | 'shop'
  | 'activities'

export type ListingSaleRecord = {
  id: number
  vertical: ListingSaleVertical | string
  listing_id: number
  title: string
  badge: string
  price_label: string
  sale_price: string | null
  compare_at_price: string | null
  how_to_claim: string
  proof_required: string
  terms_note: string
  is_active: boolean
  starts_on: string | null
  ends_on: string | null
}

type Draft = {
  title: string
  badge: string
  price_label: string
  sale_price: string
  compare_at_price: string
  how_to_claim: string
  proof_required: string
  terms_note: string
  is_active: boolean
  starts_on: string
  ends_on: string
}

const EMPTY: Draft = {
  title: 'On sale',
  badge: '',
  price_label: '',
  sale_price: '',
  compare_at_price: '',
  how_to_claim: '',
  proof_required: '',
  terms_note: '',
  is_active: true,
  starts_on: '',
  ends_on: '',
}

function fromRecord(row: ListingSaleRecord | null | undefined): Draft {
  if (!row) return { ...EMPTY }
  return {
    title: row.title || 'On sale',
    badge: row.badge || '',
    price_label: row.price_label || '',
    sale_price: row.sale_price != null ? String(row.sale_price) : '',
    compare_at_price: row.compare_at_price != null ? String(row.compare_at_price) : '',
    how_to_claim: row.how_to_claim || '',
    proof_required: row.proof_required || '',
    terms_note: row.terms_note || '',
    is_active: row.is_active !== false,
    starts_on: row.starts_on || '',
    ends_on: row.ends_on || '',
  }
}

function toPayload(draft: Draft) {
  return {
    title: draft.title.trim() || 'On sale',
    badge: draft.badge.trim(),
    price_label: draft.price_label.trim(),
    sale_price: draft.sale_price.trim() || null,
    compare_at_price: draft.compare_at_price.trim() || null,
    how_to_claim: draft.how_to_claim.trim(),
    proof_required: draft.proof_required.trim(),
    terms_note: draft.terms_note.trim(),
    is_active: draft.is_active,
    starts_on: draft.starts_on || null,
    ends_on: draft.ends_on || null,
  }
}

type Props = {
  vertical: ListingSaleVertical
  listingId: number
  canEdit?: boolean
  className?: string
}

/** Provider control: set / clear a listing-level sale (Phase 2). */
export function ListingSaleEditor({ vertical, listingId, canEdit = true, className }: Props) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState('')
  const queryKey = ['listing-sale', vertical, listingId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<ListingSaleRecord | null>(`/api/accounts/me/listing-sales/${vertical}/${listingId}/`),
    enabled: Boolean(listingId),
  })

  useEffect(() => {
    setDraft(fromRecord(data ?? null))
  }, [data])

  const saveMut = useMutation({
    mutationFn: () =>
      apiFetch<ListingSaleRecord>(`/api/accounts/me/listing-sales/${vertical}/${listingId}/`, {
        method: 'PUT',
        body: JSON.stringify(toPayload(draft)),
      }),
    onSuccess: async () => {
      setError('')
      setSavedFlash('Sale saved')
      window.setTimeout(() => setSavedFlash(''), 2000)
      await qc.invalidateQueries({ queryKey })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not save sale.')),
  })

  const clearMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/accounts/me/listing-sales/${vertical}/${listingId}/`, { method: 'DELETE' }),
    onSuccess: async () => {
      setError('')
      setDraft({ ...EMPTY })
      setSavedFlash('Sale cleared')
      window.setTimeout(() => setSavedFlash(''), 2000)
      await qc.invalidateQueries({ queryKey })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not clear sale.')),
  })

  if (!listingId) return null

  const hasSale = Boolean(data && typeof data === 'object' && 'id' in data)

  return (
    <section className={`listing-sale-editor${className ? ` ${className}` : ''}`}>
      <div className="listing-sale-editor__head">
        <div>
          <h3>
            <Tag size={16} strokeWidth={2.25} aria-hidden /> Listing sale
          </h3>
          <p>
            Show a sale badge and optional “was / now” price on this listing. Travellers open the same claim
            sheet as business Travel Offers.
          </p>
        </div>
      </div>

      {isLoading ? <p className="listing-sale-editor__ok">Loading…</p> : null}

      <div className="listing-sale-editor__grid">
        <label>
          Title
          <input
            value={draft.title}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            maxLength={160}
          />
        </label>
        <label>
          Badge (optional)
          <input
            value={draft.badge}
            disabled={!canEdit}
            placeholder="Sale or −20%"
            onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))}
            maxLength={40}
          />
        </label>
        <label>
          Sale price
          <input
            value={draft.sale_price}
            disabled={!canEdit}
            inputMode="decimal"
            placeholder="e.g. 800"
            onChange={(e) => setDraft((d) => ({ ...d, sale_price: e.target.value }))}
          />
        </label>
        <label>
          Compare-at (was)
          <input
            value={draft.compare_at_price}
            disabled={!canEdit}
            inputMode="decimal"
            placeholder="e.g. 1000"
            onChange={(e) => setDraft((d) => ({ ...d, compare_at_price: e.target.value }))}
          />
        </label>
        <label>
          Price label
          <input
            value={draft.price_label}
            disabled={!canEdit}
            placeholder="−20% or From N$800"
            onChange={(e) => setDraft((d) => ({ ...d, price_label: e.target.value }))}
            maxLength={80}
          />
        </label>
        <label className="listing-sale-editor__check">
          <input
            type="checkbox"
            checked={draft.is_active}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          Sale is active
        </label>
        <label>
          Starts on
          <input
            type="date"
            value={draft.starts_on}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, starts_on: e.target.value }))}
          />
        </label>
        <label>
          Ends on
          <input
            type="date"
            value={draft.ends_on}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, ends_on: e.target.value }))}
          />
        </label>
        <label className="listing-sale-editor__span2">
          How to claim
          <textarea
            rows={3}
            value={draft.how_to_claim}
            disabled={!canEdit}
            placeholder="Book while the sale is active — discounted price is shown on the listing."
            onChange={(e) => setDraft((d) => ({ ...d, how_to_claim: e.target.value }))}
          />
        </label>
        <label>
          Proof required
          <input
            value={draft.proof_required}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, proof_required: e.target.value }))}
            maxLength={240}
          />
        </label>
        <label>
          Terms note
          <input
            value={draft.terms_note}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, terms_note: e.target.value }))}
          />
        </label>
      </div>

      {error ? <p className="listing-sale-editor__error">{error}</p> : null}
      {savedFlash ? <p className="listing-sale-editor__ok">{savedFlash}</p> : null}

      {canEdit ? (
        <div className="listing-sale-editor__actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Saving…' : hasSale ? 'Update sale' : 'Set sale'}
          </button>
          {hasSale ? (
            <button
              type="button"
              className="btn btn-sm"
              disabled={clearMut.isPending}
              onClick={() => clearMut.mutate()}
            >
              {clearMut.isPending ? 'Clearing…' : 'Clear sale'}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
