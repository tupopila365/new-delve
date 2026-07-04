import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BedDouble,
  Building2,
  Car,
  Compass,
  MapPin,
  Navigation,
  Ticket,
  Utensils,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { BUSINESS_TYPE_LABELS, type BusinessType } from '../data/businessProfiles'
import type { BusinessListingItem, PublicBusiness } from '../hooks/useBusinessAccess'
import {
  BusinessProfileHero,
  BusinessProfileSection,
  BusinessProfileServiceRow,
  BusinessProfileShell,
  BusinessProfileState,
  BusinessProfileEmptyServices,
  BusinessTeamPosts,
} from '../components/business'
import { MiniRating } from '../components/MiniRating'
import { useBusinessAccess } from '../hooks/useBusinessAccess'

type ServiceTab = 'all' | 'stays' | 'food' | 'guides' | 'transport' | 'events'

type ListingItem = BusinessListingItem & { Icon: LucideIcon; displayIcon: LucideIcon }

const SERVICE_TABS: { id: ServiceTab; label: string; Icon: LucideIcon }[] = [
  { id: 'all', label: 'All', Icon: Building2 },
  { id: 'stays', label: 'Stays', Icon: BedDouble },
  { id: 'food', label: 'Food', Icon: Utensils },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'transport', label: 'Transport', Icon: Car },
  { id: 'events', label: 'Events', Icon: Ticket },
]

const TYPE_TO_KIND: Record<string, Exclude<ServiceTab, 'all'>> = {
  accommodation: 'stays',
  food_drink: 'food',
  guide: 'guides',
  transport: 'transport',
  event_organiser: 'events',
}

const KIND_ICONS: Record<Exclude<ServiceTab, 'all'>, LucideIcon> = {
  stays: BedDouble,
  food: Utensils,
  guides: Compass,
  transport: Car,
  events: Ticket,
}

