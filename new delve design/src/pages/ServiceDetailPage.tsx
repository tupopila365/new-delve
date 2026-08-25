import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, CheckCircle, ExternalLink, MapPin } from 'lucide-react'
import type { ListingPublicDto } from '@delve/contracts'
import { fetchPublicListing } from '../api/listingClient'
import ListingMediaGallery from '../media/ListingMediaGallery'
import { SectionError } from '../components/SectionStates'
import { formatMoney } from '../lib/formatMoney'
import BookingRequestForm from './booking/BookingRequestForm'
import { getStoredAccessToken } from '../api/authClient'

/** Kept for App booking wiring compatibility — checkout not connected for real listings yet. */
export type ServiceBookingDraft = {
  selectedOptionId?: string
  selectedOptionLabel?: string
  quantity?: number
  unitPrice?: string
}

interface ServiceDetailPageProps {
  listingId: string
  onBack: () => void
  onOpenBusiness?: (slug: string) => void
  onOpenBookings?: () => void
}

function locationOf(listing: ListingPublicDto) {
  return [listing.business.city, listing.business.countryCode].filter(Boolean).join(', ') || null
}

export default function ServiceDetailPage({
  listingId,
  onBack,
  onOpenBusiness,
  onOpenBookings,
}: ServiceDetailPageProps) {
  const [listing, setListing] = useState<ListingPublicDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await fetchPublicListing(listingId)
        if (!cancelled) setListing(row)
      } catch (err) {
        if (!cancelled) {
          setListing(null)
          setError(err instanceof Error ? err.message : 'Listing not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [listingId, reloadKey])

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Loading listing…
        </p>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="px-4 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <SectionError onRetry={() => setReloadKey(k => k + 1)} />
      </div>
    )
  }

  const location = locationOf(listing)

  return (
    <div className="pb-10">
      <div className="px-4 sm:px-0 pt-3 mb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back to services
        </button>
      </div>

      <div className="px-4 sm:px-0 mb-4">
        <ListingMediaGallery media={listing.media} coverMediaId={listing.coverMediaId} />
      </div>

      <div className="px-4 sm:px-0">
        <h1 className="font-display text-2xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
          {listing.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
          {onOpenBusiness ? (
            <button
              type="button"
              onClick={() => onOpenBusiness(listing.business.slug)}
              className="inline-flex items-center gap-1.5 font-semibold p-0"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
            >
              <Building2 size={14} />
              {listing.business.name}
              <CheckCircle size={12} style={{ color: '#10A760' }} />
              <ExternalLink size={12} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} />
              {listing.business.name}
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} />
              {location}
            </span>
          )}
          {listing.business.category && <span>{listing.business.category}</span>}
        </div>

        {listing.pricing && (
          <p className="text-xl font-bold m-0 mb-3" style={{ color: 'var(--fg)' }}>
            {formatMoney(listing.pricing.currency, listing.pricing.amount)}
          </p>
        )}

        {listing.description ? (
          <p className="text-sm leading-relaxed m-0 mb-5" style={{ color: 'var(--fg)' }}>
            {listing.description}
          </p>
        ) : (
          <p className="text-sm m-0 mb-5" style={{ color: 'var(--fg-muted)' }}>
            No description provided yet.
          </p>
        )}

        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {listing.pricing ? (
            getStoredAccessToken() ? (
              <BookingRequestForm
                listingId={listing.id}
                ctaLabel="Request to book"
                onCreated={() => onOpenBookings?.()}
              />
            ) : (
              <>
                <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                  Sign in to request a booking
                </p>
                <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                  Price is taken from this listing on the server. This is not payment.
                </p>
              </>
            )
          ) : (
            <>
              <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                Booking unavailable
              </p>
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                This listing does not have an advertised price yet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
