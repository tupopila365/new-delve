import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bus, CalendarDays, Car, MessageCircle, Plus } from 'lucide-react'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  BusTripListingCard,
  BusTripListingForm,
  EMPTY_BUS_TRIP_FORM,
  EMPTY_VEHICLE_LISTING_FORM,
  VehicleListingCard,
  VehicleListingForm,
  busTripToForm,
  formToBusTripPayload,
  formToVehiclePayload,
  vehicleToForm,
  type ProviderBusTripListing,
  type ProviderVehicleListing,
} from '../components/provider/transport'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import {
  PASSENGER_TRANSPORT_SCOPE,
  TRANSPORT_MODE_LABELS,
  hasRentalTransport,
  hasSharedTransport,
  resolveTransportModes,
} from '../data/transportProvider'
import { ListSkeleton } from '../components/ui'
import '../components/provider/transport/transport-admin.css'
import '../components/provider/transport/transport-listing.css'

type RentalBooking = {
  id: number
  vehicle_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  days: number
  total_price: string
  status: string
  renter_document_count?: number
}

type SeatBooking = {
  id: number
  route_label: string
  passenger_display_name: string
  passenger_username: string
  seat: number
  date: string
  total_price: string
  status: string
}

const RENTAL_TABS = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'rentals', label: 'Rentals' },
] as const

const SHARED_TABS = [
  { id: 'routes', label: 'Routes' },
  { id: 'seats', label: 'Seats' },
] as const

const ALL_TABS = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'routes', label: 'Routes' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'seats', label: 'Seats' },
] as const

function statusClass(status: string) {
  if (status === 'confirmed') return 'prov-ui__status prov-ui__status--confirmed'
  if (status === 'pending') return 'prov-ui__status prov-ui__status--pending'
  return 'prov-ui__status'
}

