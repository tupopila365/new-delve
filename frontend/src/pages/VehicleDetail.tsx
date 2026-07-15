import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Car } from 'lucide-react'
import { apiFetch } from '../api/client'
import { VehicleDetailView, type VehicleBooking } from '../components/transport'
import { renterUploadFromFile } from '../components/booking/transport/RenterDocumentUploads'
import { EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { friendlyApiMessage } from '../utils/friendlyError'
import { missingRenterDocuments, type RenterDocumentUpload } from '../data/renterDocuments'
import type { VehicleListing } from '../utils/transportListing'
import '../components/journeys/journey-detail.css'
import '../components/transport/transport-detail.css'

export function VehicleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canManageListingForOwner } = useBusinessAccess()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pickupArea, setPickupArea] = useState('')
  const [booking, setBooking] = useState<VehicleBooking | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [renterDocuments, setRenterDocuments] = useState<Record<string, RenterDocumentUpload | undefined>>({})

  const { data: vehicle, isLoading, isError, refetch } = useQuery({
    queryKey: ['veh', id],
    enabled: !!id,
    queryFn: () => apiFetch<VehicleListing>(`/api/transport/vehicles/${id}/`, { auth: false }),
  })

  const createMut = useMutation({
    mutationFn: () => {
      const docs = Object.values(renterDocuments).filter(Boolean) as RenterDocumentUpload[]
      return apiFetch<VehicleBooking>('/api/transport/vehicle-bookings/', {
        method: 'POST',
        body: JSON.stringify({
          listing: Number(id),
          start_date: start,
          end_date: end,
          pickup_area: pickupArea,
          renter_documents: docs,
        }),
      })
    },
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['veh-bookings'] })
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'vehicles'] })
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

  async function handleRenterDocUpload(docType: string, file: File) {
    const row = await renterUploadFromFile(docType, file)
    setRenterDocuments((prev) => ({ ...prev, [docType]: row }))
    setErr(null)
  }

  function handleRenterDocRemove(docType: string) {
    setRenterDocuments((prev) => {
      const next = { ...prev }
      delete next[docType]
      return next
    })
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
    const required = vehicle?.required_renter_documents ?? []
    const missing = missingRenterDocuments(required, renterDocuments)
    if (missing.length > 0) {
      setErr('Upload all required documents before sending your request.')
      return
    }
    createMut.mutate()
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
          title="We couldn't load this vehicle"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!vehicle || !id) {
    return (
      <div className="jn-detail-page tp-detail-page">
        <EmptyState
          iconElement={<Car size={28} strokeWidth={2} aria-hidden />}
          title="Vehicle not found"
          sub="This vehicle may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
        />
      </div>
    )
  }

  const canAnswer =
    Boolean(profile) &&
    Boolean(vehicle) &&
    canManageListingForOwner(vehicle.owner_username)

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
      <VehicleDetailView
        vehicle={vehicle}
        vehicleId={id}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(vehicle.title)}
        canAnswer={canAnswer}
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
          renterDocuments,
          onRenterDocUpload: (docType, file) => void handleRenterDocUpload(docType, file),
          onRenterDocRemove: handleRenterDocRemove,
        }}
      />
    </div>
  )
}
