import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { GuideListingCard } from '../components/guide/GuideListingCard'
import { EmptyState, ListSkeleton } from '../components/ui'
import { useToggleGuideSave } from '../hooks/useGuideSave'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import { useExploreDestination } from '../hooks/useExploreDestination'
import { useExploreNearPoint } from '../hooks/useExploreNearPoint'
import { useForYou } from '../hooks/useForYou'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import {
  AreaPlacesFilter,
  listingMatchesAreaPoint,
} from '../components/explore/AreaPlacesFilter'
import { CommunityComposeModalShell } from '../components/community/CommunityComposeModalShell'
import { MarketSearchBar } from '../components/explore/MarketSearchBar'
import { partnerBadgeFields } from '../utils/featuredPartner'
import { promotionHref, trackPromotion } from '../utils/promotionTrack'
import { listingHasActiveDeals, type ListingDeal } from '../components/deals'
import '../components/guide/guide-list.css'
import '../components/explore/market-filters-modal.css'

type Guide = {
  id: number
  headline: string
  bio: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
  licensed_guide?: boolean
  response_hours_typical?: number | null
  tour_packages?: unknown[]
  saved_by_me?: boolean
  saves_count?: number
  is_featured_partner?: boolean
  partner_label?: string
  promotion_id?: number
  deals?: ListingDeal[]
}

const NEED_CHIPS: { id: string; label: string }[] = [
  { id: 'licensed', label: 'Licensed' },
  { id: 'packages', label: 'Packages' },
  { id: 'fast', label: 'Fast reply' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'culture', label: 'Culture' },
  { id: 'food', label: 'Food' },
  { id: 'walks', label: 'Walks' },
  { id: 'photography', label: 'Photo' },
  { id: 'family', label: 'Family' },
  { id: 'budget', label: 'Under $500' },
]

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'afrikaans', label: 'Afrikaans' },
  { value: 'german', label: 'German' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
]

const COLLECTIONS: { id: string; label: string; need: string; sub: string }[] = [
  { id: 'top-rated', label: 'Top rated', need: 'rated', sub: 'Guides travellers trust' },
  { id: 'experiences', label: 'Experiences ready', need: 'packages', sub: 'Bookable tour packages' },
  { id: 'fast-reply', label: 'Fast reply', need: 'fast', sub: 'Typical reply ≤ 3 hrs' },
]

type SortId = 'recommended' | 'rating' | 'price_asc' | 'price_desc'

const FALLBACK_GUIDE_PHOTO = '/images/default-journey.jpg'
/** Namibia guide rates often sit ~N$400–500/hr — label chip accordingly. */
const BUDGET_HOURLY_MAX = 500
const FAST_RESPONSE_HOURS = 3
/** Skip duplicate browse rails when inventory is too thin to justify them. */
const DISCOVERY_MIN_GUIDES = 6

function onGuideImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_GUIDE_PHOTO)) img.src = FALLBACK_GUIDE_PHOTO
}

function ratingValue(g: Guide): number {
  const n = g.rating_avg != null && g.rating_avg !== '' ? Number(g.rating_avg) : 0
  return Number.isFinite(n) ? n : 0
}

function hourlyRate(g: Guide): number {
  const n = parseFloat(g.hourly_rate ?? '')
  return Number.isFinite(n) ? n : Infinity
}

