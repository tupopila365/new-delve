import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { apiFetch } from '../api/client'
import { AccommodationRoomDetailView } from '../components/accommodation/AccommodationRoomDetailView'
import { EmptyState } from '../components/ui'
import {
  buildRoomOffers,
  normalizeRoomTypes,
  type AccommodationListing,
} from '../utils/accommodationListing'

export function AccommodationRoomDetail() {
  const { id, roomSlug } = useParams()
  const backTo = `/accommodation/${id}`

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  const room = useMemo(() => {
    if (!data || !id || !roomSlug) return null
    const roomTypes = normalizeRoomTypes(data.room_types)
    const offers = buildRoomOffers(data, roomTypes, id)
    const decoded = decodeURIComponent(roomSlug)
    return offers.find((r) => r.name === decoded || encodeURIComponent(r.name) === roomSlug) ?? null
  }, [data, id, roomSlug])

  if (isLoading) {
    return (
      <div className="listing-room-page">
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="listing-room-page">
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
      <div className="listing-room-page">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={1.75} />}
          title="Room not found"
          sub="This room may no longer be available."
          cta={{ label: 'Back to stay', to: backTo }}
        />
      </div>
    )
  }

  return (
    <AccommodationRoomDetailView
      room={room}
      listingId={id}
      listingTitle={data.title}
      maxListingGuests={data.max_guests}
      backTo={backTo}
    />
  )
}
