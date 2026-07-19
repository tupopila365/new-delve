import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Bus } from 'lucide-react'
import { apiFetch } from '../api/client'
import { BusTripDetailView } from '../components/transport'
import type { GroupReserveResponse } from '../components/booking/transport/BusTripReserveCard'
import { StripeSimPayModal } from '../components/payments/StripeSimPayModal'
import { EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { friendlyApiMessage } from '../utils/friendlyError'
import { isSeatBlockValid, seatBlockForStart } from '../utils/transportSeatBlock'
import type { BusTripListing } from '../utils/transportListing'
import type { PayTarget } from '../utils/stripeSim'
import '../components/journeys/journey-detail.css'
import '../components/transport/transport-detail.css'

export function BusTripDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [seatPref, setSeatPref] = useState('any')
  const [firstSeat, setFirstSeat] = useState<number | null>(null)
  const [group, setGroup] = useState<GroupReserveResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [payTargets, setPayTargets] = useState<PayTarget[]>([])

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => apiFetch<BusTripListing>(`/api/transport/bus/trips/${id}/`, { auth: false }),
  })

  const taken = useMemo(() => new Set(trip?.occupied_seats ?? []), [trip?.occupied_seats])

  const blockSeats = useMemo(() => {
    if (firstSeat == null || !trip) return []
    return seatBlockForStart(firstSeat, passengers)
  }, [firstSeat, passengers, trip])

  const blockValid = useMemo(() => {
    if (!trip || !blockSeats.length) return false
    return isSeatBlockValid(blockSeats, trip.total_seats, passengers, taken)
  }, [blockSeats, passengers, taken, trip])

  useEffect(() => {
    if (firstSeat != null && !blockValid) {
      setFirstSeat(null)
    }
  }, [firstSeat, blockValid])

  const totalPrice = useMemo(() => {
    if (!trip) return null
    return (Number(trip.price) * passengers).toFixed(0)
  }, [trip, passengers])

  const bookMut = useMutation({
    mutationFn: () =>
      apiFetch<GroupReserveResponse>('/api/transport/bus/reservations/', {
        method: 'POST',
        body: JSON.stringify({
          trip: Number(id),
          seat_numbers: blockSeats,
        }),
      }),
    onSuccess: (data) => {
      setGroup(data)
      void qc.invalidateQueries({ queryKey: ['trip', id] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'seats'] })
    },
    onError: (e) => {
      setErr(friendlyApiMessage(e, "That block couldn't be reserved. Try other seats."))
      void qc.invalidateQueries({ queryKey: ['trip', id] })
      setFirstSeat(null)
    },
  })

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const handleBook = () => {
    setErr(null)
    if (!profile) {
      nav('/login')
      return
    }
    if (!profile.email_verified) {
      nav('/verify-email')
      return
    }
    if (!blockValid) {
      document.getElementById('bus-seats')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setErr('Choose an available seat block first.')
      return
    }
    bookMut.mutate()
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page tp-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page tp-detail-page">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this bus trip"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!trip || !id) {
    return (
      <div className="jn-detail-page tp-detail-page">
        <EmptyState
          iconElement={<Bus size={28} strokeWidth={2} aria-hidden />}
          title="Bus trip not found"
          sub="This route may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
        />
      </div>
    )
  }

  return (
    <div className="jn-detail-page tp-detail-page">
      {shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}
      {err ? (
        <p className="jn-detail-page__toast" role="alert">
          {err}
        </p>
      ) : null}
      <BusTripDetailView
        trip={trip}
        tripId={id}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(`${trip.route_detail.origin} to ${trip.route_detail.destination}`)}
        booking={{
          passengers,
          seatPref,
          onPassengersChange: (n) => {
            setPassengers(n)
            setFirstSeat(null)
          },
          onSeatPrefChange: setSeatPref,
          onBook: handleBook,
          isPending: bookMut.isPending,
          err,
          onDismissErr: () => setErr(null),
          profile,
          group,
          totalPrice,
          onPay: () => {
            if (!group?.reservations.length) return
            const ids = group.reservations.map((r) => r.id)
            const amount = totalPrice ? `N$${totalPrice}` : undefined
            if (ids.length > 1) {
              setPayTargets([
                {
                  target_type: 'bus_seat_bulk',
                  target_id: ids.join('-'),
                  amountLabel: amount,
                  title: `${trip.route_detail.origin} → ${trip.route_detail.destination}`,
                  metadata: { reservation_ids: ids },
                },
              ])
            } else {
              setPayTargets([
                {
                  target_type: 'bus_seat',
                  target_id: String(ids[0]),
                  amountLabel: amount,
                  title: `${trip.route_detail.origin} → ${trip.route_detail.destination}`,
                },
              ])
            }
          },
          isPayPending: false,
          seats: {
            passengers,
            firstSeat,
            blockSeats,
            blockValid,
            taken,
            onSelectSeat: setFirstSeat,
          },
        }}
      />
      <StripeSimPayModal
        open={payTargets.length > 0}
        targets={payTargets}
        onClose={() => setPayTargets([])}
        onSuccess={(intents) => {
          const ref = intents[0]?.id ?? ''
          setGroup((g) => {
            if (!g?.reservations.length) return g
            return {
              ...g,
              reservations: g.reservations.map((x) => ({
                ...x,
                mock_payment_ref: ref,
              })),
            }
          })
          setPayTargets([])
          void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'seats'] })
        }}
      />
    </div>
  )
}
