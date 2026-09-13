import { useEffect, useMemo, useState } from 'react'
import { Search, Tag, X } from 'lucide-react'
import DealFeedCard from '../components/deals/DealFeedCard'
import DealCatalogDetail from '../components/deals/DealCatalogDetail'
import { SectionEmpty, SkeletonCard } from '../components/SectionStates'
import { formatMoney } from '../lib/formatMoney'
import MyClaimsPage from './MyClaimsPage'
import { fetchPublicDeals, fetchPublicDeal } from '../api/dealClient'
import {
  DEAL_AUDIENCES,
  DEAL_CITIES,
  DEAL_SERVICE_CATEGORIES,
  dealDtoToCatalogDeal,
  type CatalogDeal,
  type DealAudience,
} from '../data/marketingDealsCatalog'

type SortFilter = 'all' | 'ending-soon' | 'discount'

function hoursLeft(endIso: string) {
  return (new Date(endIso).getTime() - Date.now()) / (1000 * 60 * 60)
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
      style={{
        background: active ? 'var(--primary)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--fg)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

export default function DealsPage({
  initialDealId = null,
  onClearInitialDeal,
}: {
  onBookDeal?: (dealId: string) => void
  onOpenBusiness?: (slug: string) => void
  onOpenListing?: (listingId: string) => void
  initialDealId?: string | null
  onClearInitialDeal?: () => void
} = {}) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId)
  const [selectedDeal, setSelectedDeal] = useState<CatalogDeal | null>(null)
  const [deals, setDeals] = useState<CatalogDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortFilter>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<DealAudience | ''>('')
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Load public deals from backend
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicDeals(40, undefined, {
      city: cityFilter || undefined,
      category: categoryFilter || undefined,
      q: query.trim() || undefined,
      sort: sort === 'ending-soon' ? 'endingSoon' : undefined,
    })
      .then(rows => {
        if (!cancelled) {
          setDeals(rows.map(dealDtoToCatalogDeal))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeals([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cityFilter, categoryFilter, query, sort])

  // Load deal details when selected
  useEffect(() => {
    if (!selectedDealId) {
      setSelectedDeal(null)
      return
    }

    const cached = deals.find(d => d.id === selectedDealId)
    if (cached) {
      setSelectedDeal(cached)
      return
    }

    let cancelled = false
    fetchPublicDeal(selectedDealId)
      .then(dto => {
        if (!cancelled) setSelectedDeal(dealDtoToCatalogDeal(dto))
      })
      .catch(() => {
        if (!cancelled) setSelectedDeal(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDealId, deals])

  const featured = useMemo(() => {
    return deals.filter(d => d.featuredRank != null).sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99))
  }, [deals])

  const filtered = useMemo(() => {
    let rows = deals.filter(deal => {
      if (cityFilter && deal.city.toLowerCase() !== cityFilter.toLowerCase()) return false
      if (categoryFilter && deal.category !== categoryFilter) return false
      if (audienceFilter && !deal.audiences.includes(audienceFilter)) return false
      if (sort === 'ending-soon' && hoursLeft(deal.endDate) > 72) return false
      return true
    })
    if (sort === 'discount') {
      rows = [...rows].sort((a, b) => b.discountPercentage - a.discountPercentage)
    }
    return rows
  }, [deals, cityFilter, categoryFilter, audienceFilter, sort])

  const grouped = useMemo(() => {
    const canGroup = sort === 'all' && !query.trim() && !cityFilter && !categoryFilter && !audienceFilter
    if (!canGroup) return null
    return DEAL_SERVICE_CATEGORIES.map(cat => ({
      cat,
      rows: filtered.filter(d => d.category === cat),
    })).filter(g => g.rows.length > 0)
  }, [filtered, sort, query, cityFilter, categoryFilter, audienceFilter])

  function toggleSave(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (selectedDeal) {
    return (
      <DealCatalogDetail
        deal={selectedDeal}
        saved={savedIds.has(selectedDeal.id)}
        onBack={() => {
          setSelectedDealId(null)
          setSelectedDeal(null)
          onClearInitialDeal?.()
        }}
        onToggleSave={() => toggleSave(selectedDeal.id)}
      />
    )
  }

  return (
    <div className="pb-8" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="px-4 sm:px-0 pt-4 mb-4">
        <h1 className="font-display text-2xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          Deals
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          Exclusive offers and promotional rates from verified Namibian operators.
        </p>
        <div className="flex gap-2 mt-3">
          {(
            [
              { id: 'discover', label: 'Discover' },
              { id: 'mine', label: 'My claims' },
            ] as const
          ).map(opt => (
            <Chip key={opt.id} active={tab === opt.id} label={opt.label} onClick={() => setTab(opt.id)} />
          ))}
        </div>
      </div>

      {tab === 'mine' ? (
        <div className="px-4 sm:px-0">
          <MyClaimsPage onOpenDeal={setSelectedDealId} />
        </div>
      ) : (
        <>
          <div className="px-4 sm:px-0 mb-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--fg-muted)' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search Windhoek, stay, tour, adventure…"
                className="flex-1 bg-transparent text-sm outline-none border-none"
                style={{ color: 'var(--fg)' }}
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="px-4 sm:px-0 mb-3 flex gap-2 flex-wrap">
            <Chip active={sort === 'all'} label="All active" onClick={() => setSort('all')} />
            <Chip active={sort === 'discount'} label="Highest discount" onClick={() => setSort('discount')} />
            <Chip active={sort === 'ending-soon'} label="Ending soon" onClick={() => setSort('ending-soon')} />
          </div>

          <div className="px-4 sm:px-0 mb-3 flex gap-2 overflow-x-auto pb-1">
            <Chip active={!audienceFilter} label="All travelers" onClick={() => setAudienceFilter('')} />
            {DEAL_AUDIENCES.map(a => (
              <Chip key={a} active={audienceFilter === a} label={a} onClick={() => setAudienceFilter(a)} />
            ))}
          </div>

          <div className="px-4 sm:px-0 mb-3 flex gap-2 overflow-x-auto pb-1">
            <Chip active={!cityFilter} label="All destinations" onClick={() => setCityFilter('')} />
            {DEAL_CITIES.map(city => (
              <Chip key={city} active={cityFilter === city} label={city} onClick={() => setCityFilter(city)} />
            ))}
          </div>

          <div className="px-4 sm:px-0 mb-4 flex gap-2 overflow-x-auto pb-1">
            <Chip active={!categoryFilter} label="All categories" onClick={() => setCategoryFilter('')} />
            {DEAL_SERVICE_CATEGORIES.map(cat => (
              <Chip key={cat} active={categoryFilter === cat} label={cat} onClick={() => setCategoryFilter(cat)} />
            ))}
          </div>

          {featured.length > 0 && sort === 'all' && !query.trim() && !cityFilter && !categoryFilter && !audienceFilter && (
            <div className="px-4 sm:px-0 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
                Featured
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {featured.map(deal => (
                  <FeaturedDealTile key={deal.id} deal={deal} onOpen={setSelectedDealId} />
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
              <SkeletonCard height={280} />
              <SkeletonCard height={280} />
              <SkeletonCard height={280} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 sm:px-0">
              <SectionEmpty icon={<Tag size={20} />} title="No matching deals" body="Try another destination, category, or search term." />
            </div>
          ) : grouped ? (
            <div className="flex flex-col">
              {grouped.map(group => (
                <section key={group.cat}>
                  <p className="px-4 sm:px-0 text-xs font-bold uppercase tracking-wider m-0 mt-4 mb-1" style={{ color: 'var(--fg-muted)' }}>
                    {group.cat}
                  </p>
                  {group.rows.map(deal => (
                    <DealFeedCard
                      key={deal.id}
                      deal={deal}
                      saved={savedIds.has(deal.id)}
                      onOpen={setSelectedDealId}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map(deal => (
                <DealFeedCard
                  key={deal.id}
                  deal={deal}
                  saved={savedIds.has(deal.id)}
                  onOpen={setSelectedDealId}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FeaturedDealTile({ deal, onOpen }: { deal: CatalogDeal; onOpen: (id: string) => void }) {
  const cover = deal.media[0]!
  return (
    <button
      type="button"
      onClick={() => onOpen(deal.id)}
      className="min-w-[240px] max-w-[260px] text-left rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
    >
      {cover.type === 'video' ? (
        <video src={cover.url} className="w-full h-28 object-cover" muted playsInline loop autoPlay preload="metadata" />
      ) : (
        <img src={cover.url} alt="" className="w-full h-28 object-cover" />
      )}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold m-0" style={{ color: 'var(--primary)' }}>
          {deal.discountSummary}
        </p>
        <p className="text-sm font-bold m-0 mt-1">{formatMoney(deal.currency, deal.dealAmount)}</p>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          Was {formatMoney(deal.currency, deal.originalAmount)}
        </p>
        <p className="text-sm font-semibold m-0 mt-1 truncate" style={{ color: 'var(--fg)' }}>
          {deal.title}
        </p>
        <p className="text-xs m-0 mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>
          {deal.businessName}
        </p>
      </div>
    </button>
  )
}