function mapsDirectionsUrl(city: string, region: string) {
  const q = [city, region, 'Namibia'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function primaryServiceLabel(types: string[]) {
  const filtered = types.filter((t) => t !== 'multi_provider')
  if (filtered.length === 0) return null
  if (filtered.length === 1) return BUSINESS_TYPE_LABELS[filtered[0] as BusinessType] ?? filtered[0]
  return filtered.map((t) => BUSINESS_TYPE_LABELS[t as BusinessType] ?? t).slice(0, 2).join(' · ')
}

function toListingItems(rows: BusinessListingItem[]): ListingItem[] {
  return rows.map((row) => ({
    ...row,
    image: row.image ? mediaUrl(row.image) || row.image : null,
    Icon: KIND_ICONS[row.kind],
    displayIcon:
      row.kind === 'transport' && row.transport_mode === 'shared' ? Bus : KIND_ICONS[row.kind],
  }))
}

export function BusinessProfile() {
  const { id } = useParams()
  const { businesses: myBusinesses } = useBusinessAccess()
  const [serviceTab, setServiceTab] = useState<ServiceTab>('all')
  const [shareMsg, setShareMsg] = useState('')

  const { data: business, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: () => apiFetch<PublicBusiness>(`/api/accounts/businesses/${id}/`, { auth: false }),
    enabled: Boolean(id),
  })

  const { data: listingRows = [], isLoading: loadingListings } = useQuery({
    queryKey: ['business-listings', id],
    queryFn: () => apiFetch<BusinessListingItem[]>(`/api/accounts/businesses/${id}/listings/`, { auth: false }),
    enabled: Boolean(id),
  })

  const listings = useMemo(() => toListingItems(listingRows), [listingRows])

  const allowedKinds = useMemo(() => {
    if (!business) return new Set<Exclude<ServiceTab, 'all'>>()
    const kinds = business.business_types
      .filter((t) => t !== 'multi_provider')
      .map((t) => TYPE_TO_KIND[t])
      .filter((k): k is Exclude<ServiceTab, 'all'> => Boolean(k))
    return new Set(kinds)
  }, [business])

  const scopedListings = useMemo(() => {
    if (allowedKinds.size === 0) return listings
    return listings.filter((l) => allowedKinds.has(l.kind))
  }, [listings, allowedKinds])

  const visibleTabs = useMemo(() => {
    const kinds = new Set(scopedListings.map((l) => l.kind))
    return SERVICE_TABS.filter(
      (t) => t.id === 'all' || (allowedKinds.has(t.id) && kinds.has(t.id)),
    )
  }, [scopedListings, allowedKinds])

  const filteredListings = useMemo(
    () => (serviceTab === 'all' ? scopedListings : scopedListings.filter((l) => l.kind === serviceTab)),
    [scopedListings, serviceTab],
  )

  const galleryPhotos = useMemo(() => {
    if (!business) return [] as { src: string; alt: string }[]
    const photos: { src: string; alt: string }[] = []
    if (business.cover_image) {
      const src = mediaUrl(business.cover_image) || business.cover_image
      photos.push({ src, alt: `${business.business_name} cover` })
    }
    if (business.logo) {
      const src = mediaUrl(business.logo) || business.logo
      photos.push({ src, alt: `${business.business_name} logo` })
    }
    scopedListings.forEach((l) => {
      if (l.image) photos.push({ src: l.image, alt: l.title })
    })
    return photos.slice(0, 9)
  }, [business, scopedListings])

  const onShareProfile = () => {
    if (!business) return
    void navigator.clipboard
      .writeText(`${window.location.origin}/business/${business.id}`)
      .then(() => {
        setShareMsg('Profile link copied')
        window.setTimeout(() => setShareMsg(''), 1600)
      })
      .catch(() => {
        setShareMsg('Copy failed')
        window.setTimeout(() => setShareMsg(''), 1600)
      })
  }

  if (isLoading) {
    return (
      <BusinessProfileShell>
        <div className="skeleton biz-profile__sk" />
      </BusinessProfileShell>
    )
  }

  if (isError) {
    return (
      <BusinessProfileShell>
        <BusinessProfileState
          icon={<AlertCircle size={28} strokeWidth={2} />}
          title="We couldn't load this business"
          message="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </BusinessProfileShell>
    )
  }

  if (!business) {
    return (
      <BusinessProfileShell>
        <BusinessProfileState
          icon={<Building2 size={28} strokeWidth={2} />}
          title="Business not found"
          message="This provider profile may have been removed or the link is incorrect."
          cta={{ label: 'Explore DELVE', to: '/' }}
        />
      </BusinessProfileShell>
    )
  }

  const types = business.business_types.filter((t) => t !== 'multi_provider')
  const verified = business.verification_status === 'verified'
  const stats = business.stats
  const ratingAvg = stats?.rating_avg ?? undefined
  const ratingCount = stats?.rating_count
  const responseHours = stats?.response_hours ?? undefined
  const listingsCount = stats?.listings_count ?? scopedListings.length
  const locationLabel = [business.city, business.region].filter(Boolean).join(', ')
  const directionsUrl = locationLabel ? mapsDirectionsUrl(business.city, business.region) : null
  const logoSrc = business.logo ? mediaUrl(business.logo) || business.logo : null
  const coverSrc = business.cover_image ? mediaUrl(business.cover_image) || business.cover_image : null
  const businessId = Number(id)
  const canManageBusiness = myBusinesses.some((b) => b.id === businessId)

  return (
    <BusinessProfileShell onShare={onShareProfile}>
      {shareMsg ? (
        <p className="biz-profile__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      {canManageBusiness ? (
        <p className="biz-profile__manage-bar">
          <Link to="/provider" className="biz-profile__manage-link">
            Open provider dashboard
          </Link>
          <span aria-hidden>·</span>
          <Link to={`/u/${business.owner_username}`} className="biz-profile__manage-link">
            Your personal profile
          </Link>
        </p>
      ) : null}

      <BusinessProfileHero
        name={business.business_name}
        tagline={business.tagline}
        logo={logoSrc}
        cover={coverSrc}
        verified={verified}
        serviceLabel={primaryServiceLabel(types)}
        location={locationLabel || null}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        responseHours={responseHours}
        listingsCount={listingsCount}
        ownerUsername={business.owner_username}
        ownerProfileHref={`/u/${business.owner_username}`}
        businessId={business.id}
      />

      {business.description?.trim() ? (
        <BusinessProfileSection title="About">
          <p className="biz-profile__text">{business.description.trim()}</p>
        </BusinessProfileSection>
      ) : null}

      <BusinessTeamPosts
        ownerUsername={business.owner_username}
        businessName={business.business_name}
      />

      <BusinessProfileSection title="Services">
        {loadingListings ? (
          <div className="skeleton biz-profile__sk" />
        ) : scopedListings.length > 0 ? (
          <>
            {visibleTabs.length > 1 ? (
              <div className="biz-profile__tabs" role="tablist" aria-label="Service categories">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={serviceTab === t.id}
                    className={
                      serviceTab === t.id ? 'biz-profile__tab biz-profile__tab--active' : 'biz-profile__tab'
                    }
                    onClick={() => setServiceTab(t.id)}
                  >
                    <t.Icon size={13} strokeWidth={2.25} aria-hidden />
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="biz-profile__services" role="tabpanel">
              {filteredListings.map((item) => (
                <BusinessProfileServiceRow
                  key={`${item.kind}-${item.id}`}
                  title={item.title}
                  subtitle={item.subtitle}
                  href={item.href}
                  image={item.image}
                  Icon={item.displayIcon}
                  meta={item.meta ?? undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <BusinessProfileEmptyServices businessTypes={types} />
        )}
      </BusinessProfileSection>

      {ratingAvg ? (
        <BusinessProfileSection title="Reviews">
          <div className="biz-profile__reviews">
            <MiniRating rating={Number(ratingAvg)} count={ratingCount} />
            <p className="biz-profile__reviews-note">
              Overall rating from traveller feedback on DELVE.
            </p>
          </div>
        </BusinessProfileSection>
      ) : null}

      {galleryPhotos.length > 0 ? (
        <BusinessProfileSection title="Photos">
          <div className="biz-profile__gallery">
            {galleryPhotos.map((photo, i) => (
              <img key={`${photo.src}-${i}`} src={photo.src} alt={photo.alt} loading="lazy" />
            ))}
          </div>
        </BusinessProfileSection>
      ) : null}

      {locationLabel && directionsUrl ? (
        <BusinessProfileSection title="Location">
          <div className="biz-profile__location">
            <div className="biz-profile__location-copy">
              <MapPin size={16} strokeWidth={2.25} aria-hidden />
              <div>
                <strong>{locationLabel}</strong>
                <span>Primary service area</span>
              </div>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="biz-profile__directions"
            >
              <Navigation size={13} strokeWidth={2.25} aria-hidden />
              Directions
            </a>
          </div>
        </BusinessProfileSection>
      ) : null}
    </BusinessProfileShell>
  )
}
