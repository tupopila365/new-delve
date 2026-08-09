import { useState, useRef, useEffect } from 'react'
import {
  Car, Plane, Anchor, Search, MapPin, Users,
  CheckCircle, Clock, Bookmark, Star, Info,
  ArrowRight, Heart, MessageCircle, Send, MoreHorizontal,
  Truck, Bus, Navigation, Flame, TrendingUp,
  AlertCircle, X, Plus, Minus,
} from 'lucide-react'
import { transportResults, quickNeeds, type TransportGroup, type TransportResult } from '../data/transportData'
import TransportDetailPage from './TransportDetailPage'

// ─── Config ───────────────────────────────────────────────────────────────

const groupColors: Record<string, string> = {
  road:  '#E05C1A',
  air:   '#3B82F6',
  water: '#06B6D4',
}

const modeIcon: Record<string, React.ReactNode> = {
  'Car rental':       <Car size={16} />,
  'Community ride':   <Users size={16} />,
  'Private driver':   <Car size={16} />,
  'Bus':              <Bus size={16} />,
  'Airport transfer': <Plane size={16} />,
  'Regional flight':  <Plane size={16} />,
  'Charter flight':   <Plane size={16} />,
  'Ferry':            <Anchor size={16} />,
  'Water taxi':       <Anchor size={16} />,
}

// ─── Highlights (stories-style row) ──────────────────────────────────────

const highlights = [
  { id: 'h0', label: 'All', icon: <Navigation size={20} />, color: '#8C52FF', count: 8 },
  { id: 'h1', label: 'Car rental', icon: <Car size={20} />, color: '#E05C1A', count: 3 },
  { id: 'h2', label: 'Rides', icon: <Users size={20} />, color: '#10A760', count: 2 },
  { id: 'h3', label: 'Bus', icon: <Bus size={20} />, color: '#F59E0B', count: 1 },
  { id: 'h4', label: 'Flights', icon: <Plane size={20} />, color: '#3B82F6', count: 2 },
  { id: 'h5', label: 'Ferry', icon: <Anchor size={20} />, color: '#06B6D4', count: 1 },
  { id: 'h6', label: 'Transfer', icon: <Truck size={20} />, color: '#6366F1', count: 1 },
]

// ─── Trending routes ──────────────────────────────────────────────────────

const trendingRoutes = [
  { from: 'Windhoek', to: 'Swakopmund', bookings: '34 this week', mode: 'Bus · Car rental' },
  { from: 'Swakopmund', to: 'Walvis Bay', bookings: '18 this week', mode: 'Shared ride · Water taxi' },
  { from: 'Windhoek', to: 'Sossusvlei', bookings: '11 this week', mode: 'Car rental · Charter' },
]

// ─── Recent activity ──────────────────────────────────────────────────────

