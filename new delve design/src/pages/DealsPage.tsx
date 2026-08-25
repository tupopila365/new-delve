import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Building2, Clock, Flag, Navigation, Search, Tag, X } from 'lucide-react'
import type { DealClaimDto, DealDto } from '@delve/contracts'
import {
  claimDeal,
  fetchMyDealClaim,
  fetchPublicDeal,
  fetchPublicDeals,
  recordDealAnalytics,
  reportDeal,
} from '../api/dealClient'
import { saveItem, unsaveItem } from '../api/socialClient'
import { getStoredAccessToken } from '../api/authClient'
import { SkeletonCard, SectionEmpty, SectionError } from '../components/SectionStates'
import { formatMoney } from '../lib/formatMoney'
import AddDealToJourneySheet from '../components/deals/AddDealToJourneySheet'
import BookingRequestForm from './booking/BookingRequestForm'
import MyClaimsPage from './MyClaimsPage'

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

function hoursLeft(endIso: string) {
  return (new Date(endIso).getTime() - Date.now()) / (1000 * 60 * 60)
}

type AvailabilityFilter = 'all' | 'ending-soon' | 'discount'

const CATEGORY_ORDER = ['Food & Drink', 'Stays', 'Tours', 'Experiences', 'Things to Do']
const CITY_CHIPS = ['Windhoek', 'Swakopmund', 'Sossusvlei', 'Etosha', 'Walvis Bay', 'Cape Town']

function countryLabel(code: string | null | undefined) {
  if (code === 'NA') return 'Namibia'
  if (code === 'ZA') return 'South Africa'
  return code ?? ''
}

function locationLine(deal: DealDto) {
  const country = countryLabel(deal.countryCode)
  if (deal.city && country) return `${deal.city}, ${country}`
  return deal.city || country || ''
}

