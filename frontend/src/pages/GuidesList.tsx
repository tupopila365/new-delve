import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Binoculars,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Heart,
  Landmark,
  Languages,
  MapPin,
  Route,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { MarketplaceBadge, MarketplaceHero, QuickFilterChips, SearchPanel } from '../components/marketplace'
import { MiniRating } from '../components/MiniRating'
import { EmptyState, ListSkeleton } from '../components/ui'

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
}

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'mandarin', label: 'Mandarin' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'italian', label: 'Italian' },
  { value: 'hindi', label: 'Hindi' },
]

const REGION_OPTIONS = [
  'Europe', 'Asia', 'Americas', 'Africa',
  'Oceania', 'Middle East', 'Caribbean', 'Arctic',
]

const QUICK_FILTERS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'licensed', label: 'Licensed guides', Icon: BadgeCheck },
  { id: 'fast', label: 'Fast response', Icon: Clock },
  { id: 'culture', label: 'Culture', Icon: Landmark },
  { id: 'food', label: 'Food tours', Icon: Utensils },
  { id: 'wildlife', label: 'Wildlife', Icon: Binoculars },
  { id: 'walks', label: 'City walks', Icon: Route },
  { id: 'budget', label: 'Budget friendly', Icon: BadgeDollarSign },
  { id: 'photography', label: 'Photography', Icon: Camera },
]

const SIDEBAR_TYPES: { label: string; id: string }[] = [
  { label: 'Culture', id: 'culture' },
  { label: 'Wildlife', id: 'wildlife' },
  { label: 'Food tours', id: 'food' },
  { label: 'City walks', id: 'walks' },
  { label: 'Photography', id: 'photography' },
  { label: 'Adventure', id: 'wildlife' },
  { label: 'History', id: 'culture' },
  { label: 'Family friendly', id: 'family' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Etosha', 'Walvis Bay', 'Sossusvlei'] as const

const FALLBACK_GUIDE_PHOTO = '/images/default-journey.jpg'
const BUDGET_HOURLY_MAX = 300
const FAST_RESPONSE_HOURS = 3

function onGuidePhotoError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_GUIDE_PHOTO)) {
    img.src = FALLBACK_GUIDE_PHOTO
  }
}

