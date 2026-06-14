import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Croissant,
  Fish,
  Flame,
  Heart,
  MapPin,
  Moon,
  Sandwich,
  SlidersHorizontal,
  Soup,
  Sparkles,
  Star,
  Truck,
  Users,
  Utensils,
  Wine,
  X,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { MarketplaceBadge, MarketplaceHero, QuickFilterChips, SearchPanel } from '../components/marketplace'
import { MiniRating } from '../components/MiniRating'
import { EmptyState, ListSkeleton } from '../components/ui'
import { foodCoverSrc, foodOpenBadge, pickFeaturedFood } from '../utils/foodDisplay'

type Venue = {
  id: number
  name: string
  description?: string
  cuisine: string
  region: string
  city?: string | null
  owner_username?: string
  owner_display_name?: string | null
  price_level: number
  cover_image: string | null
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  tagline?: string | null
  popular_dish?: string | null
  closes_at?: string | null
}

const CUISINE_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'local', label: 'Local', Icon: Utensils },
  { value: 'grill', label: 'Grill', Icon: Flame },
  { value: 'seafood', label: 'Seafood', Icon: Fish },
  { value: 'cafe', label: 'Café', Icon: Coffee },
  { value: 'bakery', label: 'Bakery', Icon: Croissant },
  { value: 'pizza', label: 'Pizza', Icon: Utensils },
  { value: 'asian', label: 'Asian', Icon: Soup },
  { value: 'fast_food', label: 'Fast food', Icon: Sandwich },
  { value: 'bar', label: 'Bar', Icon: Wine },
  { value: 'other', label: 'Other', Icon: Utensils },
]

const MOOD_FILTERS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'open', label: 'Open now', Icon: Clock },
  { id: 'favourites', label: 'Local favourite', Icon: Star },
  { id: 'cheap', label: 'Cheap eats', Icon: BadgeDollarSign },
  { id: 'date', label: 'Date night', Icon: Moon },
  { id: 'family', label: 'Family friendly', Icon: Users },
  { id: 'takeaway', label: 'Takeaway', Icon: Truck },
]

