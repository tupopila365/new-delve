import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Car, Plane, Anchor, Search, MapPin, Users,
  CheckCircle, Clock, Bookmark, Star, Info,
  ArrowRight, Heart, MessageCircle, Send, MoreHorizontal,
  Truck, Bus, Navigation, Flame, TrendingUp,
  AlertCircle, X, Plus, Minus, ShieldCheck,
} from 'lucide-react'
import { quickNeeds, type TransportGroup, type TransportResult } from '../data/transportData'
import TransportDetailPage from './TransportDetailPage'
import { fetchPublicListings } from '../api/listingClient'
import { listingToTransportResult } from '../api/homeClient'
import { SkeletonCard } from '../components/SectionStates'
import {
  ScrollRail,
  SectionEmpty,
  TravelerAvatar,
  SaveButton,
  CategoryHighlightRail,
  FilterChipRail,
  ExpandableSearchFilter,
} from '../components/shared'

// ─── Config ───────────────────────────────────────────────────────────────

const groupColors: Record<string, string> = {
  road:  '#E05C1A',
  air:   '#3B82F6',
  water: '#06B6D4',
}

const modeIcon: Record<string, React.ReactNode> = {
  'Car rental':       <Car size={16} className="flex-shrink-0" />,
  'Community ride':   <Users size={16} className="flex-shrink-0" />,
  'Private driver':   <Car size={16} className="flex-shrink-0" />,
  'Bus':              <Bus size={16} className="flex-shrink-0" />,
  'Airport transfer': <Plane size={16} className="flex-shrink-0" />,
  'Regional flight':  <Plane size={16} className="flex-shrink-0" />,
  'Charter flight':   <Plane size={16} className="flex-shrink-0" />,
  'Ferry':            <Anchor size={16} className="flex-shrink-0" />,
  'Water taxi':       <Anchor size={16} className="flex-shrink-0" />,
}

// ─── Highlights (categories) ──────────────────────────────────────────────

const highlights = [
  { id: 'All', label: 'All', icon: <Navigation size={20} className="flex-shrink-0" />, color: '#8C52FF' },
  { id: 'Car rental', label: 'Car rental', icon: <Car size={20} className="flex-shrink-0" />, color: '#E05C1A' },
  { id: 'Rides', label: 'Rides', icon: <Users size={20} className="flex-shrink-0" />, color: '#10A760' },
  { id: 'Bus', label: 'Bus', icon: <Bus size={20} className="flex-shrink-0" />, color: '#F59E0B' },
  { id: 'Flights', label: 'Flights', icon: <Plane size={20} className="flex-shrink-0" />, color: '#3B82F6' },
  { id: 'Ferry', label: 'Ferry', icon: <Anchor size={20} className="flex-shrink-0" />, color: '#06B6D4' },
  { id: 'Transfer', label: 'Transfer', icon: <Truck size={20} className="flex-shrink-0" />, color: '#6366F1' },
]

// ─── Expandable search ────────────────────────────────────────────────────

interface SearchState {
  from: string
  to: string
  date: string
  passengers: number
}

type ActiveField = 'from' | 'to' | 'date' | 'passengers' | null

const popularPlaces = [
  'Windhoek', 'Swakopmund', 'Walvis Bay', 'Sossusvlei',
  'Etosha', 'Lüderitz', 'Damaraland', 'Hosea Kutako Airport',
]

const upcomingDates = [
  { label: 'Today', value: 'Today' },
  { label: 'Tomorrow', value: 'Tomorrow' },
  { label: 'Sat 9 Aug', value: 'Sat 9 Aug' },
  { label: 'Sun 10 Aug', value: 'Sun 10 Aug' },
  { label: 'This weekend', value: 'This weekend' },
  { label: 'Next week', value: 'Next week' },
]

