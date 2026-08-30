import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LogIn,
  Navigation,
  Plus,
  Search,
  X,
  Map as MapIcon,
  List,
  Filter,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Car,
  ChevronDown,
  Compass,
  MapPin,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api'
import type { JourneySummary } from '@delve/contracts'
import { fetchOnboarding } from '../api/authClient'
import {
  listJourneys,
  listMyJourneys,
  listMyPersonalisations,
  patchJourneyPersonalisation,
  patchMyJourneyOrder,
} from '../api/journeyClient'
import JourneyCard from '../components/journeys/JourneyCard'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'
import JourneysPageSkeleton from '../components/journeys/JourneysPageSkeleton'
import JourneyHeroCarousel from '../components/journeys/JourneyHeroCarousel'
import JourneyCategoryStrip, {
  journeyMatchesCategory,
  CATEGORY_MATCHERS,
} from '../components/journeys/JourneyCategoryStrip'
import MyJourneyCard from '../components/journeys/MyJourneyCard'
import {
  filterMyJourneys,
  JOURNEY_DISCOVER_FILTERS,
  MY_JOURNEY_FILTERS,
  type JourneyDiscoverFilter,
  type MyJourneyFilter,
} from '../components/journeys/journeyLifecycle'

type Tab = 'discover' | 'mine'
type ViewMode = 'feed' | 'map'

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)) ||
  ''

const MAP_LIBRARIES: ('places' | 'geometry')[] = ['places']

const DEFAULT_MAP_CENTER = { lat: -22.5609, lng: 17.0658 } // Windhoek, Namibia

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: '600px',
  borderRadius: '1.5rem',
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#17171c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#17171c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8e93' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d1d5db' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6366f1' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1c221c' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e1e24' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#312e81' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e1b4b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c7d2fe' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#818cf8' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0f172a' }],
  },
]

const PLACE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  windhoek: { lat: -22.5609, lng: 17.0658 },
  swakopmund: { lat: -22.6792, lng: 14.5272 },
  walvis_bay: { lat: -22.9575, lng: 14.5053 },
  'walvis bay': { lat: -22.9575, lng: 14.5053 },
  sossusvlei: { lat: -24.7271, lng: 15.3444 },
  etosha: { lat: -18.8556, lng: 16.3293 },
  'etosha national park': { lat: -18.8556, lng: 16.3293 },
  sesriem: { lat: -24.4842, lng: 15.7989 },
  luderitz: { lat: -26.6481, lng: 15.1594 },
  'lüderitz': { lat: -26.6481, lng: 15.1594 },
  damaraland: { lat: -20.6667, lng: 14.8333 },
  twyfelfontein: { lat: -20.5947, lng: 14.3725 },
  kaokoland: { lat: -18.0667, lng: 13.8333 },
  skeleton_coast: { lat: -20.0, lng: 13.0 },
  'skeleton coast': { lat: -20.0, lng: 13.0 },
  caprivi: { lat: -17.8833, lng: 24.2667 },
  katima_mulilo: { lat: -17.5, lng: 24.2667 },
  'katima mulilo': { lat: -17.5, lng: 24.2667 },
  rundu: { lat: -17.9333, lng: 19.7667 },
  okahandja: { lat: -21.9833, lng: 16.9167 },
  otjiwarongo: { lat: -20.4639, lng: 16.6478 },
  grootfontein: { lat: -19.5667, lng: 18.1167 },
  tsumeb: { lat: -19.2333, lng: 17.7167 },
  mariental: { lat: -24.6278, lng: 17.9639 },
  keetmanshoop: { lat: -26.5786, lng: 18.1333 },
  'fish river canyon': { lat: -27.6978, lng: 17.5847 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  johannesburg: { lat: -26.2041, lng: 28.0473 },
  'victoria falls': { lat: -17.9243, lng: 25.8572 },
  maun: { lat: -19.9833, lng: 23.4167 },
  'chobe national park': { lat: -18.6667, lng: 24.5 },
  kasane: { lat: -17.8167, lng: 25.15 },
}

