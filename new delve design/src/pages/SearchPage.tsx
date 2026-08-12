import { useState, useRef, useEffect } from 'react'
import {
  Search, X, Clock, MapPin, ArrowRight, Car, Plane, Anchor,
  Bus, Star, CheckCircle, Bookmark, Heart, TrendingUp,
  Filter, ChevronDown, SlidersHorizontal, AlertCircle, User,
} from 'lucide-react'
import type { PublicTravelerProfile } from '@delve/contracts'
import {
  autocompleteSuggestions, popularSearches, suggestedDestinations,
  recentSearches, mockSearchResults, exploreCategories, transportShortcuts,
  type ResultType, type AutocompleteSuggestion, type SearchResult,
  type TransportSearchResult, type JourneySearchResult, type DelversSearchResult,
  type DealSearchResult,
} from '../data/searchData'
import { deals, journeys, delversPosts } from '../data/mockData'
import { searchTravelers } from '../api/socialClient'
import { formatUsername } from '../lib/formatUsername'

// ─── Config ───────────────────────────────────────────────────────────────

const resultTypeTabs: { label: string; value: ResultType }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Deals',      value: 'deal' },
  { label: 'Places',     value: 'place' },
  { label: 'Transport',  value: 'transport' },
  { label: 'Food',       value: 'food' },
  { label: 'Activities', value: 'activity' },
  { label: 'Events',     value: 'event' },
  { label: 'Guides',     value: 'guide' },
  { label: 'Journeys',   value: 'journey' },
  { label: 'Delvers',    value: 'delvers' },
]

const groupColors: Record<string, string> = {
  road: '#E05C1A', air: '#3B82F6', water: '#06B6D4',
}

const typeColors: Record<string, string> = {
  deal:      '#10A760',
  place:     '#8C52FF',
  stay:      '#6366F1',
  transport: '#E05C1A',
  food:      '#F59E0B',
  activity:  '#EF4444',
  event:     '#EC4899',
  journey:   '#8C52FF',
  delvers:   '#8C52FF',
  guide:     '#06B6D4',
}

const groupIcon = (group: string) => {
  if (group === 'road') return <Car size={13} />
  if (group === 'air') return <Plane size={13} />
  return <Anchor size={13} />
}

const suggestionGroupIcon = (group: AutocompleteSuggestion['group']) => {
  if (group === 'recent') return <Clock size={15} style={{ color: 'var(--fg-muted)' }} />
  if (group === 'transport') return <Car size={15} style={{ color: '#E05C1A' }} />
  if (group === 'deal') return <Star size={15} style={{ color: '#F59E0B' }} />
  if (group === 'journey') return <MapPin size={15} style={{ color: '#8C52FF' }} />
  return <MapPin size={15} style={{ color: 'var(--fg-muted)' }} />
}

// ─── Autocomplete panel ───────────────────────────────────────────────────

