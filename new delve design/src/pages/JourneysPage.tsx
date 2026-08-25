import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogIn, Navigation, Plus, Search, X } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { fetchOnboarding } from '../api/authClient'
import { listJourneys, listMyJourneys } from '../api/journeyClient'
import JourneyCard from '../components/journeys/JourneyCard'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'
import JourneysPageSkeleton from '../components/journeys/JourneysPageSkeleton'
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
      setMine(await listMyJourneys())
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

  const list = useMemo(() => {
    if (tab === 'discover') return discover
    return filterMyJourneys(mine, mineFilter)
  }, [tab, discover, mine, mineFilter])

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

      <div className="px-4 sm:px-0 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {([
          { key: 'discover' as const, label: 'Discover' },
          { key: 'mine' as const, label: 'My Journeys' },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
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
        <div className="px-4 sm:px-0 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
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
              className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
              style={chipStyle(discoverFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'mine' && signedIn && (
        <div className="px-4 sm:px-0 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {MY_JOURNEY_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMineFilter(f.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
              style={chipStyle(mineFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

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

      {!loading && !error && list.length > 0 && (tab === 'discover' || signedIn) && (
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
