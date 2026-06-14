import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Bus,
  Car,
  ChevronRight,
  Clock,
  Compass,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  Utensils,
  Wallet,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import {
  BUSINESS_TYPE_LABELS,
  findBusinessById,
  VERIFICATION_LABELS,
  type BusinessType,
  type VerificationStatus,
} from '../data/businessProfiles'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { mockStays, mockGuides, mockVehicles, mockFood, mockEvents } from '../mocks/mockData'
import { DelversMoments, DetailPage, DetailSkeleton, TrustBadgeRow } from '../components/detail'
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
  cta: string
  rating?: string
  price?: string
  location?: string
}

const SERVICE_TABS: { id: ServiceTab; label: string; Icon: LucideIcon }[] = [
  { id: 'all', label: 'All services', Icon: Building2 },
  { id: 'stays', label: 'Stays', Icon: BedDouble },
  { id: 'food', label: 'Food', Icon: Utensils },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'transport', label: 'Transport', Icon: Car },
  { id: 'events', label: 'Events', Icon: Ticket },
]

function mapsDirectionsUrl(city: string, region: string) {
  const q = [city, region, 'Namibia'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function BusinessProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
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
          image: s.cover_image,
          href: `/accommodation/${s.id}`,
          cta: 'View stay',
          rating: s.rating_avg,
          price: `N$${s.price_per_night}/night`,
          location: [s.city, s.region].filter(Boolean).join(', '),
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
          image: f.cover_image,
          href: `/food/${f.id}`,
          cta: 'View food spot',
          rating: f.rating_avg,
          location: [f.city, f.region].filter(Boolean).join(', '),
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
          image: g.photo,
          href: `/guides/${g.id}`,
          cta: 'View guide',
          rating: g.rating_avg,
          price: g.hourly_rate ? `N$${g.hourly_rate}/hr` : undefined,
          location: g.regions?.join(', '),
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
          image: v.cover_image,
          href: `/transport/vehicle/${v.id}`,
          cta: 'View vehicle',
          price: `N$${v.price_per_day}/day`,
          location: [v.city, v.region].filter(Boolean).join(', '),
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
          image: e.cover_image,
          href: `/events/${e.id}`,
          cta: 'View event',
          location: [e.city, e.region].filter(Boolean).join(', '),
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
      photos.push({ src: business.cover_image, alt: `${business.business_name} cover` })
    }
    listings.forEach((l) => {
      if (l.image) photos.push({ src: l.image, alt: l.title })
    })
    return photos.slice(0, 12)
  }, [business, listings])

  const onShareProfile = async () => {
    if (!business) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/business/${business.id}`,
      )
      setShareMsg('Profile link copied')
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  if (isLoading) {
    return (
      <DetailPage prefix="bp" className="bp bp--premium">
        <DetailSkeleton className="bp__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="bp" className="bp bp--premium">
        <EmptyState
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
          title="We couldn't load this business"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!business) {
    return (
      <DetailPage prefix="bp" className="bp bp--premium">
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={2} aria-hidden />}
          title="Business not found"
          sub="This provider profile may have been removed or the link is incorrect."
          cta={{ label: 'Explore DELVE', to: '/' }}
        />
      </DetailPage>
    )
  }

  const types = business.business_types.filter((t) => t !== 'multi_provider')
  const verification = business.verification_status as VerificationStatus
  const verified = business.verification_status === 'verified'
  const ratingAvg = profileExtras?.rating_avg
  const ratingCount = profileExtras?.rating_count
  const responseHours = profileExtras?.response_hours
  const listingsCount = profileExtras?.listings_count ?? listings.length
  const locationLabel = [business.city, business.region].filter(Boolean).join(', ')
  const directionsUrl = locationLabel ? mapsDirectionsUrl(business.city, business.region) : null

  const trustItems = [
    verified ? 'Verified provider' : 'Listed on DELVE',
    ...(responseHours && responseHours <= 6 ? ['Fast response'] : []),
    ...(ratingAvg ? ['Rated on DELVE'] : []),
  ]

  return (
    <DetailPage prefix="bp" className="bp bp--premium">
      {shareMsg ? (
        <p className="bp__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <div className="bp__hero">
        {business.cover_image ? (
          <img
            src={business.cover_image}
            alt={`${business.business_name} cover`}
            className="bp__hero-img"
          />
        ) : (
          <div className="bp__hero-img bp__hero-img--placeholder" aria-hidden>
            <Building2 size={48} strokeWidth={1.25} className="bp__hero-placeholder-icon" />
          </div>
        )}
        <div className="bp__hero-scrim" aria-hidden />
        <button
          type="button"
          className="bp__back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
          Back
        </button>
        <button
          type="button"
          className="bp__share"
          onClick={() => void onShareProfile()}
          aria-label="Share profile"
        >
          <Share2 size={16} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <section className="bp__identity detail-section" aria-labelledby="bp-identity-title">
        <div className="bp__identity-top">
          {business.logo ? (
            <img src={business.logo} alt={business.business_name} className="bp__logo" />
          ) : (
            <div className="bp__logo bp__logo--ph" aria-hidden>
              <Building2 size={32} strokeWidth={1.75} />
            </div>
          )}
          <div className="bp__identity-main">
            <p className="bp__kicker">Provider profile</p>
            <h1 id="bp-identity-title">{business.business_name}</h1>
            {business.tagline ? <p className="bp__tagline">{business.tagline}</p> : null}
            <div className="bp__badges">
              {verified ? (
                <span className="bp__badge bp__badge--verified">
                  <ShieldCheck size={12} strokeWidth={2.5} aria-hidden />
                  {VERIFICATION_LABELS.verified}
                </span>
              ) : (
                <span className="bp__badge">
                  {VERIFICATION_LABELS[verification] ?? business.verification_status}
                </span>
              )}
              {types.map((t) => (
                <span key={t} className="bp__badge">
                  {BUSINESS_TYPE_LABELS[t as BusinessType] ?? t}
                </span>
              ))}
            </div>
            <TrustBadgeRow items={trustItems} className="bp__trust-row" />
          </div>
        </div>

        <div className="bp__facts">
          {ratingAvg ? (
            <div className="bp__fact">
              <Star size={14} strokeWidth={2.25} aria-hidden />
              <MiniRating rating={ratingAvg} count={ratingCount} />
            </div>
          ) : null}
          {locationLabel ? (
            <div className="bp__fact">
              <MapPin size={14} strokeWidth={2.25} aria-hidden />
              <span>{locationLabel}</span>
            </div>
          ) : null}
          {responseHours ? (
            <div className="bp__fact">
              <Clock size={14} strokeWidth={2.25} aria-hidden />
              <span>Responds in ~{responseHours}h</span>
            </div>
          ) : null}
          {listingsCount > 0 ? (
            <div className="bp__fact">
              <Building2 size={14} strokeWidth={2.25} aria-hidden />
              <span>
                {listingsCount} {listingsCount === 1 ? 'listing' : 'listings'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="bp__actions">
          <Link to="/messages" className="btn btn-primary bp__action-btn">
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Message provider
          </Link>
          <Link to={`/u/${business.owner_username}`} className="btn btn-ghost bp__action-btn">
            View owner profile
          </Link>
          <button
            type="button"
            className="btn btn-ghost bp__action-btn bp__action-btn--icon"
            onClick={() => void onShareProfile()}
            aria-label="Share profile"
          >
            <Share2 size={15} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </section>

      <section className="bp__about detail-section" aria-labelledby="bp-about-title">
        <h2 id="bp-about-title" className="bp__section-title">
          About
        </h2>
        {business.description ? (
          <p className="bp__desc">{business.description}</p>
        ) : (
          <p className="bp__desc bp__desc--empty">
            This provider has not added a full business description yet.
          </p>
        )}
        {types.length > 0 ? (
          <div className="bp__offer-chips">
            <span className="bp__offer-label">Services offered</span>
            {types.map((t) => (
              <span key={t} className="bp__offer-chip">
                {BUSINESS_TYPE_LABELS[t as BusinessType] ?? t}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="detail-section bp__listings" aria-labelledby="bp-services-title">
        <h2 id="bp-services-title" className="bp__section-title">
          Services
        </h2>
        <p className="bp__section-sub">Listings and experiences from this provider on DELVE.</p>

        {listings.length > 0 ? (
          <>
            {visibleTabs.length > 1 ? (
              <div className="bp__service-tabs" role="tablist" aria-label="Service categories">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    id={`bp-svc-tab-${t.id}`}
                    role="tab"
                    aria-selected={serviceTab === t.id}
                    aria-controls="bp-services-panel"
                    className={
                      serviceTab === t.id ? 'bp__service-tab bp__service-tab--active' : 'bp__service-tab'
                    }
                    onClick={() => setServiceTab(t.id)}
                  >
                    <t.Icon size={14} strokeWidth={2.25} aria-hidden />
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div id="bp-services-panel" role="tabpanel" aria-labelledby={`bp-svc-tab-${serviceTab}`}>
              <div className="bp__listing-grid">
                {filteredListings.map((item) => (
                  <ListingCard key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            compact
            iconElement={<Building2 size={24} strokeWidth={2} aria-hidden />}
            title="No services listed yet"
            sub="This provider's listings will appear here once added."
          />
        )}
      </section>

      <section className="bp__reviews detail-section" aria-labelledby="bp-reviews-title">
        <h2 id="bp-reviews-title" className="bp__section-title">
          Reviews
        </h2>
        {ratingAvg ? (
          <div className="bp__reviews-summary">
            <MiniRating rating={ratingAvg} count={ratingCount} />
            <p className="bp__reviews-note">
              Overall rating from traveller feedback across this provider&apos;s services on DELVE.
            </p>
          </div>
        ) : (
          <EmptyState
            compact
            iconElement={<Star size={24} strokeWidth={2} aria-hidden />}
            title="No reviews yet"
            sub="Reviews will appear after travellers use this provider's services."
          />
        )}
      </section>

      <section className="bp__gallery detail-section" aria-labelledby="bp-gallery-title">
        <h2 id="bp-gallery-title" className="bp__section-title">
          Photos
        </h2>
        {galleryPhotos.length > 0 ? (
          <div className="bp__gallery-grid">
            {galleryPhotos.map((photo, i) => (
              <div key={`${photo.src}-${i}`} className="bp__gallery-cell">
                <img src={photo.src} alt={photo.alt} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            iconElement={<ImageIcon size={24} strokeWidth={2} aria-hidden />}
            title="No photos yet"
            sub="Business photos will appear here once added."
          />
        )}
      </section>

      {locationLabel ? (
        <section className="bp__location detail-section" aria-labelledby="bp-location-title">
          <h2 id="bp-location-title" className="bp__section-title">
            Location
          </h2>
          <div className="bp__location-card">
            <MapPin size={18} strokeWidth={2.25} className="bp__location-icon" aria-hidden />
            <div>
              <p className="bp__location-city">{locationLabel}</p>
              <p className="bp__location-sub">Primary service area for this provider</p>
            </div>
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm bp__directions-btn"
              >
                <Navigation size={14} strokeWidth={2.25} aria-hidden />
                Get directions
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <DelversMoments
        title="Updates"
        subtitle="Guest photos, reviews, and route tips connected to this business."
        moments={[]}
        showWhenEmpty
        emptyMessage="Updates will appear here once this provider posts."
        className="bp__moments"
      />

      <section className="detail-section bp__trust" aria-labelledby="bp-trust-title">
        <h2 id="bp-trust-title" className="bp__section-title">
          Trust & policies
        </h2>
        <ul className="bp__trust-list">
          <li>Clear pricing shown on each listing</li>
          <li>Guest messaging through DELVE</li>
          {verified ? (
            <li>Verified provider status reviewed by the DELVE team</li>
          ) : (
            <li>Listed on DELVE as a public provider profile</li>
          )}
        </ul>
      </section>

      <section className="bp__explore detail-section">
        <Link to="/" className="bp__explore-link">
          <Compass size={16} strokeWidth={2.25} aria-hidden />
          Explore DELVE
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </Link>
      </section>
    </DetailPage>
  )
}

function ListingCard({ item }: { item: ListingItem }) {
  const KindIcon =
    item.kind === 'stays'
      ? BedDouble
      : item.kind === 'food'
        ? Utensils
        : item.kind === 'guides'
          ? Compass
          : item.kind === 'transport'
            ? Car
            : item.kind === 'events'
              ? Ticket
              : Bus

  return (
    <Link to={item.href} className="bp__listing-card card">
      <div className="bp__listing-media">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : (
          <div className="bp__listing-placeholder" aria-hidden>
            <KindIcon size={28} strokeWidth={1.75} />
          </div>
        )}
        <span className="bp__listing-type">
          <KindIcon size={11} strokeWidth={2.5} aria-hidden />
          {item.kind === 'stays'
            ? 'Stay'
            : item.kind === 'food'
              ? 'Food'
              : item.kind === 'guides'
                ? 'Guide'
                : item.kind === 'transport'
                  ? 'Vehicle'
                  : 'Event'}
        </span>
      </div>
      <div className="bp__listing-body">
        <strong className="bp__listing-title">{item.title}</strong>
        {item.subtitle ? <span className="bp__listing-sub">{item.subtitle}</span> : null}
        <div className="bp__listing-meta">
          {item.location ? (
            <span>
              <MapPin size={11} strokeWidth={2.25} aria-hidden />
              {item.location}
            </span>
          ) : null}
          {item.rating ? <MiniRating rating={item.rating} /> : null}
          {item.price ? (
            <span>
              <Wallet size={11} strokeWidth={2.25} aria-hidden />
              {item.price}
            </span>
          ) : null}
        </div>
        <span className="bp__listing-cta">
          {item.cta}
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  )
}
