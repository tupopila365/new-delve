import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { AdminBooking, AdminBookingDetail } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminDrawer,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'
import { statusVariant } from '../data/demoData'

const TYPE_FILTERS = ['All', 'Stays', 'Guides', 'Transport', 'Bus', 'Events', 'Food'] as const

const TYPE_MAP: Record<string, string> = {
  Stays: 'accommodation',
  Guides: 'guide',
  Transport: 'vehicle',
  Bus: 'bus_seat',
  Events: 'event',
  Food: 'food',
}

const STATUS_FILTERS = [
  'All',
  'pending',
  'confirmed',
  'completed',
  'checked_in',
  'checked_out',
  'cancelled',
  'refunded',
] as const

function bookingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    accommodation: 'Stay',
    guide: 'Guide',
    vehicle: 'Vehicle',
    bus_seat: 'Bus seat',
    event: 'Event',
    food: 'Food reservation',
  }
  return map[type] || type
}

export function BookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [note, setNote] = useState('')

  const { data: bookings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => asArray<AdminBooking>(await apiFetch('/api/accounts/admin/bookings/')),
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['booking', selected?.booking_type, selected?.booking_id],
    queryFn: () =>
      apiFetch<AdminBookingDetail>(
        `/api/accounts/admin/bookings/${selected!.booking_type}/${selected!.booking_id}/`,
      ),
    enabled: selected != null,
  })

  const updateMut = useMutation({
    mutationFn: (payload: { booking_type: string; booking_id: number; note?: string; status?: string }) =>
      apiFetch<AdminBookingDetail>(
        `/api/accounts/admin/bookings/${payload.booking_type}/${payload.booking_id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ note: payload.note, status: payload.status }),
        },
      ),
    onSuccess: () => {
      setNote('')
      void qc.invalidateQueries({ queryKey: ['bookings'] })
      void qc.invalidateQueries({ queryKey: ['booking', selected?.booking_type, selected?.booking_id] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const filtered = useMemo(() => {
    let rows = bookings
    if (typeFilter !== 'All') {
      rows = rows.filter((r) => r.booking_type === TYPE_MAP[typeFilter])
    }
    if (statusFilter !== 'All') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.listing_title.toLowerCase().includes(q) ||
          r.customer_username.toLowerCase().includes(q) ||
          r.provider_username.toLowerCase().includes(q),
      )
    }
    return rows
  }, [bookings, typeFilter, statusFilter, search])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Bookings" subtitle="All reservations across DELVE services." />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Bookings" subtitle="All reservations across DELVE services." />
        <DelveAdminError message="Could not load bookings." onRetry={() => void refetch()} />
      </div>
    )
  }

  const pending = bookings.filter((b) => b.status === 'pending').length
  const disputed = bookings.filter((b) => b.has_dispute_notes).length

  return (
    <div className="da-page">
      <DelveAdminPageHeader title="Bookings" subtitle="Cross-vertical reservations and dispute notes." />

      <DelveAdminStatGrid
        stats={[
          { value: bookings.length, label: 'Total bookings' },
          { value: pending, label: 'Pending', warn: pending > 0 },
          { value: disputed, label: 'With notes', warn: disputed > 0 },
        ]}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search bookings…">
        {TYPE_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={typeFilter === f} onClick={() => setTypeFilter(f)} />
        ))}
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip
            key={f}
            label={f === 'All' ? 'All statuses' : f}
            active={statusFilter === f}
            onClick={() => setStatusFilter(f)}
          />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No bookings match" message="Try changing your search or filters." />
      ) : (
        <div className="da-stack">
          {filtered.map((b) => (
            <DelveAdminDataRow
              key={b.id}
              primary={b.listing_title}
              secondary={`@${b.customer_username} → @${b.provider_username} · ${b.start_date}${b.total_price ? ` · N$${b.total_price}` : ''}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={bookingTypeLabel(b.booking_type)} variant="info" />
                  <DelveAdminStatusBadge status={b.status} variant={statusVariant(b.status)} />
                  {b.has_dispute_notes ? (
                    <DelveAdminStatusBadge status="Has notes" variant="warning" />
                  ) : null}
                </>
              }
              actions={
                <button type="button" className="da-link-btn" onClick={() => setSelected(b)}>
                  View
                </button>
              }
            />
          ))}
        </div>
      )}

      <DelveAdminDrawer
        open={selected != null}
        title={selected ? `Booking — ${selected.listing_title}` : ''}
        onClose={() => {
          setSelected(null)
          setNote('')
        }}
      >
        {loadingDetail || !detail ? (
          <DelveAdminLoading count={3} />
        ) : (
          <>
            <dl className="da-dl">
              <div>
                <dt>Type</dt>
                <dd>{bookingTypeLabel(detail.booking_type)}</dd>
              </div>
              <div>
                <dt>Listing</dt>
                <dd>{detail.listing_title}</dd>
              </div>
              {detail.booking_type === 'event' && detail.booking_ref ? (
                <div>
                  <dt>Booking ref</dt>
                  <dd>{detail.booking_ref}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'event' && detail.tickets != null ? (
                <div>
                  <dt>Tickets</dt>
                  <dd>{detail.tickets}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'accommodation' && detail.guests != null ? (
                <div>
                  <dt>Guests</dt>
                  <dd>{detail.guests}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'accommodation' && detail.room_type_name ? (
                <div>
                  <dt>Room type</dt>
                  <dd>{detail.room_type_name}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'food' && detail.party_size != null ? (
                <div>
                  <dt>Party size</dt>
                  <dd>{detail.party_size}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.package_title ? (
                <div>
                  <dt>Package</dt>
                  <dd>{detail.package_title}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.guide_headline ? (
                <div>
                  <dt>Guide</dt>
                  <dd>{detail.guide_headline}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.group_size != null ? (
                <div>
                  <dt>Travellers</dt>
                  <dd>{detail.group_size}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.duration_hours != null ? (
                <div>
                  <dt>Duration</dt>
                  <dd>{detail.duration_hours}h</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.start_time ? (
                <div>
                  <dt>Start time</dt>
                  <dd>{detail.start_time}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.meeting_point ? (
                <div>
                  <dt>Meeting point</dt>
                  <dd>{detail.meeting_point}</dd>
                </div>
              ) : null}
              {detail.special_requests ? (
                <div>
                  <dt>{detail.booking_type === 'accommodation' ? 'Special requests' : 'Notes'}</dt>
                  <dd>{detail.special_requests}</dd>
                </div>
              ) : null}
              {detail.booking_type === 'guide' && detail.notes ? (
                <div>
                  <dt>Traveller notes</dt>
                  <dd>{detail.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt>Customer</dt>
                <dd>@{detail.customer_username}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>@{detail.provider_username}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <DelveAdminStatusBadge status={detail.status} variant={statusVariant(detail.status)} />
                </dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd>
                  {detail.start_date}
                  {detail.end_date ? ` → ${detail.end_date}` : ''}
                </dd>
              </div>
              {detail.total_price ? (
                <div>
                  <dt>Total</dt>
                  <dd>N${detail.total_price}</dd>
                </div>
              ) : null}
              {detail.mock_payment_ref ? (
                <div>
                  <dt>Payment ref</dt>
                  <dd>{detail.mock_payment_ref}</dd>
                </div>
              ) : null}
            </dl>

            {detail.dispute_notes.length > 0 ? (
              <div className="da-notes">
                <h3>Dispute & support notes</h3>
                <ul>
                  {detail.dispute_notes.map((n) => (
                    <li key={n.id}>
                      <strong>@{n.author_username}</strong> · {new Date(n.created_at).toLocaleString()}
                      <p>{n.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="da-field">
              <span>Add note</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dispute details, resolution steps…" />
            </label>

            <div className="da-verify-actions">
              <button
                type="button"
                className="da-btn da-btn--primary"
                disabled={updateMut.isPending || !note.trim()}
                onClick={() =>
                  selected &&
                  updateMut.mutate({
                    booking_type: selected.booking_type,
                    booking_id: selected.booking_id,
                    note: note.trim(),
                  })
                }
              >
                Save note
              </button>
              {detail.status === 'pending' ? (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() =>
                    selected &&
                    updateMut.mutate({
                      booking_type: selected.booking_type,
                      booking_id: selected.booking_id,
                      status: 'confirmed',
                    })
                  }
                >
                  Mark confirmed
                </button>
              ) : null}
              {detail.booking_type === 'guide' && detail.status === 'confirmed' ? (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() =>
                    selected &&
                    updateMut.mutate({
                      booking_type: selected.booking_type,
                      booking_id: selected.booking_id,
                      status: 'completed',
                    })
                  }
                >
                  Mark completed
                </button>
              ) : null}
              {!['cancelled', 'refunded', 'completed'].includes(detail.status) ? (
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={updateMut.isPending}
                  onClick={() =>
                    selected &&
                    updateMut.mutate({
                      booking_type: selected.booking_type,
                      booking_id: selected.booking_id,
                      status: 'cancelled',
                    })
                  }
                >
                  Cancel booking
                </button>
              ) : null}
            </div>
          </>
        )}
      </DelveAdminDrawer>
    </div>
  )
}
