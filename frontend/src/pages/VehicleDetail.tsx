import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Car } from 'lucide-react'
import { apiFetch } from '../api/client'
import { DetailPage, DetailSkeleton } from '../components/detail'
import { VehicleDetailView, type VehicleBooking } from '../components/transport'
import { EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { friendlyApiMessage } from '../utils/friendlyError'
import type { VehicleListing } from '../utils/transportListing'

const DEFAULT_QUESTIONS = [
  { id: 'v1', author: 'Jonas T.', body: 'Ask about gravel-road insurance before heading north.', ago: '1d ago' },
  { id: 'v2', author: 'Priya M.', body: 'Airport pickup was smooth — allow 20 min at Hosea Kutako.', ago: '4d ago' },
]

export function VehicleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pickupArea, setPickupArea] = useState('')
  const [booking, setBooking] = useState<VehicleBooking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: vehicle, isLoading, isError, refetch } = useQuery({
    queryKey: ['veh', id],
    enabled: !!id,
    queryFn: () => apiFetch<VehicleListing>(`/api/transport/vehicles/${id}/`, { auth: false }),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<VehicleBooking>('/api/transport/vehicle-bookings/', {
        method: 'POST',
        body: JSON.stringify({ listing: Number(id), start_date: start, end_date: end }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['veh-bookings'] })
    },
    onError: (e) => setErr(friendlyApiMessage(e, "We couldn't save that request. Try again.")),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/vehicle-bookings/${bid}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
    onError: (e) =>
      setErr(friendlyApiMessage(e, "The practice payment didn't go through.")),
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

  const handleReserve = () => {
    setErr(null)
    if (!profile) {
      nav('/login')
      return
    }
    if (!profile.email_verified) {
      nav('/verify-email')
      return
    }
    if (!start) {
      setErr('Choose a pick-up date.')
      return
    }
    if (!end) {
      setErr('Choose a return date.')
      return
    }
    if (new Date(end) < new Date(start)) {
      setErr('Choose a return date on or after pick-up.')
      return
    }
    createMut.mutate()
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
          title="We couldn't load this vehicle"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  if (!vehicle || !id) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page">
        <EmptyState
          iconElement={<Car size={28} strokeWidth={2} aria-hidden />}
          title="Vehicle not found"
          sub="This vehicle may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
          className="acc-detail__empty"
        />
      </DetailPage>
    )
  }

  return (
    <DetailPage prefix="tp-detail" className="tp-detail--premium td acc-detail-page" toast={shareMsg || null}>
      <VehicleDetailView
        vehicle={vehicle}
        vehicleId={id}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(vehicle.title)}
        initialQuestions={DEFAULT_QUESTIONS}
        booking={{
          start,
          end,
          pickupArea,
          onStartChange: setStart,
          onEndChange: setEnd,
          onPickupAreaChange: setPickupArea,
          onReserve: handleReserve,
          isPending: createMut.isPending,
          err,
          onDismissErr: () => setErr(null),
          profile,
          booking,
          onPay: () => booking && payMut.mutate(booking.id),
          isPayPending: payMut.isPending,
        }}
      />
    </DetailPage>
  )
}