function AutocompletePanel({
  query, onSelect, activeIndex, setActiveIndex,
}: {
  query: string
  onSelect: (label: string) => void
  activeIndex: number
  setActiveIndex: (i: number) => void
}) {
  const filtered = autocompleteSuggestions.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase()) ||
    s.context.toLowerCase().includes(query.toLowerCase())
  )

  if (filtered.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 shadow-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>No suggestions for "{query}"</p>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Press Enter to search anyway</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 shadow-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {filtered.map((s, i) => (
        <button key={s.id} onClick={() => onSelect(s.label)}
          onMouseEnter={() => setActiveIndex(i)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
          style={{
            background: i === activeIndex ? 'var(--surface-subtle)' : 'transparent',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
          <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-subtle)' }}>
            {suggestionGroupIcon(s.group)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{s.label}</p>
            <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{s.context}</p>
          </div>
          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}>
            {s.type}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Result card ─────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)
  const color = typeColors[result.resultType] ?? 'var(--primary)'

  return (
    <article className="overflow-hidden sm:rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Image */}
      <div className="relative" style={{ height: 180 }}>
        <img src={result.image} alt={result.title} className="w-full h-full object-cover" />

        {/* Type chip */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${color}dd`, color: '#fff', backdropFilter: 'blur(4px)' }}>
            {result.resultType === 'transport' && groupIcon((result as TransportSearchResult).transportGroup)}
            {result.resultType.charAt(0).toUpperCase() + result.resultType.slice(1)}
          </span>
        </div>

        {/* Sponsored */}
        {result.sponsored && (
          <div className="absolute top-3 right-3">
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }}>Sponsored</span>
          </div>
        )}

        {/* Save */}
        <button onClick={() => setSaved(s => !s)}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <Bookmark size={16} fill={saved ? '#fff' : 'none'} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {/* Creator row for journey/delvers */}
        {(result.resultType === 'journey' || result.resultType === 'delvers') && (
          <div className="flex items-center gap-2">
            <img
              src={(result as JourneySearchResult | DelversSearchResult).creatorAvatar}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
              {(result as JourneySearchResult | DelversSearchResult).creator}
            </span>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold leading-snug mb-0.5" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            {result.title}
          </h3>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{result.subtitle}</p>
        </div>

        {/* Transport specifics */}
        {result.resultType === 'transport' && (() => {
          const t = result as TransportSearchResult
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${groupColors[t.transportGroup]}18`, color: groupColors[t.transportGroup] }}>
                {t.transportMode}
              </span>
              {t.seatsLeft !== undefined && (
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.seatsLeft} seats left</span>
              )}
            </div>
          )
        })()}

        {/* Deal specifics */}
        {result.resultType === 'deal' && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start"
            style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>
            Save {(result as DealSearchResult).saving}
          </span>
        )}

        {/* Destination + explanation */}
        <div className="flex items-center gap-1 flex-wrap">
          {result.destination && (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={10} /> {result.destination}
            </span>
          )}
          {result.explanation && (
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>· {result.explanation}</span>
          )}
        </div>

        {/* Rating */}
        {result.rating && (
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={11}
                  fill={i < Math.round(result.rating!) ? '#F59E0B' : 'none'}
                  style={{ color: '#F59E0B' }} />
              ))}
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{result.rating}</span>
            {result.reviewCount !== undefined && result.reviewCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>({result.reviewCount})</span>
            )}
            {result.verification?.verified && (
              <CheckCircle size={11} style={{ color: 'var(--primary)' }} />
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2 pt-1"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            {result.price && (
              <>
                <span className="text-base font-extrabold tabular-nums"
                  style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
                  {result.currency} {result.price}
                </span>
                <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {result.priceBasis}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLiked(l => !l)}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform">
              <Heart size={16} fill={liked ? '#EF4444' : 'none'}
                style={{ color: liked ? '#EF4444' : 'var(--fg-muted)' }} />
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 hover:opacity-90"
              style={{ background: color, color: '#fff', minHeight: 36 }}>
              {result.actionLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Landing sections ─────────────────────────────────────────────────────

function LandingDeal({ deal }: { deal: (typeof deals)[0] }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="flex-shrink-0 overflow-hidden rounded-2xl"
      style={{ width: 240, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="relative" style={{ height: 130 }}>
        <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
        <button onClick={() => setSaved(s => !s)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <Bookmark size={14} fill={saved ? '#fff' : 'none'} style={{ color: '#fff' }} />
        </button>
        {deal.sponsored && (
          <span className="absolute bottom-2 left-2 text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)' }}>Sponsored</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold mb-0.5 truncate" style={{ color: 'var(--fg)' }}>{deal.title}</p>
        <p className="text-xs truncate mb-1.5" style={{ color: 'var(--fg-muted)' }}>{deal.business} · {deal.destination}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--fg)' }}>N$ {deal.price}</span>
            <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceUnit}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>Save {deal.saving}</span>
        </div>
      </div>
    </div>
  )
}

function LandingJourney({ journey }: { journey: (typeof journeys)[0] }) {
  return (
    <div className="flex-shrink-0 overflow-hidden rounded-2xl"
      style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="relative" style={{ height: 120 }}>
        <img src={journey.coverImage} alt={journey.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
          <p className="text-xs font-bold text-white leading-tight">{journey.title}</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <img src={journey.creator.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{journey.creator.name}</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{journey.stops} stops · {journey.duration}</p>
      </div>
    </div>
  )
}

function DelversThumb({ post }: { post: (typeof delversPosts)[0] }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <img src={post.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <img src={post.creator.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
          <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{post.creator.name}</span>
        </div>
        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: 'var(--fg)' }}>{post.caption}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{post.place}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function SearchPage({
  onNavigate,
  onOpenProfile,
}: {
  onNavigate?: (destination: string) => void
  onOpenProfile?: (username: string) => void
} = {}) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
  const [activeTab, setActiveTab] = useState<ResultType>('all')
  const [sort, setSort] = useState<string>('recommended')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [savedResults, setSavedResults] = useState<Set<string>>(new Set())
  const [travelers, setTravelers] = useState<PublicTravelerProfile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Close autocomplete on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSubmit(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return
    setQuery(finalQuery)
    setSubmitted(true)
    setShowAutocomplete(false)
    setActiveTab('all')
    void searchTravelers(finalQuery)
      .then(setTravelers)
      .catch(() => setTravelers([]))
  }

  function handleClear() {
    setQuery('')
    setSubmitted(false)
    setShowAutocomplete(false)
    setActiveTab('all')
    setTravelers([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const filtered = autocompleteSuggestions.filter(s =>
      s.label.toLowerCase().includes(query.toLowerCase())
    )
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (autocompleteIndex >= 0 && filtered[autocompleteIndex]) {
        handleSubmit(filtered[autocompleteIndex].label)
      } else {
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
      inputRef.current?.blur()
    }
  }

  const filteredResults = mockSearchResults.filter(r =>
    activeTab === 'all' || r.resultType === activeTab
  )

  // ── Search input (shared between landing and results) ──
  const searchInput = (
    <div ref={searchWrapRef} className="relative">
      <div className="flex items-center gap-3 px-4 rounded-2xl transition-all"
        style={{
          background: 'var(--surface)',
          border: '2px solid',
          borderColor: showAutocomplete ? 'var(--primary)' : 'var(--border)',
          height: 52,
        }}>
        <Search size={18} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowAutocomplete(e.target.value.length > 0)
            setAutocompleteIndex(-1)
          }}
          onFocus={() => query.length > 0 && setShowAutocomplete(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search places, deals, transport, journeys…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--fg)', fontFamily: 'DM Sans, sans-serif' }}
        />
        {query && (
          <button onClick={handleClear} className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-subtle)' }}>
            <X size={14} style={{ color: 'var(--fg-muted)' }} />
          </button>
        )}
        {query && (
          <button onClick={() => handleSubmit()}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 36 }}>
            Search
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && query.length > 0 && (
        <AutocompletePanel
          query={query}
          onSelect={q => handleSubmit(q)}
          activeIndex={autocompleteIndex}
          setActiveIndex={setAutocompleteIndex}
        />
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

        {/* Search input */}
        <div className="px-4 sm:px-0 pt-4 pb-3">
          {searchInput}
        </div>

        {/* Result type tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-4 sm:px-0 scroll-rail scroll-rail--fade">
          {resultTypeTabs.map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                background: activeTab === tab.value ? 'var(--primary)' : 'var(--surface)',
                color: activeTab === tab.value ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${activeTab === tab.value ? 'var(--primary)' : 'var(--border)'}`,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results meta + sort */}
        <div className="flex items-center justify-between px-4 sm:px-0 py-3">
          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
            <span className="font-bold">{filteredResults.length}</span> results for
            <span className="italic ml-1" style={{ color: 'var(--primary)' }}>"{query}"</span>
          </p>
          <div className="relative">
            <button onClick={() => setShowSortMenu(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <SlidersHorizontal size={13} />
              {sort === 'recommended' ? 'Recommended' : sort === 'price-asc' ? 'Price ↑' : sort === 'rating' ? 'Rating' : 'Most reviewed'}
              <ChevronDown size={12} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 180 }}>
                {[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'price-asc',  label: 'Price low to high' },
                  { value: 'rating',     label: 'Rating' },
                  { value: 'most-reviewed', label: 'Most reviewed' },
                  { value: 'best-deal',  label: 'Best deal' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); setShowSortMenu(false) }}
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

        {travelers.length > 0 && (
          <div className="px-4 sm:px-0 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Travelers
            </p>
            <div className="flex flex-col gap-2">
              {travelers.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenProfile?.(t.username)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div
                    className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(140,82,255,0.12)' }}
                  >
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={18} style={{ color: 'var(--fg-muted)' }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {t.displayName || formatUsername(t.username)}
                    </p>
                    <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                      {formatUsername(t.username)}
                      {t.homeCity ? ` · ${t.homeCity}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {filteredResults.length === 0 ? (
          <div className="px-4 sm:px-0 py-12 text-center">
            <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-base font-bold mb-1" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
              We couldn't find an exact match.
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>Try a different category or broaden your search.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Clear filters', 'Try All results', 'View deals', 'Explore places'].map(a => (
                <button key={a} onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 sm:px-0">
            {filteredResults.map(r => <ResultCard key={r.id} result={r} />)}
          </div>
        )}

        {/* Load more */}
        {filteredResults.length > 0 && (
          <button className="w-full py-4 text-sm font-medium mt-4 sm:rounded-2xl transition-all active:opacity-70"
            style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
            Load more results
          </button>
        )}

        {/* Spacing for mobile nav */}
        <div className="h-10" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LANDING VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Hero heading */}
      <div className="px-4 sm:px-0 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
          Find your next experience.
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
          Search places, services, transport, deals, and journeys across Delve.
        </p>
        {searchInput}
      </div>

      {/* Recent searches */}
      <div className="px-4 sm:px-0 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--fg-muted)' }}>Recent</p>
        <div className="flex gap-2 flex-wrap">
          {recentSearches.map(s => (
            <button key={s} onClick={() => handleSubmit(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <Clock size={12} style={{ color: 'var(--fg-muted)' }} />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested destinations */}
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Suggested destinations</p>
          <button className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {suggestedDestinations.map(dest => (
            <button key={dest.id} onClick={() => handleSubmit(dest.name)}
              className="flex-shrink-0 overflow-hidden rounded-2xl relative active:scale-95 transition-transform"
              style={{ width: 140, height: 100 }}>
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-end p-3"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                <p className="text-xs font-bold text-white leading-tight">{dest.name}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{dest.tagline}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Explore destinations — canonical Explore hierarchy */}
      {onNavigate && (
        <div className="px-4 sm:px-0 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Browse Delve</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Services', route: 'Services' },
              { label: 'Transport', route: 'Transport' },
              { label: 'Stays & more', route: 'Services' },
              { label: 'Communities', route: 'Communities' },
              { label: 'Delvers', route: 'Delvers' },
              { label: 'Deals', route: 'Deals' },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.route)}
                className="px-3 py-3.5 rounded-xl text-sm font-semibold text-left min-h-[44px]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explore by category */}
      <div className="px-4 sm:px-0 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Explore by category</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {exploreCategories.map(cat => (
            <button key={cat.label} type="button"
              onClick={() => { setSubmitted(true); setActiveTab(cat.tab); setQuery(cat.label) }}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all active:scale-95 min-h-[44px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-xl leading-none">{cat.icon}</span>
              <span className="text-xs font-medium text-center leading-tight break-anywhere" style={{ color: 'var(--fg)' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular searches */}
      <div className="px-4 sm:px-0 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} style={{ color: 'var(--primary)' }} />
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Popular searches</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {popularSearches.map(s => (
            <button key={s} onClick={() => handleSubmit(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)', border: '1px solid rgba(140,82,255,0.2)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Deals near you */}
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Deals near you</p>
          <button onClick={() => { setSubmitted(true); setActiveTab('deal'); setQuery('deals') }}
            className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {deals.slice(0, 4).map(d => <LandingDeal key={d.id} deal={d} />)}
        </div>
      </div>

      {/* Trending journeys */}
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Trending journeys</p>
          <button onClick={() => { setSubmitted(true); setActiveTab('journey'); setQuery('journeys') }}
            className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {journeys.slice(0, 3).map(j => <LandingJourney key={j.id} journey={j} />)}
        </div>
      </div>

      {/* Transport shortcuts */}
      <div className="px-4 sm:px-0 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Transport shortcuts</p>
        <div className="flex gap-2 flex-wrap">
          {transportShortcuts.map(s => (
            <button key={s.label} onClick={() => handleSubmit(s.query)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <Car size={14} style={{ color: '#E05C1A' }} /> {s.label}
              <ArrowRight size={13} style={{ color: 'var(--fg-muted)' }} />
            </button>
          ))}
        </div>
      </div>

      {/* From Delvers */}
      <div className="px-4 sm:px-0 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>From Delvers</p>
          <button onClick={() => { setSubmitted(true); setActiveTab('delvers'); setQuery('delvers') }}
            className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex flex-col gap-3">
          {delversPosts.slice(0, 3).map(p => <DelversThumb key={p.id} post={p} />)}
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
