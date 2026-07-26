import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  StayRoomEditor,
  buildStayRoomApiItem,
  emptyStayRoom,
  stayListingToForm,
  type ProviderStayListing,
  type StayRoomForm,
} from '../components/provider/stays'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { friendlyApiMessage } from '../utils/friendlyError'
import '../components/provider/stays/stay-listing.css'

export function StayRoomEditPage() {
  const { listingId: rawListingId, roomIndex: rawRoomIndex } = useParams()
  const listingId = Number(rawListingId)
  const isNew = rawRoomIndex === 'new'
  const roomIndex = isNew ? -1 : Number(rawRoomIndex)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canManageListings, canAccessProvider } = useBusinessAccess()

  const [room, setRoom] = useState<StayRoomForm>(emptyStayRoom())
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(isNew)

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['provider-stay', listingId],
    queryFn: () => apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  useEffect(() => {
    if (!listing || isNew) {
      if (isNew) setHydrated(true)
      return
    }
    const rooms = stayListingToForm(listing).room_types
    if (roomIndex < 0 || roomIndex >= rooms.length) {
      setHydrated(false)
      return
    }
    setRoom(rooms[roomIndex])
    setHydrated(true)
  }, [listing, isNew, roomIndex])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!listing) throw new Error('Missing listing')
      if (!room.name.trim()) throw new Error('Room name is required.')
      const form = stayListingToForm(listing)
      const apiRoom = await buildStayRoomApiItem(room, form.price_per_night)
      const nextRooms = [...form.room_types]
      // Convert current form rooms to API shape for unchanged siblings
      const { buildStayListingApiPayload } = await import('../components/provider/stays')
      const currentPayload = await buildStayListingApiPayload(form)
      const siblingRooms = [...(currentPayload.room_types as unknown[])]
      if (isNew) siblingRooms.push(apiRoom)
      else siblingRooms[roomIndex] = apiRoom
      return apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ room_types: siblingRooms }),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stay', listingId] })
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      void qc.invalidateQueries({ queryKey: ['acc', String(listingId)] })
      navigate(`/provider/stays/${listingId}/rooms`)
    },
    onError: (e: Error) => setError(friendlyApiMessage(e)),
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }
  if (!canManageListings) return <Navigate to="/provider/stays" replace />
  if (!listingId || Number.isNaN(listingId)) return <Navigate to="/provider/stays" replace />
  if (!isNew && (Number.isNaN(roomIndex) || roomIndex < 0)) {
    return <Navigate to={`/provider/stays/${listingId}/rooms`} replace />
  }

  if (isLoading) {
    return (
      <ProviderUiPage>
        <p className="stay-hint">Loading room…</p>
      </ProviderUiPage>
    )
  }

  if (isError || !listing || (!isNew && !hydrated)) {
    return (
      <ProviderUiPage>
        <ProviderUiHeader title="Room not found" />
        <Link to={`/provider/stays/${listingId}/rooms`} className="prov-ui__btn prov-ui__btn--ghost">
          Back to rooms
        </Link>
      </ProviderUiPage>
    )
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title={isNew ? 'Add room' : `Edit room`}
        subtitle={`${listing.title} — this page only changes this room.`}
        actions={
          <Link to={`/provider/stays/${listingId}/rooms`} className="prov-ui__btn prov-ui__btn--ghost">
            All rooms
          </Link>
        }
      />

      <div className="stay-form stay-form--page">
        <div className="stay-form__panel stay-form__panel--page">
          {error ? (
            <p className="stay-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <StayRoomEditor room={room} onChange={setRoom} fallbackNightly={listing.price_per_night} />
          <footer className="stay-form__foot">
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--ghost"
              disabled={saveMut.isPending}
              onClick={() => navigate(`/provider/stays/${listingId}/rooms`)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--primary"
              disabled={saveMut.isPending || !room.name.trim()}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? 'Saving…' : isNew ? 'Add room' : 'Save room'}
            </button>
          </footer>
        </div>
      </div>
    </ProviderUiPage>
  )
}