function PreviewBadge() {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(15, 23, 42, 0.08)', color: 'var(--fg-muted)' }}
    >
      Preview offer
    </span>
  )
}

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
      className="rounded-2xl overflow-hidden cursor-pointer active:opacity-90"
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
      {deal.coverUrl ? (
        <img
          src={deal.coverUrl}
          alt=""
          className="w-full h-40 object-cover"
          onError={e => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
      <div className="px-4 py-3">
        <div className="flex items-center flex-wrap gap-1.5 mb-2">
          <p className="text-xs font-semibold m-0 inline-flex items-center gap-1" style={{ color: 'var(--primary)' }}>
            <Tag size={12} />
            {deal.discountSummary}
          </p>
          {deal.isPreview ? <PreviewBadge /> : null}
          {endingSoon && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.14)', color: '#B45309' }}>
              Ending soon
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
          {deal.title}
        </h3>
        {deal.pricing && (
          <div className="mt-1.5">
            <p className="text-base font-bold m-0" style={{ color: 'var(--fg)' }}>
              {formatMoney(deal.pricing.currency, deal.pricing.dealAmount)}
            </p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Was {formatMoney(deal.pricing.currency, deal.pricing.originalAmount)} · Save{' '}
              {formatMoney(deal.pricing.currency, deal.pricing.savingAmount)}
            </p>
          </div>
        )}
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
          {locationLine(deal) ? ` · ${locationLine(deal)}` : ''}
        </p>
        <p className="text-xs m-0 mt-2 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
          <Clock size={11} />
          Valid {formatRange(deal.startDate, deal.endDate)}
        </p>
      </div>
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

  const [claim, setClaim] = useState<DealClaimDto | null>(null)
  const [saved, setSaved] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [journeyOpen, setJourneyOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [createdBookingRef, setCreatedBookingRef] = useState<string | null>(null)
  const signedIn = Boolean(getStoredAccessToken())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await fetchPublicDeal(dealId)
        if (!cancelled) {
          setDeal(row)
          try {
            const key = `delve:deal-impression:${dealId}`
            if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1')
              void recordDealAnalytics(dealId, 'IMPRESSION')
            }
          } catch {
            void recordDealAnalytics(dealId, 'IMPRESSION')
          }
        }
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

  useEffect(() => {
    if (!signedIn) return
    void fetchMyDealClaim(dealId)
      .then(row => setClaim(row))
      .catch(() => setClaim(null))
  }, [dealId, signedIn])

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

      {deal.coverUrl ? (
        <img
          src={deal.coverUrl}
          alt=""
          className="w-full max-h-56 object-cover rounded-2xl mb-4"
          onError={e => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : null}

      <div className="flex items-center flex-wrap gap-2 mb-2">
        <p className="text-sm font-semibold m-0" style={{ color: 'var(--primary)' }}>
          {deal.discountSummary}
        </p>
        {deal.isPreview ? <PreviewBadge /> : null}
      </div>
      {deal.pricing && (
        <div className="rounded-2xl px-4 py-3 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Original price</p>
          <p className="text-sm m-0 mb-2 line-through" style={{ color: 'var(--fg-muted)' }}>{formatMoney(deal.pricing.currency, deal.pricing.originalAmount)}</p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Deal price</p>
          <p className="text-lg font-bold m-0 mb-2" style={{ color: 'var(--fg)' }}>{formatMoney(deal.pricing.currency, deal.pricing.dealAmount)}</p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>You save</p>
          <p className="text-sm m-0">{formatMoney(deal.pricing.currency, deal.pricing.savingAmount)} · {deal.pricing.discountPercentage}%</p>
        </div>
      )}
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
        {locationLine(deal) ? <span>{locationLine(deal)}</span> : null}
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
        {actionError && (
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--auth-danger)' }} role="alert">
            {actionError}
          </p>
        )}
        {deal.isPreview ? (
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Delve preview
          </p>
        ) : claim ? (
          <div className="mb-3">
            <p className="text-sm font-semibold m-0 mb-1" style={{ color: claim.status === 'REDEEMED' ? '#0F8A52' : 'var(--fg)' }}>
              {claim.status === 'REDEEMED' ? 'REDEEMED ✓' : `Claim ${claim.status.toLowerCase()}`}
            </p>
            <p className="text-xs font-mono m-0" style={{ color: 'var(--fg)' }}>
              Code {claim.code}
            </p>
            {claim.redeemedAt && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                Redeemed {new Date(claim.redeemedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Claim this deal
          </p>
        )}
        {deal.isPreview && (
          <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
            This preview offer cannot be claimed, booked, or paid.
          </p>
        )}
        {deal.eligibility && (
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            {deal.eligibility}
          </p>
        )}
        {deal.terms && (
          <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
            {deal.terms}
          </p>
        )}
        {deal.included && (
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            Included: {deal.included}
          </p>
        )}
        {deal.excluded && (
          <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
            Not included: {deal.excluded}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {deal.isPreview ? null : (
          <button
            type="button"
            disabled={!signedIn || Boolean(claim) || !deal.isActive}
            onClick={() => {
              setActionError(null)
              void claimDeal(deal.id)
                .then(setClaim)
                .catch(err => setActionError(err instanceof Error ? err.message : 'Could not claim'))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {claim ? 'Claimed' : signedIn ? 'Claim' : 'Sign in to claim'}
          </button>
          )}
          {claim && deal.listing && ['PENDING', 'CONFIRMED'].includes(claim.status) && (
            <button
              type="button"
              disabled={!signedIn || Boolean(deal.isPreview)}
              onClick={() => setBookingOpen(v => !v)}
              className="rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              {deal.claimMethod === 'BOOKING_CODE' ? 'Book Deal' : 'Reserve with deal'}
            </button>
          )}
          <button
            type="button"
            disabled={!signedIn}
            onClick={() => {
              setActionError(null)
              const op = saved
                ? unsaveItem({ targetType: 'DEAL', targetId: deal.id })
                : saveItem({ targetType: 'DEAL', targetId: deal.id })
              void op
                .then(() => setSaved(!saved))
                .catch(err => setActionError(err instanceof Error ? err.message : 'Could not save'))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <Bookmark size={14} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={!signedIn}
            onClick={() => setJourneyOpen(true)}
            className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <Navigation size={14} />
            Journey
          </button>
          <button
            type="button"
            disabled={!signedIn}
            onClick={() => {
              setActionError(null)
              void reportDeal(deal.id, { reason: 'MISLEADING' })
                .then(() => setActionError('Report submitted'))
                .catch(err => setActionError(err instanceof Error ? err.message : 'Could not report'))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"
            style={{ background: 'none', color: 'var(--fg-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <Flag size={14} />
            Report
          </button>
        </div>
        {bookingOpen && claim && deal.listing && (
          <div className="mt-3">
            {createdBookingRef && (
              <p className="text-xs m-0 mb-2" style={{ color: '#0F8A52' }}>
                Reservation created {createdBookingRef}. This is not a payment.
              </p>
            )}
            <BookingRequestForm
              listingId={deal.listing.id}
              dealClaimId={claim.id}
              ctaLabel={deal.claimMethod === 'BOOKING_CODE' ? 'Submit booking request' : 'Submit reservation request'}
              onCreated={row => setCreatedBookingRef(row.bookingReference)}
            />
          </div>
        )}
      </div>
      <AddDealToJourneySheet
        open={journeyOpen}
        dealId={deal.id}
        dealTitle={deal.title}
        onClose={() => setJourneyOpen(false)}
      />
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
  const [featured, setFeatured] = useState<DealDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId)
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')

  useEffect(() => {
    let cancelled = false
    void fetchPublicDeals(12, undefined, { featured: true, sort: 'featured' })
      .then(rows => {
        if (!cancelled) setFeatured(rows)
      })
      .catch(() => {
        if (!cancelled) setFeatured([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const rows = await fetchPublicDeals(60, undefined, {
            q: query.trim() || undefined,
            city: cityFilter || undefined,
            category: categoryFilter || undefined,
            sort: availability === 'ending-soon' ? 'endingSoon' : availability === 'discount' ? 'discount' : 'newest',
          })
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
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [reloadKey, query, availability, cityFilter, categoryFilter])

  const filtered = useMemo(() => {
    if (availability !== 'ending-soon') return deals
    return deals.filter(deal => hoursLeft(deal.endDate) <= 72)
  }, [deals, availability])

  const grouped = useMemo(() => {
    const canGroup = availability === 'all' && !query.trim() && !cityFilter && !categoryFilter
    if (!canGroup) return null
    const buckets = new Map<string, DealDto[]>()
    for (const cat of CATEGORY_ORDER) buckets.set(cat, [])
    const other: DealDto[] = []
    for (const deal of filtered) {
      const key = deal.category && buckets.has(deal.category) ? deal.category : ''
      if (key) buckets.get(key)!.push(deal)
      else other.push(deal)
    }
    return [
      ...CATEGORY_ORDER.map(cat => ({ cat, rows: buckets.get(cat) ?? [] })).filter(g => g.rows.length > 0),
      ...(other.length ? [{ cat: 'More', rows: other }] : []),
    ]
  }, [filtered, availability, query, cityFilter, categoryFilter])

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
        <div className="flex gap-2 mt-3">
          {(
            [
              { id: 'discover', label: 'Discover' },
              { id: 'mine', label: 'My claims' },
            ] as const
          ).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTab(opt.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: tab === opt.id ? 'var(--primary)' : 'var(--surface)',
                color: tab === opt.id ? '#fff' : 'var(--fg)',
                border: `1px solid ${tab === opt.id ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mine' ? (
        <div className="px-4 sm:px-0">
          <MyClaimsPage onOpenDeal={setSelectedDealId} onOpenBusiness={onOpenBusiness} />
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

      <div className="px-4 sm:px-0 mb-4 flex gap-2 flex-wrap">
        {(
          [
            { id: 'all', label: 'All active' },
            { id: 'discount', label: 'Highest discount' },
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

      <div className="px-4 sm:px-0 mb-3 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCityFilter('')}
          className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          style={{
            background: !cityFilter ? 'var(--primary)' : 'var(--surface)',
            color: !cityFilter ? '#fff' : 'var(--fg)',
            border: `1px solid ${!cityFilter ? 'var(--primary)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          All destinations
        </button>
        {CITY_CHIPS.map(city => (
          <button
            key={city}
            type="button"
            onClick={() => setCityFilter(city)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            style={{
              background: cityFilter === city ? 'var(--primary)' : 'var(--surface)',
              color: cityFilter === city ? '#fff' : 'var(--fg)',
              border: `1px solid ${cityFilter === city ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {city}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-0 mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategoryFilter('')}
          className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          style={{
            background: !categoryFilter ? 'var(--primary)' : 'var(--surface)',
            color: !categoryFilter ? '#fff' : 'var(--fg)',
            border: `1px solid ${!categoryFilter ? 'var(--primary)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          All categories
        </button>
        {CATEGORY_ORDER.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            style={{
              background: categoryFilter === cat ? 'var(--primary)' : 'var(--surface)',
              color: categoryFilter === cat ? '#fff' : 'var(--fg)',
              border: `1px solid ${categoryFilter === cat ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {featured.length > 0 && availability === 'all' && !query.trim() && !cityFilter && !categoryFilter && (
        <div className="px-4 sm:px-0 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            Featured
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {featured.map(deal => (
              <button
                key={deal.id}
                type="button"
                onClick={() => setSelectedDealId(deal.id)}
                className="min-w-[240px] max-w-[260px] text-left rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                {deal.coverUrl ? (
                  <img src={deal.coverUrl} alt="" className="w-full h-28 object-cover" />
                ) : null}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold m-0" style={{ color: 'var(--primary)' }}>{deal.discountSummary}</p>
                    {deal.isPreview ? <PreviewBadge /> : null}
                  </div>
                  {deal.pricing && (
                    <>
                      <p className="text-sm font-bold m-0 mt-1">{formatMoney(deal.pricing.currency, deal.pricing.dealAmount)}</p>
                      <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                        Was {formatMoney(deal.pricing.currency, deal.pricing.originalAmount)}
                      </p>
                    </>
                  )}
                  <p className="text-sm font-semibold m-0 mt-1 truncate" style={{ color: 'var(--fg)' }}>{deal.title}</p>
                  <p className="text-xs m-0 mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>{deal.business.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
        ) : grouped ? (
          <div className="flex flex-col gap-6">
            {grouped.map(group => (
              <section key={group.cat}>
                <p className="text-xs font-bold uppercase tracking-wider m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
                  {group.cat}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.rows.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onOpen={setSelectedDealId}
                      onOpenBusiness={onOpenBusiness}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
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
        </>
      )}
    </div>
  )
}
