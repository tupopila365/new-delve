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
import { SectionEmpty, SkeletonCard } from '../components/SectionStates'

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
  { id: 'h0', label: 'All', icon: <Navigation size={20} className="flex-shrink-0" />, color: '#8C52FF' },
  { id: 'h1', label: 'Car rental', icon: <Car size={20} className="flex-shrink-0" />, color: '#E05C1A' },
  { id: 'h2', label: 'Rides', icon: <Users size={20} className="flex-shrink-0" />, color: '#10A760' },
  { id: 'h3', label: 'Bus', icon: <Bus size={20} className="flex-shrink-0" />, color: '#F59E0B' },
  { id: 'h4', label: 'Flights', icon: <Plane size={20} className="flex-shrink-0" />, color: '#3B82F6' },
  { id: 'h5', label: 'Ferry', icon: <Anchor size={20} className="flex-shrink-0" />, color: '#06B6D4' },
  { id: 'h6', label: 'Transfer', icon: <Truck size={20} className="flex-shrink-0" />, color: '#6366F1' },
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
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [search, setSearch] = useState<SearchState>({ from: '', to: '', date: '', passengers: 1 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActiveField(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function clear() {
    setSearch({ from: '', to: '', date: '', passengers: 1 })
    setActiveField(null)
    onSearch?.('', '')
  }

  function handleTriggerSearch() {
    setActiveField(null)
    setOpen(false)
    onSearch?.(search.from, search.to)
  }

  const hasSearch = Boolean(search.from || search.to || search.date || search.passengers > 1)

  return (
    <div ref={cardRef} className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer text-left"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
            >
              <Search size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate m-0" style={{ color: 'var(--fg)' }}>
                {search.from && search.to ? `${search.from} → ${search.to}` :
                 search.from ? `From ${search.from}` :
                 search.to ? `To ${search.to}` :
                 'Where are you traveling in Namibia?'}
              </p>
              <p className="text-xs truncate m-0" style={{ color: 'var(--fg-muted)' }}>
                {[search.date || 'Any date', `${search.passengers} traveler${search.passengers !== 1 ? 's' : ''}`].join(' · ')}
              </p>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: 'var(--surface-subtle)', color: 'var(--primary)', border: '1px solid var(--border)' }}
          >
            Search
          </span>
        </button>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1.5px solid var(--primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
        >
          {/* Inputs bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: 'var(--border)' }}>
            <div className="p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>From</label>
              <input
                type="text"
                placeholder="Origin city"
                value={search.from}
                onChange={e => setSearch(s => ({ ...s, from: e.target.value }))}
                className="w-full bg-transparent text-xs font-semibold outline-none border-none p-0"
                style={{ color: 'var(--fg)' }}
              />
            </div>
            <div className="p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>To</label>
              <input
                type="text"
                placeholder="Destination"
                value={search.to}
                onChange={e => setSearch(s => ({ ...s, to: e.target.value }))}
                className="w-full bg-transparent text-xs font-semibold outline-none border-none p-0"
                style={{ color: 'var(--fg)' }}
              />
            </div>
            <div className="p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>Date</label>
              <input
                type="text"
                placeholder="When?"
                value={search.date}
                onChange={e => setSearch(s => ({ ...s, date: e.target.value }))}
                className="w-full bg-transparent text-xs font-semibold outline-none border-none p-0"
                style={{ color: 'var(--fg)' }}
              />
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>Travelers</label>
                <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{search.passengers}</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSearch(s => ({ ...s, passengers: Math.max(1, s.passengers - 1) }))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setSearch(s => ({ ...s, passengers: Math.min(20, s.passengers + 1) }))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={clear} className="text-xs font-semibold underline cursor-pointer" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none' }}>
              Clear
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerSearch}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
              >
                <Search size={13} />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${color}` }}>
          <img src={avatar} alt={result.operator} className="w-full h-full object-cover" />
        </div>
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
        <button
          type="button"
          onClick={() => onSave(result.id)}
          className="p-2 rounded-xl cursor-pointer"
          style={{ color: saved ? 'var(--primary)' : 'var(--fg-muted)', background: 'none', border: 'none' }}
          aria-label="Save"
        >
          <Bookmark size={18} fill={saved ? 'var(--primary)' : 'none'} />
        </button>
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
      <div
        className="mb-3 sm:mb-4 sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex gap-3 sm:gap-4 overflow-x-auto px-3 sm:px-4 py-3" style={{ scrollbarWidth: 'none' }}>
          {highlights.map(h => {
            const active = activeHighlight === h.label
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveHighlight(h.label)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 active:opacity-70 transition-opacity cursor-pointer"
                style={{ minWidth: 60, background: 'none', border: 'none' }}
              >
                <div
                  className="p-0.5 rounded-full"
                  style={{ background: active ? h.color : 'var(--border)' }}
                >
                  <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                    style={{ background: active ? `${h.color}22` : 'var(--surface-subtle)', border: '2px solid var(--surface)' }}
                  >
                    <span style={{ color: active ? h.color : 'var(--fg-muted)' }}>{h.icon}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-center leading-tight" style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)', maxWidth: 64 }}>
                  {h.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick needs chips */}
      <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto px-3 sm:px-0" style={{ scrollbarWidth: 'none' }}>
        {quickNeeds.slice(0, 6).map(need => {
          const active = activeQuickNeeds.has(need)
          return (
            <button
              key={need}
              type="button"
              onClick={() => toggleQuickNeed(need)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                minHeight: 40,
              }}
            >
              {need}
            </button>
          )
        })}
      </div>

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
            body="Published transport options matching your filters will appear here."
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
