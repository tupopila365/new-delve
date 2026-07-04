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
import { useProviderFoodBookings } from '../hooks/useProviderFoodData'
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
  const { activeBusiness, canManageBookings } = useOutletContext<ProviderOutletContext>()
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')
  const includeTransport = allowedCategories.length === 0 || allowedCategories.includes('Transport')
  const includeFood = allowedCategories.length === 0 || allowedCategories.includes('Food')

  const { data: eventBookings = [] } = useProviderEventBookings(Boolean(profile && includeEvents))
  const { data: stayBookings = [] } = useProviderStayBookings(Boolean(profile && includeStays))
  const { data: transportBookings = [] } = useProviderTransportBookings(Boolean(profile && includeTransport))
  const { data: foodBookings = [] } = useProviderFoodBookings(Boolean(profile && includeFood))

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

  const transportBookingAction = (kind: 'rental' | 'seat', id: number, action: string) =>
    apiFetch(`/api/transport/provider-${kind === 'rental' ? 'rental' : 'seat'}-bookings/${id}/${action}/`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

  const confirmTransportMut = useMutation({
    mutationFn: ({ kind, id }: { kind: 'rental' | 'seat'; id: number }) =>
      transportBookingAction(kind, id, 'confirm'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-transport-bookings'] })
      void qc.invalidateQueries({ queryKey: ['provider-rental-bookings'] })
      void qc.invalidateQueries({ queryKey: ['provider-seat-bookings'] })
    },
  })

  const checkInTransportMut = useMutation({
    mutationFn: ({ kind, id }: { kind: 'rental' | 'seat'; id: number }) =>
      transportBookingAction(kind, id, 'check_in'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-transport-bookings'] })
      void qc.invalidateQueries({ queryKey: ['provider-rental-bookings'] })
      void qc.invalidateQueries({ queryKey: ['provider-seat-bookings'] })
    },
  })

  const confirmFoodMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/food/provider-reservations/${id}/confirm/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provider-food-reservations'] }),
  })

  const checkInFoodMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/food/provider-reservations/${id}/check_in/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provider-food-reservations'] }),
  })

  const scopedBookings = useMemo(
    () =>
      mergeProviderBookings(
        getProviderBookings(),
        eventBookings,
        allowedCategories,
        stayBookings,
        transportBookings,
        foodBookings,
      ),
    [allowedCategories, eventBookings, stayBookings, transportBookings, foodBookings],
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
        subtitle={
          canManageBookings
            ? bookingsPageSubtitle(businessTypes)
            : 'View bookings for your business. Confirm and check-in require staff access.'
        }
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
          message="When travellers request stays, food tables, guides, transport, or event RSVPs, they appear here."
        />
      ) : (
        <div className="prov-bookings__list">
          {bookings.map((b) => (
            <ProviderBookingCard
              key={`${b.source ?? 'mock'}-${b.id}`}
              booking={b}
              onConfirm={
                canManageBookings && b.source === 'event-api' && b.status === 'pending'
                  ? () => confirmEventMut.mutate(b.id)
                  : canManageBookings && b.source === 'stay-api' && b.status === 'pending'
                    ? () => confirmStayMut.mutate(b.id)
                    : canManageBookings &&
                        (b.source === 'transport-rental-api' || b.source === 'transport-seat-api') &&
                        b.status === 'pending'
                      ? () =>
                          confirmTransportMut.mutate({
                            kind: b.source === 'transport-rental-api' ? 'rental' : 'seat',
                            id: b.id,
                          })
                      : canManageBookings && b.source === 'food-api' && b.status === 'pending'
                        ? () => confirmFoodMut.mutate(b.id)
                        : undefined
              }
              onCheckIn={
                canManageBookings && b.source === 'event-api' && b.status === 'confirmed'
                  ? () => checkInEventMut.mutate(b.id)
                  : canManageBookings && b.source === 'stay-api' && b.status === 'confirmed'
                    ? () => checkInStayMut.mutate(b.id)
                    : canManageBookings &&
                        (b.source === 'transport-rental-api' || b.source === 'transport-seat-api') &&
                        b.status === 'confirmed'
                      ? () =>
                          checkInTransportMut.mutate({
                            kind: b.source === 'transport-rental-api' ? 'rental' : 'seat',
                            id: b.id,
                          })
                      : canManageBookings && b.source === 'food-api' && b.status === 'confirmed'
                        ? () => checkInFoodMut.mutate(b.id)
                        : undefined
              }
              confirmPending={
                (confirmEventMut.isPending && confirmEventMut.variables === b.id) ||
                (confirmStayMut.isPending && confirmStayMut.variables === b.id) ||
                (confirmTransportMut.isPending &&
                  confirmTransportMut.variables?.id === b.id &&
                  (b.source === 'transport-rental-api' || b.source === 'transport-seat-api')) ||
                (confirmFoodMut.isPending && confirmFoodMut.variables === b.id)
              }
              checkInPending={
                (checkInEventMut.isPending && checkInEventMut.variables === b.id) ||
                (checkInStayMut.isPending && checkInStayMut.variables === b.id) ||
                (checkInTransportMut.isPending &&
                  checkInTransportMut.variables?.id === b.id &&
                  (b.source === 'transport-rental-api' || b.source === 'transport-seat-api')) ||
                (checkInFoodMut.isPending && checkInFoodMut.variables === b.id)
              }
            />
          ))}
        </div>
      )}
    </ProviderUiPage>
  )
}