const SIDEBAR_CUISINES: { label: string; value: string }[] = [
  { label: 'Café', value: 'cafe' },
  { label: 'Grill', value: 'grill' },
  { label: 'Seafood', value: 'seafood' },
  { label: 'Local food', value: 'local' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Vegetarian', value: 'other' },
  { label: 'Fast food', value: 'fast_food' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Ongwediva', 'Lüderitz'] as const

function cuisineMeta(value: string) {
  return CUISINE_OPTIONS.find((c) => c.value === value) ?? { label: value, Icon: Utensils }
}

function priceLabel(level: number): string {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

function onFoodImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

function venueBlurb(v: Venue): string {
  return v.tagline?.trim() || v.description?.trim() || ''
}

function venueTrustBadges(v: Venue): string[] {
  const badges: string[] = []
  if ((v.rating_count ?? 0) >= 80) badges.push('Local favourite')
  if (v.is_open === true) badges.push('Open now')
  if (v.popular_dish) badges.push('Popular dish')
  if ((v.price_level || 2) <= 1) badges.push('Budget friendly')
  if (v.cuisine === 'grill' || v.cuisine === 'local') badges.push('Good for groups')
  return badges.slice(0, 3)
}

function resultsSummary(count: number, hasFilters: boolean, search: string) {
  const noun = count === 1 ? 'food spot' : 'food spots'
  if (!hasFilters && !search) {
    return count > 0 ? `${count} ${noun} available` : 'Explore restaurants, cafés, and local food spots.'
  }
  if (search && hasFilters) return `${count} ${noun} for “${search}” match your filters`
  if (search) return `${count} results for “${search}”`
  if (hasFilters) return `${count} ${noun} match your filters`
  return `${count} ${noun} available`
}

export function FoodList() {
  const { profile } = useAuth()
  const [cuisine, setCuisine] = useState('')
  const [mood, setMood] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
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
    if (cuisine) p.set('cuisine', cuisine)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [cuisine, search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['food', qs],
    queryFn: () => apiFetch<Venue[]>(`/api/food/venues/${qs}`, { auth: false }),
  })

  const venues = useMemo(() => {
    let list = data ?? []
    if (mood === 'open') list = list.filter((v) => v.is_open === true)
    if (mood === 'cheap') list = list.filter((v) => (v.price_level || 1) <= 1)
    if (mood === 'date') list = list.filter((v) => (v.price_level || 1) >= 3 || v.cuisine === 'bar')
    if (mood === 'family') list = list.filter((v) => (v.price_level || 2) <= 2)
    if (mood === 'favourites') list = list.filter((v) => (v.rating_count ?? 0) >= 80)
    if (mood === 'takeaway') list = list.filter((v) => v.cuisine === 'fast_food' || v.cuisine === 'bakery')
    return list
  }, [data, mood])

  const featured = useMemo(() => venues.slice(0, 6), [venues])
  const showRichSections = featured.length >= 4
  const topPick = useMemo(() => pickFeaturedFood(venues), [venues])
  const gridVenues = useMemo(() => {
    if (!topPick) return venues
    return venues.filter((v) => v.id !== topPick.id)
  }, [venues, topPick])
  const activeStory = activeStoryIdx != null ? featured[activeStoryIdx] : null
  const openNowCount = useMemo(() => (data ?? []).filter((v) => v.is_open === true).length, [data])
  const favouritesCount = useMemo(
    () => (data ?? []).filter((v) => (v.rating_count ?? 0) >= 80).length,
    [data],
  )

  const hasFilters = !!(cuisine || search || mood)

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

  const onReactStory = (venueId: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[venueId] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [venueId]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[venueId] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [venueId]: out }
    })
  }

  const onShareStory = async (venueId: number) => {
    const url = `${window.location.origin}/food/${venueId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (venueId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [venueId]: [`${author}: ${body}`, ...(prev[venueId] ?? [])].slice(0, 8),
    }))
    setStoryDraft('')
  }

  const clearAll = () => {
    setCuisine('')
    setMood('')
    setSearchInput('')
    setSearch('')
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

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-cuisines',
        title: 'Popular cuisines',
        type: 'links',
        items: SIDEBAR_CUISINES.map(({ label, value }) => ({
          label,
          active: cuisine === value,
          onClick: () => setCuisine(cuisine === value ? '' : value),
        })),
      },
      {
        id: 'food-pulse',
        title: 'Food pulse',
        type: 'stats',
        items: [
          { value: data?.length ? data.length : '—', label: 'food spots listed' },
          { value: openNowCount ? openNowCount : '—', label: 'open now' },
          { value: favouritesCount ? favouritesCount : '—', label: 'local favourites' },
        ],
      },
      {
        id: 'top-areas',
        title: 'Top areas',
        type: 'links',
        items: TOP_AREAS.map((city) => ({
          label: city,
          onClick: () => {
            setSearchInput(city)
            setSearch(city)
          },
        })),
      },
    ]
  }, [cuisine, data?.length, favouritesCount, openNowCount])

  return (
    <div className="fd-page disc-page mk-page">
      <MarketplaceHero
        title="Eat & drink"
        subtitle="Find restaurants, cafés, grills, bars, and local food spots travellers recommend."
        support="Search by cuisine, venue, city, price, or mood."
        action={
          <button
            type="button"
            className={`fd-filter-toggle acc-page__filter-btn btn btn-ghost${showFilters ? ' acc-page__filter-btn--active' : ''}${hasFilters ? ' acc-page__filter-btn--has-filters' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        }
      />

      <SearchPanel
        id="fd-search"
        label="Search food venues"
        placeholder="Search sushi, coffee, Windhoek, grill, café…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
        className="fd-page__search"
      />

      <QuickFilterChips
        ariaLabel="Food mood filters"
        className="fd-page__quick-chips"
        chips={MOOD_FILTERS.map((m) => ({
          id: m.id,
          label: m.label,
          Icon: m.Icon,
          active: mood === m.id,
        }))}
        onChipClick={(id) => setMood(mood === id ? '' : id)}
      />

      {(cuisine || mood) && (
        <div className="fd-active-filters" role="group" aria-label="Active filters">
          {cuisine ? (
            <button type="button" className="fd-active-filter" onClick={() => setCuisine('')}>
              {cuisineMeta(cuisine).label}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          {mood ? (
            <button type="button" className="fd-active-filter" onClick={() => setMood('')}>
              {MOOD_FILTERS.find((m) => m.id === mood)?.label ?? mood}
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      )}

      {showFilters && (
        <section className="ev-page__discover card fd-filters-panel fd-page__discover" aria-labelledby="fd-discover-title">
          <h2 id="fd-discover-title" className="ev-page__discover-title">
            Match your taste
          </h2>
          <p className="ev-page__discover-sub">Filter by cuisine — combine with mood chips above.</p>
          <div className="ev-page__discover-chips fd-page__cuisine-chips" role="group" aria-label="Cuisines">
            {CUISINE_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={`fd-discover-${value}`}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip fd-page__cuisine-chip${cuisine === value ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setCuisine(cuisine === value ? '' : value)}
                aria-pressed={cuisine === value}
              >
                <Icon className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="fd-page__layout disc-page__layout">
        <main className="fd-page__main disc-page__main">
          {!isLoading && !isError && (
            <p className="fd-page__results-summary" role="status">
              {venues.length > 0
                ? resultsSummary(venues.length, hasFilters, search)
                : hasFilters || search
                  ? resultsSummary(0, hasFilters, search)
                  : resultsSummary(0, false, '')}
            </p>
          )}

          {!isLoading && showRichSections && (
            <section className="ev-page__story-rings" aria-labelledby="fd-story-rings-title">
              <div className="ev-page__stories-head">
                <h2 id="fd-story-rings-title" className="ev-page__stories-title">
                  Meet the kitchens
                </h2>
                <span className="ev-page__stories-sub">Tap to open</span>
              </div>
              <div className="ev-page__story-rings-row">
                {featured.map((f, i) => (
                  <button
                    key={`fd-ring-${f.id}`}
                    type="button"
                    className="ev-story-ring"
                    onClick={() => setActiveStoryIdx(i)}
                    aria-label={`Open story for ${f.name}`}
                  >
                    <span className="ev-story-ring__avatar">
                      <img
                        src={foodCoverSrc(f.cover_image, f.cuisine)}
                        alt=""
                        onError={(e) => onFoodImgError(e, f.cuisine)}
                      />
                    </span>
                    <span className="ev-story-ring__label">{f.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!isLoading && featured.length > 0 && (
            <section className="fd-featured-section" aria-labelledby="fd-featured-title">
              <div className="fd-featured-section__head">
                <div>
                  <h2 id="fd-featured-title" className="fd-featured-section__title">
                    Popular food spots
                  </h2>
                  <p className="fd-featured-section__sub">
                    Restaurants, cafés, and local favourites people are checking out.
                  </p>
                </div>
              </div>
              <div className="fd-featured-rail">
                {featured.map((f) => {
                  const meta = cuisineMeta(f.cuisine)
                  const location = f.city ? `${f.city}, ${f.region}` : f.region
                  const openLabel = foodOpenBadge(f.is_open, f.closes_at)
                  return (
                    <Link key={`fd-featured-${f.id}`} to={`/food/${f.id}`} className="fd-featured-card">
                      <div className="fd-featured-card__media">
                        <img
                          className="fd-featured-card__img"
                          src={foodCoverSrc(f.cover_image, f.cuisine)}
                          alt={f.name}
                          loading="lazy"
                          onError={(e) => onFoodImgError(e, f.cuisine)}
                        />
                        {openLabel ? (
                          <span
                            className={`fd-card__open-badge${f.is_open === false ? ' fd-card__open-badge--closed' : ''}`}
                          >
                            {openLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="fd-featured-card__body">
                        <span className="fd-featured-card__cuisine">
                          <meta.Icon size={13} strokeWidth={2.25} aria-hidden />
                          {meta.label}
                        </span>
                        <p className="fd-featured-card__name">{f.name}</p>
                        <p className="fd-featured-card__meta">
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          {location}
                        </p>
                        <div className="fd-featured-card__foot">
                          {f.rating_avg != null ? (
                            <MiniRating rating={f.rating_avg} count={f.rating_count} />
                          ) : null}
                          <span className="fd-featured-card__price">{priceLabel(f.price_level)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {hasFilters && (
            <div className="fd-page__filter-summary">
              <span className="fd-page__filter-text">
                Filtered
                {cuisine ? ` · ${cuisineMeta(cuisine).label}` : ''}
                {mood ? ` · ${MOOD_FILTERS.find((m) => m.id === mood)?.label}` : ''}
                {search ? ` · “${search}”` : ''}
              </span>
              <button type="button" className="fd-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <EmptyState
              iconElement={<Utensils size={28} strokeWidth={1.75} />}
              title="We couldn't load food spots"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
              className="fd-page__empty"
            />
          )}

          {isLoading && !isError && (
            <div className="fd-page__skeleton-wrap">
              <ListSkeleton count={4} />
            </div>
          )}

          {!isLoading && topPick && (
            <FoodFeaturedCard venue={topPick} saved={savedIds.has(topPick.id)} onToggleSave={toggleSaved} />
          )}

          <div className="fd-page__grid">
            {gridVenues.map((f) => (
              <FoodVenueCard key={f.id} venue={f} saved={savedIds.has(f.id)} onToggleSave={toggleSaved} />
            ))}
          </div>

          {!isLoading && !isError && venues.length === 0 && (
            <EmptyState
              iconElement={<Utensils size={28} strokeWidth={1.75} />}
              title={
                hasFilters || search
                  ? 'No food spots found'
                  : (data?.length ?? 0) > 0
                    ? 'No food spots found'
                    : 'No food spots listed yet'
              }
              sub={
                hasFilters || search
                  ? 'Try changing your cuisine, city, price, or filters.'
                  : 'Restaurants, cafés, bars, and local food places will appear here once added.'
              }
              cta={hasFilters || search ? { label: 'Show all food spots', onClick: clearAll } : undefined}
              className="fd-page__empty"
            />
          )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Food discovery" />
      </div>

      {shareMsg ? (
        <p className="fd-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Food story: ${activeStory.name}`}
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
            <img
              className="ev-story-viewer__img"
              src={foodCoverSrc(activeStory.cover_image, activeStory.cuisine)}
              alt={activeStory.name}
              onError={(e) => onFoodImgError(e, activeStory.cuisine)}
            />
            <div className="ev-story-viewer__meta">
              <div className="ev-story-viewer__progress" aria-hidden>
                <span
                  key={activeStory.id}
                  className="ev-story-viewer__progress-fill"
                  style={{ animationDuration: '15s' }}
                />
              </div>
              <p className="ev-story-viewer__author-row">
                {activeStory.owner_username ? (
                  <Link className="ev-story-viewer__author" to={`/u/${activeStory.owner_username}`}>
                    @{activeStory.owner_display_name?.trim() || activeStory.owner_username}
                  </Link>
                ) : (
                  <span className="ev-story-viewer__author">@food-host</span>
                )}
              </p>
              <p className="ev-story-viewer__title">{activeStory.name}</p>
              <p className="ev-story-viewer__sub">
                {cuisineMeta(activeStory.cuisine).label} · {activeStory.city || activeStory.region}
              </p>
              <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'love' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'love')}
                  aria-label="React with love"
                >
                  <Heart size={16} strokeWidth={2.25} fill={storyReactions[activeStory.id] === 'love' ? 'currentColor' : 'none'} aria-hidden />
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
                  <label className="visually-hidden" htmlFor="fd-story-comment">
                    Write a comment
                  </label>
                  <input
                    id="fd-story-comment"
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
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/food/${activeStory.id}`}>
                View place
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

function FoodFeaturedCard({
  venue: f,
  saved,
  onToggleSave,
}: {
  venue: Venue
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const meta = cuisineMeta(f.cuisine)
  const MetaIcon = meta.Icon
  const location = f.city ? `${f.city}, ${f.region}` : f.region
  const price = priceLabel(f.price_level)
  const openLabel = foodOpenBadge(f.is_open, f.closes_at)

  return (
    <Link to={`/food/${f.id}`} className="fd-featured">
      <div className="fd-featured__media">
        <img
          src={foodCoverSrc(f.cover_image, f.cuisine)}
          alt={f.name}
          loading="lazy"
          onError={(e) => onFoodImgError(e, f.cuisine)}
        />
        <button
          type="button"
          className={`acc-media-card__save fd-featured__save${saved ? ' acc-media-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save venue'}
          onClick={(e) => onToggleSave(f.id, e)}
        >
          <Heart size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
        {openLabel ? (
          <span className={`fd-card__open-badge${f.is_open === false ? ' fd-card__open-badge--closed' : ''}`}>
            {openLabel}
          </span>
        ) : null}
      </div>
      <div className="fd-featured__body">
        <span className="fd-featured__badge">Featured today</span>
        <h2 className="fd-featured__name">{f.name}</h2>
        <p className="fd-featured__meta">
          <MetaIcon size={14} strokeWidth={2.25} aria-hidden />
          {meta.label}
          <span aria-hidden> · </span>
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {location}
          {f.rating_avg != null ? (
            <>
              <span aria-hidden> · </span>
              <MiniRating rating={f.rating_avg} count={f.rating_count} />
            </>
          ) : null}
        </p>
        <p className="fd-featured__desc">
          {venueBlurb(f) || f.popular_dish || 'A local favourite worth booking ahead.'}
        </p>
        <p className="fd-featured__price">
          {price}
          {openLabel ? ` · ${openLabel}` : ''}
        </p>
        <span className="fd-featured__cta">
          View place
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function FoodVenueCard({
  venue: f,
  saved,
  onToggleSave,
}: {
  venue: Venue
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const meta = cuisineMeta(f.cuisine)
  const price = priceLabel(f.price_level)
  const location = f.city ? `${f.city}, ${f.region}` : f.region
  const openLabel = foodOpenBadge(f.is_open, f.closes_at)
  const badges = venueTrustBadges(f)
  const MetaIcon = meta.Icon

  return (
    <Link to={`/food/${f.id}`} className="fd-card">
      <div className="fd-card__img-wrap">
        <img
          className="fd-card__img"
          src={foodCoverSrc(f.cover_image, f.cuisine)}
          alt={f.name}
          loading="lazy"
          onError={(e) => onFoodImgError(e, f.cuisine)}
        />
        <button
          type="button"
          className={`acc-media-card__save fd-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save venue'}
          onClick={(e) => onToggleSave(f.id, e)}
        >
          <Heart size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
        {openLabel ? (
          <span className={`fd-card__open-badge${f.is_open === false ? ' fd-card__open-badge--closed' : ''}`}>
            {openLabel}
          </span>
        ) : null}
      </div>
      <div className="fd-card__body">
        {badges.length > 0 ? (
          <div className="fd-card__badges">
            {badges.map((b) => (
              <MarketplaceBadge key={b}>{b}</MarketplaceBadge>
            ))}
          </div>
        ) : null}
        <div className="fd-card__top-row">
          <span className="fd-card__cuisine">
            <MetaIcon size={13} strokeWidth={2.25} aria-hidden />
            {meta.label}
          </span>
          <span className="fd-card__price" aria-label={`Price level: ${price}`}>
            {price}
          </span>
        </div>
        <h2 className="fd-card__name">{f.name}</h2>
        <p className="fd-card__location">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {location}
        </p>
        {f.rating_avg != null && (
          <div className="fd-card__rating">
            <MiniRating rating={f.rating_avg} count={f.rating_count} />
          </div>
        )}
        {f.popular_dish ? (
          <p className="fd-card__dish">
            Known for: <strong>{f.popular_dish}</strong>
          </p>
        ) : null}
        {venueBlurb(f) ? <p className="fd-card__tagline">{venueBlurb(f)}</p> : null}
        <div className="fd-card__footer">
          <p className="fd-card__rate-row">
            <span className="fd-card__rate-from">From</span>
            <strong className="fd-card__rate-amount">{price}</strong>
            <span className="fd-card__rate-unit"> typical</span>
          </p>
          <span className="fd-card__book">
            View place
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
