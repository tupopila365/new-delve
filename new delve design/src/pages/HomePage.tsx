import { useState, useEffect, useMemo } from 'react'
import {
  Search, MapPin, Sparkles, Tag, Car, Bed, Utensils, Zap, Map,
  Calendar, ShoppingBag, Navigation, Users, Flame, HelpCircle,
  ShieldCheck, ChevronRight, ArrowUpRight, CheckCircle, Bookmark,
  Star, MessageSquare, Award, Clock, ArrowRight,
  Plane, Bus, X, Compass
} from 'lucide-react'
import { fetchHomePageData, type HomeFeedData, type NormalizedListing, type NormalizedDeal, type NormalizedJourney } from '../api/homeClient'
import type { TransportResult } from '../data/transportData'
import SafeImage from '../components/mobile/SafeImage'
import { SkeletonCard, SectionError } from '../components/SectionStates'
import {
  SectionHeader,
  ScrollRail,
  SectionEmpty,
  TravelerAvatar,
  SaveButton,
  ListingCard,
  DealCard,
  JourneyCard,
  FilterChipRail,
} from '../components/shared'

export interface HomePageProps {
  onNavigate: (nav: string) => void
  onOpenListing?: (id: string) => void
  onOpenDeal?: (id: string) => void
  onOpenJourney?: (id: string) => void
  onOpenTransport?: () => void
  onOpenExplore?: () => void
  onOpenServices?: (category?: string) => void
  signedIn?: boolean
  onSignIn?: () => void
}

const DESTINATIONS = [
  { id: 'all', label: 'All Namibia', subtitle: 'Explore nationwide' },
  { id: 'Swakopmund', label: 'Swakopmund', subtitle: 'Coast & dunes' },
  { id: 'Windhoek', label: 'Windhoek', subtitle: 'Capital & culture' },
  { id: 'Walvis Bay', label: 'Walvis Bay', subtitle: 'Lagoon & marine life' },
  { id: 'Sossusvlei', label: 'Sossusvlei', subtitle: 'Red dunes & Deadvlei' },
  { id: 'Etosha', label: 'Etosha', subtitle: 'Wildlife & safaris' },
]

const MOOD_SHORTCUTS = [
  { label: 'Weekend away', category: 'Stays', icon: <Bed size={14} /> },
  { label: 'Coast & Dunes', category: 'Activities', icon: <Zap size={14} /> },
  { label: 'Wildlife Safaris', category: 'Activities', icon: <Compass size={14} /> },
  { label: 'Easy on the wallet', category: 'Deals', icon: <Tag size={14} /> },
  { label: 'Road trips', category: 'Transport', icon: <Car size={14} /> },
  { label: 'Local dining', category: 'Food', icon: <Utensils size={14} /> },
]

