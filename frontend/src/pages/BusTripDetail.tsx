import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Bus } from 'lucide-react'
import { apiFetch } from '../api/client'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { BusTripDetailView } from '../components/transport'
import type { GroupReserveResponse, Reservation } from '../components/booking/transport/BusTripReserveCard'
import { EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { friendlyApiMessage } from '../utils/friendlyError'
import type { BusTripListing } from '../utils/transportListing'

const DEFAULT_QUESTIONS = [
  { id: 'b1', author: 'Sam N.', body: 'How much luggage space is there under the bus?', ago: '3d ago' },
  { id: 'b2', author: 'Leah P.', body: 'Does this route stop for food in Rehoboth?', ago: '1w ago' },
]

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

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => apiFetch<BusTripListing>(`/api/transport/bus/trips/${id}/`, { auth: false }),
  })

  const taken = useMemo(() => new Set(trip?.occupied_seats ?? []), [trip?.occupied_seats])

  const blockSeats = useMemo(() => {
    if (firstSeat == null || !trip) return []
    const out: number[] = []
    for (let i = 0; i < passengers; i += 1) {
      const n = firstSeat + i
      if (n > trip.total_seats) return []
      out.push(n)
    }
    return out
  }, [firstSeat, passengers, trip])

  const blockValid = useMemo(() => {
    if (!trip || !blockSeats.length) return false
    if (blockSeats.length !== passengers) return false
    return blockSeats.every((n) => !taken.has(n))
  }, [blockSeats, passengers, taken, trip])

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
    },
    onError: (e) => setErr(friendlyApiMessage(e, "That block couldn't be reserved. Try other seats.")),
  })

  const payMut = useMutation({
    mutationFn: async (rows: Reservation[]) => {
      const ids = rows.map((r) => r.id)
      if (ids.length > 1) {
        return apiFetch<{
          status: string
          mock_payment_ref: string
          reservations: Reservation[]
        }>('/api/transport/bus/reservations/bulk-mock-pay/', {
          method: 'POST',
          body: JSON.stringify({ reservation_ids: ids }),
        })
      }
      return apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/bus/reservations/${ids[0]}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      )
    },
    onSuccess: (r) => {
      setGroup((g) => {
        if (!g?.reservations.length) return g
        if ('reservations' in r && Array.isArray(r.reservations)) {
          return { ...g, reservations: r.reservations }
        }
        const paid = r as { status: string; mock_payment_ref: string }
        return {
          ...g,
          reservations: g.reservations.map((x) => ({
            ...x,
            status: paid.status,
            mock_payment_ref: paid.mock_payment_ref,
          })),
        }
      })
    },
    onError: (e) => setErr(friendlyApiMessage(e, "The practice payment didn't go through.")),
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
      <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page">
        <DetailSkeleton className="acc-page__detail-skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this bus trip"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!trip || !id) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page">
        <EmptyState
          iconElement={<Bus size={28} strokeWidth={2} aria-hidden />}
          title="Bus trip not found"
          sub="This route may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page" toast={shareMsg || null}>
      <BusTripDetailView
        trip={trip}
        tripId={id}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(`${trip.route_detail.origin} to ${trip.route_detail.destination}`)}
        initialQuestions={DEFAULT_QUESTIONS}
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
          onPay: () => group && payMut.mutate(group.reservations),
          isPayPending: payMut.isPending,
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
    </DetailPage>
  )
}