function getJourneyCoordinates(j: JourneySummary): { lat: number; lng: number } {
  const query = (j.startPlace || j.title || '').toLowerCase().trim()
  for (const [key, coords] of Object.entries(PLACE_COORDINATES)) {
    if (query.includes(key)) return coords
  }
  // Deterministic scatter fallback around central Namibia
  let hash = 0
  for (let i = 0; i < j.id.length; i++) {
    hash = (hash << 5) - hash + j.id.charCodeAt(i)
    hash |= 0
  }
  const latOffset = ((Math.abs(hash) % 400) - 200) / 100
  const lngOffset = ((Math.abs(hash >> 3) % 400) - 200) / 100
  return {
    lat: -22.5609 + latOffset,
    lng: 17.0658 + lngOffset,
  }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function JourneysPage({
  signedIn = false,
  onSignIn,
  onOpenJourney,
  onOpenProfile,
  refreshKey = 0,
  destinationHint,
  createRequestKey = 0,
}: {
  signedIn?: boolean
  onSignIn?: () => void
  onOpenJourney?: (id: string) => void
  onOpenProfile?: (username: string) => void
  refreshKey?: number
  destinationHint?: string | null
  createRequestKey?: number
}) {
  const [tab, setTab] = useState<Tab>('discover')
  const [viewMode, setViewMode] = useState<ViewMode>('feed')
  const [discoverFilter, setDiscoverFilter] = useState<JourneyDiscoverFilter>('forYou')
  const [mineFilter, setMineFilter] = useState<MyJourneyFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 320)
  const [nearbyCity, setNearbyCity] = useState<string | null>(null)
  const [discover, setDiscover] = useState<JourneySummary[]>([])
  const [mine, setMine] = useState<JourneySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  // Google Maps Load Script
  const { isLoaded: isMapScriptLoaded, loadError: mapScriptError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  })

  // Granular secondary filter states
  const [durationFilter, setDurationFilter] = useState<'all' | 'weekend' | 'week' | 'extended'>('all')
  const [partyFilter, setPartyFilter] = useState<'all' | 'solo' | 'couple' | 'family' | 'group'>('all')
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'budget' | 'luxury'>('all')
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'summer' | 'winter' | 'any'>('all')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  // Hero carousel / category strip
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // My Journeys personalisation (local state — persists in localStorage)
  const [myOrder, setMyOrder] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('delve_my_journey_order') ?? '[]')
    } catch {
      return []
    }
  })
  const [myTitles, setMyTitles] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('delve_my_journey_titles') ?? '{}')
    } catch {
      return {}
    }
  })
  const [myNotes, setMyNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('delve_my_journey_notes') ?? '{}')
    } catch {
      return {}
    }
  })

  // Selected map pin for map view overlay
  const [selectedMapJourney, setSelectedMapJourney] = useState<JourneySummary | null>(null)

  // DnD refs
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!signedIn) {
      setNearbyCity(null)
      return
    }
    let cancelled = false
    void fetchOnboarding()
      .then(profile => {
        if (!cancelled) setNearbyCity(profile.homeCity?.trim() || null)
      })
      .catch(() => {
        if (!cancelled) setNearbyCity(null)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, refreshKey])

  useEffect(() => {
    if (createRequestKey > 0) setComposeOpen(true)
  }, [createRequestKey])

  const loadDiscover = useCallback(async () => {
    if (discoverFilter === 'following' && !signedIn) {
      setDiscover([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const destination =
        discoverFilter === 'nearby'
          ? destinationHint?.trim() || nearbyCity?.trim() || undefined
          : undefined
      const rows = await listJourneys({
        q: debouncedSearch || undefined,
        filter: discoverFilter,
        destination,
      })
      setDiscover(rows)
    } catch (err) {
      setDiscover([])
      setError(err instanceof Error ? err.message : 'Unable to load journeys')
    } finally {
      setLoading(false)
    }
  }, [discoverFilter, debouncedSearch, signedIn, destinationHint, nearbyCity])

  const loadMine = useCallback(async () => {
    if (!signedIn) {
      setMine([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [journeys, personalisations] = await Promise.all([
        listMyJourneys(),
        listMyPersonalisations().catch(() => []),
      ])
      setMine(journeys)

      const titlesMap: Record<string, string> = {}
      const notesMap: Record<string, string> = {}
      const orderList: { journeyId: string; sortOrder: number }[] = []

      personalisations.forEach(p => {
        if (p.customTitle) titlesMap[p.journeyId] = p.customTitle
        if (p.notes) notesMap[p.journeyId] = p.notes
        if (typeof p.sortOrder === 'number') {
          orderList.push({ journeyId: p.journeyId, sortOrder: p.sortOrder })
        }
      })

      orderList.sort((a, b) => a.sortOrder - b.sortOrder)
      const sortedOrderIds = orderList.map(o => o.journeyId)

      setMyTitles(prev => {
        const next = { ...prev, ...titlesMap }
        localStorage.setItem('delve_my_journey_titles', JSON.stringify(next))
        return next
      })
      setMyNotes(prev => {
        const next = { ...prev, ...notesMap }
        localStorage.setItem('delve_my_journey_notes', JSON.stringify(next))
        return next
      })
      if (sortedOrderIds.length > 0) {
        setMyOrder(sortedOrderIds)
        localStorage.setItem('delve_my_journey_order', JSON.stringify(sortedOrderIds))
      }
    } catch (err) {
      setMine([])
      setError(err instanceof Error ? err.message : 'Unable to load your journeys')
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    if (tab === 'discover') void loadDiscover()
    else void loadMine()
  }, [tab, loadDiscover, loadMine, refreshKey])

  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent')

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (tab === 'discover') {
      if (discoverFilter !== 'forYou') count++
    } else {
      if (mineFilter !== 'all') count++
    }
    if (searchQuery.trim()) count++
    if (activeCategory) count++
    if (durationFilter !== 'all') count++
    if (partyFilter !== 'all') count++
    if (budgetFilter !== 'all') count++
    if (seasonFilter !== 'all') count++
    return count
  }, [tab, discoverFilter, mineFilter, searchQuery, activeCategory, durationFilter, partyFilter, budgetFilter, seasonFilter])

  const list = useMemo(() => {
    if (tab === 'discover') {
      let filtered = activeCategory
        ? discover.filter(j => journeyMatchesCategory(j, activeCategory))
        : discover

      // Duration filter
      if (durationFilter === 'weekend') {
        filtered = filtered.filter(j => (j.durationDays || j.stopCount) <= 3)
      } else if (durationFilter === 'week') {
        filtered = filtered.filter(j => (j.durationDays || j.stopCount) > 3 && (j.durationDays || j.stopCount) <= 7)
      } else if (durationFilter === 'extended') {
        filtered = filtered.filter(j => (j.durationDays || j.stopCount) > 7)
      }

      // Party filter
      if (partyFilter !== 'all') {
        filtered = filtered.filter(j => j.partyType?.toUpperCase() === partyFilter.toUpperCase())
      }

      // Budget filter
      if (budgetFilter === 'budget') {
        filtered = filtered.filter(j => j.tags.some(t => /budget/i.test(t)) || (j.historicalCost && parseFloat(j.historicalCost) < 5000))
      } else if (budgetFilter === 'luxury') {
        filtered = filtered.filter(j => j.tags.some(t => /luxury/i.test(t)) || (j.historicalCost && parseFloat(j.historicalCost) >= 5000))
      }

      const sorted = [...filtered]
      if (sortBy === 'recent') {
        sorted.sort(
          (a, b) =>
            new Date(b.publishedAt || b.createdAt || 0).getTime() -
            new Date(a.publishedAt || a.createdAt || 0).getTime(),
        )
      } else if (sortBy === 'popular') {
        sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      } else if (sortBy === 'views') {
        sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      }
      return sorted
    }

    // My Journeys
    const filtered = filterMyJourneys(mine, mineFilter)
    if (!myOrder.length) return filtered
    const orderMap = new Map(myOrder.map((id, i) => [id, i]))
    return [...filtered].sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999))
  }, [
    tab,
    discover,
    mine,
    mineFilter,
    sortBy,
    myOrder,
    activeCategory,
    durationFilter,
    partyFilter,
    budgetFilter,
  ])

  // Category match counts
  const categoryMatchCounts = useMemo<Record<string, number>>(() => {
    if (tab !== 'discover') return {}
    return Object.fromEntries(
      Object.keys(CATEGORY_MATCHERS).map(key => [
        key,
        discover.filter(j => journeyMatchesCategory(j, key)).length,
      ]),
    )
  }, [discover, tab])

  const handleTitleChange = useCallback((id: string, title: string) => {
    setMyTitles(prev => {
      const next = { ...prev, [id]: title }
      localStorage.setItem('delve_my_journey_titles', JSON.stringify(next))
      return next
    })
    void patchJourneyPersonalisation(id, { customTitle: title }).catch(() => {})
  }, [])

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setMyNotes(prev => {
      const next = { ...prev, [id]: notes }
      localStorage.setItem('delve_my_journey_notes', JSON.stringify(next))
      return next
    })
    void patchJourneyPersonalisation(id, { notes: notes }).catch(() => {})
  }, [])

  // DnD handlers
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragItem.current = idx
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnter = useCallback((_e: React.DragEvent, idx: number) => {
    dragOverItem.current = idx
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingIdx(null)
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }
    const ids = list.map(j => j.id)
    const spliced = [...ids]
    const [removed] = spliced.splice(dragItem.current, 1)
    spliced.splice(dragOverItem.current, 0, removed!)
    dragItem.current = null
    dragOverItem.current = null
    setMyOrder(spliced)
    localStorage.setItem('delve_my_journey_order', JSON.stringify(spliced))
    void patchMyJourneyOrder(spliced).catch(() => {})
  }, [list])

  const handleSelectCategory = useCallback((key: string | null) => {
    setActiveCategory(key)
  }, [])

  const patchJourney = useCallback((updated: JourneySummary) => {
    const patchList = (rows: JourneySummary[]) =>
      rows.map(row => (row.id === updated.id ? updated : row))
    setDiscover(patchList)
    setMine(patchList)
  }, [])

  const emptyCopy = useMemo(() => {
    if (tab === 'mine') {
      if (!signedIn) return { title: 'Sign in to see your journeys', body: 'Plan trips and share travel stories.' }
      if (mineFilter !== 'all') return { title: 'Nothing here yet', body: 'Try another filter or create a journey.' }
      return { title: "You haven't created a Journey yet", body: 'Trips worth planning. Stories worth sharing.' }
    }
    if (discoverFilter === 'following' && !signedIn) {
      return { title: 'Sign in to see following', body: 'Follow travelers to see their journeys here.' }
    }
    if (debouncedSearch) return { title: 'No journeys found', body: 'Try another search or destination.' }
    if (discoverFilter === 'nearby' && !nearbyCity && !destinationHint) {
      return { title: 'Add your home city', body: 'Set your city in profile settings for nearby journeys.' }
    }
    return { title: 'No journeys found for this destination yet', body: 'Be the first to share a route.' }
  }, [tab, signedIn, mineFilter, discoverFilter, debouncedSearch, nearbyCity, destinationHint])

  return (
    <div className="pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div
        className="px-4 sm:px-0 py-4 border-b border-white/10"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold m-0 text-white">
              Journeys
            </h1>
            <p className="text-xs sm:text-sm m-0 mt-1 text-neutral-400">
              Curated routes, live itineraries, and community road trips.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!signedIn) {
                onSignIn?.()
                return
              }
              setComposeOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/30 flex-shrink-0 min-h-[44px]"
          >
            <Plus size={16} /> Create Journey
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 sm:px-0 py-3 border-b border-white/10">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search journeys, destinations, 4x4 trails, national parks…"
            className="w-full pl-10 pr-10 rounded-2xl text-sm min-h-[46px] bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 focus:bg-white/[0.08] focus:ring-1 focus:ring-indigo-500 transition-all"
            aria-label="Search journeys"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Discover vs My Journeys */}
      <div className="px-4 sm:px-0 py-2.5 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none border-b border-white/10">
        <div className="flex gap-2">
          {([
            { key: 'discover' as const, label: 'Discover' },
            { key: 'mine' as const, label: 'My Journeys' },
          ]).map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold transition-all min-h-[40px] ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Task 1: View Mode State & Toggle (List View vs Map View) */}
        {tab === 'discover' && (
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('feed')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'feed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <List size={14} /> Feed
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MapIcon size={14} /> Map View
            </button>
          </div>
        )}
      </div>

      {/* Discover Filters Strip */}
      {tab === 'discover' && (
        <div className="px-4 sm:px-0 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {JOURNEY_DISCOVER_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                if (f.id === 'following' && !signedIn) {
                  onSignIn?.()
                  return
                }
                setDiscoverFilter(f.id)
              }}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                discoverFilter === f.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-neutral-400 hover:text-neutral-200 border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* My Journeys Filter Strip */}
      {tab === 'mine' && signedIn && (
        <div className="px-4 sm:px-0 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {MY_JOURNEY_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMineFilter(f.id)}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                mineFilter === f.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-neutral-400 hover:text-neutral-200 border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Hero Carousel — only on Discover Feed tab */}
      {tab === 'discover' && viewMode === 'feed' && !loading && !error && list.length > 0 && (
        <JourneyHeroCarousel journeys={list} onOpen={id => onOpenJourney?.(id)} />
      )}

      {/* Category Strip */}
      {tab === 'discover' && (
        <JourneyCategoryStrip
          activeCategory={activeCategory}
          matchCounts={categoryMatchCounts}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Task 2: Granular Filters Strip (Duration, Budget, Party Size, Season) */}
      {tab === 'discover' && (
        <div className="px-4 sm:px-0 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-white/5">
          {/* Duration Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'duration' ? null : 'duration')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all whitespace-nowrap ${
                durationFilter !== 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Clock size={12} className="text-indigo-400" />
              <span>
                {durationFilter === 'all'
                  ? 'Duration'
                  : durationFilter === 'weekend'
                  ? '1-3 Days'
                  : durationFilter === 'week'
                  ? '4-7 Days'
                  : '8+ Days'}
              </span>
              <ChevronDown size={12} />
            </button>
            {activeDropdown === 'duration' && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                <div className="absolute left-0 top-9 z-40 rounded-2xl bg-neutral-900 border border-white/10 p-1.5 shadow-2xl min-w-[140px]">
                  {[
                    { id: 'all', label: 'All Durations' },
                    { id: 'weekend', label: 'Weekend (1-3d)' },
                    { id: 'week', label: '1 Week (4-7d)' },
                    { id: 'extended', label: 'Extended (8d+)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDurationFilter(opt.id as any)
                        setActiveDropdown(null)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition-colors ${
                        durationFilter === opt.id ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Budget Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'budget' ? null : 'budget')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all whitespace-nowrap ${
                budgetFilter !== 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-white/5'
              }`}
            >
              <DollarSign size={12} className="text-emerald-400" />
              <span>{budgetFilter === 'all' ? 'Budget' : budgetFilter === 'budget' ? 'Budget Friendly' : 'Luxury / Premium'}</span>
              <ChevronDown size={12} />
            </button>
            {activeDropdown === 'budget' && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                <div className="absolute left-0 top-9 z-40 rounded-2xl bg-neutral-900 border border-white/10 p-1.5 shadow-2xl min-w-[140px]">
                  {[
                    { id: 'all', label: 'Any Budget' },
                    { id: 'budget', label: 'Budget Friendly' },
                    { id: 'luxury', label: 'Luxury / High End' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setBudgetFilter(opt.id as any)
                        setActiveDropdown(null)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition-colors ${
                        budgetFilter === opt.id ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Party Size Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'party' ? null : 'party')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all whitespace-nowrap ${
                partyFilter !== 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Users size={12} className="text-purple-400" />
              <span>{partyFilter === 'all' ? 'Party Size' : partyFilter.toUpperCase()}</span>
              <ChevronDown size={12} />
            </button>
            {activeDropdown === 'party' && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                <div className="absolute left-0 top-9 z-40 rounded-2xl bg-neutral-900 border border-white/10 p-1.5 shadow-2xl min-w-[140px]">
                  {[
                    { id: 'all', label: 'All Parties' },
                    { id: 'solo', label: 'Solo' },
                    { id: 'couple', label: 'Couple' },
                    { id: 'family', label: 'Family' },
                    { id: 'group', label: 'Group / Friends' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPartyFilter(opt.id as any)
                        setActiveDropdown(null)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition-colors ${
                        partyFilter === opt.id ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Season Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'season' ? null : 'season')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all whitespace-nowrap ${
                seasonFilter !== 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Calendar size={12} className="text-amber-400" />
              <span>{seasonFilter === 'all' ? 'Season' : seasonFilter.toUpperCase()}</span>
              <ChevronDown size={12} />
            </button>
            {activeDropdown === 'season' && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                <div className="absolute left-0 top-9 z-40 rounded-2xl bg-neutral-900 border border-white/10 p-1.5 shadow-2xl min-w-[140px]">
                  {[
                    { id: 'all', label: 'Any Season' },
                    { id: 'summer', label: 'Summer / Dry' },
                    { id: 'winter', label: 'Winter / Green' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSeasonFilter(opt.id as any)
                        setActiveDropdown(null)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition-colors ${
                        seasonFilter === opt.id ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter summary bar */}
      <div className="px-4 sm:px-0 py-3 flex items-center justify-between gap-3 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-xl bg-indigo-600 text-white">
              {activeFilterCount} Active
            </span>
          )}
          <span className="text-xs font-medium text-neutral-400">
            {loading ? 'Searching…' : `${list.length} ${list.length === 1 ? 'journey' : 'journeys'} found`}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setDiscoverFilter('forYou')
                setMineFilter('all')
                setActiveCategory(null)
                setDurationFilter('all')
                setPartyFilter('all')
                setBudgetFilter('all')
                setSeasonFilter('all')
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 cursor-pointer border border-white/10"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="journeys-sort" className="text-xs font-medium text-neutral-400">
            Sort by:
          </label>
          <select
            id="journeys-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'recent' | 'popular' | 'views')}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-neutral-900 border border-white/10 text-white cursor-pointer outline-none focus:border-indigo-500"
          >
            <option value="recent">Recent</option>
            <option value="popular">Most Liked</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>
      </div>

      {tab === 'mine' && !signedIn && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold m-0 mb-3 text-neutral-300">
            Sign in to see your journeys
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      )}

      {loading && <JourneysPageSkeleton />}

      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm m-0 mb-3 text-red-400" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void (tab === 'discover' ? loadDiscover() : loadMine())}
            className="rounded-2xl px-4 py-2 text-sm font-semibold bg-white/10 hover:bg-white/15 text-white"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (tab === 'discover' || signedIn) && list.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Navigation size={32} className="text-neutral-500 mx-auto mb-3" />
          <p className="text-sm font-semibold m-0 mb-1 text-white">{emptyCopy.title}</p>
          <p className="text-xs text-neutral-400 m-0 mb-4">{emptyCopy.body}</p>
          {tab === 'mine' && signedIn && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            >
              <Plus size={16} /> Create your first Journey
            </button>
          )}
        </div>
      )}

      {/* Task 1, 2, 3: Live Interactive Google Map View */}
      {!loading && !error && tab === 'discover' && viewMode === 'map' && list.length > 0 && (
        <div className="mt-4 px-4 sm:px-0">
          <div className="relative min-h-[600px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900">
            {isMapScriptLoaded ? (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={DEFAULT_MAP_CENTER}
                zoom={5}
                options={{
                  styles: DARK_MAP_STYLES,
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              >
                {/* Task 2: Render Journey Markers */}
                {list.map(journey => {
                  const position = getJourneyCoordinates(journey)
                  const isSelected = selectedMapJourney?.id === journey.id

                  return (
                    <MarkerF
                      key={journey.id}
                      position={position}
                      title={journey.title}
                      onClick={() => setSelectedMapJourney(journey)}
                      icon={
                        isSelected
                          ? 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
                          : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                      }
                    />
                  )
                })}
              </GoogleMap>
            ) : (
              <div className="min-h-[600px] w-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Loading Google Maps…</p>
              </div>
            )}

            {/* Top Control Overlay on Map */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg">
              <Compass className="text-indigo-400 animate-spin-slow" size={18} />
              <div>
                <span className="text-xs font-bold text-white block">Live Route Map</span>
                <span className="text-[10px] text-neutral-400">Centered at Windhoek · {list.length} routes</span>
              </div>
            </div>

            {/* Task 3: Interactive Selection State & Floating Preview Card */}
            {selectedMapJourney && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-sm bg-neutral-900/95 backdrop-blur-md border border-white/15 p-4 rounded-3xl shadow-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedMapJourney.coverUrl ? (
                      <img
                        src={selectedMapJourney.coverUrl}
                        alt=""
                        className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <MapPin size={22} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white m-0 truncate">
                        {selectedMapJourney.title}
                      </h4>
                      <p className="text-xs text-neutral-400 m-0 truncate mt-0.5">
                        {selectedMapJourney.startPlace} → {selectedMapJourney.endPlace}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-300">
                        <span>{selectedMapJourney.durationDays || selectedMapJourney.stopCount} Days</span>
                        {selectedMapJourney.historicalCost && (
                          <span>• {selectedMapJourney.currency} {selectedMapJourney.historicalCost}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMapJourney(null)}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white shrink-0"
                    aria-label="Close preview"
                  >
                    <X size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenJourney?.(selectedMapJourney.id)}
                  className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                >
                  <span>View Itinerary</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journey Card Feed (when viewMode === 'feed') */}
      {!loading && !error && list.length > 0 && (tab === 'discover' || signedIn) && (
        viewMode === 'feed' || tab === 'mine' ? (
          tab === 'mine' ? (
            /* My Journeys — personalised cards with DnD */
            <div
              className="flex flex-col sm:gap-4 sm:pt-4"
              onDragOver={e => e.preventDefault()}
            >
              {list.map((j, idx) => (
                <MyJourneyCard
                  key={j.id}
                  journey={j}
                  signedIn={signedIn}
                  onSignIn={onSignIn}
                  onOpen={id => onOpenJourney?.(id)}
                  onJourneyUpdated={patchJourney}
                  customTitle={myTitles[j.id]}
                  customNotes={myNotes[j.id]}
                  onTitleChange={handleTitleChange}
                  onNotesChange={handleNotesChange}
                  dragging={draggingIdx === idx}
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragEnter={e => handleDragEnter(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                />
              ))}
            </div>
          ) : (
            /* Discover — regular feed cards */
            <div className="flex flex-col sm:gap-4 sm:pt-4">
              {list.map(j => (
                <JourneyCard
                  key={j.id}
                  journey={j}
                  signedIn={signedIn}
                  onSignIn={onSignIn}
                  onOpen={id => onOpenJourney?.(id)}
                  onOpenProfile={onOpenProfile}
                  onJourneyUpdated={patchJourney}
                />
              ))}
            </div>
          )
        ) : null
      )}

      {/* Create Journey Editor Modal */}
      <JourneyEditorSheet
        open={composeOpen}
        mode="create"
        signedIn={signedIn}
        onClose={() => setComposeOpen(false)}
        onSignIn={onSignIn}
        onSaved={j => {
          setComposeOpen(false)
          setTab('mine')
          onOpenJourney?.(j.id)
        }}
      />
    </div>
  )
}
