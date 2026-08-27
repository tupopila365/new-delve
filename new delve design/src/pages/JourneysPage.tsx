import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogIn, Navigation, Plus, Search, X } from 'lucide-react'
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

  // Hero carousel / category strip
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // My Journeys personalisation (local state — persists in localStorage)
  const [myOrder, setMyOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('delve_my_journey_order') ?? '[]') } catch { return [] }
  })
  const [myTitles, setMyTitles] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('delve_my_journey_titles') ?? '{}') } catch { return {} }
  })
  const [myNotes, setMyNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('delve_my_journey_notes') ?? '{}') } catch { return {} }
  })

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
    return count
  }, [tab, discoverFilter, mineFilter, searchQuery])

  const list = useMemo(() => {
    if (tab === 'discover') {
      // Apply category filter client-side first, then sort
      const categoryFiltered = activeCategory
        ? discover.filter(j => journeyMatchesCategory(j, activeCategory))
        : discover
      const sorted = [...categoryFiltered]
      if (sortBy === 'recent') {
        sorted.sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime())
      } else if (sortBy === 'popular') {
        sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      } else if (sortBy === 'views') {
        sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      }
      return sorted
    }
    // My Journeys — filter then apply custom order
    const filtered = filterMyJourneys(mine, mineFilter)
    if (!myOrder.length) return filtered
    const orderMap = new Map(myOrder.map((id, i) => [id, i]))
    return [...filtered].sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999))
  }, [tab, discover, mine, mineFilter, sortBy, myOrder, activeCategory])

  // Pre-compute match counts for every category so chips can show badges
  const categoryMatchCounts = useMemo<Record<string, number>>(() => {
    if (tab !== 'discover') return {}
    return Object.fromEntries(
      Object.keys(CATEGORY_MATCHERS).map(key => [
        key,
        discover.filter(j => journeyMatchesCategory(j, key)).length,
      ])
    )
  }, [discover, tab])

  // Personalisation setters (persist to localStorage and sync to backend)
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
    if (dragItem.current === dragOverItem.current) { dragItem.current = null; dragOverItem.current = null; return }
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

  // Category chip handler — client-side only, no API call
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

  const chipStyle = (active: boolean) => ({
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
    color: active ? 'var(--primary)' : 'var(--fg)',
    cursor: 'pointer' as const,
  })

  return (
    <div className="pb-8">
      <div
        className="px-4 sm:px-0 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              Journeys
            </h1>
            <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
              Trips worth planning. Stories worth sharing.
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
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white flex-shrink-0 min-h-[44px]"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={16} /> Create Journey
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-0 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search journeys, destinations, travelers…"
            className="w-full pl-9 pr-9 rounded-xl text-sm min-h-[44px]"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
            aria-label="Search journeys, destinations, travelers"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-0 py-2 flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Journey Feeds">
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
            className="rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap min-h-[44px]"
            style={{
              border: `1px solid ${tab === t.key ? 'var(--primary)' : 'var(--border)'}`,
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="px-4 sm:px-0 pb-2 flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Discover Filters">
          {JOURNEY_DISCOVER_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={discoverFilter === f.id}
              onClick={() => {
                if (f.id === 'following' && !signedIn) {
                  onSignIn?.()
                  return
                }
                setDiscoverFilter(f.id)
              }}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
              style={chipStyle(discoverFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'mine' && signedIn && (
        <div className="px-4 sm:px-0 pb-2 flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="My Journey Filters">
          {MY_JOURNEY_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={mineFilter === f.id}
              onClick={() => setMineFilter(f.id)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
              style={chipStyle(mineFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Hero Carousel — only on Discover tab when there are results */}
      {tab === 'discover' && !loading && !error && list.length > 0 && (
        <JourneyHeroCarousel journeys={list} onOpen={id => onOpenJourney?.(id)} />
      )}

      {/* Category Strip — only on Discover tab */}
      {tab === 'discover' && (
        <JourneyCategoryStrip
          activeCategory={activeCategory}
          matchCounts={categoryMatchCounts}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Filter control strip */}
      <div className="px-4 sm:px-0 py-3 flex items-center justify-between gap-3 border-b border-[var(--border)] flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-xl bg-[var(--primary)] text-white"
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount} Active
            </span>
          )}
          <span className="text-xs font-medium text-[var(--fg-muted)]">
            {loading ? 'Searching…' : `${list.length} ${list.length === 1 ? 'journey' : 'journeys'} found`}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setDiscoverFilter('forYou'); setMineFilter('all'); setActiveCategory(null) }}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--fg)] cursor-pointer"
              aria-label="Clear all filters"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="journeys-sort" className="text-xs font-medium text-[var(--fg-muted)]">Sort by:</label>
          <select
            id="journeys-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'recent' | 'popular' | 'views')}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            <option value="recent">Recent</option>
            <option value="popular">Most Liked</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>
      </div>

      {tab === 'mine' && !signedIn && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--fg)' }}>
            Sign in to see your journeys
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white min-h-[44px]"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      )}

      {loading && <JourneysPageSkeleton />}

      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm m-0 mb-3" style={{ color: 'var(--auth-danger)' }} role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void (tab === 'discover' ? loadDiscover() : loadMine())}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px]"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (tab === 'discover' || signedIn) && list.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Navigation size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            {emptyCopy.title}
          </p>
          <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
            {emptyCopy.body}
          </p>
          {tab === 'mine' && signedIn && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Create your first Journey
            </button>
          )}
        </div>
      )}

      {/* Journey card lists */}
      {!loading && !error && list.length > 0 && (tab === 'discover' || signedIn) && (
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
          /* Discover — regular cards */
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
      )}

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