export function TransportAdmin() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { activeBusiness, canAccessProvider, canManageListings, canManageBookings, isViewerOnly } = useBusinessAccess()

  const modes = resolveTransportModes(activeBusiness)
  const showRental = hasRentalTransport(modes)
  const showShared = hasSharedTransport(modes)

  const tabs = useMemo(() => {
    if (showRental && showShared) return [...ALL_TABS]
    if (showRental) return [...RENTAL_TABS]
    if (showShared) return [...SHARED_TABS]
    return [...ALL_TABS]
  }, [showRental, showShared])

  const defaultTab = showRental ? 'fleet' : showShared ? 'routes' : 'fleet'
  const [tab, setTab] = useState<string>(defaultTab)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showBusForm, setShowBusForm] = useState(false)
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null)
  const [editBusId, setEditBusId] = useState<number | null>(null)
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_LISTING_FORM)
  const [busForm, setBusForm] = useState(EMPTY_BUS_TRIP_FORM)
  const [vehicleErr, setVehicleErr] = useState('')
  const [busErr, setBusErr] = useState('')

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['provider-vehicles'],
    queryFn: () => apiFetch<ProviderVehicleListing[]>('/api/transport/provider-vehicles/'),
    enabled: Boolean(profile && canAccessProvider && showRental),
  })

  const { data: busTrips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['provider-bus-trips'],
    queryFn: () => apiFetch<ProviderBusTripListing[]>('/api/transport/provider-bus-trips/'),
    enabled: Boolean(profile && canAccessProvider && showShared),
  })

  const { data: rentalBookings = [] } = useQuery({
    queryKey: ['provider-rental-bookings'],
    queryFn: () => apiFetch<RentalBooking[]>('/api/transport/provider-rental-bookings/'),
    enabled: Boolean(profile && canAccessProvider && showRental),
  })

  const { data: seatBookings = [] } = useQuery({
    queryKey: ['provider-seat-bookings'],
    queryFn: () => apiFetch<SeatBooking[]>('/api/transport/provider-seat-bookings/'),
    enabled: Boolean(profile && canAccessProvider && showShared),
  })

  const saveVehicleMut = useMutation({
    mutationFn: async () => {
      const body = formToVehiclePayload(vehicleForm)
      if (editVehicleId) {
        return apiFetch<ProviderVehicleListing>(`/api/transport/provider-vehicles/${editVehicleId}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      return apiFetch<ProviderVehicleListing>('/api/transport/provider-vehicles/', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-vehicles'] })
      setShowVehicleForm(false)
      setEditVehicleId(null)
      setVehicleForm(EMPTY_VEHICLE_LISTING_FORM)
      setVehicleErr('')
    },
    onError: (e: Error) => setVehicleErr(friendlyApiMessage(e)),
  })

  const saveBusMut = useMutation({
    mutationFn: async () => {
      const body = formToBusTripPayload(busForm)
      if (editBusId) {
        return apiFetch<ProviderBusTripListing>(`/api/transport/provider-bus-trips/${editBusId}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      return apiFetch<ProviderBusTripListing>('/api/transport/provider-bus-trips/', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-bus-trips'] })
      setShowBusForm(false)
      setEditBusId(null)
      setBusForm(EMPTY_BUS_TRIP_FORM)
      setBusErr('')
    },
    onError: (e: Error) => setBusErr(friendlyApiMessage(e)),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  const modeLabel = modes.map((m) => TRANSPORT_MODE_LABELS[m]).join(' & ') || 'Passenger transport'
  const pendingRentals = rentalBookings.filter((b) => b.status === 'pending').length
  const pendingSeats = seatBookings.filter((b) => b.status === 'pending').length
  const missingPhotos = vehicles.filter((v) => !v.cover_image).length
  const revenue =
    rentalBookings.filter((b) => b.status === 'confirmed').reduce((s, b) => s + parseFloat(b.total_price), 0) +
    seatBookings.filter((b) => b.status === 'confirmed').reduce((s, b) => s + parseFloat(b.total_price), 0)

  const openCreateVehicle = () => {
    setEditVehicleId(null)
    setVehicleForm(EMPTY_VEHICLE_LISTING_FORM)
    setShowVehicleForm(true)
    setVehicleErr('')
    setTab('fleet')
  }

  const openEditVehicle = (v: ProviderVehicleListing) => {
    setEditVehicleId(v.id)
    setVehicleForm(vehicleToForm(v))
    setShowVehicleForm(true)
    setVehicleErr('')
  }

  const openCreateBus = () => {
    setEditBusId(null)
    setBusForm({
      ...EMPTY_BUS_TRIP_FORM,
      operator_name: activeBusiness?.business_name ?? '',
    })
    setShowBusForm(true)
    setBusErr('')
    setTab('routes')
  }

  const openEditBus = (t: ProviderBusTripListing) => {
    setEditBusId(t.id)
    setBusForm(busTripToForm(t))
    setShowBusForm(true)
    setBusErr('')
  }

  const attention = [
    ...(showRental && missingPhotos > 0
      ? [{ id: 'photos', label: `${missingPhotos} vehicle${missingPhotos === 1 ? '' : 's'} missing photos`, action: 'Add photos', onClick: () => setTab('fleet') }]
      : []),
    ...(pendingRentals + pendingSeats > 0
      ? [{
          id: 'pending',
          label: `${pendingRentals + pendingSeats} booking${pendingRentals + pendingSeats === 1 ? '' : 's'} pending`,
          action: 'Review bookings',
          onClick: () => setTab(pendingRentals > 0 ? 'rentals' : 'seats'),
        }]
      : []),
  ]

  const stats = [
    ...(showRental ? [{ value: vehicles.length, label: 'Vehicles' }] : []),
    ...(showShared ? [{ value: busTrips.length, label: 'Trips' }] : []),
    { value: rentalBookings.length + seatBookings.length || '—', label: 'Bookings', accent: pendingRentals + pendingSeats > 0 },
    { value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },
  ]

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Transport"
        subtitle={
          isViewerOnly
            ? `View ${modeLabel.toLowerCase()} listings and passenger bookings.`
            : `Manage ${modeLabel.toLowerCase()} — what travellers see on your public transport pages.`
        }
        actions={
          <>
            <Link to="/transport" className="prov-ui__btn prov-ui__btn--ghost">View public</Link>
            {canManageListings && showRental ? (
              <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={openCreateVehicle}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add vehicle
              </button>
            ) : canManageListings && showShared ? (
              <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={openCreateBus}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add trip
              </button>
            ) : null}
          </>
        }
      />

      <div className="transport-scope">
        <strong>{PASSENGER_TRANSPORT_SCOPE.title}</strong>
        <p>{PASSENGER_TRANSPORT_SCOPE.summary}</p>
        {modes.length > 0 ? (
          <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'rgba(255,250,242,0.7)' }}>
            Your business: <strong>{modeLabel}</strong>
          </p>
        ) : null}
      </div>

      {attention.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Needs attention</h2>
          <ul className="prov-ui__attention">
            {attention.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <button type="button" className="prov-ui__link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={item.onClick}>
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="prov-ui__section-title">Quick links</h2>
        <div className="prov-ui__shortcuts">
          {showRental && canManageListings ? (
            <button type="button" className="prov-ui__shortcut" onClick={openCreateVehicle}>
              <Car size={18} strokeWidth={2.25} aria-hidden />
              <span>Add vehicle</span>
            </button>
          ) : null}
          {showShared && canManageListings ? (
            <button type="button" className="prov-ui__shortcut" onClick={openCreateBus}>
              <Bus size={18} strokeWidth={2.25} aria-hidden />
              <span>Add trip</span>
            </button>
          ) : null}
          <button type="button" className="prov-ui__shortcut" onClick={() => setTab(showRental ? 'rentals' : 'seats')}>
            <CalendarDays size={18} strokeWidth={2.25} aria-hidden />
            <span>Bookings</span>
          </button>
          <Link to="/provider/messages" className="prov-ui__shortcut">
            <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
            <span>Messages</span>
          </Link>
      </div>
      </section>

      <ProviderUiStats columns={4} stats={stats} />

      <ProviderUiChips chips={tabs} active={tab} onChange={setTab} ariaLabel="Transport sections" />

      {tab === 'fleet' && showRental && (
        <section id="fleet">
          {loadingVehicles ? (
            <ListSkeleton count={2} variant="row" />
          ) : vehicles.length === 0 ? (
            <>
              <ProviderUiEmpty
                title="No rental vehicles yet"
                message="Add cars, 4×4s, or vans with photos, daily rate, pickup location, and included features."
              />
              {canManageListings ? (
                <button type="button" className="transport-add-btn" onClick={openCreateVehicle}>Add rental vehicle</button>
              ) : null}
            </>
          ) : (
            <div className="transport-list">
              {vehicles.map((v) => (
                <VehicleListingCard key={v.id} vehicle={v} canEdit={canManageListings} onEdit={() => openEditVehicle(v)} />
                        ))}
                      </div>
                    )}
          {canManageListings && vehicles.length > 0 ? (
            <button type="button" className="transport-add-btn" onClick={openCreateVehicle}>Add rental vehicle</button>
          ) : null}
        </section>
      )}

      {tab === 'routes' && showShared && (
        <section id="routes">
          {loadingTrips ? (
            <ListSkeleton count={2} variant="row" />
          ) : busTrips.length === 0 ? (
            <>
              <ProviderUiEmpty
                title="No shared trips yet"
                message="Add bus or shuttle routes with departure times, fares, seat capacity, and onboard amenities."
              />
              {canManageListings ? (
                <button type="button" className="transport-add-btn" onClick={openCreateBus}>Add shared trip</button>
              ) : null}
            </>
          ) : (
            <div className="transport-list">
              {busTrips.map((t) => (
                <BusTripListingCard key={t.id} trip={t} canEdit={canManageListings} onEdit={() => openEditBus(t)} />
              ))}
            </div>
          )}
          {canManageListings && busTrips.length > 0 ? (
            <button type="button" className="transport-add-btn" onClick={openCreateBus}>Add shared trip</button>
          ) : null}
        </section>
      )}

      {tab === 'rentals' && showRental && (
        <section id="rentals">
          {!canManageBookings ? <p className="stay-hint">Your role can view transport but not manage bookings.</p> : null}
          {rentalBookings.length === 0 ? (
            <ProviderUiEmpty title="No vehicle rentals yet" message="Passenger rental requests will appear here." />
          ) : (
            <div className="prov-ui__list">
              {rentalBookings.map((r) => (
                <article key={r.id} className="prov-ui__booking">
                  <div className="prov-ui__booking-top">
                    <span className="prov-ui__booking-avatar" aria-hidden>{r.guest_display_name.charAt(0)}</span>
                    <div className="prov-ui__booking-meta">
                      <strong>{r.guest_display_name}</strong>
                      <span>{r.vehicle_title}</span>
                    </div>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </div>
                  <div className="prov-ui__booking-details">
                    <span>
                      {r.check_in} → {r.check_out} · {r.days} days
                      {(r.renter_document_count ?? 0) > 0
                        ? ` · ${r.renter_document_count} doc${r.renter_document_count === 1 ? '' : 's'} uploaded`
                        : ''}
                    </span>
                    <strong>N${parseFloat(r.total_price).toLocaleString()}</strong>
                  </div>
                </article>
              ))}
                </div>
          )}
        </section>
      )}

      {tab === 'seats' && showShared && (
        <section id="seats">
          {seatBookings.length === 0 ? (
            <ProviderUiEmpty title="No seat bookings yet" message="Passenger seat reservations will appear here." />
          ) : (
            <div className="prov-ui__list">
              {seatBookings.map((r) => (
                <article key={r.id} className="prov-ui__booking">
                  <div className="prov-ui__booking-top">
                    <span className="prov-ui__booking-avatar" aria-hidden>{r.passenger_display_name.charAt(0)}</span>
                    <div className="prov-ui__booking-meta">
                      <strong>{r.passenger_display_name}</strong>
                      <span>{r.route_label}</span>
                    </div>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </div>
                  <div className="prov-ui__booking-details">
                    <span>{r.date} · Seat {r.seat}</span>
                    <strong>N${parseFloat(r.total_price).toLocaleString()}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showVehicleForm && canManageListings ? (
        <VehicleListingForm
          values={vehicleForm}
          onChange={setVehicleForm}
          error={vehicleErr}
          saving={saveVehicleMut.isPending}
          isEdit={Boolean(editVehicleId)}
          onSubmit={() => saveVehicleMut.mutate()}
          onCancel={() => {
            setShowVehicleForm(false)
            setEditVehicleId(null)
            setVehicleForm(EMPTY_VEHICLE_LISTING_FORM)
            setVehicleErr('')
          }}
        />
      ) : null}

      {showBusForm && canManageListings ? (
        <BusTripListingForm
          values={busForm}
          onChange={setBusForm}
          error={busErr}
          saving={saveBusMut.isPending}
          isEdit={Boolean(editBusId)}
          onSubmit={() => saveBusMut.mutate()}
          onCancel={() => {
            setShowBusForm(false)
            setEditBusId(null)
            setBusForm(EMPTY_BUS_TRIP_FORM)
            setBusErr('')
          }}
        />
      ) : null}
    </ProviderUiPage>
  )
}