function guideDisplayName(g: Guide): string {
  return g.display_name?.trim() || g.username
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

function applyQuickFilter(guides: Guide[], filterId: string): Guide[] {
  switch (filterId) {
    case 'licensed':
      return guides.filter((g) => g.licensed_guide === true)
    case 'fast':
      return guides.filter((g) => (g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS)
    case 'culture':
      return guides.filter((g) =>
        guideMatchesKeywords(g, ['culture', 'history', 'architecture', 'heritage', 'museum', 'urban']),
      )
    case 'food':
      return guides.filter((g) => guideMatchesKeywords(g, ['food', 'culinary', 'restaurant', 'market']))
    case 'wildlife':
      return guides.filter((g) =>
        guideMatchesKeywords(g, ['wildlife', 'nature', 'safari', 'desert', 'bird', 'animal']),
      )
    case 'walks':
      return guides.filter((g) => guideMatchesKeywords(g, ['walk', 'city', 'urban', 'street', 'route']))
    case 'budget':
      return guides.filter((g) => {
        const rate = parseFloat(g.hourly_rate ?? '')
        return !Number.isNaN(rate) && rate <= BUDGET_HOURLY_MAX
      })
    case 'photography':
      return guides.filter((g) => guideMatchesKeywords(g, ['photography', 'photo', 'camera']))
    case 'family':
      return guides.filter((g) => guideMatchesKeywords(g, ['family', 'kids', 'children']))
    default:
      return guides
  }
}

function pickTopGuide(guides: Guide[]): Guide | null {
  if (!guides.length) return null
  return guides.reduce((best, g) => {
    const r = parseFloat(g.rating_avg ?? '0')
    const br = parseFloat(best.rating_avg ?? '0')
    return r > br ? g : best
  })
}

function guideTrustBadges(g: Guide): { label: string; variant?: 'licensed' | 'fast' | 'popular' | 'default' }[] {
  const badges: { label: string; variant?: 'licensed' | 'fast' | 'popular' | 'default' }[] = []
  if (g.licensed_guide) badges.push({ label: 'Licensed guide', variant: 'licensed' })
  const rating = parseFloat(g.rating_avg ?? '0')
  if (g.rating_avg != null && rating >= 4.5) badges.push({ label: 'Highly rated', variant: 'popular' })
  else if (g.rating_count && g.rating_count >= 10) badges.push({ label: 'Traveller rated', variant: 'default' })
  if ((g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS) badges.push({ label: 'Fast response', variant: 'fast' })
  if ((g.tour_packages?.length ?? 0) > 0) badges.push({ label: 'Experiences available', variant: 'default' })
  if (badges.length === 0) badges.push({ label: 'Local expert', variant: 'default' })
  return badges.slice(0, 3)
}

function resultsSummary(count: number, hasFilters: boolean, search: string) {
  const noun = count === 1 ? 'guide' : 'guides'
  if (!hasFilters && !search) {
    return count > 0 ? `${count} ${noun} available` : 'Explore local experts and private experiences.'
  }
  if (search && hasFilters) return `${count} ${noun} for “${search}” match your filters`
  if (search) return `${count} ${noun} for “${search}”`
  if (hasFilters) return `${count} ${noun} match your filters`
  return `${count} ${noun} available`
}

export function GuidesList() {
  const { profile } = useAuth()
  const [language, setLanguage] = useState('')
  const [region, setRegion] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null)
  const [storyReactions, setStoryReactions] = useState<Record<number, 'love' | 'fire' | 'wow' | null>>({})
  const [storyReactionCounts, setStoryReactionCounts] = useState<
    Record<number, { love: number; fire: number; wow: number }>
  >({})
  const [storyComments, setStoryComments] = useState<Record<number, string[]>>({})
  const [storyDraft, setStoryDraft] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (language) p.set('language', language)
    if (region) p.set('region', region)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [language, region, search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['guides', qs],
    queryFn: () => apiFetch<Guide[]>(`/api/guides/profiles/${qs}`, { auth: false }),
  })

  const guides = useMemo(() => {
    let list = data ?? []
    if (quickFilter) list = applyQuickFilter(list, quickFilter)
    return list
  }, [data, quickFilter])

  const featured = useMemo(() => guides.slice(0, 6), [guides])
  const showRichSections = featured.length >= 4
  const topPick = useMemo(() => pickTopGuide(guides), [guides])
  const gridGuides = useMemo(() => {
    if (!topPick) return guides
    return guides.filter((g) => g.id !== topPick.id)
  }, [guides, topPick])
  const activeStory = activeStoryIdx != null ? featured[activeStoryIdx] : null

  const highlyRatedCount = useMemo(
    () => (data ?? []).filter((g) => parseFloat(g.rating_avg ?? '0') >= 4.5).length,
    [data],
  )
  const packagesCount = useMemo(
    () => (data ?? []).filter((g) => (g.tour_packages?.length ?? 0) > 0).length,
    [data],
  )
  const fastResponseCount = useMemo(
    () => (data ?? []).filter((g) => (g.response_hours_typical ?? 99) <= FAST_RESPONSE_HOURS).length,
    [data],
  )

  const hasFilters = !!(language || region || search || quickFilter)

  useEffect(() => {
    if (activeStoryIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveStoryIdx(null)
      if (e.key === 'ArrowRight' && featured.length > 0) {
        setActiveStoryIdx((idx) => (idx == null ? 0 : (idx + 1) % featured.length))
      }
      if (e.key === 'ArrowLeft' && featured.length > 0) {
        setActiveStoryIdx((idx) => (idx == null ? 0 : (idx - 1 + featured.length) % featured.length))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStoryIdx, featured.length])

  useEffect(() => {
    if (activeStoryIdx == null || featured.length === 0) return
    const t = window.setTimeout(() => {
      setActiveStoryIdx((idx) => {
        if (idx == null) return null
        if (idx >= featured.length - 1) return null
        return idx + 1
      })
    }, 15000)
    return () => window.clearTimeout(t)
  }, [activeStoryIdx, featured.length])

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  useEffect(() => {
    if (!activeStory) {
      setStoryDraft('')
      setShowCommentInput(false)
      return
    }
    const id = activeStory.id
    setStoryReactionCounts((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: { love: 0, fire: 0, wow: 0 } }
    })
  }, [activeStory])

  const onReactStory = (id: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[id] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [id]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[id] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [id]: out }
    })
  }

  const onShareStory = async (id: number) => {
    const url = `${window.location.origin}/guides/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (id: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [id]: [`${author}: ${body}`, ...(prev[id] ?? [])].slice(0, 8),
    }))
    setStoryDraft('')
  }

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearAll = () => {
    setLanguage('')
    setRegion('')
    setQuickFilter('')
    setSearchInput('')
    setSearch('')
  }

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-types',
        title: 'Popular guide types',
        type: 'links',
        items: SIDEBAR_TYPES.map(({ label, id }) => ({
          label,
          active: quickFilter === id,
          onClick: () => setQuickFilter(quickFilter === id ? '' : id),
        })),
      },
      {
        id: 'guide-pulse',
        title: 'Guide pulse',
        type: 'stats',
        items: [
          { value: data?.length ? data.length : '—', label: 'guides listed' },
          { value: highlyRatedCount ? highlyRatedCount : '—', label: 'highly rated' },
          { value: packagesCount ? packagesCount : '—', label: 'with experiences' },
          { value: fastResponseCount ? fastResponseCount : '—', label: 'fast response' },
        ],
      },
      {
        id: 'top-areas',
        title: 'Top areas',
        type: 'links',
        items: TOP_AREAS.map((area) => ({
          label: area,
          onClick: () => {
            setSearchInput(area)
            setSearch(area)
          },
        })),
      },
    ]
  }, [data?.length, fastResponseCount, highlyRatedCount, packagesCount, quickFilter])

  return (
    <div className="gd-page disc-page mk-page">
      <MarketplaceHero
        title="Find local guides"
        subtitle="Book trusted local experts for culture, wildlife, food, city walks, photography, and hidden places."
        support="Compare specialities, languages, ratings, regions, and prices."
        action={
          <button
            type="button"
            className={`gd-filter-toggle acc-page__filter-btn btn btn-ghost${showFilters ? ' acc-page__filter-btn--active' : ''}${hasFilters ? ' acc-page__filter-btn--has-filters' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        }
      />

      <SearchPanel
        id="gd-search"
        label="Search guides"
        placeholder="Search culture, wildlife, Windhoek, food tour, photography…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
        className="gd-page__search"
      />

      <QuickFilterChips
        ariaLabel="Guide speciality filters"
        className="gd-page__quick-chips"
        chips={QUICK_FILTERS.map((f) => ({
          id: f.id,
          label: f.label,
          Icon: f.Icon,
          active: quickFilter === f.id,
        }))}
        onChipClick={(id) => setQuickFilter(quickFilter === id ? '' : id)}
      />

      {(language || region || quickFilter) && (
        <div className="gd-active-filters" role="group" aria-label="Active filters">
          {language ? (
            <button type="button" className="gd-active-filter" onClick={() => setLanguage('')}>
              {LANGUAGE_OPTIONS.find((l) => l.value === language)?.label ?? language}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          {region ? (
            <button type="button" className="gd-active-filter" onClick={() => setRegion('')}>
              {region}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          {quickFilter ? (
            <button type="button" className="gd-active-filter" onClick={() => setQuickFilter('')}>
              {QUICK_FILTERS.find((f) => f.id === quickFilter)?.label ?? quickFilter}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      )}

      {showFilters && (
        <section className="ev-page__discover card gd-filters-panel gd-page__discover" aria-labelledby="gd-discover-title">
          <h2 id="gd-discover-title" className="ev-page__discover-title">
            Match with a local expert
          </h2>
          <p className="ev-page__discover-sub">Filter by language first — then narrow by where they guide.</p>
          <div className="ev-page__discover-chips gd-page__lang-chips" role="group" aria-label="Languages">
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <button
                key={`gd-lang-${value}`}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip gd-page__lang-chip${language === value ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setLanguage(language === value ? '' : value)}
                aria-pressed={language === value}
              >
                <Languages className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <div
            className="ev-page__discover-chips gd-page__discover-chips--regions"
            role="group"
            aria-label="Regions"
          >
            {REGION_OPTIONS.map((r) => (
              <button
                key={`gd-reg-${r}`}
                type="button"
                className={`acc-quick-chip gd-page__region-chip${region === r ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setRegion(region === r ? '' : r)}
                aria-pressed={region === r}
              >
                <MapPin className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="gd-page__layout disc-page__layout">
        <main className="gd-page__main disc-page__main">
          {!isLoading && !isError && (
            <p className="gd-page__results-summary" role="status">
              {guides.length > 0
                ? resultsSummary(guides.length, hasFilters, search)
                : hasFilters || search
                  ? resultsSummary(0, hasFilters, search)
                  : resultsSummary(0, false, '')}
            </p>
          )}

          {!isLoading && showRichSections && (
            <section className="ev-page__story-rings" aria-labelledby="gd-story-rings-title">
              <div className="ev-page__stories-head">
                <h2 id="gd-story-rings-title" className="ev-page__stories-title">
                  Meet the guides
                </h2>
                <span className="ev-page__stories-sub">Tap to open</span>
              </div>
              <div className="ev-page__story-rings-row">
                {featured.map((g, i) => {
                  const name = guideDisplayName(g)
                  return (
                    <button
                      key={`gd-ring-${g.id}`}
                      type="button"
                      className="ev-story-ring"
                      onClick={() => setActiveStoryIdx(i)}
                      aria-label={`Open story for ${name}`}
                    >
                      <span className="ev-story-ring__avatar">
                        <GuidePhoto guide={g} className="ev-story-ring__avatar-img" alt="" />
                      </span>
                      <span className="ev-story-ring__label">{name}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {!isLoading && featured.length > 0 && (
            <section className="gd-featured-section" aria-labelledby="gd-featured-title">
              <div className="gd-featured-section__head">
                <div>
                  <h2 id="gd-featured-title" className="gd-featured-section__title">
                    Featured local experts
                  </h2>
                  <p className="gd-featured-section__sub">
                    Guides with strong profiles, useful specialities, and traveller trust signals.
                  </p>
                </div>
              </div>
              <div className="gd-featured-rail">
                {featured.map((g) => (
                  <GuideFeaturedRailCard key={`gd-featured-${g.id}`} guide={g} />
                ))}
              </div>
            </section>
          )}

          {hasFilters && (
            <div className="gd-page__filter-summary">
              <span className="gd-page__filter-text">
                Filtered
                {language ? ` · ${LANGUAGE_OPTIONS.find((l) => l.value === language)?.label ?? language}` : ''}
                {region ? ` · ${region}` : ''}
                {quickFilter ? ` · ${QUICK_FILTERS.find((f) => f.id === quickFilter)?.label}` : ''}
                {search ? ` · “${search}”` : ''}
              </span>
              <button type="button" className="gd-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <EmptyState
              iconElement={<Compass size={28} strokeWidth={1.75} />}
              title="We couldn't load guides"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
              className="gd-page__empty"
            />
          )}

          {isLoading && !isError && (
            <div className="gd-page__skeleton-wrap">
              <ListSkeleton count={3} />
            </div>
          )}

          {!isLoading && topPick && (
            <GuideFeaturedCard guide={topPick} saved={savedIds.has(topPick.id)} onToggleSave={toggleSaved} />
          )}

          <div className="gd-page__grid">
            {gridGuides.map((g) => (
              <GuideCard key={g.id} guide={g} saved={savedIds.has(g.id)} onToggleSave={toggleSaved} />
            ))}
          </div>

          {!isLoading && !isError && guides.length === 0 && (
            <EmptyState
              iconElement={<Compass size={28} strokeWidth={1.75} />}
              title={
                hasFilters || search
                  ? 'No guides found'
                  : (data?.length ?? 0) > 0
                    ? 'No guides found'
                    : 'No guides listed yet'
              }
              sub={
                hasFilters || search
                  ? 'Try changing your region, speciality, language, price, or filters.'
                  : 'Local experts, tour hosts, and private guides will appear here once added.'
              }
              cta={hasFilters || search ? { label: 'Show all guides', onClick: clearAll } : undefined}
              className="gd-page__empty"
            />
          )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Guide discovery" />
      </div>

      {shareMsg ? (
        <p className="gd-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Guide story: ${activeStory.headline}`}
          onClick={() => setActiveStoryIdx(null)}
        >
          <div className="ev-story-viewer__card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ev-story-viewer__close"
              aria-label="Close story"
              onClick={() => setActiveStoryIdx(null)}
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
            <GuidePhoto guide={activeStory} className="ev-story-viewer__img" alt={activeStory.headline} large />
            <div className="ev-story-viewer__meta">
              <div className="ev-story-viewer__progress" aria-hidden>
                <span
                  key={activeStory.id}
                  className="ev-story-viewer__progress-fill"
                  style={{ animationDuration: '15s' }}
                />
              </div>
              <p className="ev-story-viewer__author-row">
                <Link className="ev-story-viewer__author" to={`/u/${encodeURIComponent(activeStory.username)}`}>
                  @{activeStory.display_name?.trim() || activeStory.username}
                </Link>
              </p>
              <p className="ev-story-viewer__title">{activeStory.headline}</p>
              <p className="ev-story-viewer__sub">
                {(activeStory.regions || []).slice(0, 2).join(' · ')}
                {activeStory.hourly_rate ? ` · From $${activeStory.hourly_rate}/hr` : ''}
              </p>
              <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'love' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'love')}
                  aria-label="React with love"
                >
                  <Heart
                    size={16}
                    strokeWidth={2.25}
                    fill={storyReactions[activeStory.id] === 'love' ? 'currentColor' : 'none'}
                    aria-hidden
                  />
                  {storyReactionCounts[activeStory.id]?.love ?? 0}
                </button>
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'fire' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'fire')}
                  aria-label="React with fire"
                >
                  <Flame size={16} strokeWidth={2.25} aria-hidden />
                  {storyReactionCounts[activeStory.id]?.fire ?? 0}
                </button>
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'wow' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'wow')}
                  aria-label="React with surprise"
                >
                  <Sparkles size={16} strokeWidth={2.25} aria-hidden />
                  {storyReactionCounts[activeStory.id]?.wow ?? 0}
                </button>
                <button type="button" className="ev-story-viewer__share" onClick={() => onShareStory(activeStory.id)}>
                  Share
                </button>
                <button
                  type="button"
                  className="ev-story-viewer__share"
                  onClick={() => setShowCommentInput((v) => !v)}
                >
                  {showCommentInput ? 'Close comment' : 'Comment'}
                </button>
              </div>
              {showCommentInput && (
                <div className="ev-story-viewer__comment-box">
                  <label className="visually-hidden" htmlFor="gd-story-comment">
                    Write a comment
                  </label>
                  <input
                    id="gd-story-comment"
                    className="input ev-story-viewer__comment-input"
                    placeholder="Write a comment…"
                    value={storyDraft}
                    onChange={(e) => setStoryDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onCommentStory(activeStory.id)
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-ghost ev-story-viewer__comment-send"
                    onClick={() => onCommentStory(activeStory.id)}
                    disabled={!storyDraft.trim()}
                  >
                    Send
                  </button>
                </div>
              )}
              {shareMsg && <p className="ev-story-viewer__share-msg">{shareMsg}</p>}
              {(storyComments[activeStory.id] ?? []).length > 0 && (
                <div className="ev-story-viewer__comments">
                  {(storyComments[activeStory.id] ?? []).map((c, idx) => (
                    <p key={`${activeStory.id}-c-${idx}`} className="ev-story-viewer__comment-item">
                      {c}
                    </p>
                  ))}
                </div>
              )}
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/guides/${activeStory.id}`}>
                View guide
              </Link>
            </div>
            {featured.length > 1 && (
              <>
                <button
                  type="button"
                  className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                  aria-label="Previous story"
                  onClick={() =>
                    setActiveStoryIdx((idx) =>
                      idx == null ? 0 : (idx - 1 + featured.length) % featured.length,
                    )
                  }
                >
                  <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ev-story-viewer__nav ev-story-viewer__nav--next"
                  aria-label="Next story"
                  onClick={() => setActiveStoryIdx((idx) => (idx == null ? 0 : (idx + 1) % featured.length))}
                >
                  <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GuidePhoto({
  guide,
  className = '',
  alt,
  large = false,
}: {
  guide: Guide
  className?: string
  alt: string
  large?: boolean
}) {
  const resolved = mediaUrl(guide.photo)

  if (!resolved) {
    return (
      <div
        className={`gd-card__photo--placeholder${large ? ' gd-card__photo--placeholder-large' : ''} ${className}`.trim()}
        aria-hidden={alt === ''}
      >
        <Compass size={large ? 40 : 28} strokeWidth={1.75} className="gd-card__photo-placeholder-icon" />
      </div>
    )
  }

  return (
    <img
      className={className}
      src={resolved}
      alt={alt}
      loading="lazy"
      onError={onGuidePhotoError}
    />
  )
}

function GuideFeaturedRailCard({ guide: g }: { guide: Guide }) {
  const name = guideDisplayName(g)
  const regionSnippet = (g.regions || []).slice(0, 2).join(' · ')
  const specialitySnippet = (g.specialities || []).slice(0, 2).join(' · ')
  const badges = guideTrustBadges(g)

  return (
    <Link to={`/guides/${g.id}`} className="gd-featured-card">
      <div className="gd-featured-card__media">
        <GuidePhoto guide={g} className="gd-featured-card__img" alt={name} />
      </div>
      <div className="gd-featured-card__body">
        {badges[0] ? (
          <MarketplaceBadge variant={badges[0].variant}>{badges[0].label}</MarketplaceBadge>
        ) : null}
        <p className="gd-featured-card__name">{g.headline}</p>
        <p className="gd-featured-card__sub">{name}</p>
        {regionSnippet ? (
          <p className="gd-featured-card__meta">
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            {regionSnippet}
          </p>
        ) : null}
        {specialitySnippet ? <p className="gd-featured-card__spec">{specialitySnippet}</p> : null}
        <div className="gd-featured-card__foot">
          {g.rating_avg != null ? <MiniRating rating={g.rating_avg} count={g.rating_count} /> : null}
          {g.hourly_rate ? (
            <span className="gd-featured-card__price">
              From <strong>${g.hourly_rate}</strong>/hr
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function GuideCard({
  guide: g,
  saved,
  onToggleSave,
}: {
  guide: Guide
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const name = guideDisplayName(g)
  const regionSnippet = (g.regions || []).slice(0, 2).join(' · ')
  const langSnippet = (g.languages || []).slice(0, 3)
  const specSnippet = (g.specialities || []).slice(0, 2)
  const badges = guideTrustBadges(g)

  return (
    <Link to={`/guides/${g.id}`} className="gd-card">
      <div className="gd-card__photo-wrap">
        <GuidePhoto guide={g} className="gd-card__photo" alt={name} />
        <button
          type="button"
          className={`gd-card__save${saved ? ' gd-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save guide'}
          onClick={(e) => onToggleSave(g.id, e)}
        >
          <Heart size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>
      <div className="gd-card__body">
        <div className="gd-card__trust-rating-row">
          <div className="gd-card__badges">
            {badges.map((b) => (
              <MarketplaceBadge key={b.label} variant={b.variant}>
                {b.label}
              </MarketplaceBadge>
            ))}
          </div>
          {g.rating_avg != null ? (
            <MiniRating rating={g.rating_avg} count={g.rating_count} />
          ) : null}
        </div>
        <h2 className="gd-card__headline">{g.headline}</h2>
        <p className="gd-card__name">{name}</p>
        {regionSnippet ? (
          <p className="gd-card__regions">
            <MapPin className="gd-card__pin" size={13} strokeWidth={2.25} aria-hidden />
            {regionSnippet}
          </p>
        ) : null}
        {specSnippet.length > 0 ? (
          <div className="gd-card__specialities">
            {specSnippet.map((s) => (
              <span key={s} className="gd-card__spec-chip">
                {s}
              </span>
            ))}
          </div>
        ) : null}
        {langSnippet.length > 0 ? (
          <div className="gd-card__langs">
            <Languages size={12} strokeWidth={2.25} aria-hidden className="gd-card__langs-icon" />
            {langSnippet.map((l) => (
              <span key={l} className="gd-card__lang-chip">
                {l}
              </span>
            ))}
          </div>
        ) : null}
        <div className="gd-card__footer">
          {g.hourly_rate ? (
            <p className="gd-card__rate">
              <span className="gd-card__rate-from">From</span>
              <strong>${g.hourly_rate}</strong>
              <span className="gd-card__rate-unit"> / hr</span>
            </p>
          ) : (
            <span className="gd-card__rate gd-card__rate--muted">Rates on profile</span>
          )}
          <span className="gd-card__book">
            View guide
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

function GuideFeaturedCard({
  guide: g,
  saved,
  onToggleSave,
}: {
  guide: Guide
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const name = guideDisplayName(g)
  const regionSnippet = (g.regions || []).slice(0, 2).join(' · ')
  const langSnippet = (g.languages || []).slice(0, 3).join(' · ')
  const badges = guideTrustBadges(g)

  return (
    <Link to={`/guides/${g.id}`} className="gd-featured">
      <div className="gd-featured__media">
        <GuidePhoto guide={g} className="gd-featured__img" alt={name} />
        <button
          type="button"
          className={`gd-card__save gd-featured__save${saved ? ' gd-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save guide'}
          onClick={(e) => onToggleSave(g.id, e)}
        >
          <Heart size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>
      <div className="gd-featured__body">
        <span className="gd-featured__badge">Top pick</span>
        <div className="gd-featured__badges">
          {badges.slice(0, 2).map((b) => (
            <MarketplaceBadge key={b.label} variant={b.variant}>
              {b.label}
            </MarketplaceBadge>
          ))}
        </div>
        <h2 className="gd-featured__name">{g.headline}</h2>
        <p className="gd-featured__byline">{name}</p>
        {regionSnippet ? (
          <p className="gd-featured__meta">
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {regionSnippet}
          </p>
        ) : null}
        {langSnippet ? (
          <p className="gd-featured__meta">
            <Languages size={13} strokeWidth={2.25} aria-hidden />
            {langSnippet}
          </p>
        ) : null}
        {g.rating_avg != null ? (
          <div className="gd-featured__rating">
            <MiniRating rating={g.rating_avg} count={g.rating_count} />
          </div>
        ) : null}
        {g.hourly_rate ? (
          <p className="gd-featured__rate">
            From <strong>${g.hourly_rate}</strong>/hr
          </p>
        ) : null}
        <span className="gd-featured__cta">
          View guide
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </span>
      </div>
    </Link>
  )
}
