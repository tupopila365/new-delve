/** Editorial Explore chip pins — ahead of usage ranking. */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { ExplorePlacePin, ExplorePlacePinsResponse } from '../api/types'
import { MAX_EXPLORE_PLACE_PINS } from '../api/types'
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

const DEFAULT_COUNTRIES = ['NA', 'ZA', 'BW', 'KE', 'TZ', 'ZM', 'MZ', 'AO', 'NG', 'GH', 'US']

export function ExplorePlacesPage() {
  const qc = useQueryClient()
  const [country, setCountry] = useState('NA')
  const [toast, setToast] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formActive, setFormActive] = useState(true)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['explore-place-pins', country],
    queryFn: () =>
      apiFetch<ExplorePlacePinsResponse>(
        `/api/accounts/admin/explore-place-pins/?country=${encodeURIComponent(country)}`,
      ),
  })

  const pins = data?.pins ?? []
  const presets = data?.presets ?? []
  const countries = data?.countries?.length ? data.countries : DEFAULT_COUNTRIES
  const maxPins = data?.max_pins ?? MAX_EXPLORE_PLACE_PINS

  const orderedPins = useMemo(
    () => [...pins].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [pins],
  )
  const activeCount = orderedPins.filter((p) => p.is_active).length

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['explore-place-pins'] })

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<ExplorePlacePin>('/api/accounts/admin/explore-place-pins/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setToast('Explore pin created.')
      setFormLabel('')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not create pin.'),
  })

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiFetch<ExplorePlacePin>(`/api/accounts/admin/explore-place-pins/${id}/`, {
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
      apiFetch<void>(`/api/accounts/admin/explore-place-pins/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      setToast('Pin removed.')
      invalidate()
    },
    onError: (err: Error) => setToast(err.message || 'Could not delete pin.'),
  })

  const reorderMut = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiFetch<ExplorePlacePin[]>('/api/accounts/admin/explore-place-pins/reorder/', {
        method: 'POST',
        body: JSON.stringify({ country, ordered_ids: orderedIds }),
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

  const onCreate = () => {
    const label = formLabel.trim()
    if (!label) {
      setToast('Choose a town to pin.')
      return
    }
    createMut.mutate({ country, label, is_active: formActive })
  }

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Explore places" subtitle="Pin featured towns on Explore chips." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Explore places" subtitle="Pin featured towns on Explore chips." />
        <DelveAdminError message="Could not load Explore place pins." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Explore places"
        subtitle={`${activeCount} active of ${maxPins} max · pins appear before usage ranking`}
        action={
          <Link to="/admin/home-pins" className="da-btn da-btn--ghost">
            Home pins
          </Link>
        }
      />

      {toast ? (
        <p className="da-toast" role="status">
          {toast}
        </p>
      ) : null}

      <DelveAdminFilterBar>
        {countries.map((cc) => (
          <DelveAdminFilterChip
            key={cc}
            label={cc}
            active={country === cc}
            onClick={() => setCountry(cc)}
          />
        ))}
      </DelveAdminFilterBar>

      <DelveAdminPanel title={`Pins — ${country}`}>
        <p className="da-panel__hint">
          Up to {maxPins} active pins per country. Remaining Explore chips fill from listing / booking /
          engagement ranking, then hardcoded town centres.
        </p>
        {orderedPins.length === 0 ? (
          <DelveAdminEmpty title="No pins" message="No pinned places for this country yet." />
        ) : (
          <div className="da-stack">
            {orderedPins.map((pin, index) => (
              <DelveAdminDataRow
                key={pin.id}
                primary={pin.label}
                secondary={`${pin.region || 'No region'} · ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}${pin.created_by_username ? ` · @${pin.created_by_username}` : ''}`}
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
                      className="da-btn da-btn--ghost"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (window.confirm(`Remove pin “${pin.label}”?`)) deleteMut.mutate(pin.id)
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

      <DelveAdminPanel title="Add pin">
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            onCreate()
          }}
        >
          <label className="da-field">
            <span>Town / city</span>
            <select
              required
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              disabled={createMut.isPending}
            >
              <option value="">Select a preset…</option>
              {presets.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                  {p.region ? ` (${p.region})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="da-field">
            <span className="da-flag">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                disabled={createMut.isPending}
              />
              Active immediately
            </span>
          </label>
          {formActive && activeCount >= maxPins ? (
            <p className="da-panel__hint">
              This country already has {maxPins} active pins. Deactivate one first, or add as inactive.
            </p>
          ) : null}
          <div className="da-field-row">
            <button
              type="submit"
              className="da-btn da-btn--primary"
              disabled={
                createMut.isPending ||
                !formLabel ||
                (formActive && activeCount >= maxPins)
              }
            >
              {createMut.isPending ? 'Saving…' : 'Pin place'}
            </button>
          </div>
        </form>
      </DelveAdminPanel>
    </div>
  )
}