function guideSearchText(g: Guide): string {
  return [
    g.headline,
    g.bio,
    g.username,
    g.display_name,
    ...(g.languages || []),
    ...(g.regions || []),
    ...(g.specialities || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function guideMatchesKeywords(g: Guide, keywords: string[]): boolean {
  const hay = guideSearchText(g)
  return keywords.some((k) => hay.includes(k))
}

function applyNeedFilter(guides: Guide[], needId: string): Guide[] {
  switch (needId) {
    case 'licensed':
      return guides.filter((g) => g.licensed_guide === true)
    case 'packages':
      return guides.filter((g) => (g.tour_packages?.length ?? 0) > 0)
    case 'fast':
      return guides.filter((g) => (g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS)
    case 'rated':
      return guides.filter((g) => ratingValue(g) >= 4.5 || (g.rating_count ?? 0) >= 10)
    case 'culture':
      return guides.filter((g) =>
        guideMatchesKeywords(g, ['culture', 'history', 'architecture', 'heritage', 'museum', 'urban']),
      )
    case 'food':
      return guides.filter((g) => guideMatchesKeywords(g, ['food', 'culinary', 'restaurant', 'market']))
    case 'wildlife':
      return guides.filter((g) =>
        guideMatchesKeywords(g, ['wildlife', 'nature', 'safari', 'desert', 'bird', 'animal', 'etosha']),
      )
    case 'walks':
      return guides.filter((g) => guideMatchesKeywords(g, ['walk', 'city', 'urban', 'street', 'route', 'hike']))
    case 'budget':
      return guides.filter((g) => {
        const rate = hourlyRate(g)
        return rate !== Infinity && rate <= BUDGET_HOURLY_MAX
      })
    case 'photography':
      return guides.filter((g) => guideMatchesKeywords(g, ['photography', 'photo', 'camera']))
    case 'family':
      return guides.filter((g) => guideMatchesKeywords(g, ['family', 'kids', 'children']))
    default:
      return guides
  }
}

function sortGuides(list: Guide[], sort: SortId, forYouAffinity = 0): Guide[] {
  const next = [...list]
  next.sort((a, b) => {
    if (sort === 'price_asc') return hourlyRate(a) - hourlyRate(b)
    if (sort === 'price_desc') {
      const ar = hourlyRate(a)
      const br = hourlyRate(b)
      if (ar === Infinity && br === Infinity) return 0
      if (ar === Infinity) return 1
      if (br === Infinity) return -1
      return br - ar
    }
    if (sort === 'rating') {
      const diff = ratingValue(b) - ratingValue(a)
      if (diff !== 0) return diff
      return (b.rating_count ?? 0) - (a.rating_count ?? 0)
    }
    const score = (g: Guide) =>
      (g.licensed_guide ? 2 : 0) +
      ratingValue(g) * 2 +
      Math.min(g.rating_count ?? 0, 40) / 20 +
      (g.is_featured_partner ? 4 : 0) +
      ((g.tour_packages?.length ?? 0) > 0 ? 1.5 : 0) +
      ((g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS ? 1 : 0) +
      forYouAffinity * 2.5 +
      (g.saved_by_me ? 1.5 : 0)
    return score(b) - score(a)
  })
  return next
}

export function GuidesList() {
  const { format } = useDisplayMoney()
  const { boost } = useForYou()
  const guidesAffinity = boost('guides')
  const { country } = useExploreDestination()
  const { point: nearPoint, clear: clearNearPoint } = useExploreNearPoint()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const saveMut = useToggleGuideSave()
  const [need, setNeed] = useState('')
  const [language, setLanguage] = useState('')
  const [sort, setSort] = useState<SortId>('recommended')
  const [search, setSearch] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dealsOnly, setDealsOnly] = useState(false)

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    // City/town only — country picks are filtered client-side (name / regions).
    if (nearPoint?.kind !== 'country' && nearPoint?.label) p.set('region', nearPoint.label)
    if (language) p.set('language', language)
    if (need === 'licensed') p.set('licensed', '1')
    if (sort === 'rating') p.set('ordering', '-rating_avg')
    else if (sort === 'price_asc') p.set('ordering', 'hourly_rate')
    else if (sort === 'price_desc') p.set('ordering', '-hourly_rate')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [search, nearPoint?.kind, nearPoint?.label, language, need, sort])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['guides', qs, profile?.username ?? 'anon', country],
    queryFn: () => apiFetch<Guide[]>(`/api/guides/profiles/${qs}`, { auth: Boolean(profile) }),
  })

  const { data: featuredGuides = [] } = useFeaturedPlacement<Guide>(
    'guides-featured-rail',
    FEATURED_API.guides,
  )

  const guides = useMemo(() => {
    let list = [...(data ?? [])]
    if (need && need !== 'licensed') list = applyNeedFilter(list, need)
    if (nearPoint) {
      list = list.filter((g) =>
        listingMatchesAreaPoint(
          { regions: g.regions, headline: g.headline, city: null, region: null },
          nearPoint,
        ),
      )
    }
    if (dealsOnly) list = list.filter((g) => listingHasActiveDeals(g.deals))
    return sortGuides(list, sort, guidesAffinity)
  }, [data, need, sort, guidesAffinity, nearPoint, dealsOnly])

  const inventoryCount = data?.length ?? 0
  const featured = useMemo(() => featuredGuides.slice(0, 8), [featuredGuides])

  const hasFilters = Boolean(search || nearPoint || language || need || dealsOnly)
  const showDiscovery = !isLoading && !hasFilters && inventoryCount >= DISCOVERY_MIN_GUIDES
  const showFeaturedRail = showDiscovery && featured.length > 0

  const clearAll = () => {
    setNeed('')
    clearNearPoint()
    setLanguage('')
    setSearch('')
    setSort('recommended')
    setDealsOnly(false)
  }

  const sheetFilterCount = [Boolean(language), Boolean(need), dealsOnly].filter(Boolean).length

  const clearSheetFilters = () => {
    setLanguage('')
    setNeed('')
    setDealsOnly(false)
    setFiltersOpen(false)
  }

  const requireAuth = () => {
    if (!profile) {
      navigate('/login')
      return false
    }
    return true
  }

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!requireAuth()) return
    saveMut.mutate(id)
  }

  const shareGuide = async (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const guide = guides.find((g) => g.id === id) ?? (data ?? []).find((g) => g.id === id)
    const url = `${window.location.origin}/guides/${id}`
    const title = guide?.headline || 'DELVE guide'
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setShareMsg('Link copied')
      }
    } catch {
      // cancelled share stays quiet
    }
  }

  const applyCollection = (c: (typeof COLLECTIONS)[number]) => {
    setNeed(c.need)
  }

  const needLabel = NEED_CHIPS.find((n) => n.id === need)?.label
    || COLLECTIONS.find((c) => c.need === need)?.label

  const languageLabel = LANGUAGE_OPTIONS.find((l) => l.value === language)?.label

  return (
    <div className="gl-market">
      {shareMsg ? (
        <p className="jn-detail-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <header className="gl-market__hero">
        <div className="gl-market__hero-head">
          <p className="gl-market__kicker">People who help you figure it out</p>
          <h1 className="gl-market__title">Find a guide</h1>
          <p className="gl-market__lead">
            Local guides aren’t VIPs — they’re helpers for routes, seasons, and how bookings work on
            the ground.
          </p>
        </div>

        <div className="gl-market__find">
          <MarketSearchBar
            id="gd-search"
            classPrefix="gl-market"
            placeholder="Safari, city, food tour…"
            ariaLabel="Search guides or a location"
            keyword={search}
            onKeywordChange={setSearch}
          />

          <div className="gl-market__find-row">
            <button
              type="button"
              className={`gl-market__more${sheetFilterCount > 0 ? ' is-active' : ''}`}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={14} strokeWidth={2.25} aria-hidden />
              Filters{sheetFilterCount > 0 ? ` (${sheetFilterCount})` : ''}
            </button>

            <select
              className="gl-market__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort guides"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        <AreaPlacesFilter variant="panel" showSearch={false} />
      </header>

      {hasFilters ? (
        <div className="gl-market__active" aria-label="Active filters">
          {search ? (
            <button
              type="button"
              className="gl-market__active-pill"
              onClick={() => setSearch('')}
            >
              “{search}” <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {nearPoint ? (
            <button
              type="button"
              className="gl-market__active-pill"
              onClick={() => clearNearPoint()}
            >
              {nearPoint.kind === 'country' ? 'In' : 'Near'} {nearPoint.label}{' '}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {language && languageLabel ? (
            <button type="button" className="gl-market__active-pill" onClick={() => setLanguage('')}>
              {languageLabel} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {need && needLabel ? (
            <button type="button" className="gl-market__active-pill" onClick={() => setNeed('')}>
              {needLabel} <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {dealsOnly ? (
            <button type="button" className="gl-market__active-pill" onClick={() => setDealsOnly(false)}>
              Deals <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="gl-market__clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      {showDiscovery && !showFeaturedRail ? (
        <section className="gl-market__section gl-market__section--tight" aria-label="Collections">
          <div className="gl-market__rail" role="group">
            {COLLECTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="gl-market__chip"
                onClick={() => applyCollection(c)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="gl-market__results-bar">
        <p className="gl-market__count" role="status">
          {isLoading ? (
            'Loading guides…'
          ) : (
            <>
              <strong>{guides.length}</strong> {guides.length === 1 ? 'guide' : 'guides'}
              {hasFilters ? ' match' : ' to explore'}
            </>
          )}
        </p>
      </div>

      {isError ? (
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="We couldn't load guides"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="gl-market__empty"
        />
      ) : null}

      {isLoading && !isError ? <ListSkeleton count={6} /> : null}

      {!isLoading && !isError && guides.length > 0 ? (
        <div className="gl-market__grid">
          {guides.map((g) => (
            <GuideListingCard
              key={g.id}
              guide={g}
              saved={Boolean(g.saved_by_me)}
              saveBusy={saveMut.isPending && saveMut.variables === g.id}
              onToggleSave={toggleSaved}
              onShare={shareGuide}
            />
          ))}
        </div>
      ) : null}

      {showFeaturedRail ? (
        <section className="gl-market__section" aria-labelledby="gl-featured-title">
          <div className="gl-market__section-head">
            <div>
              <h2 id="gl-featured-title" className="gl-market__section-title">
                Guides travellers lean on
              </h2>
              <p className="gl-market__section-sub">Clear replies, local routes, practical help</p>
            </div>
          </div>
          <div className="gl-market__featured-rail">
            {featured.map((g) => {
              const partner = partnerBadgeFields(g, (g.specialities || [])[0] || 'Guide')
              const href = promotionHref(`/guides/${g.id}`, g.promotion_id)
              const region = (g.regions || []).slice(0, 2).join(' · ') || 'Namibia'
              const photo = mediaUrl(g.photo)
              return (
                <Link
                  key={`gl-feat-${g.id}`}
                  to={href}
                  className="gl-market__featured"
                  onClick={() => {
                    if (g.promotion_id) trackPromotion(g.promotion_id, 'click')
                  }}
                >
                  <div className="gl-market__featured-media">
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" onError={onGuideImgError} />
                    ) : (
                      <div className="gl-spot__placeholder" aria-hidden>
                        <Compass size={28} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="gl-market__featured-body">
                    <span className="gl-market__featured-type">
                      {partner.eyebrow ?? partner.partnerLabel ?? 'Guide'}
                    </span>
                    <p className="gl-market__featured-title">{g.headline}</p>
                    <p className="gl-market__featured-meta">
                      <MapPin size={12} strokeWidth={2.25} aria-hidden />
                      {region}
                      {g.hourly_rate ? (
                        <>
                          <span aria-hidden>·</span>
                          {format(g.hourly_rate, { suffix: '/hr', from: true })}
                        </>
                      ) : null}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && guides.length === 0 ? (
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title={hasFilters ? 'No guides match those filters' : 'No guides listed yet'}
          sub={
            hasFilters
              ? need === 'budget'
                ? `No guides under $${BUDGET_HOURLY_MAX}/hr — try another area or clear filters.`
                : 'Try another area or need — clear filters to see more helpers nearby.'
              : 'When guides publish, they’ll show up here to help with routes, seasons, and how to book.'
          }
          cta={hasFilters ? { label: 'Clear filters', onClick: clearAll } : undefined}
          className="gl-market__empty"
        />
      ) : null}

      <CommunityComposeModalShell
        open={filtersOpen}
        title="Filters"
        titleId="gl-filter-modal-title"
        onClose={() => setFiltersOpen(false)}
      >
        <p className="cm-compose-modal__note">Match a language or trip need to find the right helper.</p>

        <div className="cm-compose-modal__composer-block">
          <span>Guide</span>
          <div className="mk-filter-modal__row">
            <label className="mk-filter-modal__field">
              <span>Language</span>
              <select
                className="cm-compose-modal__select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="">Any language</option>
                {LANGUAGE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mk-filter-modal__field">
              <span>Need</span>
              <select
                className="cm-compose-modal__select"
                value={need}
                onChange={(e) => setNeed(e.target.value)}
              >
                <option value="">Any need</option>
                {NEED_CHIPS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="cm-compose-modal__composer-block">
          <span>Deals</span>
          <div className="mk-filter-modal__checks" role="group" aria-label="Deals">
            <label className={`mk-filter-modal__check${dealsOnly ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={dealsOnly}
                onChange={() => setDealsOnly((v) => !v)}
              />
              <span>Only guides with deals / open rates</span>
            </label>
          </div>
        </div>

        <div className="mk-filter-modal__actions">
          <button
            type="button"
            className="cm-compose-modal__submit mk-filter-modal__apply"
            onClick={() => setFiltersOpen(false)}
          >
            Show results
          </button>
          {sheetFilterCount > 0 ? (
            <button type="button" className="mk-filter-modal__clear" onClick={clearSheetFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </CommunityComposeModalShell>
    </div>
  )
}
