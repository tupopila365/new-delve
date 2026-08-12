import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, ExternalLink, MapPin, Tag } from 'lucide-react'
import type { BusinessPublicDto, DealDto, ListingPublicDto } from '@delve/contracts'
import { fetchPublicBusiness } from '../api/businessClient'
import { fetchPublicBusinessListings } from '../api/listingClient'
import { fetchPublicDeals } from '../api/dealClient'
import SafeImage from '../components/mobile/SafeImage'
import { SectionError } from '../components/SectionStates'

const TABS = ['Listings', 'Deals', 'Delvers', 'Reviews', 'About'] as const
type Tab = (typeof TABS)[number]

interface PublicBusinessPageProps {
  slug: string
  onBack?: () => void
  onOpenListing?: (listingId: string) => void
  onOpenDeal?: (dealId: string) => void
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
        {title}
      </p>
      <p className="text-sm m-0 max-w-xs" style={{ color: 'var(--fg-muted)' }}>
        {body}
      </p>
    </div>
  )
}

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

function locationLabel(business: BusinessPublicDto) {
  const parts = [business.city, business.countryCode].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function coverMediaUrl(listing: ListingPublicDto): string | null {
  const cover = listing.media.find(m => m.isCover && m.resourceType === 'image')
  if (cover?.delivery?.url) return cover.delivery.url
  const firstImage = listing.media.find(m => m.resourceType === 'image' && m.delivery?.url)
  return firstImage?.delivery?.url ?? null
}

export default function PublicBusinessPage({
  slug,
  onBack,
  onOpenListing,
  onOpenDeal,
}: PublicBusinessPageProps) {
  const [business, setBusiness] = useState<BusinessPublicDto | null>(null)
  const [listings, setListings] = useState<ListingPublicDto[]>([])
  const [deals, setDeals] = useState<DealDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Listings')
  const [coverFailed, setCoverFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      setCoverFailed(false)
      setActiveTab('Listings')
      try {
        const profile = await fetchPublicBusiness(slug)
        if (cancelled) return
        setBusiness(profile)

        const [pubListings, pubDeals] = await Promise.all([
          fetchPublicBusinessListings(profile.id, 40),
          fetchPublicDeals(40, profile.id),
        ])
        if (cancelled) return
        setListings(pubListings)
        setDeals(pubDeals)
      } catch (err) {
        if (!cancelled) {
          setBusiness(null)
          setListings([])
          setDeals([])
          setError(err instanceof Error ? err.message : 'Business not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, reloadKey])

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Loading business…
        </p>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="px-4 py-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <SectionError onRetry={() => setReloadKey(k => k + 1)} />
        {error && (
          <p className="text-xs text-center m-0 mt-3" style={{ color: 'var(--fg-muted)' }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  const location = locationLabel(business)
  const coverUrl = business.coverUrl?.trim() && !coverFailed ? business.coverUrl.trim() : null
  const logoUrl = business.logoUrl?.trim() || null

  return (
    <div className="pb-4">
      <div className="relative h-44 sm:h-52 overflow-hidden sm:rounded-t-2xl">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #2A6B5A 55%, #8FBFB0 100%)' }}
        />
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-3 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
      </div>

      <div
        className="relative z-[2] px-4 pb-4"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex flex-col gap-3 -mt-9 mb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative self-start">
            <div
              className="h-20 w-20 overflow-hidden rounded-2xl flex items-center justify-center"
              style={{ border: '3px solid var(--surface)', background: 'rgba(42,107,90,0.2)', color: '#fff' }}
            >
              {logoUrl ? (
                <SafeImage src={logoUrl} alt={business.name} className="h-full w-full object-cover" kind="business" />
              ) : (
                <span className="text-xl font-bold select-none" aria-hidden>
                  {(business.name.trim()[0] || 'B').toUpperCase()}
                </span>
              )}
            </div>
            <span
              className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: 'var(--primary)', border: '2px solid var(--surface)', color: '#fff' }}
              aria-label="Verified"
            >
              <CheckCircle size={11} />
            </span>
          </div>
        </div>

        <div className="mb-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1
              className="font-display text-xl font-extrabold m-0 break-words [overflow-wrap:anywhere]"
              style={{ color: 'var(--fg)' }}
            >
              {business.name}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(16,167,96,0.12)', color: '#0F8A52' }}
            >
              Verified
            </span>
          </div>
          <p className="text-sm mb-2 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: 'var(--fg-muted)' }}>
            {business.category && <span>{business.category}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {location}
              </span>
            )}
          </p>
          {business.description && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg)' }}>
              {business.description}
            </p>
          )}
          {business.website && (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline"
              style={{ color: 'var(--primary)' }}
            >
              Website
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <div
        className="flex overflow-x-auto"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors"
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--primary)' : 'var(--fg-muted)',
              fontWeight: activeTab === tab ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Listings' &&
        (listings.length === 0 ? (
          <EmptyTab title="No listings yet" body="Published experiences from this business will appear here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {listings.map(listing => {
              const img = coverMediaUrl(listing)
              return (
                <article
                  key={listing.id}
                  role={onOpenListing ? 'button' : undefined}
                  tabIndex={onOpenListing ? 0 : undefined}
                  onClick={() => onOpenListing?.(listing.id)}
                  onKeyDown={e => {
                    if (!onOpenListing) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpenListing(listing.id)
                    }
                  }}
                  className={`overflow-hidden rounded-2xl ${onOpenListing ? 'cursor-pointer active:opacity-90' : ''}`}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="aspect-[16/10] overflow-hidden" style={{ background: 'var(--surface-subtle)' }}>
                    {img ? (
                      <SafeImage src={img} alt={listing.title} className="h-full w-full object-cover" kind="listing" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs" style={{ color: 'var(--fg-muted)' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <h3 className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {listing.title}
                    </h3>
                    {listing.description && (
                      <p className="text-xs m-0 mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                        {listing.description}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ))}

      {activeTab === 'Deals' &&
        (deals.length === 0 ? (
          <EmptyTab title="No active deals" body="Live published deals from this business will appear here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {deals.map(deal => (
              <article
                key={deal.id}
                role={onOpenDeal ? 'button' : undefined}
                tabIndex={onOpenDeal ? 0 : undefined}
                onClick={() => onOpenDeal?.(deal.id)}
                onKeyDown={e => {
                  if (!onOpenDeal) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenDeal(deal.id)
                  }
                }}
                className={`rounded-2xl px-4 py-4 ${onOpenDeal ? 'cursor-pointer active:opacity-90' : ''}`}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold m-0 mb-1 inline-flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                  <Tag size={12} />
                  {deal.discountSummary}
                </p>
                <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                  {deal.title}
                </h3>
                {deal.listing && (
                  <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                    {deal.listing.title}
                  </p>
                )}
                <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
                  Valid {formatRange(deal.startDate, deal.endDate)}
                </p>
              </article>
            ))}
          </div>
        ))}

      {activeTab === 'Delvers' && (
        <EmptyTab title="No Delvers yet" body="Business posts are not available yet. Check back soon." />
      )}

      {activeTab === 'Reviews' && (
        <EmptyTab title="No reviews yet" body="Reviews for this business are not available yet." />
      )}

      {activeTab === 'About' && (
        <div className="px-4 py-5 space-y-4">
          {business.description ? (
            <div>
              <h3 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                About
              </h3>
              <p className="text-sm m-0 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                {business.description}
              </p>
            </div>
          ) : (
            <EmptyTab title="No about details" body="This business has not added a public description yet." />
          )}
          {(location || business.address) && (
            <div>
              <h3 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                Location
              </h3>
              <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
                {[business.address, location].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
          {business.website && (
            <div>
              <h3 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                Website
              </h3>
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold no-underline"
                style={{ color: 'var(--primary)' }}
              >
                {business.website}
              </a>
            </div>
          )}
          {business.category && (
            <div>
              <h3 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                Category
              </h3>
              <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
                {business.category}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
