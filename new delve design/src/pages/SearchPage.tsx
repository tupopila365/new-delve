import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Search, X, Clock, MapPin, ArrowRight, Car, Plane, Anchor,
  Bus, Star, CheckCircle, Bookmark, Heart, TrendingUp,
  Filter, ChevronDown, SlidersHorizontal, AlertCircle, User, Calendar, Users,
} from 'lucide-react'
import type { CommunityDto, CommunityThreadSummary, EventDto, JourneySummary, PostDto, PublicTravelerProfile, SearchSuggestion } from '@delve/contracts'
import {
  popularSearches, suggestedDestinations,
  mockSearchResults, exploreCategories, transportShortcuts,
  type ResultType, type SearchResult,
  type TransportSearchResult, type JourneySearchResult, type DelversSearchResult,
  type DealSearchResult,
} from '../data/searchData'
import { deals } from '../data/mockData'
import { fetchEvents, fetchFeed } from '../api/socialClient'
import { listCommunities } from '../api/communityClient'
import { listJourneys } from '../api/journeyClient'
import { fetchSearchSuggestions, unifiedSearch } from '../api/searchClient'
import { formatUsername } from '../lib/formatUsername'
import { kindLabel } from '../components/communities/communityThreadKinds'
import EventCoverMedia from '../components/EventCoverMedia'

