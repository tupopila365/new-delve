import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminListing, HomePin } from '../api/types'
import { HOME_PIN_PLACEMENTS, MAX_HOME_PINS, TRANSPORT_TARGET_TYPES } from '../api/types'
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

export function HomePinsPage() {
  const qc = useQueryClient()
  const [placement, setPlacement] = useState<string>(HOME_PIN_PLACEMENTS[0].value)
  const [toast, setToast] = useState('')
  const [formTargetType, setFormTargetType] = useState(HOME_PIN_PLACEMENTS[0].targetType)
  const [formTargetId, setFormTargetId] = useState('')
  const [formPartnerLabel, setFormPartnerLabel] = useState('Featured')
  const [formRegion, setFormRegion] = useState('')
  const [formActive, setFormActive] = useState(true)

  const selected = HOME_PIN_PLACEMENTS.find((p) => p.value === placement) ?? HOME_PIN_PLACEMENTS[0]
  const isTransport = placement === 'homepage_transport'

  const { data: pins = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['home-pins', placement],
    queryFn: () =>
      apiFetch<HomePin[]>(`/api/accounts/admin/home-pins/?placement=${encodeURIComponent(placement)}`),
  })

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => apiFetch<AdminListing[]>('/api/accounts/admin/listings/'),
  })

  useEffect(() => {
    if (isTransport) {
      setFormTargetType('vehicle')
    } else {
      setFormTargetType(selected.targetType)
    }
    setFormTargetId('')
  }, [placement, selected.targetType, isTransport])

  const listingOptions = useMemo(() => {
    if (isTransport) {
      return listings.filter(
        (l) => (l.listing_type === 'vehicle' || l.listing_type === 'bus_trip') && l.status === 'published',
      )
    }
    return listings.filter((l) => l.listing_type === selected.listingType && l.status === 'published')
  }, [listings, selected.listingType, isTransport])

  const filteredListings = useMemo(() => {
    if (!isTransport) return listingOptions
    return listingOptions.filter((l) => l.listing_type === formTargetType)
  }, [listingOptions, isTransport, formTargetType])

  const orderedPins = useMemo(
    () => [...pins].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [pins],
  )
  const activeCount = orderedPins.filter((p) => p.is_active).length

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['home-pins'] })
    void qc.invalidateQueries({ queryKey: ['activity'] })
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<HomePin>('/api/accounts/admin/home-pins/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Editorial pin created.')
      setFormTargetId('')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not create pin.'),
  })

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiFetch<HomePin>(`/api/accounts/admin/home-pins/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setToast('Pin updated.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not update pin.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/accounts/admin/home-pins/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      setToast('Pin removed.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not delete pin.'),
  })

  const reorderMut = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiFetch<HomePin[]>('/api/accounts/admin/home-pins/reorder/', {
        method: 'POST',
        body: JSON.stringify({ placement, ordered_ids: orderedIds }),
      }),
    onSuccess: () => {
      setToast('Order saved.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not reorder pins.'),
  })

  const movePin = (id: number, direction: -1 | 1) => {
    const ids = orderedPins.map((p) => p.id)
    const idx = ids.indexOf(id)
    const swap = idx + direction
    if (idx < 0 || swap < 0 || swap >= ids.length) return
    ;[ids[idx], ids[swap]] = [ids[swap], ids[idx]]
    reorderMut.mutate(ids)
  }

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Home pins" subtitle="Editorial overrides for homepage featured rails." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Home pins" subtitle="Editorial overrides for homepage featured rails." />
        <DelveAdminError message="Could not load home pins." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Home pins"
        subtitle={`${activeCount} active of ${MAX_HOME_PINS} max · pins appear above paid partners`}
        action={
          <>
            <Link to="/admin/home-stories" className="da-btn da-btn--ghost">
              Home stories
            </Link>
            <Link to="/admin/promotions" className="da-btn da-btn--ghost">
              Featured partners
            </Link>
          </>
        }
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      <DelveAdminFilterBar>
        {HOME_PIN_PLACEMENTS.map((p) => (
          <DelveAdminFilterChip
            key={p.value}
            label={p.label.replace('Homepage — Featured ', '')}
            active={placement === p.value}
            onClick={() => setPlacement(p.value)}
          />
        ))}
      </DelveAdminFilterBar>

      <DelveAdminPanel title={`Pins — ${selected.label}`}>
        <p className="da-panel__hint">
          Up to {MAX_HOME_PINS} active pins per rail. Order controls position on the traveller Home feed (pins first,
          then paid partners, then organic).
        </p>
        {orderedPins.length === 0 ? (
          <DelveAdminEmpty message="No pins on this rail yet." />
        ) : (
          <div className="da-stack">
            {orderedPins.map((pin, index) => (
              <DelveAdminDataRow
                key={pin.id}
                primary={pin.target_label || `${pin.target_type} #${pin.target_id}`}
                secondary={`${pin.partner_label}${pin.region ? ` · ${pin.region}` : ' · National'} · ${pin.target_type}:${pin.target_id}${pin.created_by_username ? ` · @${pin.created_by_username}` : ''}`}
                badge={
                  <DelveAdminStatusBadge
                    status={pin.is_active ? 'Active' : 'Inactive'}
                    variant={pin.is_active ? 'success' : 'neutral'}
                  />
                }
                actions={
                  <>
                    <button
                      type="button"
                      className="da-btn da-btn--ghost"
                      disabled={index === 0 || reorderMut.isPending}
                      onClick={() => movePin(pin.id, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="da-btn da-btn--ghost"
                      disabled={index === orderedPins.length - 1 || reorderMut.isPending}
                      onClick={() => movePin(pin.id, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="da-btn da-btn--ghost"
                      disabled={patchMut.isPending}
                      onClick={() =>
                        patchMut.mutate({ id: pin.id, body: { is_active: !pin.is_active } })
                      }
                    >
                      {pin.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="da-btn da-btn--danger"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (window.confirm(`Remove pin for “${pin.target_label || pin.target_id}”?`)) {
                          deleteMut.mutate(pin.id)
                        }
                      }}
                    >
                      Remove
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </DelveAdminPanel>

      <DelveAdminPanel title="Add editorial pin">
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!formTargetId) return
            const listing = filteredListings.find((l) => String(l.listing_id) === formTargetId)
            createMut.mutate({
              placement,
              target_type: formTargetType,
              target_id: formTargetId,
              target_label: listing?.title ?? '',
              partner_label: formPartnerLabel.trim() || 'Featured',
              region: formRegion.trim(),
              is_active: formActive,
            })
          }}
        >
          {isTransport ? (
            <label className="da-field">
              <span>Listing type</span>
              <select value={formTargetType} onChange={(e) => setFormTargetType(e.target.value)}>
                {TRANSPORT_TARGET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="da-field">
            <span>Listing</span>
            <select
              required
              value={formTargetId}
              onChange={(e) => setFormTargetId(e.target.value)}
            >
              <option value="">Select a published listing…</option>
              {filteredListings.map((l) => (
                <option key={l.id} value={String(l.listing_id)}>
                  {l.title} ({l.region || l.city || '—'})
                </option>
              ))}
            </select>
          </label>
          <label className="da-field">
            <span>Badge label</span>
            <input
              value={formPartnerLabel}
              onChange={(e) => setFormPartnerLabel(e.target.value)}
              placeholder="Featured"
              maxLength={80}
            />
          </label>
          <label className="da-field">
            <span>Region (blank = national)</span>
            <input
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              placeholder="e.g. Khomas"
              maxLength={120}
            />
          </label>
          <label className="da-field">
            <span className="da-flag">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              Active immediately
            </span>
          </label>
          {formActive && activeCount >= MAX_HOME_PINS ? (
            <p className="da-panel__hint">
              This rail already has {MAX_HOME_PINS} active pins. Deactivate one first, or add as inactive.
            </p>
          ) : null}
          <div className="da-field-row">
            <button
              type="submit"
              className="da-btn da-btn--primary"
              disabled={
                createMut.isPending ||
                !formTargetId ||
                (formActive && activeCount >= MAX_HOME_PINS)
              }
            >
              {createMut.isPending ? 'Adding…' : 'Add pin'}
            </button>
          </div>
        </form>
      </DelveAdminPanel>
    </div>
  )
}
