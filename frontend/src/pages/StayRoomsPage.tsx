import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, Plus, Trash2 } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  stayListingToForm,
  type ProviderStayListing,
} from '../components/provider/stays'
import { ProviderUiEmpty, ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import { isVideoUrl } from '../components/listing/photos/listingGalleryMedia'
import { friendlyApiMessage } from '../utils/friendlyError'
import '../components/provider/stays/stay-listing.css'

export function StayRoomsPage() {
  const { listingId: rawId } = useParams()
  const listingId = Number(rawId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { format } = useDisplayMoney()
  const { profile } = useAuth()
  const { canManageListings, canAccessProvider } = useBusinessAccess()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['provider-stay', listingId],
    queryFn: () => apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`),
    enabled: Boolean(profile && canAccessProvider && listingId),
  })

  const deleteMut = useMutation({
    mutationFn: async (index: number) => {
      if (!listing) throw new Error('Missing listing')
      const form = stayListingToForm(listing)
      const nextRooms = form.room_types.filter((_, i) => i !== index)
      const body = await import('../components/provider/stays').then((m) =>
        m.buildStayListingApiPayload({ ...form, room_types: nextRooms }),
      )
      return apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${listingId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ room_types: body.room_types }),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-stay', listingId] })
      void qc.invalidateQueries({ queryKey: ['provider-stays'] })
      void qc.invalidateQueries({ queryKey: ['acc', String(listingId)] })
    },
  })

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }
  if (!listingId || Number.isNaN(listingId)) return <Navigate to="/provider/stays" replace />

  if (isLoading) {
    return (
      <ProviderUiPage>
        <p className="stay-hint">Loading rooms…</p>
      </ProviderUiPage>
    )
  }

  if (isError || !listing) {
    return (
      <ProviderUiPage>
        <ProviderUiHeader title="Accommodation not found" />
        <Link to="/provider/stays" className="prov-ui__btn prov-ui__btn--ghost">
          Back to stays
        </Link>
      </ProviderUiPage>
    )
  }

  const rooms = stayListingToForm(listing).room_types

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Rooms"
        subtitle={`${listing.title} — edit each room on its own page.`}
        actions={
          <>
            <Link to={`/provider/stays/${listingId}/edit`} className="prov-ui__btn prov-ui__btn--ghost">
              Accommodation details
            </Link>
            {canManageListings ? (
              <Link to={`/provider/stays/${listingId}/rooms/new`} className="prov-ui__btn prov-ui__btn--primary">
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add room
              </Link>
            ) : null}
          </>
        }
      />

      {rooms.length === 0 ? (
        <ProviderUiEmpty
          title="No rooms yet"
          message="Add room types so guests can pick a unit and book."
        />
      ) : (
        <div className="stay-room-list">
          {rooms.map((room, index) => {
            const cover = room.image ? mediaUrl(room.image) || room.image : null
            const coverIsVideo = Boolean(room.image && isVideoUrl(room.image))
            const price = room.price_per_night || listing.price_per_night
            return (
              <article key={`${index}-${room.name}`} className="prov-ui__card stay-room-card">
                <div className="stay-room-card__thumb">
                  {cover ? (
                    coverIsVideo ? (
                      <video src={`${cover}#t=0.1`} muted playsInline preload="metadata" aria-hidden />
                    ) : (
                      <img src={cover} alt="" />
                    )
                  ) : (
                    <span className="stay-card__thumb-fallback" aria-hidden>
                      <BedDouble size={22} strokeWidth={2} />
                    </span>
                  )}
                </div>
                <div className="stay-room-card__body">
                  <h3>{room.name.trim() || `Room ${index + 1}`}</h3>
                  <p>
                    {room.max_guests} guests · {room.bedrooms} bed
                    {room.bedrooms === 1 ? '' : 's'}
                    {price ? ` · ${format(price, { suffix: '/night' })}` : ''}
                    {room.featured ? ' · Featured' : ''}
                  </p>
                  {room.description.trim() ? <p className="stay-room-card__desc">{room.description}</p> : null}
                </div>
                <div className="stay-room-card__actions">
                  {canManageListings ? (
                    <>
                      <Link
                        to={`/provider/stays/${listingId}/rooms/${index}`}
                        className="prov-ui__btn prov-ui__btn--primary"
                      >
                        Edit room
                      </Link>
                      <button
                        type="button"
                        className="prov-ui__btn prov-ui__btn--ghost"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                          if (!window.confirm(`Remove “${room.name || `Room ${index + 1}`}”?`)) return
                          deleteMut.mutate(index, {
                            onError: (e: Error) => window.alert(friendlyApiMessage(e)),
                          })
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {canManageListings && rooms.length === 0 ? (
        <button
          type="button"
          className="stay-add-btn"
          onClick={() => navigate(`/provider/stays/${listingId}/rooms/new`)}
        >
          Add your first room
        </button>
      ) : null}
    </ProviderUiPage>
  )
}
