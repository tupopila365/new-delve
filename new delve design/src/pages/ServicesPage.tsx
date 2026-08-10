import { useState, useEffect } from 'react'
import {
  Search, X, SlidersHorizontal, Star, CheckCircle,
  MapPin, Clock, Users, Tag, ShoppingBag, Music,
  Utensils, Compass, Package, ChevronDown,
  TrendingUp, Flame, Car, ArrowRight,
} from 'lucide-react'
import {
  listingCategoryColor, availabilityConfig,
  type ListingFull, type ListingType,
} from '../data/listingData'
import {
  serviceListings,
  getTopPicks,
  listingMatchesCategory,
  listingMatchesNeeds,
  popularDestinations,
  topPicksTitle,
  getNeedsForCategory,
} from '../data/servicesDiscovery'
import ServiceDetailPage from './ServiceDetailPage'

// ─── Config ───────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; icon: React.ReactNode; type?: ListingType; linkTo?: 'transport' }[] = [
  { label: 'All',       icon: <Tag size={14} /> },
  { label: 'Food',      icon: <Utensils size={14} />,   type: 'food' },
  { label: 'Activity',  icon: <Compass size={14} />,    type: 'activity' },
  { label: 'Guide',     icon: <Users size={14} />,      type: 'guide' },
  { label: 'Transport', icon: <Car size={14} />,        linkTo: 'transport' },
  { label: 'Event',     icon: <Music size={14} />,      type: 'event' },
  { label: 'Shop',      icon: <ShoppingBag size={14} />,type: 'shop' },
]

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating',      label: 'Highest rated' },
  { value: 'reviews',     label: 'Most reviewed' },
  { value: 'price-asc',   label: 'Price: low to high' },
]

// ─── Service listing card ─────────────────────────────────────────────────

