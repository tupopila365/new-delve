import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatusBadge,
} from '../components'

type AdminReview = {
  id: string
  source: string
  source_label: string
  review_id: number
  listing_title: string
  reviewer_username: string
  rating: number
  body: string
  is_hidden: boolean
  moderation_note: string
  created_at: string
}

const SOURCE_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'shop', label: 'Shop' },
  { id: 'accommodation', label: 'Stays' },
  { id: 'guide', label: 'Guides' },
  { id: 'food', label: 'Food' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'bus_seat', label: 'Bus' },
] as const

const HIDDEN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'visible', label: 'Visible' },
  { id: 'hidden', label: 'Hidden' },
] as const

export function ReviewsModerationPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<(typeof SOURCE_FILTERS)[number]['id']>('All')
  const [hidden, setHidden] = useState<(typeof HIDDEN_FILTERS)[number]['id']>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reviews', source, hidden],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (source !== 'All') params.set('source', source)
      if (hidden !== 'all') params.set('hidden', hidden)
      const qs = params.toString()
      return asArray<AdminReview>(
        await apiFetch(qs ? `/api/accounts/admin/reviews/?${qs}` : '/api/accounts/admin/reviews/'),
      )
    },
  })

  const muteMut = useMutation({
    mutationFn: async ({
      row,
      action,
    }: {
      row: AdminReview
      action: 'hide' | 'unhide'
    }) => {
      setBusyId(row.id)
      return apiFetch('/api/accounts/admin/reviews/', {
        method: 'PATCH',
        body: JSON.stringify({
          source: row.source,
          review_id: row.review_id,
          action,
          reason: action === 'hide' ? 'Hidden by Delve admin' : '',
        }),
      })
    },
    onSettled: () => {
      setBusyId(null)
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })

  const filtered = reviews.filter((r) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.listing_title.toLowerCase().includes(q) ||
      r.reviewer_username.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q) ||
      r.source_label.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Reviews" subtitle="Hide traveler reviews that violate policy." />
        <DelveAdminLoading count={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Reviews" subtitle="Hide traveler reviews that violate policy." />
        <DelveAdminError message="Could not load reviews." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Reviews"
        subtitle="Marketplace traveler reviews across shop, stays, guides, food, and transport. Hidden reviews drop from public listings and rating averages."
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search reviews…">
        {SOURCE_FILTERS.map((f) => (
          <DelveAdminFilterChip
            key={f.id}
            label={f.label}
            active={source === f.id}
            onClick={() => setSource(f.id)}
          />
        ))}
        {HIDDEN_FILTERS.map((f) => (
          <DelveAdminFilterChip
            key={f.id}
            label={f.label}
            active={hidden === f.id}
            onClick={() => setHidden(f.id)}
          />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No reviews match" message="Try another filter or wait for travelers to review." />
      ) : (
        <div className="da-stack">
          {filtered.map((r) => (
            <DelveAdminDataRow
              key={r.id}
              primary={r.listing_title}
              secondary={`★ ${r.rating}/5 · @${r.reviewer_username} · ${r.body || 'No comment'}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={r.source_label} variant="info" />
                  <DelveAdminStatusBadge
                    status={r.is_hidden ? 'Hidden' : 'Visible'}
                    variant={r.is_hidden ? 'danger' : 'success'}
                  />
                </>
              }
              actions={
                r.is_hidden ? (
                  <button
                    type="button"
                    className="da-link-btn"
                    disabled={busyId === r.id || muteMut.isPending}
                    onClick={() => muteMut.mutate({ row: r, action: 'unhide' })}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    className="da-link-btn da-link-btn--danger"
                    disabled={busyId === r.id || muteMut.isPending}
                    onClick={() => muteMut.mutate({ row: r, action: 'hide' })}
                  >
                    Hide
                  </button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
