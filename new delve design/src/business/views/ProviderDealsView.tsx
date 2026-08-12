import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Tag } from 'lucide-react'
import type { CreateDealBody, DealDto, DealStatus, ListingDto, UpdateDealBody } from '@delve/contracts'
import { createDeal, fetchBusinessDeals, updateDeal } from '../../api/dealClient'
import { fetchBusinessListings } from '../../api/listingClient'

interface ProviderDealsViewProps {
  businessId: string
}

function statusTone(status: DealStatus): { bg: string; fg: string } {
  switch (status) {
    case 'PUBLISHED':
      return { bg: 'rgba(16,167,96,0.12)', fg: '#0F8A52' }
    case 'DRAFT':
      return { bg: 'rgba(107,114,128,0.12)', fg: '#4B5563' }
    case 'PENDING_REVIEW':
      return { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' }
    case 'EXPIRED':
      return { bg: 'rgba(239,68,68,0.12)', fg: '#B91C1C' }
    case 'REJECTED':
      return { bg: 'rgba(239,68,68,0.12)', fg: '#B91C1C' }
    case 'ARCHIVED':
      return { bg: 'rgba(107,114,128,0.1)', fg: '#6B7280' }
    default:
      return { bg: 'var(--surface-subtle)', fg: 'var(--fg-muted)' }
  }
}

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string) {
  return new Date(local).toISOString()
}

type FormState = {
  title: string
  description: string
  listingId: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  currency: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED'
}

function emptyForm(): FormState {
  const start = new Date()
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return {
    title: '',
    description: '',
    listingId: '',
    discountType: 'PERCENTAGE',
    discountValue: '10',
    currency: 'USD',
    startDate: toLocalInputValue(start.toISOString()),
    endDate: toLocalInputValue(end.toISOString()),
    status: 'DRAFT',
  }
}

function formFromDeal(deal: DealDto): FormState {
  return {
    title: deal.title,
    description: deal.description ?? '',
    listingId: deal.listingId ?? '',
    discountType: deal.discountType,
    discountValue: String(deal.discountValue),
    currency: deal.currency,
    startDate: toLocalInputValue(deal.startDate),
    endDate: toLocalInputValue(deal.endDate),
    status:
      deal.status === 'PENDING_REVIEW' || deal.status === 'PUBLISHED' || deal.status === 'DRAFT'
        ? deal.status
        : 'DRAFT',
  }
}

export default function ProviderDealsView({ businessId }: ProviderDealsViewProps) {
  const [deals, setDeals] = useState<DealDto[]>([])
  const [listings, setListings] = useState<ListingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  async function reload() {
    const [dealRows, listingRows] = await Promise.all([
      fetchBusinessDeals(businessId),
      fetchBusinessListings(businessId),
    ])
    setDeals(dealRows)
    setListings(listingRows)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load deals')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [businessId])

  const listingOptions = useMemo(
    () => listings.map(l => ({ id: l.id, title: l.title, status: l.status })),
    [listings],
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
    setError(null)
  }

  function openEdit(deal: DealDto) {
    setEditingId(deal.id)
    setForm(formFromDeal(deal))
    setShowForm(true)
    setError(null)
  }

  async function handleSave() {
    const discountValue = Number(form.discountValue)
    if (!form.title.trim() || Number.isNaN(discountValue)) {
      setError('Title and a valid discount value are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payloadBase = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        listingId: form.listingId ? form.listingId : null,
        discountType: form.discountType,
        discountValue,
        currency: form.currency,
        startDate: fromLocalInputValue(form.startDate),
        endDate: fromLocalInputValue(form.endDate),
        status: form.status,
      }
      if (editingId) {
        const body: UpdateDealBody = {
          ...payloadBase,
          description: form.description.trim() || null,
        }
        await updateDeal(editingId, body)
      } else {
        const body: CreateDealBody = payloadBase
        await createDeal(businessId, body)
      }
      await reload()
      setShowForm(false)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
            Deals
          </h1>
          <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            Create discounts for your business. Checkout comes later — pricing inputs are stored for Day 5.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={15} />
          Create deal
        </button>
      </div>

      {error && (
        <p className="text-sm m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <div
          className="rounded-2xl px-4 py-4 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
            {editingId ? 'Edit deal' : 'New deal'}
          </h2>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              Title
            </span>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              Description
            </span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              Linked listing (optional)
            </span>
            <select
              value={form.listingId}
              onChange={e => setForm(f => ({ ...f, listingId: e.target.value }))}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            >
              <option value="">None</option>
              {listingOptions.map(l => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.status})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                Discount type
              </span>
              <select
                value={form.discountType}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    discountType: e.target.value as FormState['discountType'],
                  }))
                }
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                Discount value
              </span>
              <input
                type="number"
                step="0.01"
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                Currency
              </span>
              <input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                maxLength={3}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                Start
              </span>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                End
              </span>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              Status
            </span>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState['status'] }))}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save deal'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading deals…
        </p>
      ) : deals.length === 0 && !showForm ? (
        <div
          className="rounded-2xl px-6 py-14 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Tag size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            No deals yet
          </p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Create a deal to offer percentage or fixed discounts for your business.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {deals.map(deal => {
            const tone = statusTone(deal.status)
            return (
              <div
                key={deal.id}
                className="rounded-2xl px-4 py-4 flex flex-col gap-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: tone.bg, color: tone.fg }}
                    >
                      {deal.status.replace(/_/g, ' ')}
                      {deal.isActive ? ' · Active' : ''}
                    </span>
                    <h3 className="text-sm font-semibold m-0 mt-2 truncate" style={{ color: 'var(--fg)' }}>
                      {deal.title}
                    </h3>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {deal.listing ? `Listing: ${deal.listing.title}` : 'No linked listing'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(deal)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)' }}
                    aria-label="Edit deal"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-lg font-bold m-0" style={{ color: 'var(--fg)' }}>
                  {deal.discountSummary}
                </p>
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                  {formatRange(deal.startDate, deal.endDate)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
