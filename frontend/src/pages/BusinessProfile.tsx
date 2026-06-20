import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
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
import {
  BUSINESS_TYPE_LABELS,
  findBusinessById,
  type BusinessType,
} from '../data/businessProfiles'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { mockStays, mockGuides, mockVehicles, mockFood, mockEvents } from '../mocks/mockData'
import {
  BusinessProfileHero,
  BusinessProfileSection,
  BusinessProfileServiceRow,
  BusinessProfileShell,
} from '../components/business'
import { MiniRating } from '../components/MiniRating'
import { EmptyState } from '../components/ui'

type ServiceTab = 'all' | 'stays' | 'food' | 'guides' | 'transport' | 'events'

type ListingItem = {
  id: number
  kind: Exclude<ServiceTab, 'all'>
  title: string
  subtitle: string
  image: string | null
  href: string
  meta?: string
  Icon: LucideIcon
}

const SERVICE_TABS: { id: ServiceTab; label: string; Icon: LucideIcon }[] = [
  { id: 'all', label: 'All', Icon: Building2 },
  { id: 'stays', label: 'Stays', Icon: BedDouble },
  { id: 'food', label: 'Food', Icon: Utensils },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'transport', label: 'Transport', Icon: Car },
  { id: 'events', label: 'Events', Icon: Ticket },
]

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

export function BusinessProfile() {
  const { id } = useParams()
  const [serviceTab, setServiceTab] = useState<ServiceTab>('all')
  const [shareMsg, setShareMsg] = useState('')

  const { data: business, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: () => apiFetch<MyBusiness>(`/api/accounts/businesses/${id}/`, { auth: false }),
    enabled: Boolean(id),
  })

  const profileExtras = business ? findBusinessById(business.id) : undefined

  const listings = useMemo(() => {
    if (!business) return [] as ListingItem[]
    const owner = business.owner_username
    const items: ListingItem[] = []

    mockStays
      .filter((s) => s.owner_username === owner)
      .forEach((s) => {
        items.push({
          id: s.id,
          kind: 'stays',
          title: s.title,
          subtitle: s.property_type ? `${s.property_type} · ${s.city}` : s.city,
          image: s.cover_image ? mediaUrl(s.cover_image) || s.cover_image : null,
          href: `/accommodation/${s.id}`,
          meta: `N$${s.price_per_night}/night`,
          Icon: KIND_ICONS.stays,
        })
      })

    mockFood
      .filter((f) => f.owner_username === owner)
      .forEach((f) => {
        items.push({
          id: f.id,
          kind: 'food',
          title: f.name,
          subtitle: f.cuisine,
          image: f.cover_image ? mediaUrl(f.cover_image) || f.cover_image : null,
          href: `/food/${f.id}`,
          Icon: KIND_ICONS.food,
        })
      })

    mockGuides
      .filter((g) => g.username === owner)
      .forEach((g) => {
        items.push({
          id: g.id,
          kind: 'guides',
          title: g.display_name || g.username,
          subtitle: g.headline,
          image: g.photo ? mediaUrl(g.photo) || g.photo : null,
          href: `/guides/${g.id}`,
          meta: g.hourly_rate ? `N$${g.hourly_rate}/hr` : undefined,
          Icon: KIND_ICONS.guides,
        })
      })

    mockVehicles
      .filter((v) => v.owner_username === owner)
      .forEach((v) => {
        items.push({
          id: v.id,
          kind: 'transport',
          title: v.title,
          subtitle: [v.city, v.vehicle_type].filter(Boolean).join(' · '),
          image: v.cover_image ? mediaUrl(v.cover_image) || v.cover_image : null,
          href: `/transport/vehicle/${v.id}`,
          meta: `N$${v.price_per_day}/day`,
          Icon: KIND_ICONS.transport,
        })
      })

    mockEvents
      .filter((e) => e.organizer_username === owner)
      .forEach((e) => {
        items.push({
          id: e.id,
          kind: 'events',
          title: e.title,
          subtitle: e.venue,
          image: e.cover_image ? mediaUrl(e.cover_image) || e.cover_image : null,
          href: `/events/${e.id}`,
          Icon: KIND_ICONS.events,
        })
      })

    return items
  }, [business])

  const visibleTabs = useMemo(() => {
    const kinds = new Set(listings.map((l) => l.kind))
    return SERVICE_TABS.filter((t) => t.id === 'all' || kinds.has(t.id))
  }, [listings])

  const filteredListings = useMemo(
    () => (serviceTab === 'all' ? listings : listings.filter((l) => l.kind === serviceTab)),
    [listings, serviceTab],
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
    listings.forEach((l) => {
      if (l.image) photos.push({ src: l.image, alt: l.title })
    })
    return photos.slice(0, 9)
  }, [business, listings])

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
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this business"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </BusinessProfileShell>
    )
  }

  if (!business) {
    return (
      <BusinessProfileShell>
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={2} aria-hidden />}
          title="Business not found"
          sub="This provider profile may have been removed or the link is incorrect."
          cta={{ label: 'Explore DELVE', to: '/' }}
        />
      </BusinessProfileShell>
    )
  }

  const types = business.business_types.filter((t) => t !== 'multi_provider')
  const verified = business.verification_status === 'verified'
  const ratingAvg = profileExtras?.rating_avg
  const ratingCount = profileExtras?.rating_count
  const responseHours = profileExtras?.response_hours
  const listingsCount = profileExtras?.listings_count ?? listings.length
  const locationLabel = [business.city, business.region].filter(Boolean).join(', ')
  const directionsUrl = locationLabel ? mapsDirectionsUrl(business.city, business.region) : null
  const logoSrc = business.logo ? mediaUrl(business.logo) || business.logo : null

  return (
    <BusinessProfileShell title="Provider" onShare={onShareProfile}>
      {shareMsg ? (
        <p className="biz-profile__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <BusinessProfileHero
        name={business.business_name}
        tagline={business.tagline}
        logo={logoSrc}
        verified={verified}
        serviceLabel={primaryServiceLabel(types)}
        location={locationLabel || null}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        responseHours={responseHours}
        listingsCount={listingsCount}
        ownerUsername={business.owner_username}
        ownerProfileHref={`/u/${business.owner_username}`}
      />

      {business.description?.trim() ? (
        <BusinessProfileSection title="About">
          <p className="biz-profile__text">{business.description.trim()}</p>
        </BusinessProfileSection>
      ) : null}

      <BusinessProfileSection title="Services">
        {listings.length > 0 ? (
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
                  Icon={item.Icon}
                  meta={item.meta}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="biz-profile__empty">No services listed yet.</p>
        )}
      </BusinessProfileSection>

      {ratingAvg ? (
        <BusinessProfileSection title="Reviews">
          <div className="biz-profile__reviews">
            <MiniRating rating={ratingAvg} count={ratingCount} />
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
