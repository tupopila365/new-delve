import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Clock, Search, Tag, X } from 'lucide-react'
import type { DealDto } from '@delve/contracts'
import { fetchPublicDeal, fetchPublicDeals } from '../api/dealClient'
import { SkeletonCard, SectionEmpty, SectionError } from '../components/SectionStates'

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

function hoursLeft(endIso: string) {
  return (new Date(endIso).getTime() - Date.now()) / (1000 * 60 * 60)
}

type AvailabilityFilter = 'all' | 'ending-soon'

function DealCard({
  deal,
  onOpen,
  onOpenBusiness,
}: {
  deal: DealDto
  onOpen: (id: string) => void
  onOpenBusiness?: (slug: string) => void
}) {
  const endingSoon = hoursLeft(deal.endDate) <= 72

  return (
    <article
      className="rounded-2xl px-4 py-4 cursor-pointer active:opacity-90"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={() => onOpen(deal.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(deal.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold m-0 inline-flex items-center gap-1" style={{ color: 'var(--primary)' }}>
          <Tag size={12} />
          {deal.discountSummary}
        </p>
        {endingSoon && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.14)', color: '#B45309' }}>
            Ending soon
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
        {deal.title}
      </h3>
      <p className="text-xs m-0 mt-1.5 truncate" style={{ color: 'var(--fg-muted)' }}>
        {onOpenBusiness ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onOpenBusiness(deal.business.slug)
            }}
            className="font-semibold p-0"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            {deal.business.name}
          </button>
        ) : (
          deal.business.name
        )}
        {deal.listing ? ` · ${deal.listing.title}` : ''}
      </p>
      <p className="text-xs m-0 mt-2 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
        <Clock size={11} />
        Valid {formatRange(deal.startDate, deal.endDate)}
      </p>
    </article>
  )
}

function DealDetail({
  dealId,
  onBack,
  onOpenBusiness,
  onOpenListing,
}: {
  dealId: string
  onBack: () => void
  onOpenBusiness?: (slug: string) => void
  onOpenListing?: (listingId: string) => void
}) {
  const [deal, setDeal] = useState<DealDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await fetchPublicDeal(dealId)
        if (!cancelled) setDeal(row)
      } catch (err) {
        if (!cancelled) {
          setDeal(null)
          setError(err instanceof Error ? err.message : 'Deal not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dealId, reloadKey])

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Loading deal…
        </p>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="px-4 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <SectionError onRetry={() => setReloadKey(k => k + 1)} />
      </div>
    )
  }

  return (
    <div className="pb-10 px-4 sm:px-0">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to deals
      </button>

      <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--primary)' }}>
        {deal.discountSummary}
      </p>
      <h1 className="font-display text-2xl font-extrabold m-0 mb-3" style={{ color: 'var(--fg)' }}>
        {deal.title}
      </h1>

      <div className="flex flex-wrap gap-3 mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
        {onOpenBusiness && (
          <button
            type="button"
            onClick={() => onOpenBusiness(deal.business.slug)}
            className="inline-flex items-center gap-1.5 font-semibold p-0"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <Building2 size={14} />
            {deal.business.name}
          </button>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock size={13} />
          {formatRange(deal.startDate, deal.endDate)}
        </span>
      </div>

      {deal.description && (
        <p className="text-sm leading-relaxed m-0 mb-4" style={{ color: 'var(--fg)' }}>
          {deal.description}
        </p>
      )}

      {deal.listing && (
        <div
          className="rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
            Linked listing
          </p>
          {onOpenListing ? (
            <button
              type="button"
              onClick={() => onOpenListing(deal.listing!.id)}
              className="text-sm font-semibold p-0"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
            >
              {deal.listing.title}
            </button>
          ) : (
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
              {deal.listing.title}
            </p>
          )}
        </div>
      )}

      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Claiming coming soon
        </p>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          Checkout is not connected yet. Discount details are stored for server-side pricing later.
        </p>
      </div>
    </div>
  )
}

export default function DealsPage({
  onOpenBusiness,
  onOpenListing,
  initialDealId = null,
  onClearInitialDeal,
}: {
  onBookDeal?: (dealId: string) => void
  onOpenBusiness?: (slug: string) => void
  onOpenListing?: (listingId: string) => void
  initialDealId?: string | null
  onClearInitialDeal?: () => void
} = {}) {
  const [deals, setDeals] = useState<DealDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId)
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchPublicDeals(60)
        if (!cancelled) setDeals(rows)
      } catch (err) {
        if (!cancelled) {
          setDeals([])
          setError(err instanceof Error ? err.message : 'Could not load deals')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return deals.filter(deal => {
      if (availability === 'ending-soon' && hoursLeft(deal.endDate) > 72) return false
      if (!q) return true
      return (
        deal.title.toLowerCase().includes(q) ||
        deal.business.name.toLowerCase().includes(q) ||
        deal.discountSummary.toLowerCase().includes(q) ||
        (deal.listing?.title.toLowerCase().includes(q) ?? false)
      )
    })
  }, [deals, query, availability])

  if (selectedDealId) {
    return (
      <DealDetail
        dealId={selectedDealId}
        onBack={() => {
          setSelectedDealId(null)
          onClearInitialDeal?.()
        }}
        onOpenBusiness={onOpenBusiness}
        onOpenListing={listingId => {
          setSelectedDealId(null)
          onClearInitialDeal?.()
          onOpenListing?.(listingId)
        }}
      />
    )
  }

  return (
    <div className="pb-8" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="px-4 sm:px-0 pt-4 mb-4">
        <h1 className="font-display text-2xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Deals
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Active published deals only — drafts, rejected, archived, and expired stays hidden.
        </p>
      </div>

      <div className="px-4 sm:px-0 mb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Search size={16} style={{ color: 'var(--fg-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search deals or businesses"
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{ color: 'var(--fg)' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-0 mb-4 flex gap-2">
        {(
          [
            { id: 'all', label: 'All active' },
            { id: 'ending-soon', label: 'Ending soon' },
          ] as const
        ).map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setAvailability(opt.id)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: availability === opt.id ? 'var(--primary)' : 'var(--surface)',
              color: availability === opt.id ? '#fff' : 'var(--fg)',
              border: `1px solid ${availability === opt.id ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-0">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full min-w-0">
                <SkeletonCard width="100%" height={160} />
              </div>
            ))}
          </div>
        ) : error ? (
          <SectionError onRetry={() => setReloadKey(k => k + 1)} />
        ) : filtered.length === 0 ? (
          <SectionEmpty
            icon={<Tag size={20} />}
            title="No active deals"
            body={
              availability === 'ending-soon'
                ? 'Nothing ending in the next 72 hours. Try All active.'
                : 'When providers publish live deals, they will show up here.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onOpen={setSelectedDealId}
                onOpenBusiness={onOpenBusiness}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