export default function HomePage({
  onNavigate,
  onOpenListing,
  onOpenDeal,
  onOpenJourney,
  onOpenTransport,
  onOpenExplore,
  onOpenServices,
  signedIn,
  onSignIn,
}: HomePageProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const [data, setData] = useState<HomeFeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [serviceFilter, setServiceFilter] = useState('All')
  const [refreshKey, setReloadKey] = useState(0)
  const [inquiryListing, setInquiryListing] = useState<NormalizedListing | null>(null)

  // 11 Core Delve Services definition
  const CORE_SERVICES = [
    {
      id: 'stays',
      label: 'Stays',
      badge: 'Lodges & Camps',
      desc: 'Desert chalets, guest farms & boutique hotels',
      icon: <Bed size={20} />,
      color: '#8C52FF',
      category: 'Stay',
      action: () => onOpenServices ? onOpenServices('Stay') : onNavigate('Services'),
    },
    {
      id: 'transport',
      label: 'Transport',
      badge: '4x4 & Shuttles',
      desc: 'Overland rentals, transfers, regional coaches',
      icon: <Car size={20} />,
      color: '#3B82F6',
      category: 'Transport',
      action: () => onOpenTransport ? onOpenTransport() : onNavigate('Transport'),
    },
    {
      id: 'food',
      label: 'Food & Drink',
      badge: 'Bomas & Seafood',
      desc: 'Coastal seafood, craft beer & local dining',
      icon: <Utensils size={20} />,
      color: '#F59E0B',
      category: 'Food',
      action: () => onOpenServices ? onOpenServices('Food') : onNavigate('Services'),
    },
    {
      id: 'activities',
      label: 'Activities',
      badge: 'Dunes & Ocean',
      desc: 'Quad biking, catamaran tours, sandboarding',
      icon: <Zap size={20} />,
      color: '#10A760',
      category: 'Activity',
      action: () => onOpenServices ? onOpenServices('Activity') : onNavigate('Services'),
    },
    {
      id: 'deals',
      label: 'Deals',
      badge: 'Direct Savings',
      desc: 'Resident rates & limited-time promotions',
      icon: <Tag size={20} />,
      color: '#FF6B00',
      category: 'Deals',
      action: () => onNavigate('Deals'),
    },
    {
      id: 'journeys',
      label: 'Journeys',
      badge: 'Road Trips',
      desc: 'Tested itineraries with real traveler budgets',
      icon: <Navigation size={20} />,
      color: '#6366F1',
      category: 'Journeys',
      action: () => onNavigate('Journeys'),
    },
    {
      id: 'events',
      label: 'Events',
      badge: 'Gatherings',
      desc: 'Night markets, cultural shows & stargazing',
      icon: <Calendar size={20} />,
      color: '#8B5CF6',
      category: 'Events',
      action: () => onNavigate('Events'),
    },
    {
      id: 'guides',
      label: 'Guides',
      badge: 'Certified',
      desc: 'Local wildlife spotters & cultural mentors',
      icon: <Compass size={20} />,
      color: '#14B8A6',
      category: 'Guide',
      action: () => onOpenServices ? onOpenServices('Guide') : onNavigate('Services'),
    },
    {
      id: 'shops',
      label: 'Shops',
      badge: 'Artisans',
      desc: 'Craft centers, Namibian curios & gems',
      icon: <ShoppingBag size={20} />,
      color: '#EC4899',
      category: 'Shop',
      action: () => onOpenServices ? onOpenServices('Shop') : onNavigate('Services'),
    },
    {
      id: 'delvers',
      label: 'Delvers',
      badge: 'Live Feed',
      desc: 'Real-time photos & tips from travelers',
      icon: <Flame size={20} />,
      color: '#F43F5E',
      category: 'Delvers',
      action: () => onNavigate('Delvers'),
    },
    {
      id: 'ask-locals',
      label: 'Ask Locals',
      badge: 'Community Q&A',
      desc: 'Advice on roads, 4x4 trails & weather',
      icon: <HelpCircle size={20} />,
      color: '#06B6D4',
      category: 'Communities',
      action: () => onNavigate('Communities'),
    },
  ]

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const feed = await fetchHomePageData(selectedDestination)
        if (!cancelled) {
          setData(feed)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load Delve services.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedDestination, refreshKey])

  function toggleSave(id: string) {
    setSavedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter listings by active category pill
  const filteredListings = useMemo(() => {
    if (!data?.listings) return []
    let list = data.listings
    if (serviceFilter !== 'All') {
      list = list.filter(l => {
        const cat = (l.category || l.businessCategory || '').toLowerCase()
        return cat.includes(serviceFilter.toLowerCase())
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.businessName.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q)
      )
    }
    return list
  }, [data?.listings, serviceFilter, searchQuery])

  // Budget friendly listings
  const budgetListings = useMemo(() => {
    if (!data?.listings) return []
    return data.listings.slice(0, 4)
  }, [data?.listings])

  return (
    <div className="min-w-0 pb-20 overflow-x-hidden">
      {/* ─── 1. HERO & DISCOVERY SECTION ───────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 sm:p-7 mb-6 sm:mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(140,82,255,0.08) 0%, rgba(224,92,26,0.04) 50%, var(--surface) 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="max-w-3xl">
          {/* Eyebrow badge & Connection Status */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
              <Sparkles size={12} />
              <span>Discover your entire trip in one place</span>
            </div>

            </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight m-0 mb-2" style={{ color: 'var(--fg)', lineHeight: 1.2 }}>
            Discover your whole trip in one place.
          </h1>

          <p className="text-xs sm:text-sm m-0 mb-4 leading-relaxed max-w-xl" style={{ color: 'var(--fg-muted)' }}>
            Find stays, transport, food, activities, and real deals. See journeys shared by travelers with direct provider contact and zero hidden booking fees.
          </p>

          {/* Quick Search Bar */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-xl mb-3.5 max-w-xl shadow-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Search size={16} className="ml-1.5 flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search places, activities, stays, or transport…"
              className="flex-1 bg-transparent text-xs sm:text-sm outline-none border-none py-1"
              style={{ color: 'var(--fg)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-md text-xs cursor-pointer"
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)' }}
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenExplore ? onOpenExplore() : onNavigate('Explore')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 cursor-pointer inline-flex items-center gap-1 transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            >
              <span>Explore</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Destination Switcher */}
          <div className="mb-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fg-muted)' }}>
              Choose Destination
            </p>
            <FilterChipRail
              items={DESTINATIONS.map(dest => ({
                id: dest.id,
                label: dest.label,
                icon: <MapPin size={12} />,
              }))}
              selected={selectedDestination || 'all'}
              onSelect={id => setSelectedDestination(id === 'all' ? null : id)}
              onClearAll={selectedDestination ? () => setSelectedDestination(null) : undefined}
              size="sm"
              ariaLabel="Destinations rail"
            />
          </div>

          {/* Mood Shortcuts */}
          <FilterChipRail
            items={MOOD_SHORTCUTS.map(chip => ({
              id: chip.category,
              label: chip.label,
              icon: chip.icon,
            }))}
            selected={serviceFilter}
            onSelect={cat => setServiceFilter(cat)}
            size="sm"
            ariaLabel="Mood shortcuts rail"
            className="mb-2"
          />

          {/* Proof points */}
          <div className="mt-4 pt-3 flex flex-wrap items-center gap-3 sm:gap-6 border-t text-[11px]" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
              <CheckCircle size={13} style={{ color: '#10A760' }} />
              <span>Verified local providers</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
              <ShieldCheck size={13} style={{ color: 'var(--primary)' }} />
              <span>Direct provider contact</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
              <CheckCircle size={13} style={{ color: '#10A760' }} />
              <span>Transparent local rates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. EXPLORE BY SERVICE (11 CATEGORIES) ─────────────────────────── */}
      <section className="mb-10 sm:mb-14">
        <SectionHeader
          title="Explore Delve Services"
          subtitle="All 11 ways Delve helps you plan and navigate your Namibian journey."
          actionLabel="All categories"
          onActionClick={() => onOpenExplore ? onOpenExplore() : onNavigate('Explore')}
        />

        {/* 11 Services Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {CORE_SERVICES.map(srv => {
            const isFilterActive = serviceFilter === srv.category
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  if (srv.action) srv.action()
                }}
                className="p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-0.5 hover:shadow-xs"
                style={{
                  background: isFilterActive ? 'rgba(140,82,255,0.08)' : 'var(--surface)',
                  border: `1px solid ${isFilterActive ? 'var(--primary)' : 'var(--border)'}`,
                  minHeight: 104,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${srv.color}18`, color: srv.color }}
                  >
                    {srv.icon}
                  </div>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: `${srv.color}12`, color: srv.color }}
                  >
                    {srv.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold m-0 flex items-center justify-between" style={{ color: 'var(--fg)' }}>
                    <span>{srv.label}</span>
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--primary)' }} />
                  </h3>
                  <p className="text-[10px] m-0 mt-0.5 line-clamp-1 leading-tight" style={{ color: 'var(--fg-muted)' }}>
                    {srv.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ─── 3. FEATURED SERVICES SHOWCASE (BACKEND CONNECTED) ─────────────── */}
      <section className="mb-10 sm:mb-14">
        <SectionHeader
          title="Featured Experiences & Services"
          subtitle={`Verified stays, activities, and dining across ${selectedDestination || 'Namibia'}.`}
          badge={
            <FilterChipRail
              items={['All', 'Stay', 'Activity', 'Food', 'Guide', 'Shop'].map(cat => ({
                id: cat,
                label: cat === 'All' ? 'All Services' : cat,
              }))}
              selected={serviceFilter}
              onSelect={setServiceFilter}
              size="sm"
              ariaLabel="Featured services filter rail"
              className="max-w-md"
            />
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} width="100%" height={280} />
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={() => setReloadKey(k => k + 1)} />
        ) : filteredListings.length === 0 ? (
          <SectionEmpty
            icon={<Search size={24} />}
            title="No services found"
            description="Try selecting another category or destination."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.slice(0, 6).map(listing => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                subtitle={listing.subtitle}
                category={listing.category}
                businessName={listing.businessName}
                destination={listing.destination}
                media={listing.coverImage}
                verified={listing.verified}
                rating={listing.rating}
                priceFormatted={listing.priceFormatted}
                priceBasis={listing.priceBasis}
                isSaved={savedItems.has(listing.id)}
                onSave={() => toggleSave(listing.id)}
                onClick={() => setInquiryListing(listing)}
                onContact={() => setInquiryListing(listing)}
              />
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onOpenServices ? onOpenServices() : onNavigate('Services')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer inline-flex items-center gap-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            <span>Explore all {data?.listings.length ?? ''} services</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ─── 4. DEALS FOR THIS PLACE (BACKEND CONNECTED) ───────────────────── */}
      {data?.deals && data.deals.length > 0 && (
        <section className="mb-10 sm:mb-14">
          <SectionHeader
            title="Deals & Resident Rates"
            subtitle="Genuine savings offered directly by local operators. No intermediary fees."
            icon={<Tag size={18} style={{ color: '#E05C1A' }} />}
            actionLabel="View all deals"
            onActionClick={() => onNavigate('Deals')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.deals.slice(0, 3).map(deal => (
              <DealCard
                key={deal.id}
                id={deal.id}
                title={deal.title}
                businessName={deal.businessName}
                destination={deal.destination}
                discountLabel={deal.discountSummary}
                currentPrice={deal.currentPrice || 'Special rate'}
                media={deal.image}
                isSaved={savedItems.has(deal.id)}
                onSave={() => toggleSave(deal.id)}
                onClick={() => onOpenDeal ? onOpenDeal(deal.id) : onNavigate('Deals')}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── 5. TRANSPORT DISCOVERY RAIL ───────────────────────────────────── */}
      <section className="mb-10 sm:mb-14">
        <SectionHeader
          title="Transport Options"
          subtitle="From airport transfers to 4x4 rentals, community rides and intercity buses."
          icon={<Car size={18} style={{ color: '#3B82F6' }} />}
          actionLabel="All transport"
          onActionClick={() => onOpenTransport ? onOpenTransport() : onNavigate('Transport')}
        />

        {data?.transport && data.transport.length > 0 ? (
          <ScrollRail gap="md" fadeEdges ariaLabel="Transport options rail">
            {data.transport.map(t => (
              <div
                key={t.id}
                onClick={() => onOpenTransport ? onOpenTransport() : onNavigate('Transport')}
                className="p-4 rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-1 cursor-pointer w-[280px] sm:w-[300px] shrink-0"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                      style={{ background: 'rgba(59,130,246,0.12)', color: '#2563EB' }}
                    >
                      {t.transportMode === 'Airport transfer' ? <Plane size={12} /> :
                       t.transportMode === 'Bus' || t.transportMode === 'Minibus' ? <Bus size={12} /> :
                       <Car size={12} />}
                      <span>{t.transportMode}</span>
                    </span>
                    {t.verification?.verified && (
                      <span title="Verified operator"><CheckCircle size={14} style={{ color: '#10A760' }} /></span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                    {t.origin} → {t.destination}
                  </h3>
                  <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
                    Operated by {t.operator}
                  </p>

                  <div className="space-y-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} />
                      <span>Duration: {t.duration}</span>
                    </div>
                    {t.departure && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>Departure: {t.departure}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                      {t.currency} {t.price}
                    </span>
                    <span className="text-[11px] ml-1" style={{ color: 'var(--fg-muted)' }}>
                      /{t.priceBasis}
                    </span>
                  </div>
                  <span className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                    <span>Details</span>
                    <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </ScrollRail>
        ) : (
          <SectionEmpty
            icon={<Car size={24} />}
            title="No transport routes available"
            description="Transport listings and vehicle routes will appear here once published."
          />
        )}
      </section>

      {/* ─── 6. JOURNEYS TO BORROW ─────────────────────────────────────────── */}
      {data?.journeys && data.journeys.length > 0 && (
        <section className="mb-10 sm:mb-14">
          <SectionHeader
            title="Journeys to Borrow"
            subtitle="Tested itineraries shared by travelers with transparent historical costs."
            icon={<Navigation size={18} style={{ color: '#6366F1' }} />}
            actionLabel="Explore all journeys"
            onActionClick={() => onNavigate('Journeys')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.journeys.slice(0, 2).map(journey => (
              <JourneyCard
                key={journey.id}
                id={journey.id}
                title={journey.title}
                duration={journey.duration}
                stops={journey.route ? journey.route.split(' → ') : []}
                creator={{
                  name: journey.creatorName,
                  avatarUrl: journey.creatorAvatar,
                }}
                historicalCost={journey.historicalCost}
                media={journey.coverImage}
                onClick={() => onOpenJourney ? onOpenJourney(journey.id) : onNavigate('Journeys')}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── 7. EASY ON THE WALLET (BUDGET PICKS) ─────────────────────────── */}
      <section className="mb-10 sm:mb-14">
        <SectionHeader
          title="Easy on the Wallet"
          subtitle="High-value experiences and self-guided highlights under N$ 600 or with local rates."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {budgetListings.map(item => (
            <ListingCard
              key={`budget-${item.id}`}
              id={item.id}
              title={item.title}
              businessName={item.businessName}
              category="Great Value"
              destination={item.destination}
              media={item.coverImage || ''}
              priceFormatted={item.priceFormatted || 'Free access'}
              onClick={() => onOpenListing ? onOpenListing(item.id) : onOpenServices ? onOpenServices() : onNavigate('Services')}
              onContact={() => onOpenListing ? onOpenListing(item.id) : onOpenServices ? onOpenServices() : onNavigate('Services')}
            />
          ))}
        </div>
      </section>

      {/* ─── 8. ASK LOCALS (COMMUNITY ADVICE) ──────────────────────────────── */}
      <section className="mb-10 sm:mb-14">
        <SectionHeader
          title="Ask Locals"
          subtitle="Real travel questions answered by Namibian hosts, drivers, and local guides."
          icon={<MessageSquare size={18} style={{ color: '#14B8A6' }} />}
          actionLabel="Browse Q&A"
          onActionClick={() => onNavigate('Communities')}
        />

        <div className="p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="max-w-xl">
            <h3 className="text-base font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
              Got a question about road conditions, park passes, or travel timing?
            </h3>
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--fg-muted)' }}>
              Join Delve Communities to connect with verified Namibian hosts, resident guides, and fellow overland travelers in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('Communities')}
            className="min-h-[44px] px-5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
          >
            Explore Community Q&A
          </button>
        </div>
      </section>

      {/* ─── 9. TRUST & PLATFORM GUIDANCE (WHY DELVE) ─────────────────────── */}
      <section
        className="rounded-3xl p-6 sm:p-8 mb-10 sm:mb-14"
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="max-w-[700px] mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>
            <Award size={13} />
            <span>Built for transparent Namibian travel</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold m-0 mb-1.5" style={{ color: 'var(--fg)' }}>
            Direct provider connection. Zero hidden booking fees.
          </h2>
          <p className="text-xs sm:text-sm m-0 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Delve connects travelers directly with registered Namibian businesses, local drivers, certified safari guides, and genuine resident discounts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>Verified Businesses</h3>
            <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Each provider profile is reviewed for legitimacy, contact accuracy, and service registration.
            </p>
          </div>

          <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>
              <Tag size={18} />
            </div>
            <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>Local & Resident Rates</h3>
            <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Discover genuine resident rates and off-peak discounts without third-party commission markups.
            </p>
          </div>

          <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
              <Users size={18} />
            </div>
            <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>Real Traveler Stories</h3>
            <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Visual stories and honest itineraries from fellow travelers who drove the roads and paid the costs.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 10. COMPREHENSIVE FOOTER ───────────────────────────────────────── */}
      <footer className="pt-10 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg)' }}>Services</h4>
            <ul className="space-y-2 text-xs p-0 m-0 list-none" style={{ color: 'var(--fg-muted)' }}>
              <li><button type="button" onClick={() => onNavigate('Services')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Stays & Lodges</button></li>
              <li><button type="button" onClick={() => onNavigate('Transport')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Transport & Rentals</button></li>
              <li><button type="button" onClick={() => onNavigate('Services')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Activities & Safaris</button></li>
              <li><button type="button" onClick={() => onNavigate('Deals')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Deals & Discounts</button></li>
              <li><button type="button" onClick={() => onNavigate('Journeys')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Traveler Journeys</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg)' }}>Community</h4>
            <ul className="space-y-2 text-xs p-0 m-0 list-none" style={{ color: 'var(--fg-muted)' }}>
              <li><button type="button" onClick={() => onNavigate('Delvers')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Delvers Stories</button></li>
              <li><button type="button" onClick={() => onNavigate('Communities')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Local Q&A</button></li>
              <li><button type="button" onClick={() => onNavigate('Events')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Events Calendar</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg)' }}>Providers</h4>
            <ul className="space-y-2 text-xs p-0 m-0 list-none" style={{ color: 'var(--fg-muted)' }}>
              <li><button type="button" onClick={() => onNavigate('Become a provider')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">List your business</button></li>
              <li><button type="button" onClick={() => onNavigate('Provider')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Provider portal</button></li>
              <li><button type="button" onClick={() => onNavigate('Contact')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Partner inquiries</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg)' }}>Company</h4>
            <ul className="space-y-2 text-xs p-0 m-0 list-none" style={{ color: 'var(--fg-muted)' }}>
              <li><button type="button" onClick={() => onNavigate('About')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">About Delve</button></li>
              <li><button type="button" onClick={() => onNavigate('Investors')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Investors</button></li>
              <li><button type="button" onClick={() => onNavigate('Contact')} className="hover:underline cursor-pointer bg-transparent border-none p-0 text-left text-inherit">Help & Support</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
          <p className="m-0">© 2026 Delve Worldwide. Namibia Discovery & Travel Platform.</p>
          <div className="flex items-center gap-4">
            <span>Currency: <strong>NAD (N$)</strong></span>
            <span>Region: <strong>Namibia</strong></span>
          </div>
        </div>
      </footer>

      {/* ─── DIRECT INQUIRY / PROVIDER CONNECTION MODAL ─── */}
      {inquiryListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setInquiryListing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl relative"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInquiryListing(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer bg-transparent border-none"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
                {inquiryListing.category}
              </span>
              {inquiryListing.verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle size={12} />
                  Verified Operator
                </span>
              )}
            </div>

            <h3 className="text-base font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
              {inquiryListing.title}
            </h3>
            <p className="text-xs m-0 mb-3 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={12} />
              <span>{inquiryListing.destination} · {inquiryListing.businessName}</span>
            </p>

            <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(16,167,96,0.08)', border: '1px solid rgba(16,167,96,0.2)' }}>
              <p className="font-bold m-0 text-emerald-700 dark:text-emerald-400 mb-0.5">
                0% Middleman Booking Fees
              </p>
              <p className="m-0 text-emerald-600/90 dark:text-emerald-400/80 text-[11px] leading-relaxed">
                Connect directly with {inquiryListing.businessName}. No booking markups or credit card processing surcharges.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <a
                href={`https://wa.me/264811234567?text=${encodeURIComponent(`Hi ${inquiryListing.businessName}, I found your listing "${inquiryListing.title}" on Delve and would like to inquire about availability and rates.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-95 no-underline"
                style={{ background: '#25D366' }}
              >
                <span>Chat directly on WhatsApp</span>
                <ArrowUpRight size={14} />
              </a>

              <a
                href="tel:+264811234567"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 no-underline"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              >
                <span>Call Operator (+264 81 123 4567)</span>
              </a>
            </div>

            <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
              <span className="font-bold" style={{ color: 'var(--fg)' }}>
                {inquiryListing.priceFormatted || 'Direct inquiry'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const id = inquiryListing.id
                  setInquiryListing(null)
                  if (onOpenListing) onOpenListing(id)
                  else if (onOpenServices) onOpenServices()
                  else onNavigate('Services')
                }}
                className="font-semibold text-[var(--primary)] hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1"
              >
                <span>View full listing</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