function TransportSearch({
  onSearch,
}: {
  onSearch?: (from: string, to: string) => void
}) {
  const [search, setSearch] = useState<SearchState>({ from: '', to: '', date: '', passengers: 1 })

  function clear() {
    setSearch({ from: '', to: '', date: '', passengers: 1 })
    onSearch?.('', '')
  }

  function handleTriggerSearch() {
    onSearch?.(search.from, search.to)
  }

  const summaryTitle =
    search.from && search.to
      ? `${search.from} → ${search.to}`
      : search.from
        ? `From ${search.from}`
        : search.to
          ? `To ${search.to}`
          : 'Where are you traveling in Namibia?'

  const summarySubtitle = [
    search.date || 'Any date',
    `${search.passengers} traveler${search.passengers !== 1 ? 's' : ''}`,
  ].join(' · ')

  return (
    <ExpandableSearchFilter
      summaryTitle={summaryTitle}
      summarySubtitle={summarySubtitle}
      fields={[
        {
          id: 'from',
          label: 'From',
          placeholder: 'Origin city',
          value: search.from,
          onChange: v => setSearch(s => ({ ...s, from: v })),
          suggestions: popularPlaces,
        },
        {
          id: 'to',
          label: 'To',
          placeholder: 'Destination',
          value: search.to,
          onChange: v => setSearch(s => ({ ...s, to: v })),
          suggestions: popularPlaces,
        },
        {
          id: 'date',
          label: 'Date',
          placeholder: 'When?',
          value: search.date,
          onChange: v => setSearch(s => ({ ...s, date: v })),
          suggestions: upcomingDates.map(d => d.label),
        },
        {
          id: 'passengers',
          label: 'Travelers',
          placeholder: '1',
          type: 'stepper',
          value: search.passengers,
          min: 1,
          max: 20,
          unitLabel: 'traveler',
          onChange: v => setSearch(s => ({ ...s, passengers: v })),
        },
      ]}
      onSearch={handleTriggerSearch}
      onClear={clear}
      searchButtonLabel="Search"
    />
  )
}

// ─── Transport listing card ───────────────────────────────────────────────

function ListingCard({ result, saved, liked, onSave, onLike, onViewDetail }: {
  result: TransportResult
  saved: boolean
  liked: boolean
  onSave: (id: string) => void
  onLike: (id: string) => void
  onViewDetail: (result: TransportResult) => void
}) {
  const color = groupColors[result.transportGroup] ?? '#8C52FF'
  const avatar = result.operatorAvatar || 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=80&h=80&fit=crop&auto=format'

  return (
    <article
      className="overflow-hidden sm:rounded-2xl"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <TravelerAvatar
          src={avatar}
          alt={result.operator}
          fallbackInitials={result.operator}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold m-0 truncate" style={{ color: 'var(--fg)' }}>
              {result.operator}
            </h3>
            {result.verification.verified && (
              <CheckCircle size={13} style={{ color: '#10A760', flexShrink: 0 }} />
            )}
          </div>
          <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
            {result.transportMode} · {result.origin} → {result.destination}
          </p>
        </div>
        <SaveButton
          isSaved={saved}
          onClick={() => onSave(result.id)}
          variant="ghost"
          size="md"
          ariaLabel="Save transport option"
        />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-xl overflow-hidden mb-3 bg-black/10" style={{ height: 160 }}>
          <img src={result.image} alt={result.transportMode} className="w-full h-full object-cover" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--fg)' }}>
                {result.currency} {result.price}
              </span>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>/ {result.priceBasis}</span>
            </div>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {result.duration} · {result.departure}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onViewDetail(result)}
            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
          >
            View options
          </button>
        </div>
      </div>
    </article>
  )
}

function highlightMatches(result: TransportResult, highlight: string) {
  if (highlight === 'All') return true
  const lowerMode = result.transportMode.toLowerCase()
  if (highlight === 'Car rental') return lowerMode.includes('rental') || lowerMode.includes('car') || lowerMode.includes('4x4')
  if (highlight === 'Rides') return lowerMode.includes('ride') || lowerMode.includes('driver')
  if (highlight === 'Bus') return lowerMode.includes('bus') || lowerMode.includes('shuttle')
  if (highlight === 'Flights') return lowerMode.includes('flight') || lowerMode.includes('air')
  if (highlight === 'Ferry') return lowerMode.includes('ferry') || lowerMode.includes('boat')
  if (highlight === 'Transfer') return lowerMode.includes('transfer')
  return true
}

