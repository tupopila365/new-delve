/** Admin-managed purchasable boost packages. */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { PromotionProduct } from '../api/types'
import { PACKAGE_PLACEMENT_OPTIONS } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatusBadge,
} from '../components'

const ACTIVE_FILTERS = ['All', 'Active', 'Inactive'] as const

const EMPTY_FORM = {
  name: '',
  description: '',
  placement: PACKAGE_PLACEMENT_OPTIONS[0].value,
  region: '',
  duration_days: 7,
  price_nad: '1500',
  currency: 'NAD',
  is_active: true,
}

function moneyFromCents(cents: number, currency = 'NAD') {
  const amount = (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'NAD' ? `N$${amount}` : `${currency} ${amount}`
}

export function PromotionPackagesPage() {
  const qc = useQueryClient()
  const [toast, setToast] = useState('')
  const [activeFilter, setActiveFilter] = useState<(typeof ACTIVE_FILTERS)[number]>('All')
  const [placementFilter, setPlacementFilter] = useState('All')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['promotion-products'],
    queryFn: () => apiFetch<PromotionProduct[]>('/api/accounts/admin/promotion-products/'),
  })

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeFilter === 'Active' && !p.is_active) return false
      if (activeFilter === 'Inactive' && p.is_active) return false
      if (placementFilter !== 'All' && p.placement !== placementFilter) return false
      return true
    })
  }, [products, activeFilter, placementFilter])

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['promotion-products'] })

  const saveMut = useMutation({
    mutationFn: async () => {
      const price = Number(form.price_nad)
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Enter a valid price in NAD.')
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        placement: form.placement,
        region: form.region.trim(),
        duration_days: Number(form.duration_days) || 7,
        price_cents: Math.round(price * 100),
        currency: form.currency || 'NAD',
        is_active: form.is_active,
      }
      if (!payload.name) throw new Error('Name is required.')
      if (editingId) {
        return apiFetch<PromotionProduct>(`/api/accounts/admin/promotion-products/${editingId}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }
      return apiFetch<PromotionProduct>('/api/accounts/admin/promotion-products/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      setToast(editingId ? 'Package updated.' : 'Package created — hosts can buy it now.')
      setEditingId(null)
      setForm(EMPTY_FORM)
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not save package.'),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<PromotionProduct>(`/api/accounts/admin/promotion-products/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      setToast('Package deactivated.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not deactivate package.'),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<PromotionProduct>(`/api/accounts/admin/promotion-products/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: true }),
      }),
    onSuccess: () => {
      setToast('Package reactivated.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not reactivate package.'),
  })

  function startEdit(p: PromotionProduct) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      placement: p.placement,
      region: p.region || '',
      duration_days: p.duration_days,
      price_nad: (p.price_cents / 100).toFixed(2),
      currency: p.currency || 'NAD',
      is_active: p.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Boost packages" subtitle="Packages hosts can purchase." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Boost packages" subtitle="Packages hosts can purchase." />
        <DelveAdminError message="Could not load packages." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Boost packages"
        subtitle={`${products.filter((p) => p.is_active).length} active · ${products.length} total — these appear on Boost on Delve for hosts.`}
        action={
          <>
            <Link to="/admin/promotions" className="da-btn da-btn--ghost">
              Boost campaigns
            </Link>
            <Link to="/admin/promotions/analytics" className="da-btn da-btn--ghost">
              Analytics
            </Link>
          </>
        }
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      <DelveAdminPanel title={editingId ? 'Edit package' : 'Create package'}>
        <p className="da-panel__hint">
          Set name, placement, region, duration, and price. Inactive packages stay in history but are hidden from hosts.
        </p>
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate()
          }}
        >
          <label className="da-field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Homepage featured 7 days — Food — Erongo"
              required
            />
          </label>
          <label className="da-field">
            <span>Description</span>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Featured on the homepage food rail"
            />
          </label>
          <label className="da-field">
            <span>Placement</span>
            <select
              value={form.placement}
              onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
            >
              {PACKAGE_PLACEMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="da-field">
            <span>Region (blank = National)</span>
            <input
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="Khomas, Erongo…"
            />
          </label>
          <div className="da-field-row">
            <label className="da-field">
              <span>Duration (days)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: Number(e.target.value) || 7 }))}
                required
              />
            </label>
            <label className="da-field">
              <span>Price (NAD)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price_nad}
                onChange={(e) => setForm((f) => ({ ...f, price_nad: e.target.value }))}
                required
              />
            </label>
          </div>
          <label className="da-field">
            <span className="da-flag">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active (visible to hosts)
            </span>
          </label>
          <div className="da-actions">
            <button type="submit" className="da-btn da-btn--primary" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create package'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="da-btn da-btn--ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </DelveAdminPanel>

      <DelveAdminFilterBar>
        {ACTIVE_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
        ))}
        <DelveAdminFilterChip
          label="All placements"
          active={placementFilter === 'All'}
          onClick={() => setPlacementFilter('All')}
        />
        {PACKAGE_PLACEMENT_OPTIONS.map((p) => (
          <DelveAdminFilterChip
            key={p.value}
            label={p.shortLabel}
            active={placementFilter === p.value}
            onClick={() => setPlacementFilter(p.value)}
          />
        ))}
      </DelveAdminFilterBar>

      <DelveAdminPanel title={`Packages (${filtered.length})`}>
        {filtered.length ? (
          <div className="da-stack">
            {filtered.map((p) => (
              <DelveAdminDataRow
                key={p.id}
                primary={p.name}
                secondary={`${p.placement_label}${p.region ? ` · ${p.region}` : ' · National'} · ${p.duration_days} days · ${p.price_display || moneyFromCents(p.price_cents, p.currency)}${p.description ? ` · ${p.description}` : ''}`}
                badge={
                  <DelveAdminStatusBadge
                    status={p.is_active ? 'Active' : 'Inactive'}
                    variant={p.is_active ? 'success' : 'neutral'}
                  />
                }
                actions={
                  <>
                    <button type="button" className="da-btn da-btn--ghost" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    {p.is_active ? (
                      <button
                        type="button"
                        className="da-btn da-btn--ghost"
                        disabled={deactivateMut.isPending}
                        onClick={() => deactivateMut.mutate(p.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="da-btn da-btn--primary"
                        disabled={reactivateMut.isPending}
                        onClick={() => reactivateMut.mutate(p.id)}
                      >
                        Reactivate
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <DelveAdminEmpty
            title="No packages yet"
            message="Create the first package above — it will show up for hosts under Boost on Delve."
          />
        )}
      </DelveAdminPanel>
    </div>
  )
}
