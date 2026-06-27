import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderBookingCard } from '../components/provider/bookings'
import { ProviderUiChips, ProviderUiEmpty, ProviderUiHeader, ProviderUiPage, ProviderUiStats } from '../components/provider/ui'
import { getBookingStats, getProviderBookings } from '../data/providerData'
import { mergeProviderBookings, useProviderEventBookings } from '../hooks/useProviderEventData'
import { useProviderStayBookings } from '../hooks/useProviderStayData'
import { bookingsPageSubtitle, categoriesForBusinessTypes } from '../utils/providerCategories'

const STATUS_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Confirmed', label: 'Confirmed' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Cancelled', label: 'Cancelled' },
] as const

export function ProviderBookings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')

  const { data: eventBookings = [] } = useProviderEventBookings(Boolean(profile && includeEvents))
  const { data: stayBookings = [] } = useProviderStayBookings(Boolean(profile && includeStays))

  const confirmEventMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/events/provider-bookings/${id}/confirm/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-event-bookings'] })
      void qc.invalidateQueries({ queryKey: ['event-provider-analytics'] })
    },
  })

  const checkInEventMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/events/provider-bookings/${id}/check_in/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-event-bookings'] })
      void qc.invalidateQueries({ queryKey: ['event-provider-analytics'] })
    },
  })

  const confirmStayMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/accommodation/provider-bookings/${id}/confirm/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stay-bookings'] })
    },
  })

  const checkInStayMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/accommodation/provider-bookings/${id}/check_in/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stay-bookings'] })
    },
  })

  const scopedBookings = useMemo(
    () => mergeProviderBookings(getProviderBookings(), eventBookings, allowedCategories, stayBookings),
    [allowedCategories, eventBookings, stayBookings],
  )

  const stats = getBookingStats(scopedBookings)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const bookings = useMemo(() => {
    let rows = scopedBookings
    if (statusFilter !== 'All') {
      const key = statusFilter.toLowerCase()
      rows = rows.filter(
        (b) =>
          b.status === key ||
          (statusFilter === 'Pending' && ['requested', 'pending', 'reserved'].includes(b.status)) ||
          (statusFilter === 'Completed' && ['completed', 'checked_in', 'checked_out'].includes(b.status)),
      )
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (b) =>
          b.guest.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          b.guestUsername.toLowerCase().includes(q),
      )
    }
    return rows
  }, [scopedBookings, search, statusFilter])

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Bookings"
        subtitle={bookingsPageSubtitle(businessTypes)}
      />

      <ProviderUiStats
        stats={[
          { value: stats.pending, label: 'Pending', accent: stats.pending > 0 },
          { value: stats.confirmed, label: 'Confirmed' },
          { value: stats.completed, label: 'Completed' },
          { value: `N$${stats.revenue.toLocaleString()}`, label: 'Revenue' },
        ]}
        columns={4}
      />

      <ProviderUiChips
        chips={[...STATUS_FILTERS]}
        active={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter by status"
      />

      <label className="prov-ui__search">
        <span className="sr-only">Search bookings</span>
        <input
          type="search"
          placeholder="Search guest or service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {bookings.length === 0 ? (
        <ProviderUiEmpty
          title="No bookings match"
          message="When travellers request stays, guides, transport, or event RSVPs, they appear here."
        />
      ) : (
        <div className="prov-bookings__list">
          {bookings.map((b) => (
            <ProviderBookingCard
              key={`${b.source ?? 'mock'}-${b.id}`}
              booking={b}
              onConfirm={
                b.source === 'event-api' && b.status === 'pending'
                  ? () => confirmEventMut.mutate(b.id)
                  : b.source === 'stay-api' && b.status === 'pending'
                    ? () => confirmStayMut.mutate(b.id)
                    : undefined
              }
              onCheckIn={
                b.source === 'event-api' && b.status === 'confirmed'
                  ? () => checkInEventMut.mutate(b.id)
                  : b.source === 'stay-api' && b.status === 'confirmed'
                    ? () => checkInStayMut.mutate(b.id)
                    : undefined
              }
              confirmPending={
                (confirmEventMut.isPending && confirmEventMut.variables === b.id) ||
                (confirmStayMut.isPending && confirmStayMut.variables === b.id)
              }
              checkInPending={
                (checkInEventMut.isPending && checkInEventMut.variables === b.id) ||
                (checkInStayMut.isPending && checkInStayMut.variables === b.id)
              }
            />
          ))}
        </div>
      )}
    </ProviderUiPage>
  )
}