export function TransportAside() {
  return (
    <aside className="hidden xl:flex flex-col gap-4 flex-shrink-0" style={{ width: 300 }}>
      <div className="sticky top-20 flex flex-col gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck size={16} style={{ color: '#10A760' }} />
            <h3 className="text-sm font-bold m-0" style={{ color: 'var(--fg)' }}>Direct Transport Promise</h3>
          </div>
          <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--fg-muted)' }}>
            All vehicle rentals, shuttle transfers, and flights connect directly to authorized Namibian transport operators. Zero hidden markups or intermediary middleman fees.
          </p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Car size={16} style={{ color: 'var(--primary)' }} />
            <h3 className="text-sm font-bold m-0" style={{ color: 'var(--fg)' }}>Overland Route Tips</h3>
          </div>
          <div className="space-y-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <p className="m-0">
              <strong className="text-[var(--fg)]">B2 Highway:</strong> Fully paved between Windhoek, Okahandja, and Swakopmund.
            </p>
            <p className="m-0">
              <strong className="text-[var(--fg)]">C-Roads:</strong> Gravel surface — high-clearance 2WD or 4WD recommended.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function TransportPage({
  onBookResult,
}: {
  onBookResult?: (resultId: string, passengers: number) => void
} = {}) {
  const [selectedResult, setSelectedResult] = useState<TransportResult | null>(null)
  const [activeHighlight, setActiveHighlight] = useState('All')
  const [activeQuickNeeds, setActiveQuickNeeds] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [listings, setListings] = useState<TransportResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicListings({
      category: 'Transport',
      city: searchCity || undefined,
      limit: 40,
    })
      .then(dtos => {
        if (!cancelled) {
          setListings(dtos.map(listingToTransportResult))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setListings([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [searchCity])

  if (selectedResult) {
    return (
      <TransportDetailPage
        resultId={selectedResult.id}
        item={selectedResult}
        onBack={() => setSelectedResult(null)}
        onBook={passengers => onBookResult?.(selectedResult.id, passengers)}
      />
    )
  }

  function toggleSave(id: string) {
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleLike(id: string) {
    setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleQuickNeed(label: string) {
    setActiveQuickNeeds(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })
  }

  const feed = listings.filter(r => highlightMatches(r, activeHighlight))

  return (
    <>
      <TransportSearch
        onSearch={(from, to) => {
          setSearchCity(to || from || null)
        }}
      />

      {/* Mode highlights */}
      <CategoryHighlightRail
        items={highlights}
        selectedId={activeHighlight}
        onSelect={setActiveHighlight}
        className="mb-3 sm:mb-4 sm:rounded-2xl"
        ariaLabel="Transport categories rail"
      />

      {/* Quick needs chips */}
      <FilterChipRail
        items={quickNeeds.slice(0, 6).map(need => ({ id: need, label: need }))}
        selected={activeQuickNeeds}
        onSelect={toggleQuickNeed}
        mode="multi"
        onClearAll={() => setActiveQuickNeeds(new Set())}
        className="mb-3 sm:mb-4"
        ariaLabel="Quick filter needs rail"
      />

      {loading ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>
      ) : feed.length === 0 ? (
        <div className="px-3 sm:px-0 py-6">
          <SectionEmpty
            icon={<Car size={24} />}
            title="No transport listings available"
            description="Published transport options matching your filters will appear here."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          <p className="text-xs mb-1 px-3 sm:px-0" style={{ color: 'var(--fg-muted)' }}>
            {feed.length} listing{feed.length !== 1 ? 's' : ''} available
          </p>
          {feed.map(r => (
            <ListingCard
              key={r.id}
              result={r}
              saved={saved.has(r.id)}
              liked={liked.has(r.id)}
              onSave={toggleSave}
              onLike={toggleLike}
              onViewDetail={setSelectedResult}
            />
          ))}
        </div>
      )}
    </>
  )
}