const recentActivity = [
  { avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=60&h=60&fit=crop&auto=format', name: 'Lena B.', action: 'booked a community ride', route: 'Windhoek → Swakopmund', timeAgo: '12m ago' },
  { avatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=60&h=60&fit=crop&auto=format', name: 'Marcus V.', action: 'saved a car rental', route: 'Namibia Car Hire Co.', timeAgo: '1h ago' },
  { avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=60&h=60&fit=crop&auto=format', name: 'Theo P.', action: 'asked about the bus', route: 'Intercape Windhoek → Swakop', timeAgo: '3h ago' },
]

// ─── Operator avatars (mock) ──────────────────────────────────────────────

const operatorAvatars: Record<string, string> = {
  'Namibia Car Hire Co.':       'https://images.unsplash.com/photo-1635858780418-2eeb9e75768f?w=80&h=80&fit=crop&auto=format',
  'Selma K.':                   'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format',
  'Johannes M.':                'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format',
  'Intercape Namibia':          'https://images.unsplash.com/photo-1678038541432-a5b25b41591e?w=80&h=80&fit=crop&auto=format',
  'SwiftShuttle NM':            'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=80&h=80&fit=crop&auto=format',
  'Westair Aviation':           'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=80&h=80&fit=crop&auto=format',
  'Namibia Air Charter':        'https://images.unsplash.com/photo-1695302938630-929b584ae6f2?w=80&h=80&fit=crop&auto=format',
  'Walvis Bay Ferry Services':  'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=80&h=80&fit=crop&auto=format',
  'Swakop Bay Transfers':       'https://images.unsplash.com/photo-1544632688-712e150321a5?w=80&h=80&fit=crop&auto=format',
}

const operatorRatings: Record<string, { rating: number; reviews: number }> = {
  'Namibia Car Hire Co.':       { rating: 4.7, reviews: 312 },
  'Selma K.':                   { rating: 4.4, reviews: 28 },
  'Johannes M.':                { rating: 4.9, reviews: 87 },
  'Intercape Namibia':          { rating: 4.3, reviews: 641 },
  'SwiftShuttle NM':            { rating: 4.8, reviews: 194 },
  'Westair Aviation':           { rating: 4.6, reviews: 520 },
  'Namibia Air Charter':        { rating: 4.5, reviews: 43 },
  'Walvis Bay Ferry Services':  { rating: 4.2, reviews: 189 },
  'Swakop Bay Transfers':       { rating: 3.9, reviews: 34 },
}

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
  { label: 'Mon 11 Aug', value: 'Mon 11 Aug' },
  { label: 'This weekend', value: 'This weekend' },
  { label: 'Next week', value: 'Next week' },
]

function TransportSearch() {
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [search, setSearch] = useState<SearchState>({ from: '', to: '', date: '', passengers: 1 })
  const cardRef = useRef<HTMLDivElement>(null)

  // close when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActiveField(null)
        if (!search.from && !search.to && !search.date) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [search])

  const hasValues = search.from || search.to || search.date
  const summary = [search.from, search.to, search.date, `${search.passengers} traveler${search.passengers !== 1 ? 's' : ''}`]
    .filter(Boolean).join(' · ')

  function clear() {
    setSearch({ from: '', to: '', date: '', passengers: 1 })
    setOpen(false)
    setActiveField(null)
  }

  const fieldBase = {
    flex: 1,
    minWidth: 0,
    padding: '10px 14px',
    cursor: 'pointer',
    borderRadius: 0,
    transition: 'background 0.15s',
  }

  const fieldActive = (field: ActiveField) => ({
    background: activeField === field ? 'rgba(140,82,255,0.07)' : 'transparent',
    outline: activeField === field ? '2px solid var(--primary)' : 'none',
    outlineOffset: '-2px',
    borderRadius: 16,
  })

  return (
    <div ref={cardRef} className="mx-3 sm:mx-0 mb-3 sm:mb-4">
      {/* Collapsed pill */}
      {!open ? (
        <button
          onClick={() => { setOpen(true); setActiveField('from') }}
          className="w-full flex items-center gap-3 rounded-2xl px-4 text-sm font-medium text-left transition-all hover:opacity-90"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 52 }}>
          <Search size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span className="flex-1 truncate" style={{ color: hasValues ? 'var(--fg)' : 'var(--fg-muted)' }}>
            {hasValues ? summary : 'From · To · Date · Travelers'}
          </span>
          {hasValues && (
            <span onClick={e => { e.stopPropagation(); clear() }}
              className="p-1.5 rounded-full flex-shrink-0"
              style={{ color: 'var(--fg-muted)', background: 'var(--surface-subtle)' }}>
              <X size={13} />
            </span>
          )}
          <span className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            Search
          </span>
        </button>
      ) : (
        /* Expanded card */
        <div className="rounded-2xl overflow-hidden shadow-lg"
          style={{ background: 'var(--surface)', border: '2px solid var(--primary)' }}>

          {/* Field blocks row — stacks on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y-2 sm:divide-y-0 sm:divide-x-2"
            style={{ borderColor: 'var(--border)' }}>

            {/* FROM */}
            <button
              onClick={() => setActiveField(activeField === 'from' ? null : 'from')}
              className="text-left p-4"
              style={{ ...fieldActive('from'), borderRight: '1px solid var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--primary)' }}>From</p>
              <p className="text-sm font-medium truncate" style={{ color: search.from ? 'var(--fg)' : 'var(--fg-muted)' }}>
                {search.from || 'Where from?'}
              </p>
            </button>

            {/* TO */}
            <button
              onClick={() => setActiveField(activeField === 'to' ? null : 'to')}
              className="text-left p-4"
              style={{ ...fieldActive('to'), borderRight: '1px solid var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>To</p>
              <p className="text-sm font-medium truncate" style={{ color: search.to ? 'var(--fg)' : 'var(--fg-muted)' }}>
                {search.to || 'Where to?'}
              </p>
            </button>

            {/* DATE */}
            <button
              onClick={() => setActiveField(activeField === 'date' ? null : 'date')}
              className="text-left p-4"
              style={{ ...fieldActive('date'), borderRight: '1px solid var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>Date</p>
              <p className="text-sm font-medium" style={{ color: search.date ? 'var(--fg)' : 'var(--fg-muted)' }}>
                {search.date || 'When?'}
              </p>
            </button>

            {/* PASSENGERS */}
            <button
              onClick={() => setActiveField(activeField === 'passengers' ? null : 'passengers')}
              className="text-left p-4"
              style={fieldActive('passengers')}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>Travelers</p>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                {search.passengers} traveler{search.passengers !== 1 ? 's' : ''}
              </p>
            </button>
          </div>

          {/* Dropdown panel */}
          {activeField && (
            <div className="border-t" style={{ borderColor: 'var(--border)' }}>

              {/* FROM / TO — place picker */}
              {(activeField === 'from' || activeField === 'to') && (
                <div className="p-4">
                  <div className="relative mb-3">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                    <input
                      autoFocus
                      placeholder={activeField === 'from' ? 'City, airport, or address…' : 'Where are you going?'}
                      value={activeField === 'from' ? search.from : search.to}
                      onChange={e => setSearch(s => ({ ...s, [activeField]: e.target.value }))}
                      className="w-full pl-9 pr-4 rounded-xl text-sm"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 42 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Popular places</p>
                  <div className="flex flex-wrap gap-2">
                    {popularPlaces.map(place => (
                      <button key={place}
                        onClick={() => {
                          setSearch(s => ({ ...s, [activeField]: place }))
                          setActiveField(activeField === 'from' ? 'to' : 'date')
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                        <MapPin size={12} style={{ color: 'var(--primary)' }} />
                        {place}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DATE — date picker */}
              {activeField === 'date' && (
                <div className="p-4">
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Select a date</p>
                  <div className="flex flex-wrap gap-2">
                    {upcomingDates.map(d => (
                      <button key={d.value}
                        onClick={() => { setSearch(s => ({ ...s, date: d.value })); setActiveField('passengers') }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                        style={{
                          background: search.date === d.value ? 'var(--primary)' : 'var(--surface-subtle)',
                          color: search.date === d.value ? '#fff' : 'var(--fg)',
                          border: `1px solid ${search.date === d.value ? 'var(--primary)' : 'var(--border)'}`,
                        }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PASSENGERS — stepper */}
              {activeField === 'passengers' && (
                <div className="p-4">
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Number of travelers</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSearch(s => ({ ...s, passengers: Math.max(1, s.passengers - 1) }))}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                      style={{ border: '1.5px solid var(--border)', color: 'var(--fg)', background: 'var(--surface-subtle)' }}
                      disabled={search.passengers <= 1}>
                      <Minus size={16} />
                    </button>
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
                        {search.passengers}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>traveler{search.passengers !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setSearch(s => ({ ...s, passengers: Math.min(20, s.passengers + 1) }))}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                      style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', background: 'rgba(140,82,255,0.1)' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                  {search.passengers >= 8 && (
                    <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
                      For groups of 8+, consider a private charter or minibus.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom bar — close + search */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={clear} className="text-sm font-medium underline" style={{ color: 'var(--fg-muted)' }}>Clear</button>
            <button
              onClick={() => { setActiveField(null); setOpen(false) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              <Search size={15} /> Search transport
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Transport listing card (social + marketplace) ────────────────────────

function ListingCard({ result, saved, liked, onSave, onLike, onViewDetail }: {
  result: TransportResult
  saved: boolean
  liked: boolean
  onSave: (id: string) => void
  onLike: (id: string) => void
  onViewDetail: (id: string) => void
}) {
  const [commentOpen, setCommentOpen] = useState(false)
  const color = groupColors[result.transportGroup] ?? '#8C52FF'
  const avatar = operatorAvatars[result.operator]
  const ratingData = operatorRatings[result.operator]
  const isOnRequest = result.bookingMethod === 'request'
  const isExternal = result.bookingMethod === 'external'

  const actionLabel =
    result.transportMode === 'Car rental' ? 'View vehicle' :
    result.transportMode === 'Community ride' ? 'Request seat' :
    result.transportMode === 'Private driver' ? 'Request ride' :
    result.transportMode === 'Bus' ? 'Choose seats' :
    result.transportMode === 'Airport transfer' ? 'Request transfer' :
    result.transportMode.includes('flight') || result.transportMode.includes('Flight') ? 'View flight' :
    result.transportMode === 'Ferry' ? 'View ferry' : 'Check availability'

  return (
    <article className="overflow-hidden sm:rounded-2xl"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>

      {/* ── Operator header (like a social post) ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden"
            style={{ border: `2px solid ${color}` }}>
            <img src={avatar} alt={result.operator} className="w-full h-full object-cover" />
          </div>
          {/* Group dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: color, border: '2px solid var(--surface)' }}>
            <span style={{ color: '#fff', fontSize: 8 }}>
              {result.transportGroup === 'road' ? '🚗' : result.transportGroup === 'air' ? '✈' : '⚓'}
            </span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{result.operator}</span>
            {result.verification.verified && <CheckCircle size={13} style={{ color: 'var(--primary)' }} />}
            {result.sponsored && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}>Sponsored</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: 'var(--fg-muted)' }}>
            <span>{result.operatorType}</span>
            {ratingData && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span className="flex items-center gap-0.5">
                  <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                  <span className="tabular-nums">{ratingData.rating}</span>
                  <span>({ratingData.reviews})</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mode pill + more */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: `${color}18`, color }}>
            {modeIcon[result.transportMode]} {result.transportMode}
          </span>
          <button className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} aria-label="More">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* ── Photo ── */}
      <div className="relative" style={{ background: '#111' }}>
        <img src={result.image} alt={result.transportMode}
          className="w-full object-cover" style={{ maxHeight: '60vw', minHeight: 200 }} />
        {/* Route overlay at bottom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)' }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin size={13} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span className="text-sm font-semibold text-white truncate">{result.origin}</span>
            <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
            <span className="text-sm font-semibold text-white truncate">{result.destination}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <span className="flex items-center gap-1"><Clock size={10} /> {result.departure}</span>
            {result.duration !== 'N/A' && <span>· {result.duration}</span>}
            {result.seatsLeft !== undefined && (
              <span className="flex items-center gap-1" style={{ color: result.seatsLeft <= 3 ? '#FCA5A5' : 'rgba(255,255,255,0.7)' }}>
                · {result.seatsLeft} seat{result.seatsLeft !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
        {/* Status badge */}
        {result.status !== 'available' && (
          <div className="absolute top-3 left-3">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: result.status === 'on-request' ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)', color: '#fff' }}>
              {result.status === 'on-request' ? 'On request' : result.status === 'delayed' ? 'Delayed' : 'Sold out'}
            </span>
          </div>
        )}
      </div>

      {/* ── Price + actions bar ── */}
      <div className="px-4 pt-3 pb-1">
        {/* Social actions + save */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-0">
            <button onClick={() => onLike(result.id)}
              className="flex items-center gap-1.5 pr-3 pl-1 active:scale-95 transition-transform"
              style={{ minHeight: 44, background: 'transparent' }}>
              <Heart size={22} fill={liked ? '#EF4444' : 'none'}
                style={{ color: liked ? '#EF4444' : 'var(--fg-muted)' }} />
            </button>
            <button onClick={() => setCommentOpen(o => !o)}
              className="flex items-center gap-1.5 pr-3 active:scale-95 transition-transform"
              style={{ minHeight: 44, background: 'transparent' }}>
              <MessageCircle size={22} style={{ color: commentOpen ? 'var(--primary)' : 'var(--fg-muted)' }} />
            </button>
            <button className="flex items-center pr-3 active:scale-95 transition-transform"
              style={{ minHeight: 44 }}>
              <Send size={20} style={{ color: 'var(--fg-muted)' }} />
            </button>
          </div>
          <button onClick={() => onSave(result.id)}
            className="flex items-center active:scale-95 transition-transform"
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'flex-end' }}>
            <Bookmark size={22} fill={saved ? 'var(--primary)' : 'none'}
              style={{ color: saved ? 'var(--primary)' : 'var(--fg-muted)' }} />
          </button>
        </div>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-2xl"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tabular-nums"
                style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
                {result.currency} {result.price}
              </span>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>/ {result.priceBasis}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{result.cancellation}</span>
            </div>
            {isExternal && (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#D97706' }}>
                <AlertCircle size={10} /> Leaves Delve to book
              </p>
            )}
            {isOnRequest && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Operator confirms within 2 hrs</p>
            )}
          </div>
          <button
            disabled={result.status === 'sold-out'}
            onClick={() => !result.status.includes('sold') && onViewDetail(result.id)}
            className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 hover:opacity-90"
            style={{
              background: result.status === 'sold-out' ? 'var(--border)' : 'var(--primary)',
              color: result.status === 'sold-out' ? 'var(--fg-muted)' : '#fff',
              minHeight: 44,
            }}>
            {result.status === 'sold-out' ? 'Sold out' : actionLabel}
          </button>
        </div>

        {/* Verification */}
        <div className="flex items-center gap-1.5 mb-2">
          {result.verification.verified
            ? <CheckCircle size={12} style={{ color: 'var(--primary)' }} />
            : <Info size={12} style={{ color: 'var(--fg-muted)' }} />}
          <span className="text-xs" style={{ color: result.verification.verified ? 'var(--primary)' : 'var(--fg-muted)' }}>
            {result.verification.label}
          </span>
        </div>

        {/* Comment input */}
        {commentOpen && (
          <div className="flex items-center gap-2 mt-2 mb-1">
            <div className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }} />
            <input placeholder="Ask a question…"
              className="flex-1 text-sm rounded-2xl px-4"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none', height: 40 }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
            <button className="text-sm font-semibold px-4 rounded-2xl flex-shrink-0"
              style={{ background: 'var(--primary)', color: '#fff', height: 40 }}>Ask</button>
          </div>
        )}

        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--fg-muted)' }}>{result.departure}</p>
      </div>
    </article>
  )
}

function highlightMatches(result: TransportResult, highlight: string) {
  if (highlight === 'All') return true
  if (highlight === 'Car rental') return result.transportMode === 'Car rental'
  if (highlight === 'Rides') return result.transportMode === 'Community ride' || result.transportMode === 'Private driver'
  if (highlight === 'Bus') return result.transportMode === 'Bus'
  if (highlight === 'Flights') return result.transportMode === 'Regional flight' || result.transportMode === 'Charter flight'
  if (highlight === 'Ferry') return result.transportMode === 'Ferry' || result.transportMode === 'Water taxi'
  if (highlight === 'Transfer') return result.transportMode === 'Airport transfer'
  return true
}

export function TransportAside() {
  const [followedRoutes, setFollowedRoutes] = useState<Set<string>>(new Set())

  function toggleRoute(route: string) {
    setFollowedRoutes(prev => {
      const n = new Set(prev)
      n.has(route) ? n.delete(route) : n.add(route)
      return n
    })
  }

  return (
    <aside className="hidden xl:flex flex-col gap-4 flex-shrink-0" style={{ width: 300 }}>
      <div className="sticky top-20 flex flex-col gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
              <TrendingUp size={14} style={{ color: 'var(--primary)' }} /> Trending routes
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {trendingRoutes.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold tabular-nums w-4 text-center flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                    <span className="truncate">{r.from}</span>
                    <ArrowRight size={11} className="flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                    <span className="truncate">{r.to}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{r.mode} · {r.bookings}</p>
                </div>
                <button type="button" onClick={() => toggleRoute(`${r.from}-${r.to}`)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{
                    background: followedRoutes.has(`${r.from}-${r.to}`) ? 'var(--surface-subtle)' : 'rgba(140,82,255,0.12)',
                    color: followedRoutes.has(`${r.from}-${r.to}`) ? 'var(--fg-muted)' : 'var(--primary)',
                    border: `1px solid ${followedRoutes.has(`${r.from}-${r.to}`) ? 'var(--border)' : 'transparent'}`,
                  }}>
                  {followedRoutes.has(`${r.from}-${r.to}`) ? 'Saved' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
            <Flame size={14} style={{ color: 'var(--primary)' }} /> Activity
          </p>
          <div className="flex flex-col gap-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug" style={{ color: 'var(--fg)' }}>
                    <span className="font-semibold">{a.name}</span> {a.action}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--primary)' }}>{a.route}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{a.timeAgo}</p>
                </div>
              </div>
            ))}
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
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [activeHighlight, setActiveHighlight] = useState('All')
  const [activeQuickNeeds, setActiveQuickNeeds] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState<Set<string>>(new Set())

  if (selectedResultId) {
    return (
      <TransportDetailPage
        resultId={selectedResultId}
        onBack={() => setSelectedResultId(null)}
        onBook={(passengers) => onBookResult?.(selectedResultId, passengers)}
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

  const feed = transportResults.filter(r => highlightMatches(r, activeHighlight))

  return (
    <>
      <TransportSearch />

      {/* Mode highlights — same rhythm as Home stories */}
      <div className="mb-3 sm:mb-4 sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto px-3 sm:px-4 py-3" style={{ scrollbarWidth: 'none' }}>
          {highlights.map(h => {
            const active = activeHighlight === h.label
            return (
              <button key={h.id} type="button" onClick={() => setActiveHighlight(h.label)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 active:opacity-70 transition-opacity"
                style={{ minWidth: 60 }}>
                <div className="p-0.5 rounded-full"
                  style={{ background: active ? h.color : 'var(--border)' }}>
                  <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                    style={{ background: active ? `${h.color}22` : 'var(--surface-subtle)', border: '2px solid var(--surface)' }}>
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

      {/* Quick needs — home-style single chip row */}
      <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto px-3 sm:px-0" style={{ scrollbarWidth: 'none' }}>
        {quickNeeds.slice(0, 6).map(need => {
          const active = activeQuickNeeds.has(need)
          return (
            <button key={need} type="button" onClick={() => toggleQuickNeed(need)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                minHeight: 40,
              }}>
              {need}
            </button>
          )
        })}
      </div>

      <p className="text-xs mb-3 px-3 sm:px-0" style={{ color: 'var(--fg-muted)' }}>
        {feed.length} listing{feed.length !== 1 ? 's' : ''} · Swakopmund area
      </p>

      <div className="flex flex-col gap-3 sm:gap-4">
        {feed.map(r => (
          <ListingCard key={r.id} result={r}
            saved={saved.has(r.id)} liked={liked.has(r.id)}
            onSave={toggleSave} onLike={toggleLike}
            onViewDetail={setSelectedResultId} />
        ))}
      </div>

      <button type="button" className="w-full py-4 text-sm font-medium transition-all active:opacity-70 mt-3 sm:mt-4 sm:rounded-2xl"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}>
        Load more listings
      </button>
    </>
  )
}
