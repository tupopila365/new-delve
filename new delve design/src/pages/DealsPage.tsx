import { useState, useRef, useEffect } from 'react'
import {
  Search, X, Bookmark, Heart, CheckCircle, Info,
  Star, ChevronDown, SlidersHorizontal, ArrowRight, Clock,
  MapPin, Shield, ExternalLink, Tag, Car, Plane, Anchor,
  Flame, TrendingDown, Sparkles, Users, GraduationCap,
  Percent, Package, Zap, BadgeCheck,
} from 'lucide-react'
import {
  allDeals, dealCategories, sortOptions,
  type DealFull, type DealType, type EligibilityStatus, type DealStatus,
} from '../data/dealsData'

// ─── Config ───────────────────────────────────────────────────────────────

const categoryColor: Record<string, string> = {
  'Stay':            '#6366F1',
  'Road transport':  '#E05C1A',
  'Air transport':   '#3B82F6',
  'Water transport': '#06B6D4',
  'Food & drink':    '#F59E0B',
  'Activity':        '#EF4444',
  'Event':           '#EC4899',
  'Shop':            '#8B5CF6',
  'Guide':           '#10A760',
}

const dealTypeColor: Record<string, string> = {
  'percentage':    '#10A760',
  'fixed-saving':  '#10A760',
  'local-rate':    '#D97706',
  'resident-rate': '#D97706',
  'student-rate':  '#3B82F6',
  'group-rate':    '#8C52FF',
  'package':       '#8C52FF',
  'early-booking': '#6366F1',
  'last-minute':   '#EF4444',
  'bundle':        '#EC4899',
  'special-rate':  '#E05C1A',
  'limited':       '#EF4444',
  'free-extra':    '#10A760',
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'active':       { label: 'Active',         color: '#10A760', bg: 'rgba(16,167,96,0.12)' },
  'ending-soon':  { label: 'Ending soon',    color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  'limited':      { label: 'Limited spots',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  'scheduled':    { label: 'Coming soon',    color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  'expired':      { label: 'Expired',        color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  'unavailable':  { label: 'Unavailable',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  'sold-out':     { label: 'Sold out',       color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

const eligibilityConfig: Record<string, { label: string; color: string }> = {
  'everyone':       { label: 'Available to everyone', color: '#10A760' },
  'may-qualify':    { label: 'May qualify',            color: '#D97706' },
  'eligible':       { label: 'Eligible',               color: '#10A760' },
  'not-eligible':   { label: 'Not eligible',           color: '#EF4444' },
  'proof-required': { label: 'Proof required',         color: '#D97706' },
  'unknown':        { label: 'Eligibility unknown',    color: '#9CA3AF' },
  'sign-in':        { label: 'Sign in to check',       color: '#8C52FF' },
}

// ─── Filter state types ───────────────────────────────────────────────────

interface FilterState {
  category: string
  dealTypes: DealType[]
  eligibility: EligibilityStatus[]
  statuses: DealStatus[]
  verifiedOnly: boolean
  endingSoon: boolean
  everyoneOnly: boolean
  bigSavings: boolean          // 15%+ saving
  noSponsor: boolean
  transportGroup: 'all' | 'road' | 'air' | 'water'
}

const defaultFilters: FilterState = {
  category: 'All',
  dealTypes: [],
  eligibility: [],
  statuses: [],
  verifiedOnly: false,
  endingSoon: false,
  everyoneOnly: false,
  bigSavings: false,
  noSponsor: false,
  transportGroup: 'all',
}

function countActive(f: FilterState): number {
  let n = 0
  if (f.category !== 'All') n++
  if (f.dealTypes.length) n++
  if (f.eligibility.length) n++
  if (f.statuses.length) n++
  if (f.verifiedOnly) n++
  if (f.endingSoon) n++
  if (f.everyoneOnly) n++
  if (f.bigSavings) n++
  if (f.noSponsor) n++
  if (f.transportGroup !== 'all') n++
  return n
}

function applyFilters(deals: DealFull[], f: FilterState, query: string, sort: string): DealFull[] {
  let result = deals.filter(d => {
    if (f.category !== 'All' && d.serviceCategory !== f.category) return false
    if (f.dealTypes.length && !f.dealTypes.includes(d.dealType)) return false
    if (f.eligibility.length && !f.eligibility.includes(d.eligibility)) return false
    if (f.statuses.length && !f.statuses.includes(d.status)) return false
    if (f.verifiedOnly && !d.verification.verified) return false
    if (f.endingSoon && d.status !== 'ending-soon') return false
    if (f.everyoneOnly && d.eligibility !== 'everyone') return false
    if (f.bigSavings && !d.savingPercentage) return false
    if (f.bigSavings && d.savingPercentage && parseInt(d.savingPercentage) < 15) return false
    if (f.noSponsor && d.sponsored) return false
    if (f.transportGroup !== 'all' && d.transportGroup !== f.transportGroup) return false
    if (query) {
      const q = query.toLowerCase()
      const hit =
        d.title.toLowerCase().includes(q) ||
        d.business.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q) ||
        d.serviceCategory.toLowerCase().includes(q)
      if (!hit) return false
    }
    return true
  })

  return result.sort((a, b) => {
    if (sort === 'ending-soon') {
      const o: Record<string, number> = { 'ending-soon': 0, 'limited': 1, 'active': 2, 'scheduled': 3 }
      return (o[a.status] ?? 4) - (o[b.status] ?? 4)
    }
    if (sort === 'price-asc') {
      return parseInt(a.currentPrice.replace(/\s/g, '')) - parseInt(b.currentPrice.replace(/\s/g, ''))
    }
    if (sort === 'best-saving') {
      return (parseInt(b.savingPercentage ?? '0')) - (parseInt(a.savingPercentage ?? '0'))
    }
    return 0
  })
}

// ─── Filter sheet ─────────────────────────────────────────────────────────

const DEAL_TYPE_OPTIONS: { value: DealType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'percentage',    label: 'Percentage off',   icon: <Percent size={13} />,      color: '#10A760' },
  { value: 'fixed-saving',  label: 'Fixed saving',     icon: <TrendingDown size={13} />, color: '#10A760' },
  { value: 'local-rate',    label: 'Local rate',       icon: <MapPin size={13} />,       color: '#D97706' },
  { value: 'resident-rate', label: 'Resident rate',    icon: <MapPin size={13} />,       color: '#D97706' },
  { value: 'student-rate',  label: 'Student rate',     icon: <GraduationCap size={13} />,color: '#3B82F6' },
  { value: 'group-rate',    label: 'Group rate',       icon: <Users size={13} />,        color: '#8C52FF' },
  { value: 'package',       label: 'Package deal',     icon: <Package size={13} />,      color: '#8C52FF' },
  { value: 'early-booking', label: 'Early booking',    icon: <Clock size={13} />,        color: '#6366F1' },
  { value: 'last-minute',   label: 'Last minute',      icon: <Zap size={13} />,          color: '#EF4444' },
]

const ELIGIBILITY_OPTIONS: { value: EligibilityStatus; label: string; color: string }[] = [
  { value: 'everyone',       label: 'Available to everyone', color: '#10A760' },
  { value: 'may-qualify',    label: 'May qualify',           color: '#D97706' },
  { value: 'proof-required', label: 'Proof required',        color: '#D97706' },
]

function FilterSheet({
  filters,
  sort,
  onFilters,
  onSort,
  onClose,
}: {
  filters: FilterState
  sort: string
  onFilters: (f: FilterState) => void
  onSort: (s: string) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<FilterState>(filters)
  const [localSort, setLocalSort] = useState(sort)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  const activeCount = countActive(local) + (localSort !== 'recommended' ? 1 : 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        ref={sheetRef}
        className="w-full sm:w-[480px] sm:max-h-[80vh] max-h-[90vh] flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
            Filter & sort
          </h2>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button
                onClick={() => { setLocal(defaultFilters); setLocalSort('recommended') }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                Clear all
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-subtle)' }}>
              <X size={15} style={{ color: 'var(--fg)' }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-6">

          {/* Sort */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Sort by</p>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map(opt => (
                <button key={opt.value} onClick={() => setLocalSort(opt.value)}
                  className="px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                  style={{
                    background: localSort === opt.value ? 'rgba(140,82,255,0.1)' : 'var(--surface-subtle)',
                    color: localSort === opt.value ? 'var(--primary)' : 'var(--fg)',
                    fontWeight: localSort === opt.value ? 700 : 400,
                    border: `1.5px solid ${localSort === opt.value ? 'var(--primary)' : 'transparent'}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Deal type */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Deal type</p>
            <div className="flex flex-wrap gap-2">
              {DEAL_TYPE_OPTIONS.map(opt => {
                const active = local.dealTypes.includes(opt.value)
                return (
                  <button key={opt.value}
                    onClick={() => setLocal(l => ({ ...l, dealTypes: toggleArr(l.dealTypes, opt.value) }))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: active ? `${opt.color}18` : 'var(--surface-subtle)',
                      color: active ? opt.color : 'var(--fg-muted)',
                      border: `1.5px solid ${active ? opt.color : 'transparent'}`,
                    }}>
                    <span style={{ color: active ? opt.color : 'var(--fg-muted)' }}>{opt.icon}</span>
                    {opt.label}
                    {active && <CheckCircle size={11} style={{ color: opt.color }} />}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Eligibility */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Eligibility</p>
            <div className="flex flex-col gap-2">
              {ELIGIBILITY_OPTIONS.map(opt => {
                const active = local.eligibility.includes(opt.value)
                return (
                  <button key={opt.value}
                    onClick={() => setLocal(l => ({ ...l, eligibility: toggleArr(l.eligibility, opt.value) }))}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: active ? `${opt.color}12` : 'var(--surface-subtle)',
                      border: `1.5px solid ${active ? opt.color : 'transparent'}`,
                    }}>
                    <span className="text-sm font-medium" style={{ color: active ? opt.color : 'var(--fg)' }}>
                      {opt.label}
                    </span>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: active ? opt.color : 'var(--border)', background: active ? opt.color : 'transparent' }}>
                      {active && <CheckCircle size={12} style={{ color: '#fff' }} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Transport group */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Transport</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'all' as const, label: 'All', icon: null, color: 'var(--primary)' },
                { value: 'road' as const, label: 'Road', icon: <Car size={15} />, color: '#E05C1A' },
                { value: 'air' as const, label: 'Air', icon: <Plane size={15} />, color: '#3B82F6' },
                { value: 'water' as const, label: 'Water', icon: <Anchor size={15} />, color: '#06B6D4' },
              ].map(opt => {
                const active = local.transportGroup === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => setLocal(l => ({ ...l, transportGroup: opt.value }))}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all active:scale-95"
                    style={{
                      background: active ? `${opt.color}15` : 'var(--surface-subtle)',
                      border: `1.5px solid ${active ? opt.color : 'transparent'}`,
                    }}>
                    {opt.icon && <span style={{ color: active ? opt.color : 'var(--fg-muted)' }}>{opt.icon}</span>}
                    <span className="text-xs font-semibold"
                      style={{ color: active ? opt.color : 'var(--fg-muted)' }}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Toggles */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Quick options</p>
            <div className="flex flex-col gap-2">
              {[
                { key: 'verifiedOnly' as keyof FilterState, label: 'Verified businesses only', icon: <BadgeCheck size={15} />, color: '#8C52FF' },
                { key: 'endingSoon' as keyof FilterState, label: 'Ending soon', icon: <Flame size={15} />, color: '#D97706' },
                { key: 'everyoneOnly' as keyof FilterState, label: 'Open to everyone', icon: <Users size={15} />, color: '#10A760' },
                { key: 'bigSavings' as keyof FilterState, label: 'Big savings (15%+ off)', icon: <Percent size={15} />, color: '#10A760' },
                { key: 'noSponsor' as keyof FilterState, label: 'Organic deals only', icon: <Sparkles size={15} />, color: '#6366F1' },
              ].map(opt => {
                const active = local[opt.key] as boolean
                return (
                  <button key={opt.key}
                    onClick={() => setLocal(l => ({ ...l, [opt.key]: !l[opt.key] }))}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
                    style={{
                      background: active ? `${opt.color}10` : 'var(--surface-subtle)',
                      border: `1.5px solid ${active ? opt.color : 'transparent'}`,
                    }}>
                    <span style={{ color: active ? opt.color : 'var(--fg-muted)', flexShrink: 0 }}>{opt.icon}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: active ? opt.color : 'var(--fg)' }}>
                      {opt.label}
                    </span>
                    {/* Toggle pill */}
                    <div className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all"
                      style={{ background: active ? opt.color : 'var(--border)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: active ? 22 : 2 }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Apply button */}
        <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { onFilters(local); onSort(localSort); onClose() }}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'var(--primary)', color: '#fff', minHeight: 52 }}>
            {activeCount > 0 ? `Show results · ${activeCount} filter${activeCount > 1 ? 's' : ''} active` : 'Show all deals'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Active filter chips bar ──────────────────────────────────────────────

function ActiveFilters({ filters, sort, query, onFilters, onSort, onQuery }: {
  filters: FilterState
  sort: string
  query: string
  onFilters: (f: FilterState) => void
  onSort: (s: string) => void
  onQuery: (q: string) => void
}) {
  const chips: { label: string; onRemove: () => void; color: string }[] = []

  if (query) chips.push({ label: `"${query}"`, color: 'var(--primary)', onRemove: () => onQuery('') })
  if (filters.category !== 'All') chips.push({
    label: filters.category,
    color: categoryColor[filters.category] ?? 'var(--primary)',
    onRemove: () => onFilters({ ...filters, category: 'All' }),
  })
  filters.dealTypes.forEach(dt => chips.push({
    label: DEAL_TYPE_OPTIONS.find(o => o.value === dt)?.label ?? dt,
    color: dealTypeColor[dt] ?? '#8C52FF',
    onRemove: () => onFilters({ ...filters, dealTypes: filters.dealTypes.filter(x => x !== dt) }),
  }))
  filters.eligibility.forEach(el => chips.push({
    label: ELIGIBILITY_OPTIONS.find(o => o.value === el)?.label ?? el,
    color: '#D97706',
    onRemove: () => onFilters({ ...filters, eligibility: filters.eligibility.filter(x => x !== el) }),
  }))
  if (filters.transportGroup !== 'all') chips.push({
    label: `${filters.transportGroup.charAt(0).toUpperCase()}${filters.transportGroup.slice(1)} transport`,
    color: filters.transportGroup === 'road' ? '#E05C1A' : filters.transportGroup === 'air' ? '#3B82F6' : '#06B6D4',
    onRemove: () => onFilters({ ...filters, transportGroup: 'all' }),
  })
  if (filters.verifiedOnly) chips.push({ label: 'Verified only', color: '#8C52FF', onRemove: () => onFilters({ ...filters, verifiedOnly: false }) })
  if (filters.endingSoon) chips.push({ label: 'Ending soon', color: '#D97706', onRemove: () => onFilters({ ...filters, endingSoon: false }) })
  if (filters.everyoneOnly) chips.push({ label: 'Everyone eligible', color: '#10A760', onRemove: () => onFilters({ ...filters, everyoneOnly: false }) })
  if (filters.bigSavings) chips.push({ label: '15%+ savings', color: '#10A760', onRemove: () => onFilters({ ...filters, bigSavings: false }) })
  if (filters.noSponsor) chips.push({ label: 'Organic only', color: '#6366F1', onRemove: () => onFilters({ ...filters, noSponsor: false }) })
  if (sort !== 'recommended') chips.push({
    label: sortOptions.find(s => s.value === sort)?.label ?? sort,
    color: 'var(--fg-muted)',
    onRemove: () => onSort('recommended'),
  })

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-0 py-2 scroll-rail">
      {chips.map((chip, i) => (
        <button key={i} onClick={chip.onRemove}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
          style={{ background: `${chip.color}15`, color: chip.color, border: `1.5px solid ${chip.color}40` }}>
          {chip.label}
          <X size={11} />
        </button>
      ))}
      <button
        onClick={() => { onFilters(defaultFilters); onSort('recommended'); onQuery('') }}
        className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
        style={{ color: 'var(--fg-muted)', background: 'var(--surface-subtle)' }}>
        Clear all
      </button>
    </div>
  )
}

// ─── Deal card ────────────────────────────────────────────────────────────

function DealCard({ deal, onOpen }: { deal: DealFull; onOpen: (id: string) => void }) {
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)
  const catColor = categoryColor[deal.serviceCategory] ?? 'var(--primary)'
  const dealColor = dealTypeColor[deal.dealType] ?? '#8C52FF'
  const statusCfg = statusConfig[deal.status]
  const eligCfg = eligibilityConfig[deal.eligibility]
  const isExpired = deal.status === 'expired' || deal.status === 'unavailable'

  return (
    <article
      onClick={() => !isExpired && onOpen(deal.id)}
      className="overflow-hidden rounded-2xl cursor-pointer group transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: isExpired ? 0.55 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>

      <div className="relative overflow-hidden" style={{ height: 210 }}>
        <img src={deal.image} alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%)' }} />

        {(deal.savingPercentage || deal.savingAmount) && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black"
              style={{ background: '#10A760', color: '#fff' }}>
              <TrendingDown size={11} strokeWidth={2.5} />
              {deal.savingPercentage ? `${deal.savingPercentage}% off` : `Save N$ ${deal.savingAmount}`}
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {deal.sponsored && (
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}>
              Sponsored
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); setSaved(s => !s) }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ background: saved ? 'var(--primary)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
            <Bookmark size={14} fill={saved ? '#fff' : 'none'} style={{ color: '#fff' }} />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <img src={deal.businessAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
            <span className="text-xs font-semibold text-white truncate" style={{ maxWidth: 120 }}>{deal.business}</span>
            {deal.verification.verified && <CheckCircle size={11} style={{ color: '#10A760', flexShrink: 0 }} />}
          </div>
        </div>

        {statusCfg && deal.status !== 'active' && (
          <div className="absolute bottom-3 right-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
              {statusCfg.label}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${catColor}15`, color: catColor }}>
            {deal.serviceCategory}
          </span>
          {deal.transportMode && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
              {deal.transportMode}
            </span>
          )}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: `${dealColor}12`, color: dealColor }}>
            {deal.typeLabel}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold leading-tight mb-1"
            style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            {deal.title}
          </h3>
          {deal.origin ? (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={10} /> {deal.origin} <ArrowRight size={10} /> {deal.destination}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={10} /> {deal.destination}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums"
              style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
              {deal.currency} {deal.currentPrice}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</span>
            {deal.referencePrice && (
              <span className="text-xs line-through tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                {deal.currency} {deal.referencePrice}
              </span>
            )}
          </div>
          {deal.rating && (
            <div className="flex items-center gap-1">
              <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{deal.rating}</span>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>({deal.reviewCount})</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {deal.eligibility === 'everyone' || deal.eligibility === 'eligible'
              ? <CheckCircle size={12} style={{ color: eligCfg.color }} />
              : <Info size={12} style={{ color: eligCfg.color }} />}
            <span className="text-xs font-medium" style={{ color: eligCfg.color }}>{eligCfg.label}</span>
          </div>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <Clock size={10} /> {deal.endsAt}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={e => { e.stopPropagation(); setLiked(l => !l) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform flex-shrink-0">
            <Heart size={16} fill={liked ? '#EF4444' : 'none'}
              style={{ color: liked ? '#EF4444' : 'var(--fg-muted)' }} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); !isExpired && onOpen(deal.id) }}
            disabled={isExpired}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{
              background: isExpired ? 'var(--border)' : 'var(--primary)',
              color: isExpired ? 'var(--fg-muted)' : '#fff',
              minHeight: 44,
            }}>
            {isExpired ? 'Expired' : 'View deal'}
            {!isExpired && deal.claimMethod === 'external' && <ExternalLink size={13} />}
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Hero deal card ───────────────────────────────────────────────────────

function HeroDealCard({ deal, onOpen }: { deal: DealFull; onOpen: (id: string) => void }) {
  const [saved, setSaved] = useState(false)
  const catColor = categoryColor[deal.serviceCategory] ?? 'var(--primary)'
  const eligCfg = eligibilityConfig[deal.eligibility]
  const statusCfg = statusConfig[deal.status]

  return (
    <div onClick={() => onOpen(deal.id)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ height: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
      <img src={deal.image} alt={deal.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%)' }} />
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${catColor}dd`, color: '#fff', backdropFilter: 'blur(6px)' }}>
            {deal.serviceCategory}
          </span>
          {(deal.savingPercentage || deal.savingAmount) && (
            <span className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: '#10A760', color: '#fff' }}>
              <TrendingDown size={11} strokeWidth={2.5} />
              {deal.savingPercentage ? `${deal.savingPercentage}% off` : `Save N$ ${deal.savingAmount}`}
            </span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); setSaved(s => !s) }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
          style={{ background: saved ? 'var(--primary)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <Bookmark size={16} fill={saved ? '#fff' : 'none'} style={{ color: '#fff' }} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-2">
          <img src={deal.businessAvatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/30" />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{deal.business}</span>
          {deal.verification.verified && <CheckCircle size={12} style={{ color: '#10A760' }} />}
        </div>
        <h3 className="text-xl font-extrabold leading-tight mb-1 text-white"
          style={{ fontFamily: 'Syne, sans-serif', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {deal.title}
        </h3>
        <div className="flex items-end justify-between mt-3 flex-wrap gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums"
                style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
                N$ {deal.currentPrice}
              </span>
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>/ {deal.priceBasis}</span>
              {deal.referencePrice && (
                <span className="text-sm line-through" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  N$ {deal.referencePrice}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium"
                style={{ color: eligCfg.color === '#10A760' ? '#6EE7B7' : 'rgba(255,255,255,0.7)' }}>
                <CheckCircle size={11} /> {eligCfg.label}
              </span>
              {statusCfg && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onOpen(deal.id) }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0"
            style={{ background: '#fff', color: 'var(--primary)', minHeight: 44 }}>
            View deal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Urgency card (ending soon rail) ─────────────────────────────────────

function UrgencyCard({ deal, onOpen }: { deal: DealFull; onOpen: (id: string) => void }) {
  const catColor = categoryColor[deal.serviceCategory] ?? 'var(--primary)'
  return (
    <button onClick={() => onOpen(deal.id)}
      className="flex-shrink-0 overflow-hidden rounded-2xl text-left transition-all active:scale-95 group"
      style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="relative overflow-hidden" style={{ height: 120 }}>
        <img src={deal.image} alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: '#D97706', color: '#fff' }}>
            <Flame size={10} /> Ending {deal.endsAt}
          </span>
        </div>
        {(deal.savingPercentage || deal.savingAmount) && (
          <div className="absolute bottom-2 right-2">
            <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background: '#10A760', color: '#fff' }}>
              {deal.savingPercentage ? `-${deal.savingPercentage}%` : `Save N$ ${deal.savingAmount}`}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold leading-snug mb-1 line-clamp-2" style={{ color: 'var(--fg)' }}>{deal.title}</p>
        <p className="text-xs mb-2 truncate" style={{ color: 'var(--fg-muted)' }}>{deal.business}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-black tabular-nums" style={{ color: 'var(--fg)' }}>N$ {deal.currentPrice}</span>
            <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ background: `${catColor}15`, color: catColor }}>
            {deal.serviceCategory}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Transport deal row ───────────────────────────────────────────────────

function TransportDealRow({ deal, onOpen }: { deal: DealFull; onOpen: (id: string) => void }) {
  const groupColor =
    deal.serviceCategory === 'Air transport' ? '#3B82F6' :
    deal.serviceCategory === 'Water transport' ? '#06B6D4' : '#E05C1A'
  const GroupIcon =
    deal.serviceCategory === 'Air transport' ? Plane :
    deal.serviceCategory === 'Water transport' ? Anchor : Car
  const eligCfg = eligibilityConfig[deal.eligibility]

  return (
    <button onClick={() => onOpen(deal.id)}
      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.99] hover:opacity-90 group"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex-shrink-0 overflow-hidden rounded-xl" style={{ width: 72, height: 72 }}>
        <img src={deal.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${groupColor}15`, color: groupColor }}>
            <GroupIcon size={11} /> {deal.transportMode ?? deal.serviceCategory}
          </span>
          {deal.verification.verified && <CheckCircle size={12} style={{ color: 'var(--primary)' }} />}
        </div>
        <p className="text-sm font-bold truncate" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>{deal.title}</p>
        {deal.origin ? (
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={10} />{deal.origin} <ArrowRight size={9} /> {deal.destination}
          </p>
        ) : (
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={10} />{deal.destination}
          </p>
        )}
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: eligCfg.color }}>
          <CheckCircle size={10} /> {eligCfg.label}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-lg font-black tabular-nums" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
          N$ {deal.currentPrice}
        </p>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</p>
        {deal.savingPercentage && (
          <span className="text-xs font-bold" style={{ color: '#10A760' }}>-{deal.savingPercentage}%</span>
        )}
        <div className="mt-1.5">
          <ArrowRight size={16} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
        </div>
      </div>
    </button>
  )
}

// ─── Deal detail page ─────────────────────────────────────────────────────

function DealDetail({
  dealId,
  onBack,
  onBook,
}: {
  dealId: string
  onBack: () => void
  onBook?: () => void
}) {
  const deal = allDeals.find(d => d.id === dealId) ?? allDeals[0]
  const [saved, setSaved] = useState(false)
  const catColor = categoryColor[deal.serviceCategory] ?? 'var(--primary)'
  const statusCfg = statusConfig[deal.status]
  const eligCfg = eligibilityConfig[deal.eligibility]
  const similar = allDeals.filter(d => d.id !== deal.id && d.serviceCategory === deal.serviceCategory).slice(0, 3)

  const claimLabel =
    deal.claimMethod === 'book'       ? 'Book this rate' :
    deal.claimMethod === 'request'    ? 'Send booking request' :
    deal.claimMethod === 'show-proof' ? 'View how to claim' :
    deal.claimMethod === 'message'    ? 'Message business' :
    deal.claimMethod === 'external'   ? 'Continue to operator' :
    deal.claimMethod === 'in-person'  ? 'See how to claim' : 'View deal'

  function handleClaim() {
    if (deal.claimMethod === 'book' || deal.claimMethod === 'request') {
      onBook?.()
      return
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="sticky top-14 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 active:scale-95 transition-all"
          style={{ color: 'var(--fg)' }}>
          ← Back to deals
        </button>
        <button onClick={() => setSaved(s => !s)} className="p-2.5 rounded-xl active:scale-95 transition-transform">
          <Bookmark size={20} fill={saved ? 'var(--primary)' : 'none'}
            style={{ color: saved ? 'var(--primary)' : 'var(--fg-muted)' }} />
        </button>
      </div>

      <div className="max-w-[1280px] mx-auto flex gap-8 px-0 sm:px-4 md:px-6 py-0 sm:py-6">
        <div className="flex-1 min-w-0">
          <div className="relative sm:rounded-2xl overflow-hidden" style={{ height: 300 }}>
            <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 50%)' }} />
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                style={{ background: `${catColor}dd`, color: '#fff' }}>{deal.serviceCategory}</span>
              {(deal.savingPercentage || deal.savingAmount) && (
                <span className="flex items-center gap-1 text-xs font-black px-2.5 py-1.5 rounded-full"
                  style={{ background: '#10A760', color: '#fff' }}>
                  <TrendingDown size={11} strokeWidth={2.5} />
                  {deal.savingPercentage ? `${deal.savingPercentage}% off` : `Save N$ ${deal.savingAmount}`}
                </span>
              )}
              {deal.sponsored && (
                <span className="text-xs px-2.5 py-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }}>Sponsored</span>
              )}
            </div>
            {statusCfg && deal.status !== 'active' && (
              <div className="absolute bottom-4 left-4">
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}44` }}>
                  {statusCfg.label}
                </span>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-0 py-4 flex items-start gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative flex-shrink-0">
              <img src={deal.businessAvatar} alt={deal.business}
                className="w-14 h-14 rounded-xl object-cover" style={{ border: `2.5px solid ${catColor}` }} />
              {deal.verification.verified && (
                <CheckCircle size={18} className="absolute -bottom-1 -right-1"
                  style={{ color: 'var(--primary)', background: 'var(--surface)', borderRadius: '50%' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight mb-0.5"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{deal.title}</h1>
              <p className="text-sm mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                {deal.business} · {deal.serviceCategory}{deal.transportMode && ` · ${deal.transportMode}`}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {deal.verification.verified
                  ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}>
                      <CheckCircle size={10} /> {deal.verification.label}
                    </span>
                  : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                      <Info size={10} /> {deal.verification.label}
                    </span>}
                {deal.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{deal.rating}</span>
                    {deal.reviewCount && <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>({deal.reviewCount})</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Price & savings</p>
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span className="text-4xl font-black tabular-nums"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                {deal.currency} {deal.currentPrice}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</span>
              {deal.referencePrice && (
                <span className="text-base line-through" style={{ color: 'var(--fg-muted)' }}>
                  {deal.currency} {deal.referencePrice}
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {deal.savingAmount && (
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>Save N$ {deal.savingAmount}</span>
              )}
              {deal.savingPercentage && (
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>{deal.savingPercentage}% off</span>
              )}
            </div>
            {deal.fees && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#D97706' }}>
                <Info size={11} /> {deal.fees}
              </p>
            )}
          </div>

          {deal.origin && (
            <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Route</p>
              <div className="flex items-stretch gap-4">
                <div className="flex flex-col items-center" style={{ width: 20 }}>
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: catColor }} />
                  <div className="flex-1 w-0.5 my-1" style={{ background: `${catColor}44` }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: catColor }} />
                </div>
                <div className="flex-1 flex flex-col justify-between gap-5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{deal.origin}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{deal.destination}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Eligibility</p>
            <div className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: `${eligCfg.color}10`, border: `1px solid ${eligCfg.color}30` }}>
              {deal.eligibility === 'everyone' || deal.eligibility === 'eligible'
                ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: eligCfg.color }} />
                : <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: eligCfg.color }} />}
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: eligCfg.color }}>{eligCfg.label}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{deal.eligibilityNote}</p>
                {deal.proofRequired && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    <strong>Proof required:</strong> {deal.proofRequired}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>About this deal</p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg)' }}>{deal.description}</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <Clock size={13} /> {deal.availability}
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <Tag size={13} /> Expires {deal.endsAt}
              </div>
              {deal.bookBy && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#D97706' }}>
                  <Info size={13} /> {deal.bookBy}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Included</p>
                <ul className="flex flex-col gap-2">
                  {deal.included.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                      <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {deal.excluded.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Not included</p>
                  <ul className="flex flex-col gap-2">
                    {deal.excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
                        <X size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--fg-muted)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>How to claim</p>
            <div className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(140,82,255,0.06)', border: '1px solid rgba(140,82,255,0.2)' }}>
              <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{deal.claimMethodNote}</p>
            </div>
          </div>

          <div className="px-4 sm:px-0 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Terms & cancellation</p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fg)' }}>{deal.terms}</p>
            <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg)' }}>
              <Shield size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
              {deal.cancellation}
            </div>
          </div>

          {similar.length > 0 && (
            <div className="px-4 sm:px-0 py-5">
              <p className="text-base font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                More {deal.serviceCategory.toLowerCase()} deals
              </p>
              <div className="flex flex-col gap-3">
                {similar.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={s.image} alt={s.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{s.title}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.business} · {s.destination}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--fg)' }}>
                        {s.currency} {s.currentPrice}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--fg-muted)' }}>/ {s.priceBasis}</span>
                      </p>
                    </div>
                    <button onClick={onBack}
                      className="text-xs font-semibold px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}>View</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block flex-shrink-0" style={{ width: 320 }}>
          <div className="sticky top-28 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="p-5" style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-3xl font-black tabular-nums"
                  style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                  {deal.currency} {deal.currentPrice}
                </span>
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</span>
              </div>
              {deal.savingAmount && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,167,96,0.12)', color: '#10A760' }}>
                  You save N$ {deal.savingAmount}
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
              <div className="p-3 rounded-xl flex items-start gap-2"
                style={{ background: `${eligCfg.color}10`, border: `1px solid ${eligCfg.color}30` }}>
                <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: eligCfg.color }} />
                <p className="text-xs leading-relaxed" style={{ color: eligCfg.color }}>
                  {eligCfg.label} — {deal.eligibilityNote}
                </p>
              </div>
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <Clock size={11} /> Expires {deal.endsAt}
              </p>
              <button
                onClick={() => deal.claimMethod !== 'external' && (deal.claimMethod === 'book' || deal.claimMethod === 'request' ? handleClaim() : undefined)}
                disabled={deal.status === 'expired' || deal.status === 'unavailable'}
                className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: (deal.status === 'expired' || deal.status === 'unavailable') ? 'var(--border)' : 'var(--primary)',
                  color: (deal.status === 'expired' || deal.status === 'unavailable') ? 'var(--fg-muted)' : '#fff',
                  minHeight: 52,
                }}>
                {(deal.status === 'expired' || deal.status === 'unavailable') ? 'No longer available' : claimLabel}
                {deal.claimMethod === 'external' && <ExternalLink size={14} />}
              </button>
              <div className="flex items-start gap-2">
                <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#10A760' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{deal.cancellation}</p>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
                Confirmed by {deal.business}. Delve is not the booking agent.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-sticky-cta lg:hidden"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="text-xl font-black tabular-nums price-inline break-anywhere"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
              {deal.currency} {deal.currentPrice}
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--fg-muted)' }}>/ {deal.priceBasis}</span>
          </div>
          <button
            type="button"
            onClick={() => deal.claimMethod !== 'external' && (deal.claimMethod === 'book' || deal.claimMethod === 'request' ? handleClaim() : undefined)}
            disabled={deal.status === 'expired' || deal.status === 'unavailable'}
            className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all min-h-[48px]"
            style={{
              background: (deal.status === 'expired' || deal.status === 'unavailable') ? 'var(--border)' : 'var(--primary)',
              color: (deal.status === 'expired' || deal.status === 'unavailable') ? 'var(--fg-muted)' : '#fff',
            }}>
            {(deal.status === 'expired' || deal.status === 'unavailable') ? 'Expired' : claimLabel}
          </button>
        </div>
      </div>
      <div className="mobile-sticky-cta-spacer lg:hidden" aria-hidden />
    </div>
  )
}

// ─── Main deals page ──────────────────────────────────────────────────────

export default function DealsPage({
  onBookDeal,
}: {
  onBookDeal?: (dealId: string) => void
} = {}) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sort, setSort] = useState('recommended')
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  if (selectedDealId) {
    return (
      <DealDetail
        dealId={selectedDealId}
        onBack={() => setSelectedDealId(null)}
        onBook={() => onBookDeal?.(selectedDealId)}
      />
    )
  }

  const activeFilterCount = countActive(filters) + (sort !== 'recommended' ? 1 : 0)
  const anyFilter = !!(query || activeFilterCount > 0)

  const results = applyFilters(allDeals, filters, query, sort)

  const heroDeals = allDeals.filter(d => d.savingPercentage && d.status !== 'expired').slice(0, 1)
  const endingSoon = allDeals.filter(d => d.status === 'ending-soon')
  const transportDeals = results.filter(d =>
    ['Road transport', 'Air transport', 'Water transport'].includes(d.serviceCategory)
  )
  const valueDeals = results.filter(d =>
    !['Road transport', 'Air transport', 'Water transport'].includes(d.serviceCategory)
  )

  // Quick filter pill data — social-media-style instant toggles
  const quickFilters: { label: string; key: keyof FilterState; icon: React.ReactNode; color: string }[] = [
    { label: 'Ending soon', key: 'endingSoon', icon: <Flame size={12} />, color: '#D97706' },
    { label: 'Everyone eligible', key: 'everyoneOnly', icon: <Users size={12} />, color: '#10A760' },
    { label: 'Big savings', key: 'bigSavings', icon: <Percent size={12} />, color: '#10A760' },
    { label: 'Verified only', key: 'verifiedOnly', icon: <BadgeCheck size={12} />, color: '#8C52FF' },
    { label: 'Organic only', key: 'noSponsor', icon: <Sparkles size={12} />, color: '#6366F1' },
  ]

  return (
    <>
      {showFilters && (
        <FilterSheet
          filters={filters}
          sort={sort}
          onFilters={setFilters}
          onSort={setSort}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden sm:rounded-2xl mb-0"
          style={{ background: 'linear-gradient(135deg, #1a0a3e 0%, #2d1b6b 40%, #1e3a5f 100%)', minHeight: 190 }}>
          <div className="absolute" style={{ top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(140,82,255,0.25)', filter: 'blur(60px)' }} />
          <div className="absolute" style={{ bottom: -20, left: 60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(16,167,96,0.2)', filter: 'blur(50px)' }} />

          <div className="relative z-10 px-5 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              {[
                { icon: <Tag size={11} />, text: `${allDeals.length} active deals` },
                { icon: <Sparkles size={11} />, text: 'Updated today' },
                { icon: <MapPin size={11} />, text: 'Namibia-wide' },
              ].map(s => (
                <div key={s.text} className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {s.icon} {s.text}
                </div>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight"
              style={{ fontFamily: 'Syne, sans-serif', maxWidth: 480 }}>
              Find more ways to experience a place for less.
            </h1>

            {/* Search bar */}
            <div className="flex items-center gap-3 px-4 rounded-2xl max-w-lg"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', height: 50, backdropFilter: 'blur(8px)' }}>
              <Search size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search deals — place, activity, transport…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
                style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif' }}
              />
              {query ? (
                <button onClick={() => setQuery('')}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <X size={13} style={{ color: '#fff' }} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── CATEGORY STRIP ── */}
        <div className="pt-4 pb-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 scroll-rail pb-3">
            {dealCategories.map(cat => {
              const isActive = filters.category === cat.label
              const color = cat.label !== 'All' ? (categoryColor[cat.label] ?? 'var(--primary)') : 'var(--primary)'
              return (
                <button key={cat.label}
                  onClick={() => setFilters(f => ({ ...f, category: f.category === cat.label ? 'All' : cat.label }))}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
                  style={{
                    background: isActive ? `${color}18` : 'var(--surface)',
                    color: isActive ? color : 'var(--fg-muted)',
                    border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                    fontWeight: isActive ? 700 : 500,
                  }}>
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── FILTER & SORT BAR ── */}
        <div className="px-4 sm:px-0 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}>

          {/* Filter/sort button */}
          <button
            onClick={() => setShowFilters(true)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              background: activeFilterCount > 0 ? 'var(--primary)' : 'var(--surface)',
              color: activeFilterCount > 0 ? '#fff' : 'var(--fg)',
              border: `1.5px solid ${activeFilterCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
              minHeight: 40,
            }}>
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.25)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick toggle chips — social feed style, horizontally scrollable */}
          <div className="flex gap-2 overflow-x-auto scroll-rail flex-1">
            {quickFilters.map(qf => {
              const active = filters[qf.key] as boolean
              return (
                <button key={qf.key}
                  onClick={() => setFilters(f => ({ ...f, [qf.key]: !f[qf.key] }))}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
                  style={{
                    background: active ? `${qf.color}15` : 'var(--surface)',
                    color: active ? qf.color : 'var(--fg-muted)',
                    border: `1.5px solid ${active ? qf.color : 'var(--border)'}`,
                    minHeight: 36,
                  }}>
                  <span>{qf.icon}</span>
                  {qf.label}
                  {active && <X size={11} />}
                </button>
              )
            })}

            {/* Sort shortcut */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{
                background: sort !== 'recommended' ? 'rgba(140,82,255,0.1)' : 'var(--surface)',
                color: sort !== 'recommended' ? 'var(--primary)' : 'var(--fg-muted)',
                border: `1.5px solid ${sort !== 'recommended' ? 'var(--primary)' : 'var(--border)'}`,
                minHeight: 36,
              }}>
              <ChevronDown size={11} />
              {sortOptions.find(s => s.value === sort)?.label ?? 'Sort'}
            </button>
          </div>
        </div>

        {/* ── ACTIVE FILTER CHIPS ── */}
        {anyFilter && (
          <ActiveFilters
            filters={filters}
            sort={sort}
            query={query}
            onFilters={setFilters}
            onSort={setSort}
            onQuery={setQuery}
          />
        )}

        {/* ── RESULTS COUNT ── */}
        {anyFilter && (
          <div className="px-4 sm:px-0 pt-3 pb-1 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
              <span className="font-black tabular-nums" style={{ color: 'var(--fg)' }}>{results.length}</span>
              {' '}deal{results.length !== 1 ? 's' : ''}
              {query && <span style={{ color: 'var(--fg-muted)' }}> for "{query}"</span>}
            </p>
            {results.length > 0 && (
              <button onClick={() => { setFilters(defaultFilters); setSort('recommended'); setQuery('') }}
                className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                Clear all
              </button>
            )}
          </div>
        )}

        {/* ── RESULTS GRID (when any filter active) ── */}
        {anyFilter && (
          <div className="px-4 sm:px-0 pt-3 pb-8">
            {results.length === 0 ? (
              <div className="py-20 text-center">
                <Tag size={36} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
                <p className="text-lg font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                  No deals match.
                </p>
                <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                  Try removing a filter or broadening your search.
                </p>
                <button onClick={() => { setFilters(defaultFilters); setSort('recommended'); setQuery('') }}
                  className="px-6 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: '#fff' }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Transport deals as rows */}
                {transportDeals.length > 0 && (
                  <div className="mb-5">
                    {transportDeals.length > 0 && valueDeals.length > 0 && (
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>
                        Transport
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      {transportDeals.map(d => <TransportDealRow key={d.id} deal={d} onOpen={setSelectedDealId} />)}
                    </div>
                  </div>
                )}
                {/* Value deals as card grid */}
                {valueDeals.length > 0 && (
                  <div>
                    {transportDeals.length > 0 && valueDeals.length > 0 && (
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>
                        Deals
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {valueDeals.map(d => <DealCard key={d.id} deal={d} onOpen={setSelectedDealId} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── LANDING SECTIONS (no filters) ── */}
        {!anyFilter && (
          <>
            {heroDeals.length > 0 && (
              <div className="px-4 sm:px-0 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <p className="text-lg font-extrabold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                      Featured this week
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Hand-picked deals with genuine savings</p>
                  </div>
                </div>
                {heroDeals.map(d => <HeroDealCard key={d.id} deal={d} onOpen={setSelectedDealId} />)}
              </div>
            )}

            {endingSoon.length > 0 && (
              <div className="pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="px-4 sm:px-0 flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(217,119,6,0.12)' }}>
                    <Flame size={15} style={{ color: '#D97706' }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                      Ending soon
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Book before these expire</p>
                  </div>
                  <button onClick={() => setFilters(f => ({ ...f, endingSoon: true }))}
                    className="ml-auto text-xs font-semibold flex items-center gap-1"
                    style={{ color: 'var(--primary)' }}>
                    See all <ArrowRight size={12} />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 scroll-rail pb-1">
                  {endingSoon.map(d => <UrgencyCard key={d.id} deal={d} onOpen={setSelectedDealId} />)}
                </div>
              </div>
            )}

            {valueDeals.length > 0 && (
              <div className="px-4 sm:px-0 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(16,167,96,0.1)' }}>
                    <TrendingDown size={15} style={{ color: '#10A760' }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                      Easy on the wallet
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Stays, food, and activities with genuine value</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {valueDeals.map(d => <DealCard key={d.id} deal={d} onOpen={setSelectedDealId} />)}
                </div>
              </div>
            )}

            {transportDeals.length > 0 && (
              <div className="px-4 sm:px-0 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(224,92,26,0.1)' }}>
                    <Car size={15} style={{ color: '#E05C1A' }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>
                      Road, air & water transport
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Special rates and group fares</p>
                  </div>
                  <button onClick={() => setShowFilters(true)}
                    className="ml-auto text-xs font-semibold flex items-center gap-1"
                    style={{ color: 'var(--primary)' }}>
                    Filter <SlidersHorizontal size={11} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {transportDeals.map(d => <TransportDealRow key={d.id} deal={d} onOpen={setSelectedDealId} />)}
                </div>
              </div>
            )}

            <div className="px-4 sm:px-0 py-6">
              <div className="rounded-2xl p-5 flex gap-4 items-start"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Shield size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>About Delve deals</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    Deals are listed by businesses and operators. Prices, eligibility, savings, and availability are set by each operator. Delve does not guarantee or verify claimed savings unless marked verified. Sponsored deals are labeled. Always review the full terms before booking.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-8" />
      </div>
    </>
  )
}