function ServiceCard({ listing, onOpen }: { listing: ListingFull; onOpen: (id: string) => void }) {
  const [saved, setSaved] = useState(false)
  const catColor = listingCategoryColor[listing.serviceCategory] ?? 'var(--primary)'
  const avail = availabilityConfig[listing.availability]
  const isUnavailable = listing.availability === 'unavailable' || listing.availability === 'sold-out'

  const CatIcon =
    listing.listingType === 'food' ? Utensils :
    listing.listingType === 'activity' ? Compass :
    listing.listingType === 'guide' ? Users :
    listing.listingType === 'event' ? Music :
    listing.listingType === 'shop' ? ShoppingBag : Package

  return (
    <article
      onClick={() => !isUnavailable && onOpen(listing.id)}
      className="group overflow-hidden rounded-2xl cursor-pointer transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: isUnavailable ? 0.6 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>

      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        <img src={listing.media[0]} alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 50%)' }} />

        {/* Top-left: category */}
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
            style={{ background: `${catColor}dd`, color: '#fff', backdropFilter: 'blur(4px)' }}>
            <CatIcon size={11} /> {listing.serviceCategory}
          </span>
        </div>

        {/* Top-right: save */}
        <button
          onClick={e => { e.stopPropagation(); setSaved(s => !s) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{ background: saved ? 'var(--primary)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? '#fff' : 'none'}
            stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Bottom: business */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', maxWidth: 160 }}>
            <img src={listing.businessAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
            <span className="text-xs font-semibold text-white truncate">{listing.business}</span>
            {listing.verification.verified && <CheckCircle size={11} style={{ color: '#10A760', flexShrink: 0 }} />}
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: avail.bg, color: avail.color, backdropFilter: 'blur(4px)' }}>
            {avail.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-bold leading-tight mb-1"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
          {listing.title}
        </h3>
        <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
          <MapPin size={10} /> {listing.destination}
        </p>

        {/* Highlights row */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {listing.highlights.slice(0, 3).map((h, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Type-specific meta row */}
        {listing.listingType === 'stay' && listing.amenities && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Package size={11} /> {listing.propertyType} · Up to {listing.maxGuests} guests
          </p>
        )}
        {listing.listingType === 'activity' && listing.duration && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Clock size={11} /> {listing.duration}
            {listing.groupSizeMax && ` · Max ${listing.groupSizeMax} people`}
          </p>
        )}
        {listing.listingType === 'guide' && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Users size={11} /> {listing.experience}
          </p>
        )}
        {listing.listingType === 'food' && listing.openingHours && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Clock size={11} /> {listing.openingHours}
          </p>
        )}
        {listing.listingType === 'event' && listing.eventDate && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Clock size={11} /> {listing.eventDate} · {listing.eventTime}
          </p>
        )}
        {listing.listingType === 'shop' && (
          <p className="text-xs mb-3 flex items-center gap-1"
            style={{ color: listing.stockStatus === 'limited' ? '#D97706' : 'var(--fg-muted)' }}>
            <ShoppingBag size={11} />
            {listing.stockStatus === 'in-stock' ? 'In stock' :
             listing.stockStatus === 'limited' ? `Limited — ${listing.stockCount} left` : 'Out of stock'}
          </p>
        )}

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                {listing.price === '0' ? 'Free' : `${listing.currency} ${listing.price}`}
              </span>
              {listing.price !== '0' && (
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>/ {listing.priceBasis}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{listing.rating}</span>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>({listing.reviewCount})</span>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Shared browse state (lifted into App) ─────────────────────────────────

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
}

// ─── Shared discover panels (desktop rail + mobile sheet) ─────────────────

function ServicesDiscoverContent({
  activeCategory,
  activeDestination,
  setActiveDestination,
  activeNeeds,
  toggleNeed,
  clearNeeds,
  onOpenListing,
  onOpenTransport,
}: Omit<ServicesBrowseProps, 'clearBrowse' | 'selectedId' | 'setSelectedId' | 'setActiveCategory'> & {
  onOpenListing: (id: string) => void
}) {
  const needs = getNeedsForCategory(activeCategory)
  const topPicks = getTopPicks(activeCategory, activeDestination, 3, activeNeeds)

  function selectDestination(name: string) {
    setActiveDestination(activeDestination === name ? null : name)
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onOpenTransport}
        className="rounded-2xl p-4 text-left transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(120deg, rgba(224,92,26,0.14) 0%, var(--surface) 70%)',
          border: '1px solid var(--border)',
        }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(224,92,26,0.18)', color: '#E05C1A' }}>
              <Car size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Transport</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Cars, rides, buses, flights & ferries</p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
        </div>
      </button>

      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
            <TrendingUp size={14} style={{ color: 'var(--primary)' }} /> Popular near you
          </p>
          {activeDestination ? (
            <button type="button" onClick={() => setActiveDestination(null)}
              className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              Clear
            </button>
          ) : (
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Top places</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {popularDestinations.map((d, i) => {
            const active = activeDestination === d.name
            return (
              <button key={d.name} type="button" onClick={() => selectDestination(d.name)}
                className="flex items-center gap-3 text-left transition-opacity hover:opacity-80 rounded-xl px-1 -mx-1 py-0.5"
                style={{ background: active ? 'rgba(140,82,255,0.1)' : 'transparent' }}>
                <img src={d.img} alt={d.name} className="w-12 h-10 rounded-lg object-cover flex-shrink-0"
                  style={{ background: 'var(--surface-subtle)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--fg)', fontWeight: active ? 700 : 500 }}>
                    {d.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{d.countLabel}</p>
                </div>
                <span className="text-xs font-bold tabular-nums"
                  style={{ color: active ? 'var(--primary)' : 'var(--fg-muted)' }}>
                  #{i + 1}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
            <Flame size={14} style={{ color: 'var(--primary)' }} /> Browse by need
          </p>
          {activeNeeds.size > 0 && (
            <button type="button" onClick={clearNeeds}
              className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              Clear
            </button>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
          {activeCategory === 'All' ? 'Quick filters for any service' : `Tuned for ${activeCategory.toLowerCase()}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {needs.map(need => {
            const active = activeNeeds.has(need)
            return (
              <button key={need} type="button" onClick={() => toggleNeed(need)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: active ? 'rgba(140,82,255,0.14)' : 'var(--surface-subtle)',
                  color: active ? 'var(--primary)' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                }}>
                {need}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>
          {topPicksTitle(activeCategory)}
        </p>
        {topPicks.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>No picks for this filter yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topPicks.map(l => (
              <button key={l.id} type="button" onClick={() => onOpenListing(l.id)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left hover:opacity-80 transition-opacity gap-3"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img src={l.media[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>{l.title}</p>
                    <p className="text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      {l.price === '0' ? 'Free' : `${l.currency} ${l.price}`}
                      {l.price !== '0' && `/${l.priceBasis}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}>
                  <Star size={10} fill="#D97706" /> {l.rating}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ServicesDiscoverSheet({
  open,
  onClose,
  ...browse
}: ServicesBrowseProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="xl:hidden fixed inset-0 z-[70] flex flex-col justify-end">
      <button type="button" aria-label="Close discover"
        className="absolute inset-0 border-0 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose} />
      <div
        className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl px-4 pt-3 pb-8"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Discover services">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              Discover
            </p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Places, needs, and top picks
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="text-sm font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            Done
          </button>
        </div>
        <ServicesDiscoverContent
          activeCategory={browse.activeCategory}
          activeDestination={browse.activeDestination}
          setActiveDestination={browse.setActiveDestination}
          activeNeeds={browse.activeNeeds}
          toggleNeed={browse.toggleNeed}
          clearNeeds={browse.clearNeeds}
          onOpenTransport={() => {
            browse.onOpenTransport()
            onClose()
          }}
          onOpenListing={id => {
            browse.setSelectedId(id)
            onClose()
          }}
        />
      </div>
    </div>
  )
}

// ─── Right rail ────────────────────────────────────────────────────────────

export function ServicesAside(props: ServicesBrowseProps) {
  return (
    <aside className="hidden xl:flex flex-col gap-4 flex-shrink-0" style={{ width: 300 }}>
      <div className="sticky top-20">
        <ServicesDiscoverContent
          activeCategory={props.activeCategory}
          activeDestination={props.activeDestination}
          setActiveDestination={props.setActiveDestination}
          activeNeeds={props.activeNeeds}
          toggleNeed={props.toggleNeed}
          clearNeeds={props.clearNeeds}
          onOpenTransport={props.onOpenTransport}
          onOpenListing={props.setSelectedId}
        />
      </div>
    </aside>
  )
}

// ─── Services page ─────────────────────────────────────────────────────────

export default function ServicesPage({
  activeCategory,
  setActiveCategory,
  activeDestination,
  setActiveDestination,
  activeNeeds,
  toggleNeed,
  clearNeeds,
  clearBrowse,
  selectedId,
  setSelectedId,
  onOpenTransport,
  onBookListing,
}: ServicesBrowseProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [showSort, setShowSort] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const filterCount = (activeDestination ? 1 : 0) + activeNeeds.size

  useEffect(() => {
    if (activeCategory === 'Stay') setActiveCategory('All')
  }, [activeCategory, setActiveCategory])

  if (selectedId) {
    return (
      <ServiceDetailPage
        listingId={selectedId}
        onBack={() => setSelectedId(null)}
        onBook={(draft) => onBookListing?.(selectedId, draft)}
      />
    )
  }

  const filtered = serviceListings.filter(l => {
    const catMatch = listingMatchesCategory(l, activeCategory)
    const queryMatch = !query ||
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.business.toLowerCase().includes(query.toLowerCase()) ||
      l.destination.toLowerCase().includes(query.toLowerCase()) ||
      l.serviceCategory.toLowerCase().includes(query.toLowerCase())
    const destMatch = !activeDestination ||
      l.destination.toLowerCase().includes(activeDestination.toLowerCase())
    const needsMatch = listingMatchesNeeds(l, activeNeeds)
    return catMatch && queryMatch && destMatch && needsMatch
  }).sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'reviews') return b.reviewCount - a.reviewCount
    if (sort === 'price-asc') return parseInt(a.price.replace(/\s/g, '')) - parseInt(b.price.replace(/\s/g, ''))
    return 0
  })

  const hasBrowseFilters = activeCategory !== 'All' || !!activeDestination || activeNeeds.size > 0

  function clearAll() {
    setQuery('')
    clearBrowse()
  }

  function selectDestination(name: string) {
    setActiveDestination(activeDestination === name ? null : name)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Hero */}
      <div className="relative overflow-hidden sm:rounded-2xl mb-0"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a2e 100%)', minHeight: 140 }}>
        <div className="absolute" style={{ top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ bottom: -10, left: 40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(236,72,153,0.12)', filter: 'blur(40px)' }} />

        <div className="relative z-10 px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {serviceListings.length} services across Namibia
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-3 leading-tight"
            style={{ fontFamily: 'Syne, sans-serif', maxWidth: 420 }}>
            Food, experiences, and people to discover.
          </h1>

          {/* Search */}
          <div className="flex items-center gap-3 px-4 rounded-2xl max-w-lg"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', height: 44, backdropFilter: 'blur(8px)' }}>
            <Search size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search food, guides, activities…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
              style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif' }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <X size={13} style={{ color: '#fff' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 scroll-rail">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.label
            const color = cat.linkTo === 'transport'
              ? '#E05C1A'
              : cat.type ? (listingCategoryColor[
              cat.type === 'food' ? 'Food & drink' :
              cat.type === 'activity' ? 'Activity' :
              cat.type === 'guide' ? 'Guide' :
              cat.type === 'event' ? 'Event' : 'Shop'
            ] ?? 'var(--primary)') : 'var(--primary)'
            return (
              <button key={cat.label}
                onClick={() => {
                  if (cat.linkTo === 'transport') onOpenTransport()
                  else setActiveCategory(cat.label)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: isActive ? `${color}15` : 'var(--surface)',
                  color: isActive ? color : 'var(--fg-muted)',
                  border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                  fontWeight: isActive ? 700 : 500,
                }}>
                {cat.icon}
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile / tablet — quick destinations + Discover sheet entry */}
      <div className="xl:hidden px-4 sm:px-0 pt-3 flex items-center gap-2">
        <div className="flex-1 flex gap-2 overflow-x-auto scroll-rail min-w-0" style={{ scrollbarWidth: 'none' }}>
          {popularDestinations.map(d => {
            const active = activeDestination === d.name
            return (
              <button key={d.name} type="button" onClick={() => selectDestination(d.name)}
                className="flex-shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: active ? 'rgba(140,82,255,0.14)' : 'var(--surface)',
                  color: active ? 'var(--primary)' : 'var(--fg)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                }}>
                <img src={d.img} alt="" className="w-7 h-7 rounded-full object-cover" />
                {d.name}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => setDiscoverOpen(true)}
          className="relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
          style={{
            background: filterCount > 0 ? 'rgba(140,82,255,0.14)' : 'var(--surface)',
            color: filterCount > 0 ? 'var(--primary)' : 'var(--fg)',
            border: `1px solid ${filterCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
          }}>
          <Flame size={13} />
          Discover
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <ServicesDiscoverSheet
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeDestination={activeDestination}
        setActiveDestination={setActiveDestination}
        activeNeeds={activeNeeds}
        toggleNeed={toggleNeed}
        clearNeeds={clearNeeds}
        clearBrowse={clearBrowse}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onOpenTransport={onOpenTransport}
      />

      {/* Active filter chips */}
      {(activeDestination || activeNeeds.size > 0) && (
        <div className="px-4 sm:px-0 pt-3 flex flex-wrap gap-2 items-center">
          {activeDestination && (
            <button type="button" onClick={() => setActiveDestination(null)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
              <MapPin size={11} /> {activeDestination} <X size={11} />
            </button>
          )}
          {[...activeNeeds].map(need => (
            <button key={need} type="button" onClick={() => toggleNeed(need)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
              {need} <X size={11} />
            </button>
          ))}
          <button type="button" onClick={() => { setActiveDestination(null); clearNeeds() }}
            className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
            Clear filters
          </button>
        </div>
      )}

      {/* Results header */}
      <div className="px-4 sm:px-0 py-4 flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          <span className="font-black tabular-nums" style={{ color: 'var(--fg)' }}>{filtered.length}</span>
          {' '}service{filtered.length !== 1 ? 's' : ''}
          {activeCategory !== 'All' && <span> in {activeCategory}</span>}
          {query && <span> for "{query}"</span>}
        </p>

        <div className="flex items-center gap-2">
          {(query || hasBrowseFilters) && (
            <button onClick={clearAll}
              className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              <X size={11} /> Clear
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowSort(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <SlidersHorizontal size={12} />
              {SORT_OPTIONS.find(s => s.value === sort)?.label ?? 'Sort'}
              <ChevronDown size={11} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 180 }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); setShowSort(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: sort === opt.value ? 'var(--surface-subtle)' : 'transparent',
                      color: sort === opt.value ? 'var(--primary)' : 'var(--fg)',
                      fontWeight: sort === opt.value ? 600 : 400,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-0 pb-8">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Compass size={36} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
            <p className="text-lg font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              No services found.
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
              Try a different category or clear your search.
            </p>
            <button onClick={clearAll}
              className="px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              Show all services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(l => (
              <ServiceCard key={l.id} listing={l} onOpen={setSelectedId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

