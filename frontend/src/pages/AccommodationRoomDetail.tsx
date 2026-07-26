import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useToggleStaySave } from '../hooks/useStaySave'
import { AccommodationRoomDetailView } from '../components/accommodation/AccommodationRoomDetailView'
import { ShareSheet } from '../components/share'
import { EmptyState } from '../components/ui'
import { recordStayPageView } from '../lib/stayPageViews'
import {
  buildRoomOffers,
  normalizeRoomTypes,
  type AccommodationListing,
} from '../utils/accommodationListing'
import '../components/journeys/journey-detail.css'
import '../components/accommodation/accommodation-detail.css'
import '../components/accommodation/accommodation-room.css'

export function AccommodationRoomDetail() {
  const { id, roomSlug } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const saveMut = useToggleStaySave()
  const [shareOpen, setShareOpen] = useState(false)
  const backTo = `/accommodation/${id}`

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id, profile?.username ?? 'anon'],
    enabled: !!id,
    queryFn: () =>
      apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, {
        auth: Boolean(profile),
      }),
  })

  const room = useMemo(() => {
    if (!data || !id || !roomSlug) return null
    const roomTypes = normalizeRoomTypes(data.room_types)
    const offers = buildRoomOffers(data, roomTypes, id)
    const decoded = decodeURIComponent(roomSlug)
    return offers.find((r) => r.name === decoded || encodeURIComponent(r.name) === roomSlug) ?? null
  }, [data, id, roomSlug])

  useEffect(() => {
    if (!id || !room?.name) return
    recordStayPageView(id, room.name)
  }, [id, room?.name])

  const onSave = () => {
    if (!profile) {
      navigate('/login')
      return
    }
    if (!id) return
    saveMut.mutate(Number(id))
  }

  if (isLoading) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 24, marginTop: 12 }} aria-busy="true" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Couldn't load this room"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  if (!data || !id || !room) {
    return (
      <div className="jn-detail-page acc-detail-page">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Room not found"
          sub="This room may no longer be available."
          cta={{ label: 'Back to stay', to: backTo }}
        />
      </div>
    )
  }

  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const roomCover =
    room.image?.trim() ||
    room.images?.find((img) => Boolean(img.src?.trim()))?.src ||
    data.cover_image
  const roomPath = `/accommodation/${id}/room/${encodeURIComponent(room.name)}`

  return (
    <div className="jn-detail-page acc-detail-page">
      <AccommodationRoomDetailView
        room={room}
        listing={data}
        listingId={id}
        listingTitle={data.title}
        maxListingGuests={data.max_guests}
        backTo={backTo}
        saved={Boolean(data.saved_by_me)}
        onSave={onSave}
        onShare={() => setShareOpen(true)}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        share={{
          path: roomPath,
          title: room.name || 'DELVE room',
          text: `Check out ${room.name || 'this room'} at ${data.title || 'a stay'} on DELVE`,
          previewImage: roomCover,
          previewLabel: locationLine ? `Room · ${locationLine}` : 'Room on DELVE',
        }}
      />
    </div>
  )
}
