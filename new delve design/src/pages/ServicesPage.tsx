import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle, MapPin, Search, Tag, X } from 'lucide-react'
import type { ListingPublicDto } from '@delve/contracts'
import { fetchPublicListings } from '../api/listingClient'
import { SkeletonCard, SectionEmpty, SectionError } from '../components/SectionStates'
import { formatMoney } from '../lib/formatMoney'
import SafeImage from '../components/mobile/SafeImage'
import ServiceDetailPage from './ServiceDetailPage'

export type ServicesBrowseProps = {
  activeCategory: string
  setActiveCategory: (category: string) => void
  activeDestination: string | null
  setActiveDestination: (destination: string | null) => void
  activeNeeds: Set<string>
  toggleNeed: (need: string) => void
  clearNeeds: () => void
  clearBrowse: () => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  onOpenTransport: () => void
  onBookListing?: (listingId: string, draft?: import('./ServiceDetailPage').ServiceBookingDraft) => void
  onOpenBusiness?: (slug: string) => void
  onOpenBookings?: () => void
}

function coverUrl(listing: ListingPublicDto): string | null {
  const cover = listing.media.find(m => m.isCover && m.resourceType === 'image' && m.delivery?.url)
  if (cover) return cover.delivery.url
  const first = listing.media.find(m => m.resourceType === 'image' && m.delivery?.url)
  return first?.delivery.url ?? null
}

function locationOf(listing: ListingPublicDto) {
  return [listing.business.city, listing.business.countryCode].filter(Boolean).join(', ') || null
}

function ListingCard({
  listing,
  onOpen,
}: {
  listing: ListingPublicDto
  onOpen: (id: string) => void
}) {
  const img = coverUrl(listing)
  const location = locationOf(listing)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(listing.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(listing.id)
        }
      }}
      className="overflow-hidden rounded-2xl cursor-pointer transition-opacity active:opacity-90"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="relative overflow-hidden" style={{ height: 180, background: 'var(--surface-subtle)' }}>
        {img ? (
          <SafeImage src={img} alt={listing.title} className="h-full w-full object-cover" kind="listing" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs" style={{ color: 'var(--fg-muted)' }}>
            No photo
          </div>
        )}
        {listing.business.category && (
          <span
            className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {listing.business.category}
          </span>
        )}
      </div>
      <div className="px-3.5 py-3">
        <h3 className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
          {listing.title}
        </h3>
        <p className="text-xs m-0 mt-1.5 flex items-center gap-1.5 truncate" style={{ color: 'var(--fg-muted)' }}>
          <Building2 size={12} className="flex-shrink-0" />
          <span className="truncate">{listing.business.name}</span>
          <CheckCircle size={11} className="flex-shrink-0" style={{ color: '#10A760' }} />
        </p>
        {location && (
          <p className="text-xs m-0 mt-1 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={11} />
            {location}
          </p>
        )}
        {listing.pricing && (
          <p className="text-sm font-semibold m-0 mt-1.5" style={{ color: 'var(--fg)' }}>
            {formatMoney(listing.pricing.currency, listing.pricing.amount)}
          </p>
        )}
      </div>
    </article>
  )
}

export function ServicesAside({
  activeDestination,
  setActiveDestination,
  clearBrowse,
}: ServicesBrowseProps) {
  return (
    <aside className="hidden lg:block w-[260px] flex-shrink-0">
      <div className="sticky top-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--fg)' }}>
          Filters
        </p>
        <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
          Category and city filters are on the main browse. Price filters will arrive when listings have pricing.
        </p>
        {activeDestination && (
          <button
            type="button"
            onClick={() => setActiveDestination(null)}
            className="text-xs font-semibold rounded-lg px-3 py-2 mb-2 w-full text-left"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            Clear city: {activeDestination}
          </button>
        )}
        <button
          type="button"
          onClick={clearBrowse}
          className="text-xs font-semibold rounded-lg px-3 py-2 w-full"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Reset browse
        </button>
      </div>
    </aside>
  )
}

export default function ServicesPage({
  activeCategory,
  setActiveCategory,
  activeDestination,
  setActiveDestination,
  clearBrowse,
  selectedId,
  setSelectedId,
  onOpenBusiness,
  onOpenBookings,
}: ServicesBrowseProps) {
  const [listings, setListings] = useState<ListingPublicDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchPublicListings({
          limit: 60,
          q: debouncedQuery || undefined,
        })
        if (!cancelled) setListings(rows)
      } catch (err) {
        if (!cancelled) {
          setListings([])
          setError(err instanceof Error ? err.message : 'Could not load listings')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, reloadKey])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const row of listings) {
      if (row.business.category) set.add(row.business.category)
    }
    return ['All', ...Array.from(set).sort()]
  }, [listings])

  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const row of listings) {
      if (row.business.city) set.add(row.business.city)
    }
    return Array.from(set).sort()
  }, [listings])

  const filtered = useMemo(() => {
    return listings.filter(row => {
      if (activeCategory !== 'All') {
        const cat = row.business.category?.toLowerCase() || ''
        if (cat !== activeCategory.toLowerCase()) return false
      }
      if (activeDestination) {
        if ((row.business.city || '').toLowerCase() !== activeDestination.toLowerCase()) return false
      }
      return true
    })
  }, [listings, activeCategory, activeDestination])

  if (selectedId) {
    return (
      <ServiceDetailPage
        listingId={selectedId}
        onBack={() => setSelectedId(null)}
        onOpenBusiness={onOpenBusiness}
        onOpenBookings={onOpenBookings}
      />
    )
  }

  return (
    <div className="pb-8">
      <div className="px-4 sm:px-0 pt-4 mb-4">
        <h1 className="font-display text-2xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Services
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Published experiences from verified businesses.
        </p>
      </div>

      <div className="px-4 sm:px-0 mb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Search size={16} style={{ color: 'var(--fg-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search listings or businesses"
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{ color: 'var(--fg)' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-0 mb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(categories.length > 1 ? categories : ['All']).map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
            style={{
              background: activeCategory === cat ? 'var(--primary)' : 'var(--surface)',
              color: activeCategory === cat ? '#fff' : 'var(--fg)',
              border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            <Tag size={11} />
            {cat}
          </button>
        ))}
      </div>

      {cities.length > 0 && (
        <div className="px-4 sm:px-0 mb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {cities.map(city => (
            <button
              key={city}
              type="button"
              onClick={() => setActiveDestination(activeDestination === city ? null : city)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
              style={{
                background: activeDestination === city ? 'rgba(16,167,96,0.12)' : 'var(--surface)',
                color: activeDestination === city ? '#0F8A52' : 'var(--fg-muted)',
                border: `1px solid ${activeDestination === city ? 'rgba(16,167,96,0.35)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              <MapPin size={11} />
              {city}
            </button>
          ))}
        </div>
      )}

      {(activeCategory !== 'All' || activeDestination || query) && (
        <div className="px-4 sm:px-0 mb-3">
          <button
            type="button"
            onClick={() => {
              clearBrowse()
              setQuery('')
            }}
            className="text-xs font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="px-4 sm:px-0">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full min-w-0">
                <SkeletonCard width="100%" height={300} />
              </div>
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={() => setReloadKey(k => k + 1)} />
        ) : filtered.length === 0 ? (
          <SectionEmpty
            icon={<Search size={20} />}
            title="No published listings"
            body="Try another city or category, or check back when providers publish experiences."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} onOpen={setSelectedId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
