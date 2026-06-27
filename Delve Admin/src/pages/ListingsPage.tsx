import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { AdminListing } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatusBadge,
  DelveAdminVerifyDialog,
} from '../components'
import { statusVariant } from '../data/demoData'

const TYPE_FILTERS = [
  'All',
  'Stays',
  'Guides',
  'Transport',
  'Food',
  'Events',
  'Delvers',
  'Community',
] as const

const TYPE_MAP: Record<string, string> = {
  Stays: 'accommodation',
  Guides: 'guide',
  Transport: 'vehicle',
  Food: 'food',
  Events: 'event',
  Delvers: 'post',
  Community: 'community',
}

const STATUS_FILTERS = ['All', 'Published', 'Unpublished'] as const

export function ListingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [dialog, setDialog] = useState<{ item: AdminListing; publish: boolean } | null>(null)

  const { data: listings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['listings'],
    queryFn: async () => asArray<AdminListing>(await apiFetch('/api/accounts/admin/listings/')),
  })

  const updateMut = useMutation({
    mutationFn: ({
      listing_type,
      listing_id,
      published,
      reason,
    }: {
      listing_type: string
      listing_id: number
      published: boolean
      reason?: string
    }) =>
      apiFetch<AdminListing>('/api/accounts/admin/listings/', {
        method: 'PATCH',
        body: JSON.stringify({ listing_type, listing_id, published, reason }),
      }),
    onSuccess: () => {
      setDialog(null)
      void qc.invalidateQueries({ queryKey: ['listings'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const filtered = useMemo(() => {
    let rows = listings
    if (typeFilter !== 'All') {
      const t = TYPE_MAP[typeFilter]
      rows = rows.filter((r) => r.listing_type === t || (typeFilter === 'Transport' && r.listing_type === 'bus_trip'))
    }
    if (statusFilter === 'Published') rows = rows.filter((r) => r.status === 'published')
    if (statusFilter === 'Unpublished') rows = rows.filter((r) => r.status === 'unpublished')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.owner_username.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q) ||
          r.category_label.toLowerCase().includes(q),
      )
    }
    return rows
  }, [listings, typeFilter, statusFilter, search])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Listings" subtitle="All marketplace listings and social content." />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Listings" subtitle="All marketplace listings and social content." />
        <DelveAdminError message="Could not load listings." onRetry={() => void refetch()} />
      </div>
    )
  }

  const unpublished = listings.filter((r) => r.status === 'unpublished').length

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Listings"
        subtitle={`${listings.length} total · ${unpublished} unpublished`}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search listings…">
        {TYPE_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={typeFilter === f} onClick={() => setTypeFilter(f)} />
        ))}
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No listings match" message="Try changing your search or filters." />
      ) : (
        <div className="da-stack">
          {filtered.map((item) => (
            <DelveAdminDataRow
              key={item.id}
              primary={item.title}
              secondary={`@${item.owner_username}${item.city ? ` · ${item.city}` : ''}${item.region ? ` · ${item.region}` : ''}${item.price_label ? ` · ${item.price_label}` : ''}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={item.category_label} variant="info" />
                  <DelveAdminStatusBadge status={item.status} variant={statusVariant(item.status)} />
                </>
              }
              actions={
                item.status === 'published' ? (
                  <button
                    type="button"
                    className="da-link-btn da-link-btn--danger"
                    onClick={() => setDialog({ item, publish: false })}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    className="da-link-btn"
                    onClick={() =>
                      updateMut.mutate({
                        listing_type: item.listing_type,
                        listing_id: item.listing_id,
                        published: true,
                      })
                    }
                  >
                    Republish
                  </button>
                )
              }
            />
          ))}
        </div>
      )}

      <DelveAdminVerifyDialog
        open={dialog != null && !dialog.publish}
        businessName={dialog ? dialog.item.title : ''}
        mode="reject"
        busy={updateMut.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          if (!dialog) return
          updateMut.mutate({
            listing_type: dialog.item.listing_type,
            listing_id: dialog.item.listing_id,
            published: false,
            reason,
          })
        }}
      />
    </div>
  )
}
