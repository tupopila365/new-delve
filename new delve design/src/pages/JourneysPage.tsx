import { useCallback, useEffect, useMemo, useState } from 'react'
import { Map, Search, MapPin, Loader2, AlertCircle, LogIn, Plus, Bookmark, Heart, MessageCircle } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { listJourneys, listMyJourneys } from '../api/journeyClient'
import { formatUsername } from '../lib/formatUsername'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'

type Tab = 'discover' | 'yours'
type Sort = 'recent' | 'saved'

function partyLabel(p: JourneySummary['partyType']) {
  return p.charAt(0) + p.slice(1).toLowerCase()
}

function JourneyCard({
  journey,
  onOpen,
}: {
  journey: JourneySummary
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(journey.id)}
      className="overflow-hidden sm:rounded-2xl text-left w-full transition-all active:scale-[0.99]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="relative h-40 bg-black/10">
        {journey.coverUrl ? (
          <img src={journey.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Map size={28} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
        {journey.visibility !== 'PUBLIC' && (
          <span
            className="absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {journey.visibility === 'DRAFT' ? 'Draft' : 'Private'}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <p className="text-sm font-bold m-0 leading-snug" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          {journey.title}
        </p>
        <p className="text-xs m-0 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
          <MapPin size={12} />
          {journey.startPlace}
          {journey.endPlace !== journey.startPlace ? ` → ${journey.endPlace}` : ''}
        </p>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          {journey.durationDays}d · {journey.stopCount} stops · {partyLabel(journey.partyType)}
          {journey.historicalCost ? ` · ${journey.currency} ${journey.historicalCost}` : ''}
        </p>
        <p className="text-xs m-0 inline-flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-0.5">
            <Heart size={11} /> {journey.likeCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle size={11} /> {journey.commentCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Bookmark size={11} /> {journey.saveCount}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {journey.author.displayName || formatUsername(journey.author.username)}
          </span>
          {journey.savedByMe && <Bookmark size={12} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
        </div>
      </div>
    </button>
  )
}

export default function JourneysPage({
  signedIn = false,
  onSignIn,
  onOpenJourney,
}: {
  signedIn?: boolean
  onSignIn?: () => void
  onOpenJourney?: (id: string) => void
} = {}) {
  const [tab, setTab] = useState<Tab>('discover')
  const [query, setQuery] = useState('')
  const [submittedQ, setSubmittedQ] = useState('')
  const [discover, setDiscover] = useState<JourneySummary[]>([])
  const [mine, setMine] = useState<JourneySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [sort, setSort] = useState<Sort>('recent')

  const loadDiscover = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      setDiscover(await listJourneys(q || undefined))
    } catch (err) {
      setDiscover([])
      setError(err instanceof Error ? err.message : 'Could not load journeys')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setError(err instanceof Error ? err.message : 'Could not load your journeys')
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    if (tab === 'discover') void loadDiscover(submittedQ)
    else void loadMine()
  }, [tab, submittedQ, loadDiscover, loadMine])

  const list = useMemo(() => {
    const base = tab === 'discover' ? discover : mine
    if (tab !== 'discover' || sort === 'recent') return base
    return [...base].sort((a, b) => b.saveCount - a.saveCount || b.likeCount - a.likeCount)
  }, [tab, discover, mine, sort])

  const emptyCopy = useMemo(() => {
    if (tab === 'yours') {
      return signedIn
        ? { title: 'No journeys yet', body: 'Share a route you actually traveled.' }
        : { title: 'Sign in to see yours', body: 'Journeys you publish will show up here.' }
    }
    if (submittedQ) return { title: 'No matches', body: 'Try another search.' }
    return { title: 'No journeys yet', body: 'Be the first to share a route.' }
  }, [tab, signedIn, submittedQ])

  return (
    <div className="pb-8">
      <section className="px-4 sm:px-0 pt-4 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-2xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          What people are travelling
        </p>
        <p className="text-sm m-0 mb-4 max-w-xl" style={{ color: 'var(--fg-muted)' }}>
          Discover real routes, useful stops, travel costs, and stories shared by Delvers.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            <Plus size={16} /> Share a journey
          </button>
        </div>

        <div
          className="flex items-center gap-2 px-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 48 }}
        >
          <Search size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setTab('discover')
                setSubmittedQ(query.trim())
              }
            }}
            placeholder="Search journeys, places…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--fg)' }}
          />
          <button
            type="button"
            onClick={() => {
              setTab('discover')
              setSubmittedQ(query.trim())
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Search
          </button>
        </div>
      </section>

      <div className="px-4 sm:px-0 pt-4 flex gap-2 overflow-x-auto scroll-rail pb-1">
        {(
          [
            { id: 'discover' as const, label: 'Discover' },
            { id: 'yours' as const, label: 'Your journeys' },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--fg)',
              border: tab === t.id ? 'none' : '1px solid var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="px-4 sm:px-0 pt-2 flex gap-2 overflow-x-auto scroll-rail pb-1">
          {(
            [
              { id: 'recent' as const, label: 'Recent' },
              { id: 'saved' as const, label: 'Most saved' },
            ] as const
          ).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: sort === s.id ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
                color: sort === s.id ? 'var(--primary)' : 'var(--fg-muted)',
                border: `1px solid ${sort === s.id ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          className="mx-4 sm:mx-0 mt-4 px-3 py-2.5 rounded-xl flex items-start gap-2 text-sm"
          style={{ background: 'rgba(196,42,42,0.08)', color: 'var(--auth-danger, #C42A2A)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {tab === 'yours' && !signedIn && (
        <div
          className="mx-4 sm:mx-0 mt-4 px-4 py-8 text-center rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <LogIn size={28} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
          <p className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Sign in to see your journeys
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-3 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Sign in
          </button>
        </div>
      )}

      {loading ? (
        <div className="px-4 sm:px-0 py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
        </div>
      ) : list.length === 0 && !(tab === 'yours' && !signedIn) ? (
        <div className="px-4 sm:px-0 py-12 text-center">
          <Map size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-base font-bold m-0 mb-1" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            {emptyCopy.title}
          </p>
          <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
            {emptyCopy.body}
          </p>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Share a journey
          </button>
        </div>
      ) : (
        <div className="px-4 sm:px-0 pt-4 grid gap-3 sm:grid-cols-2">
          {list.map(j => (
            <JourneyCard key={j.id} journey={j} onOpen={id => onOpenJourney?.(id)} />
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
          onOpenJourney?.(j.id)
        }}
      />
    </div>
  )
}