const RECENT_SEARCHES_KEY = 'delve:recent-searches'
const RECENT_SEARCHES_LIMIT = 8

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function pushRecentSearch(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const next = [trimmed, ...loadRecentSearches().filter(item => item.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    RECENT_SEARCHES_LIMIT,
  )
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function searchTypesForTab(tab: ResultType): string | undefined {
  switch (tab) {
    case 'delvers':
      return 'traveler,post'
    case 'community':
      return 'community,thread'
    case 'journey':
      return 'journey'
    case 'event':
      return 'event'
    default:
      return undefined
  }
}

function buildRecentSuggestions(query: string, recent: string[]): SearchSuggestion[] {
  const q = query.trim().toLowerCase()
  return recent
    .filter(item => !q || item.toLowerCase().includes(q))
    .slice(0, 3)
    .map((label, index) => ({
      id: `recent:${index}:${label}`,
      label,
      context: 'Recent search',
      type: 'Recent',
      group: 'recent' as const,
      entityType: 'query' as const,
      entityId: label,
    }))
}

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
  { label: 'Communities', value: 'community' },
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
  community: '#0D9488',
  guide:     '#06B6D4',
}

const groupIcon = (group: string) => {
  if (group === 'road') return <Car size={13} />
  if (group === 'air') return <Plane size={13} />
  return <Anchor size={13} />
}

const suggestionGroupIcon = (group: SearchSuggestion['group']) => {
  if (group === 'recent') return <Clock size={15} style={{ color: 'var(--fg-muted)' }} />
  if (group === 'journey') return <MapPin size={15} style={{ color: '#8C52FF' }} />
  if (group === 'community' || group === 'thread') return <Users size={15} style={{ color: '#0D9488' }} />
  if (group === 'event') return <Calendar size={15} style={{ color: '#EC4899' }} />
  if (group === 'traveler') return <User size={15} style={{ color: 'var(--primary)' }} />
  if (group === 'post') return <Heart size={15} style={{ color: '#E11D48' }} />
  return <MapPin size={15} style={{ color: 'var(--fg-muted)' }} />
}

// ─── Autocomplete panel ───────────────────────────────────────────────────

function AutocompletePanel({
  query,
  suggestions,
  loading,
  onSelect,
  activeIndex,
  setActiveIndex,
}: {
  query: string
  suggestions: SearchSuggestion[]
  loading: boolean
  onSelect: (suggestion: SearchSuggestion) => void
  activeIndex: number
  setActiveIndex: (i: number) => void
}) {
  if (loading && suggestions.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 shadow-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-5 text-center">
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>Searching…</p>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
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
      {suggestions.map((s, i) => (
        <button key={s.id} type="button" onClick={() => onSelect(s)}
          onMouseEnter={() => setActiveIndex(i)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
          style={{
            background: i === activeIndex ? 'var(--surface-subtle)' : 'transparent',
            borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
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

function LandingEvent({
  event,
  onOpen,
}: {
  event: EventDto
  onOpen?: () => void
}) {
  const place = [event.locationName, event.city].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-shrink-0 overflow-hidden rounded-2xl text-left"
      style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)', cursor: onOpen ? 'pointer' : 'default', padding: 0 }}
    >
      <div className="relative" style={{ height: 120 }}>
        {event.coverUrl ? (
          <EventCoverMedia
            url={event.coverUrl}
            resourceType={event.coverResourceType}
            className="w-full h-full object-cover"
            controls={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
            <Calendar size={24} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
          <p className="text-xs font-bold text-white leading-tight">{event.title}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          {new Date(event.startAt).toLocaleDateString()}
          {place ? ` · ${place}` : ''}
        </p>
        <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
          {event.goingCount} going
        </p>
      </div>
    </button>
  )
}

function LandingJourney({
  journey,
  onOpen,
}: {
  journey: JourneySummary
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-shrink-0 overflow-hidden rounded-2xl text-left"
      style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)', cursor: onOpen ? 'pointer' : 'default', padding: 0 }}
    >
      <div className="relative" style={{ height: 120 }}>
        {journey.coverUrl ? (
          <img src={journey.coverUrl} alt={journey.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
            <MapPin size={24} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
          <p className="text-xs font-bold text-white leading-tight">{journey.title}</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {journey.author.displayName || journey.author.username}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          {journey.stopCount} stops · {journey.durationDays} days
        </p>
      </div>
    </button>
  )
}

function LandingCommunity({
  community,
  onOpen,
}: {
  community: CommunityDto
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-shrink-0 overflow-hidden rounded-2xl text-left"
      style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)', cursor: onOpen ? 'pointer' : 'default', padding: 0 }}
    >
      <div className="relative" style={{ height: 120 }}>
        {community.coverUrl ? (
          <img src={community.coverUrl} alt={community.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.12)' }}>
            <Users size={24} style={{ color: '#0D9488' }} />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
          <p className="text-xs font-bold text-white leading-tight">{community.name}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
          {community.destination}
          {community.privacy === 'PRIVATE' ? ' · Private' : ''}
        </p>
        <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
          {community.memberCount.toLocaleString()} members
        </p>
      </div>
    </button>
  )
}

function DelversThumb({
  post,
  onOpenProfile,
}: {
  post: PostDto
  onOpenProfile?: (username: string) => void
}) {
  const media = post.media[0]
  const isVideo = String(media?.resourceType || '').toLowerCase() === 'video'
  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.(post.author.username)}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black/10">
        {media?.url ? (
          isVideo ? (
            <video src={media.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={media.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={18} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : (
            <User size={12} style={{ color: 'var(--fg-muted)' }} />
          )}
          <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
            {post.author.displayName || formatUsername(post.author.username)}
          </span>
        </div>
        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: 'var(--fg)' }}>
          {post.caption || 'Delvers post'}
        </p>
        {post.location && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{post.location}</p>
        )}
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function SearchPage({
  onNavigate,
  onOpenProfile,
  onOpenJourney,
  onOpenEvent,
  onOpenCommunity,
  onOpenCommunityThread,
}: {
  onNavigate?: (destination: string) => void
  onOpenProfile?: (username: string) => void
  onOpenJourney?: (id: string) => void
  onOpenEvent?: (id: string) => void
  onOpenCommunity?: (id: string) => void
  onOpenCommunityThread?: (threadId: string) => void
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
  const [delverPosts, setDelverPosts] = useState<PostDto[]>([])
  const [communityHits, setCommunityHits] = useState<CommunityDto[]>([])
  const [threadHits, setThreadHits] = useState<CommunityThreadSummary[]>([])
  const [journeyHits, setJourneyHits] = useState<JourneySummary[]>([])
  const [eventHits, setEventHits] = useState<EventDto[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches())
  const [liveSuggestions, setLiveSuggestions] = useState<SearchSuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [trendingCommunities, setTrendingCommunities] = useState<CommunityDto[]>([])
  const [trendingJourneys, setTrendingJourneys] = useState<JourneySummary[]>([])
  const [trendingEvents, setTrendingEvents] = useState<EventDto[]>([])
  const [featuredDelvers, setFeaturedDelvers] = useState<PostDto[]>([])
  const [delversLoading, setDelversLoading] = useState(false)
  const [delversError, setDelversError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Live Delvers strip on landing
  useEffect(() => {
    let cancelled = false
    void fetchFeed()
      .then(posts => {
        if (!cancelled) setFeaturedDelvers(posts.slice(0, 6))
      })
      .catch(() => {
        if (!cancelled) setFeaturedDelvers([])
      })
    void listCommunities()
      .then(rows => {
        if (!cancelled) setTrendingCommunities(rows.slice(0, 4))
      })
      .catch(() => {
        if (!cancelled) setTrendingCommunities([])
      })
    void listJourneys()
      .then(rows => {
        if (!cancelled) setTrendingJourneys(rows.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setTrendingJourneys([])
      })
    void fetchEvents()
      .then(rows => {
        if (!cancelled) setTrendingEvents(rows.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setTrendingEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  // Live autocomplete suggestions (debounced)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setLiveSuggestions([])
      setSuggestLoading(false)
      return
    }
    setSuggestLoading(true)
    const timer = window.setTimeout(() => {
      void fetchSearchSuggestions(trimmed)
        .then(setLiveSuggestions)
        .catch(() => setLiveSuggestions([]))
        .finally(() => setSuggestLoading(false))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const combinedSuggestions = useMemo(() => {
    const recent = buildRecentSuggestions(query, recentSearches)
    const seen = new Set(recent.map(item => item.label.toLowerCase()))
    const live = liveSuggestions.filter(item => !seen.has(item.label.toLowerCase()))
    return [...recent, ...live]
  }, [query, recentSearches, liveSuggestions])

  async function runDelversSearch(finalQuery: string, tab: ResultType = 'all') {
    setDelversLoading(true)
    setDelversError(null)
    try {
      const result = await unifiedSearch({
        q: finalQuery,
        types: tab === 'all' ? undefined : searchTypesForTab(tab),
      })
      setTravelers(result.travelers)
      setDelverPosts(result.posts)
      setCommunityHits(result.communities)
      setThreadHits(result.threads)
      setJourneyHits(result.journeys)
      setEventHits(result.events)
    } catch (err) {
      setTravelers([])
      setDelverPosts([])
      setCommunityHits([])
      setThreadHits([])
      setJourneyHits([])
      setEventHits([])
      setDelversError(err instanceof Error ? err.message : 'Could not search')
    } finally {
      setDelversLoading(false)
    }
  }

  function handleSuggestionSelect(suggestion: SearchSuggestion) {
    setShowAutocomplete(false)
    setAutocompleteIndex(-1)

    if (suggestion.entityType === 'query' || suggestion.group === 'recent') {
      handleSubmit(suggestion.label)
      return
    }
    if (suggestion.entityType === 'journey') {
      onNavigate?.('Journeys')
      onOpenJourney?.(suggestion.entityId)
      return
    }
    if (suggestion.entityType === 'community') {
      onNavigate?.('Communities')
      onOpenCommunity?.(suggestion.entityId)
      return
    }
    if (suggestion.entityType === 'thread') {
      onOpenCommunityThread?.(suggestion.entityId)
      return
    }
    if (suggestion.entityType === 'event') {
      onNavigate?.('Events')
      onOpenEvent?.(suggestion.entityId)
      return
    }
    if (suggestion.entityType === 'traveler') {
      onOpenProfile?.(suggestion.entityId)
      return
    }
    handleSubmit(suggestion.label)
  }

  function handleSubmit(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return
    pushRecentSearch(finalQuery)
    setRecentSearches(loadRecentSearches())
    setQuery(finalQuery)
    setSubmitted(true)
    setShowAutocomplete(false)
    setActiveTab('all')
    void runDelversSearch(finalQuery, 'all')
  }

  function runFilteredSearch(finalQuery: string, tab: ResultType = 'all') {
    const trimmed = finalQuery.trim()
    if (!trimmed) return
    pushRecentSearch(trimmed)
    setRecentSearches(loadRecentSearches())
    setQuery(trimmed)
    setSubmitted(true)
    setShowAutocomplete(false)
    setActiveTab(tab)
    void runDelversSearch(trimmed, tab)
  }

  function handleClear() {
    setQuery('')
    setSubmitted(false)
    setShowAutocomplete(false)
    setActiveTab('all')
    setTravelers([])
    setDelverPosts([])
    setCommunityHits([])
    setThreadHits([])
    setJourneyHits([])
    setEventHits([])
    setDelversError(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.min(i + 1, combinedSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (autocompleteIndex >= 0 && combinedSuggestions[autocompleteIndex]) {
        handleSuggestionSelect(combinedSuggestions[autocompleteIndex])
      } else {
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
      inputRef.current?.blur()
    }
  }

  const showLiveDelvers = activeTab === 'all' || activeTab === 'delvers'
  const showLiveCommunities = activeTab === 'all' || activeTab === 'community'
  const showLiveJourneys = activeTab === 'all' || activeTab === 'journey'
  const showLiveEvents = activeTab === 'all' || activeTab === 'event'
  const filteredResults = mockSearchResults.filter(r => {
    if (r.resultType === 'delvers') return false // live Delvers replace mock
    if (r.resultType === 'journey') return false // live Journeys replace mock
    if (r.resultType === 'event') return false // live Events replace mock
    return activeTab === 'all' || r.resultType === activeTab
  })
  const hasLiveDelvers = travelers.length > 0 || delverPosts.length > 0
  const hasLiveCommunities = communityHits.length > 0 || threadHits.length > 0
  const hasLiveJourneys = journeyHits.length > 0
  const hasLiveEvents = eventHits.length > 0
  const liveResultCount =
    (showLiveDelvers ? travelers.length + delverPosts.length : 0)
    + (showLiveCommunities ? communityHits.length + threadHits.length : 0)
    + (showLiveJourneys ? journeyHits.length : 0)
    + (showLiveEvents ? eventHits.length : 0)
    + (activeTab !== 'delvers' && activeTab !== 'community' && activeTab !== 'journey' && activeTab !== 'event' ? filteredResults.length : 0)
  const hasAnyResults =
    (showLiveDelvers && hasLiveDelvers) ||
    (showLiveCommunities && hasLiveCommunities) ||
    (showLiveJourneys && hasLiveJourneys) ||
    (showLiveEvents && hasLiveEvents) ||
    (activeTab !== 'delvers' && activeTab !== 'community' && activeTab !== 'journey' && activeTab !== 'event' && filteredResults.length > 0)

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
          placeholder="Search journeys, communities, events, people, places…"
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
          suggestions={combinedSuggestions}
          loading={suggestLoading}
          onSelect={handleSuggestionSelect}
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
            <span className="font-bold">{liveResultCount}</span> results for
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

        {showLiveDelvers && (
          <div className="px-4 sm:px-0 pb-4 flex flex-col gap-4">
            {delversLoading && (
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Searching Delvers…</p>
            )}
            {delversError && (
              <p className="text-xs m-0" style={{ color: 'var(--auth-danger, #C42A2A)' }}>{delversError}</p>
            )}
            {travelers.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
                  People
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
            {delverPosts.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
                  Posts
                </p>
                <div className="flex flex-col gap-2">
                  {delverPosts.map(p => (
                    <DelversThumb key={p.id} post={p} onOpenProfile={onOpenProfile} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showLiveCommunities && communityHits.length > 0 && (
          <div className="px-4 sm:px-0 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Communities
            </p>
            <div className="flex flex-col gap-2">
              {communityHits.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.('Communities')
                    onOpenCommunity?.(c.id)
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/10">
                    {c.coverUrl ? (
                      <img src={c.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Users size={18} style={{ color: '#0D9488' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {c.name}
                    </p>
                    <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                      {c.destination} · {c.memberCount.toLocaleString()} members
                      {c.privacy === 'PRIVATE' ? ' · Private' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showLiveCommunities && threadHits.length > 0 && (
          <div className="px-4 sm:px-0 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Community posts
            </p>
            <div className="flex flex-col gap-2">
              {threadHits.map(thread => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onOpenCommunityThread?.(thread.id)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(13,148,136,0.12)' }}>
                    <Users size={16} style={{ color: '#0D9488' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(13,148,136,0.12)', color: '#0D9488' }}>
                        {kindLabel(thread.kind)}
                      </span>
                      <span className="text-[10px] truncate" style={{ color: 'var(--fg-muted)' }}>
                        {thread.community.name}
                      </span>
                    </div>
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {thread.title}
                    </p>
                    {thread.body ? (
                      <p className="text-xs m-0 mt-0.5 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                        {thread.body}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showLiveJourneys && journeyHits.length > 0 && (
          <div className="px-4 sm:px-0 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Journeys
            </p>
            <div className="flex flex-col gap-2">
              {journeyHits.map(j => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.('Journeys')
                    onOpenJourney?.(j.id)
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/10">
                    {j.coverUrl ? (
                      <img src={j.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <MapPin size={18} style={{ color: 'var(--fg-muted)' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {j.title}
                    </p>
                    <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                      {j.startPlace} → {j.endPlace} · {j.durationDays}d · {j.stopCount} stops
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showLiveEvents && eventHits.length > 0 && (
          <div className="px-4 sm:px-0 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Events
            </p>
            <div className="flex flex-col gap-2">
              {eventHits.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.('Events')
                    onOpenEvent?.(ev.id)
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/10">
                    {ev.coverUrl ? (
                      <EventCoverMedia
                        url={ev.coverUrl}
                        resourceType={ev.coverResourceType}
                        className="h-full w-full object-cover"
                        controls={false}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Calendar size={18} style={{ color: 'var(--fg-muted)' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {ev.title}
                    </p>
                    <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                      {new Date(ev.startAt).toLocaleString()}
                      {ev.city ? ` · ${ev.city}` : ''}
                      {` · ${ev.goingCount} going`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!delversLoading && !hasAnyResults ? (
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
        ) : activeTab !== 'delvers' && activeTab !== 'community' && activeTab !== 'journey' && activeTab !== 'event' && filteredResults.length > 0 ? (
          <div className="flex flex-col gap-3 px-4 sm:px-0">
            {filteredResults.map(r => <ResultCard key={r.id} result={r} />)}
          </div>
        ) : null}

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
          Search journeys, communities, events, people, places, deals, and transport across Delve.
        </p>
        {searchInput}
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
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
      )}

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
              { label: 'Journeys', route: 'Journeys' },
              { label: 'Events', route: 'Events' },
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
              onClick={() => runFilteredSearch(cat.label, cat.tab)}
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
          <button onClick={() => runFilteredSearch('deals', 'deal')}
            className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {deals.slice(0, 4).map(d => <LandingDeal key={d.id} deal={d} />)}
        </div>
      </div>

      {/* Upcoming events */}
      {trendingEvents.length > 0 && (
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Upcoming events</p>
          <button type="button" onClick={() => onNavigate?.('Events')}
            className="text-xs font-semibold" style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {trendingEvents.map(ev => (
            <LandingEvent
              key={ev.id}
              event={ev}
              onOpen={() => {
                onNavigate?.('Events')
                onOpenEvent?.(ev.id)
              }}
            />
          ))}
        </div>
      </div>
      )}

      {/* Communities */}
      {trendingCommunities.length > 0 && (
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Communities</p>
          <button type="button" onClick={() => onNavigate?.('Communities')}
            className="text-xs font-semibold" style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {trendingCommunities.map(c => (
            <LandingCommunity
              key={c.id}
              community={c}
              onOpen={() => {
                onNavigate?.('Communities')
                onOpenCommunity?.(c.id)
              }}
            />
          ))}
        </div>
      </div>
      )}

      {/* Trending journeys */}
      {trendingJourneys.length > 0 && (
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-0 flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Trending journeys</p>
          <button onClick={() => runFilteredSearch('journeys', 'journey')}
            className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-1 scroll-rail">
          {trendingJourneys.map(j => (
            <LandingJourney
              key={j.id}
              journey={j}
              onOpen={() => {
                onNavigate?.('Journeys')
                onOpenJourney?.(j.id)
              }}
            />
          ))}
        </div>
      </div>
      )}

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
          <button
            type="button"
            onClick={() => onNavigate?.('Delvers')}
            className="text-xs font-semibold"
            style={{ color: 'var(--primary)' }}
          >
            See all
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {featuredDelvers.length > 0 ? (
            featuredDelvers.slice(0, 3).map(p => (
              <DelversThumb key={p.id} post={p} onOpenProfile={onOpenProfile} />
            ))
          ) : (
            <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
              Search for people or captions above to find live Delvers posts.
            </p>
          )}
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
