import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Camera,
  Car,
  Hash,
  HeartHandshake,
  Home as HomeIcon,
  Lightbulb,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  User,
  Users,
  Utensils,
  Mountain,
} from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { fetchTagTrending, type TagSummary } from '../api/tags'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'
import {
  isDelversPin,
  isFeedPost,
  type DelversFeedItem,
  type DelversFeedPost,
} from '../components/social/delversFeedTypes'
import { communityTagPath } from '../utils/communityTags'
import { communityPostPermalinkPath, postPermalinkPath } from '../utils/postPermalink'
import { HomeStoriesRow } from '../components/HomeStoriesRow'
import { NoFaceInvite } from '../components/NoFaceInvite'
import { HomeCategoryGrid } from '../components/home/HomeCategoryGrid'
import { HomeRegionPicker } from '../components/home/HomeRegionPicker'
import { MiniRating } from '../components/MiniRating'
import { ListSkeleton, EmptyState } from '../components/ui'
import {
  HOME_CHAPTER_IMAGES,
  HOME_DEFAULT_IMAGES,
  HOME_HERO_BG,
  homeCoverSrc,
  type HomeImageCategory,
} from '../data/homeDefaults'
import { journeyListFallback, mergeJourneyFeeds, type ApiJourney } from '../utils/journeyApi'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import type { FeaturedPartnerFields } from '../hooks/useFeaturedPlacement'
import { useExploreRegion } from '../hooks/useExploreRegion'
import { useNoFace } from '../hooks/useNoFace'
import './home-quintos.css'

const moodChips = [
  { label: 'Weekend away', q: 'weekend' },
  { label: 'With family', q: 'family' },
  { label: 'Mountains and peaks', q: 'mountains' },
  { label: 'Beach and coast', q: 'beach' },
  { label: 'Easy on the wallet', q: 'budget' },
  { label: 'First time exploring', q: 'first-time' },
  { label: 'Evenings out', q: 'night' },
]

const categoryShortcuts = [
  { to: '/accommodation', label: 'Stays', Icon: HomeIcon },
  { to: '/partners', label: 'Partners', Icon: HeartHandshake },
  { to: '/food', label: 'Foodies', Icon: Utensils },
  { to: '/activities', label: 'Activities', Icon: Mountain },
  { to: '/guides', label: 'Guides', Icon: Users },
  { to: '/events', label: 'Events', Icon: Ticket },
  { to: '/transport', label: 'Transport', Icon: Car },
  { to: '/shop', label: 'Shops', Icon: ShoppingBag },
  { to: '/coin-toss', label: 'Coin toss', Icon: Sparkles },
  { to: '/journeys', label: 'Journeys', Icon: Map },
  { to: '/community', label: 'Ask locals', Icon: MessageCircle },
  { to: '/delvers', label: 'Delvers', Icon: Camera },
] as const

function formatQuestionTime(iso?: string) {
  if (!iso) return 'Recently'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function clipCommunityBody(text: string, max = 120) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function pickHomeQuestions(rows: FeedPost[], limit = 2): FeedPost[] {
  const answered = rows.filter((p) => Boolean(p.accepted_answer?.body?.trim()))
  const unanswered = rows.filter((p) => !p.accepted_answer?.body?.trim())
  return [...answered, ...unanswered].slice(0, limit)
}

type StayHomeItem = FeaturedPartnerFields & {
  id: number
  title: string
  region: string
  city: string
  cover_image: string | null
  price_per_night: string
  rating_avg: string | number
  rating_count: number
}

type EventHomeItem = FeaturedPartnerFields & {
  id: number
  title: string
  venue: string
  starts_at: string
  cover_image: string | null
  region: string
}

type FoodHomeItem = FeaturedPartnerFields & {
  id: number
  name: string
  cuisine: string
  region: string
  cover_image: string | null
  rating_avg: string | number
  rating_count: number
}

type GuideHomeItem = FeaturedPartnerFields & {
  id: number
  headline: string
  username: string
  photo: string | null
  hourly_rate: string | null
  rating_avg: string | number
  rating_count: number
}

type HomeAnnouncement = {
  active: boolean
  title: string
  body: string
}

type TransportVehicleHomeItem = {
  id: number
  title: string
  region: string
  city?: string | null
  cover_image: string | null
  price_per_day: string
  rating_avg?: string | number | null
  rating_count?: number | null
}

type TransportTripHomeItem = {
  id: number
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
  }
  departs_at: string
  price: string
  available_seats: number
  rating_avg?: string | number | null
  rating_count?: number | null
}

type TransportHomeItem =
  | {
      key: string
      kind: 'vehicle'
      id: number
      title: string
      cover: string | null
      meta: string
      rating?: { avg: string | number; count: number }
    }
  | {
      key: string
      kind: 'bus'
      id: number
      title: string
      cover: string | null
      meta: string
      rating?: { avg: string | number; count: number }
    }

function transportListQuery(region: string) {
  const params = new URLSearchParams()
  if (region.trim()) params.set('region', region.trim())
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function transportTripsQuery() {
  return '?departing_within_days=14'
}

function formatTripDeparture(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date TBA'
  return d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function mergeTransportHomeItems(
  vehicles: TransportVehicleHomeItem[],
  trips: TransportTripHomeItem[],
  limit = 10,
): TransportHomeItem[] {
  const vehicleRows: TransportHomeItem[] = vehicles.slice(0, limit).map((v) => {
    const location = v.city ? `${v.city}, ${v.region}` : v.region
    return {
      key: `vehicle-${v.id}`,
      kind: 'vehicle',
      id: v.id,
      title: v.title,
      cover: v.cover_image,
      meta: `${location} · from N$${v.price_per_day}/day`,
      rating:
        v.rating_avg != null && v.rating_count != null
          ? { avg: v.rating_avg, count: v.rating_count }
          : undefined,
    }
  })

  const tripRows: TransportHomeItem[] = trips.slice(0, limit).map((t) => ({
    key: `bus-${t.id}`,
    kind: 'bus',
    id: t.id,
    title: `${t.route_detail.origin} → ${t.route_detail.destination}`,
    cover: t.route_detail.cover_image ?? null,
    meta: `${formatTripDeparture(t.departs_at)} · ${t.route_detail.operator_name} · N$${t.price}`,
    rating:
      t.rating_avg != null && t.rating_count != null
        ? { avg: t.rating_avg, count: t.rating_count }
        : undefined,
  }))

  const merged: TransportHomeItem[] = []
  let vi = 0
  let ti = 0
  while (merged.length < limit && (vi < vehicleRows.length || ti < tripRows.length)) {
    if (vi < vehicleRows.length) {
      merged.push(vehicleRows[vi])
      vi += 1
    }
    if (merged.length >= limit) break
    if (ti < tripRows.length) {
      merged.push(tripRows[ti])
      ti += 1
    }
  }
  return merged
}

function journeyRouteLabel(stops: { place_name: string }[]) {
  const places = stops.map((s) => s.place_name)
  if (places.length <= 2) return places.join(' · ')
  return `${places[0]} · ${places[places.length - 1]}`
}

function delversCoverSrc(post: DelversFeedPost): string | null {
  const image = mediaUrl(post.image) || post.image
  if (image) return image
  const fromMedia = (post.media ?? []).find((m) => m.kind === 'image' && m.image)
  if (fromMedia?.image) return mediaUrl(fromMedia.image) || fromMedia.image
  return null
}

function delversPreviewText(post: DelversFeedPost): string {
  const text = post.body?.trim()
  if (text) return text.length > 72 ? `${text.slice(0, 69)}…` : text
  if (post.delvers_board) return post.delvers_board
  if (post.region) return `Travel moment from ${post.region}`
  return 'Travel moment'
}

function selectDelversPreview(items: DelversFeedItem[], limit = 4): DelversFeedPost[] {
  return asArray<DelversFeedItem>(items)
    .filter(isFeedPost)
    .filter(isDelversPin)
    .filter((p) => p.id > 0)
    .slice(0, limit)
}

type HomeSectionProps = {
  id: string
  title: string
  sub: string
  seeAllTo: string
  loading: boolean
  count: number
  emptyMessage: string
  children: ReactNode
  className?: string
  /** Chapter already supplies the heading — only show See all. */
  headless?: boolean
}

function HomeSection({
  id,
  title,
  sub,
  seeAllTo,
  loading,
  count,
  emptyMessage,
  children,
  className = '',
  headless = false,
}: HomeSectionProps) {
  return (
    <section className={`home-section ta-rail ${className}`.trim()} aria-labelledby={id}>
      {headless ? (
        <div className="ta-rail__head ta-rail__head--slim">
          <h2 id={id} className="visually-hidden">
            {title}
          </h2>
          <Link to={seeAllTo} className="section-see-all">
            See all
          </Link>
        </div>
      ) : (
        <div className="ta-rail__head">
          <div>
            <h2 id={id} className="ta-rail__title">
              {title}
            </h2>
            <p className="ta-rail__sub">{sub}</p>
          </div>
          <Link to={seeAllTo} className="section-see-all">
            See all
          </Link>
        </div>
      )}
      {loading ? (
        <ListSkeleton count={5} />
      ) : count === 0 ? (
        <EmptyState
          compact
          className="home-section__empty"
          title={emptyMessage}
          sub={`Browse ${title.toLowerCase()} or check back soon.`}
          cta={{ label: `Browse ${title.toLowerCase()}`, to: seeAllTo }}
        />
      ) : (
        children
      )}
    </section>
  )
}

type HomeCardProps = {
  to: string
  imageSrc: string
  imageAlt: string
  title: string
  meta: string
  rating?: { avg: string | number; count: number }
  featured?: boolean
  partnerLabel?: string
  imageFallback?: HomeImageCategory
}

function HomeCard({
  to,
  imageSrc,
  imageAlt,
  title,
  meta,
  rating,
  featured,
  partnerLabel,
  imageFallback = 'stay',
}: HomeCardProps) {
  const fallbackSrc = HOME_DEFAULT_IMAGES[imageFallback]
  const [src, setSrc] = useState(imageSrc)

  useEffect(() => {
    setSrc(imageSrc)
  }, [imageSrc])

  return (
    <Link to={to} className="home-card home-card--post">
      <div className="home-card__frame">
        <img
          className="home-card__img"
          src={src}
          alt={imageAlt}
          loading="lazy"
          onError={() => {
            if (src !== fallbackSrc) setSrc(fallbackSrc)
          }}
        />
        <div className="home-card__veil" aria-hidden />
        {featured ? (
          <span className="home-card__partner">{partnerLabel?.trim() || 'Featured'}</span>
        ) : null}
        <div className="home-card__copy">
          <p className="home-card__title">{title}</p>
          {rating != null ? (
            <div className="home-card__rating">
              <MiniRating rating={rating.avg} count={rating.count} variant="onDark" />
            </div>
          ) : null}
          <p className="home-card__meta">{meta}</p>
        </div>
      </div>
    </Link>
  )
}

type JourneyHomeCardProps = {
  to: string
  imageSrc: string
  imageAlt: string
  title: string
  author: string
  days: number
  route: string
  featured?: boolean
}

function JourneyHomeCard({
  to,
  imageSrc,
  imageAlt,
  title,
  author,
  days,
  route,
  featured,
}: JourneyHomeCardProps) {
  const [src, setSrc] = useState(imageSrc)

  useEffect(() => {
    setSrc(imageSrc)
  }, [imageSrc])

  return (
    <Link to={to} className="home-card home-card--post home-card--journey">
      <div className="home-card__frame">
        <img
          className="home-card__img"
          src={src}
          alt={imageAlt}
          loading="lazy"
          onError={() => {
            if (src !== HOME_DEFAULT_IMAGES.journey) setSrc(HOME_DEFAULT_IMAGES.journey)
          }}
        />
        <div className="home-card__veil" aria-hidden />
        {featured ? <span className="home-card__partner">Featured</span> : null}
        <div className="home-card__copy">
          <p className="home-card__title">{title}</p>
          <div className="home-card__facts">
            <span>
              <User size={13} strokeWidth={2.25} aria-hidden />
              {author}
            </span>
            <span>
              <Calendar size={13} strokeWidth={2.25} aria-hidden />
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="home-card__meta">
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            <span>{route}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}

type HomeActProps = {
  index: string
  title: string
  body: string
  children: ReactNode
}

/** Editorial act intro — typography on the continuous page, not a boxed deck. */
function HomeAct({ index, title, body, children }: HomeActProps) {
  return (
    <section className="home-act">
      <header className="home-act__intro">
        <p className="home-act__index">{index}</p>
        <h2 className="home-act__title">{title}</h2>
        <p className="home-act__body">{body}</p>
      </header>
      <div className="home-act__stage">{children}</div>
    </section>
  )
}

type HomeMomentProps = {
  image: string
  caption: string
  alt: string
  className?: string
}

/** Full-bleed still photograph between acts — flat caption bar, no washes. */
function HomeMoment({ image, caption, alt, className = '' }: HomeMomentProps) {
  return (
    <figure className={`home-moment ${className}`.trim()}>
      <div
        className="home-moment__photo"
        style={{ backgroundImage: `url(${image})` }}
        role="img"
        aria-label={alt}
      />
      <figcaption className="home-moment__caption">{caption}</figcaption>
    </figure>
  )
}

function featuredUrl(path: string, region?: string, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (region?.trim()) params.set('region', region.trim())
  return `${path}?${params.toString()}`
}

export function Home() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { enabled: noFace } = useNoFace()
  const {
    region,
    source: regionSource,
    canPick: canPickRegion,
    regions: exploreRegions,
    setGuestRegion,
    clearGuestRegion,
  } = useExploreRegion()
  const [heroSearch, setHeroSearch] = useState('')
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const { data: stays = [], isLoading: staysLoading } = useFeaturedPlacement<StayHomeItem>(
    `home-stays-${region}`,
    featuredUrl(FEATURED_API.stays, region),
  )
  const { data: events = [], isLoading: eventsLoading } = useFeaturedPlacement<EventHomeItem>(
    `home-events-${region}`,
    featuredUrl(FEATURED_API.events, region),
  )
  const { data: food = [], isLoading: foodLoading } = useFeaturedPlacement<FoodHomeItem>(
    `home-food-${region}`,
    featuredUrl(FEATURED_API.food, region),
  )
  const { data: guides = [], isLoading: guidesLoading } = useFeaturedPlacement<GuideHomeItem>(
    `home-guides-${region}`,
    featuredUrl(FEATURED_API.guides, region),
  )

  const { data: homeVehicles = [], isLoading: loadingHomeVehicles } = useQuery({
    queryKey: ['home-transport-vehicles', region],
    queryFn: async () => {
      try {
        return asArray<TransportVehicleHomeItem>(
          await apiFetch(`/api/transport/vehicles/${transportListQuery(region)}`, { auth: false }),
        )
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const { data: homeTrips = [], isLoading: loadingHomeTrips } = useQuery({
    queryKey: ['home-transport-trips', region],
    queryFn: async () => {
      try {
        return asArray<TransportTripHomeItem>(
          await apiFetch(`/api/transport/bus/trips/${transportTripsQuery()}`, { auth: false }),
        )
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const { data: announcement } = useQuery({
    queryKey: ['home-announcement'],
    queryFn: () => apiFetch<HomeAnnouncement>('/api/accounts/announcement/', { auth: false }),
    staleTime: 60_000,
  })

  const { data: communityQuestions = [], isLoading: loadingCommunityQuestions } = useQuery({
    queryKey: ['home-community-questions', region],
    enabled: !noFace,
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ kind: 'question', limit: '6' })
        if (region) params.set('region', region)
        const rows = await apiFetch<FeedPost[]>(`/api/social/feed/?${params}`, { auth: Boolean(profile) })
        return asArray<FeedPost>(rows)
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const { data: communityTips = [], isLoading: loadingCommunityTips } = useQuery({
    queryKey: ['home-community-tips', region],
    enabled: !noFace,
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ kind: 'tip', limit: '4' })
        if (region) params.set('region', region)
        const rows = await apiFetch<FeedPost[]>(`/api/social/feed/?${params}`, { auth: Boolean(profile) })
        return asArray<FeedPost>(rows)
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const { data: communityTags = [], isLoading: loadingCommunityTags } = useQuery({
    queryKey: ['home-community-tags'],
    enabled: !noFace,
    queryFn: async () => {
      try {
        return asArray<TagSummary>(await fetchTagTrending('community', 8))
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })

  const { data: apiJourneys = [], isLoading: loadingJourneys } = useQuery({
    queryKey: ['journeys', 'home'],
    enabled: !noFace,
    queryFn: () => apiFetch<ApiJourney[]>('/api/journeys/?limit=8', { auth: false }),
  })

  const { data: delversFeed = [], isLoading: loadingDelvers } = useQuery({
    queryKey: ['home-delvers', region],
    enabled: !noFace,
    queryFn: async () => {
      try {
        const qs = region ? `?region=${encodeURIComponent(region)}` : ''
        return asArray<DelversFeedItem>(
          await apiFetch(`/api/social/delvers/${qs}`, { auth: Boolean(profile) }),
        )
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const stayItems = stays.slice(0, 10)
  const eventItems = events.slice(0, 10)
  const foodItems = food.slice(0, 10)
  const guideItems = guides.slice(0, 10)
  const transportItems = useMemo(
    () => mergeTransportHomeItems(homeVehicles, homeTrips, 10),
    [homeVehicles, homeTrips],
  )
  const loadingTransport = loadingHomeVehicles || loadingHomeTrips
  const delversItems = useMemo(() => selectDelversPreview(delversFeed, 4), [delversFeed])
  const homeQuestions = useMemo(() => pickHomeQuestions(communityQuestions, 2), [communityQuestions])
  const homeTips = useMemo(() => communityTips.slice(0, 2), [communityTips])
  const homeTags = useMemo(() => communityTags.slice(0, 8), [communityTags])
  const loadingCommunity = loadingCommunityQuestions || loadingCommunityTips || loadingCommunityTags
  const hasCommunityPreview = homeQuestions.length > 0 || homeTips.length > 0 || homeTags.length > 0
  const journeyItems = useMemo(
    () => mergeJourneyFeeds(apiJourneys, journeyListFallback()).slice(0, 8),
    [apiJourneys],
  )
  const showAnnouncement =
    Boolean(announcement?.active && (announcement.title.trim() || announcement.body.trim())) &&
    !announcementDismissed

  function onHeroSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = heroSearch.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <div className="page-home">
      <section className="ta-hero ta-hero--bleed ta-hero--home" aria-label="Welcome to DELVE">
        <div
          className="ta-hero__bg"
          style={{ backgroundImage: `url(${HOME_HERO_BG})` }}
          role="img"
          aria-label="Scenic travel landscape"
        />
        <div className="ta-hero__scrim" aria-hidden />
        <div className="ta-hero__inner ta-hero__inner--home">
          <p className="ta-hero__brand">DELVE</p>
          <h1 className="ta-hero__title ta-hero__title--home">Experience the world in one place.</h1>
          <p className="ta-hero__sub ta-hero__sub--home">
            Stays, tables, guides, and routes — shaped by people who’ve already been.
          </p>
          <div className="ta-hero__actions ta-hero__actions--home">
            <div className="ta-hero__cta-row">
              <Link to="/search" className="btn btn-primary">
                Start your journey
              </Link>
              <Link to="/accommodation" className="ta-hero__ghost">
                Explore
              </Link>
            </div>
            <form className="ta-hero__searchform" onSubmit={onHeroSearch} role="search" aria-label="Search DELVE">
              <label htmlFor="home-hero-search" className="visually-hidden">
                Where are you going?
              </label>
              <span className="ta-hero__searchform-icon" aria-hidden>
                <Search size={18} strokeWidth={2.25} />
              </span>
              <input
                id="home-hero-search"
                className="ta-hero__searchform-input"
                type="search"
                name="q"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Where are you going?"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="ta-hero__searchform-submit">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="home-content">
        <NoFaceInvite />

        {showAnnouncement && announcement ? (
          <aside className="home-announcement" role="status">
            <div className="home-announcement__copy">
              {announcement.title.trim() ? (
                <strong className="home-announcement__title">{announcement.title}</strong>
              ) : null}
              {announcement.body.trim() ? (
                <p className="home-announcement__body">{announcement.body}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="home-announcement__dismiss"
              onClick={() => setAnnouncementDismissed(true)}
              aria-label="Dismiss announcement"
            >
              ×
            </button>
          </aside>
        ) : null}

        <section className="home-discover" aria-labelledby="home-discover-title">
          <header className="home-discover__head">
            <h2 id="home-discover-title" className="home-discover__title">
              Where will you go next?
            </h2>
            <p className="home-discover__lead">Pick a mood, or open a category.</p>
          </header>

          <HomeRegionPicker
            region={region}
            source={regionSource}
            canPick={canPickRegion}
            regions={exploreRegions}
            onSelect={setGuestRegion}
            onClear={clearGuestRegion}
          />

          <div className="home-discover__moods" role="list" aria-label="Travel moods">
            {moodChips.map((m) => (
              <Link
                key={m.q}
                to={`/search?q=${encodeURIComponent(m.q)}`}
                className="ta-mood-chip"
                role="listitem"
              >
                {m.label}
              </Link>
            ))}
          </div>

          <HomeCategoryGrid
            items={
              noFace
                ? categoryShortcuts.filter(
                    (c) => c.to !== '/delvers' && c.to !== '/journeys' && c.to !== '/community',
                  )
                : categoryShortcuts
            }
          />

          <section className="home-quintos" aria-labelledby="home-quintos-title">
            <div className="home-quintos__glow" aria-hidden />
            <div className="home-quintos__body">
              <p className="home-quintos__kicker">The Quintos</p>
              <h3 id="home-quintos-title" className="home-quintos__title">
                Let the coin decide
              </h3>
              <p className="home-quintos__lead">
                Can&apos;t decide where to go? Flip the coin for a nearby spot — or add one you love.
              </p>
              <div className="home-quintos__actions">
                <Link to="/coin-toss" className="home-quintos__btn home-quintos__btn--primary">
                  Toss a coin
                </Link>
                <Link to="/coin-toss/add" className="home-quintos__btn">
                  Add your gem
                </Link>
              </div>
            </div>
          </section>

          {noFace ? null : (
            <section className="home-discover__stories" aria-labelledby="home-highlights">
              <h3 id="home-highlights" className="home-discover__label">
                Highlights
              </h3>
              <HomeStoriesRow />
            </section>
          )}
        </section>

        <HomeAct
          index="01"
          title="Where the night goes."
          body="Rooms and lodges from hosts — request dates when you’re ready."
        >
          <HomeSection
            id="rail-stays"
            title="Places to stay"
            sub="Browse what’s live right now."
            seeAllTo="/accommodation"
            loading={staysLoading}
            count={stayItems.length}
            emptyMessage="No stays listed yet."
            headless
          >
            <div className="home-rail">
              {stayItems.map((s) => (
                <HomeCard
                  key={s.id}
                  to={`/accommodation/${s.id}`}
                  imageSrc={homeCoverSrc(s.cover_image, 'stay')}
                  imageAlt={`${s.title}, ${s.city ? `${s.city}, ` : ''}${s.region}`}
                  title={s.title}
                  rating={{ avg: s.rating_avg, count: s.rating_count }}
                  meta={`${s.city ? `${s.city}, ` : ''}${s.region} · from $${s.price_per_night}/night`}
                  featured={Boolean(s.is_featured_partner)}
                  partnerLabel={s.partner_label}
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection
            id="rail-transport"
            title="Getting around"
            sub="Vehicle rentals and shared trips leaving soon."
            seeAllTo="/transport"
            loading={loadingTransport}
            count={transportItems.length}
            emptyMessage="No transport listed yet."
            headless
          >
            <div className="home-rail">
              {transportItems.map((item) => (
                <HomeCard
                  key={item.key}
                  to={item.kind === 'vehicle' ? `/transport/vehicle/${item.id}` : `/transport/bus/${item.id}`}
                  imageSrc={homeCoverSrc(item.cover, 'transport')}
                  imageAlt={item.title}
                  title={item.title}
                  rating={item.rating}
                  meta={item.meta}
                  imageFallback="transport"
                />
              ))}
            </div>
          </HomeSection>
        </HomeAct>

        <HomeMoment
          image={HOME_CHAPTER_IMAGES.taste}
          alt="A carefully set table"
          caption="Find the meal you’ll still talk about next year."
        />

        <HomeAct
          index="02"
          title="Tables worth finding."
          body="Spots Foodies actually talk about."
        >
          <HomeSection
            id="rail-food"
            title="Eat and drink"
            sub="Restaurants, cafes, grills, and local food spots."
            seeAllTo="/food"
            loading={foodLoading}
            count={foodItems.length}
            emptyMessage="No food venues listed yet."
            headless
          >
            <div className="home-rail">
              {foodItems.map((f) => (
                <HomeCard
                  key={f.id}
                  to={`/food/${f.id}`}
                  imageSrc={homeCoverSrc(f.cover_image, 'food')}
                  imageAlt={`${f.name} — ${f.cuisine}, ${f.region}`}
                  title={f.name}
                  rating={{ avg: f.rating_avg, count: f.rating_count }}
                  meta={`${f.cuisine} · ${f.region}`}
                  featured={Boolean(f.is_featured_partner)}
                  partnerLabel={f.partner_label}
                />
              ))}
            </div>
          </HomeSection>
        </HomeAct>

        <HomeAct
          index="03"
          title="Talk to people who’ve been."
          body="Guides and locals for the questions that matter on the ground."
        >
          <HomeSection
            id="rail-guides"
            title="Local guides"
            sub="Request experts for culture, food, wildlife, city walks, and hidden places."
            seeAllTo="/guides"
            loading={guidesLoading}
            count={guideItems.length}
            emptyMessage="No guides listed yet."
            headless
          >
            <div className="home-rail">
              {guideItems.map((g) => (
                <HomeCard
                  key={g.id}
                  to={`/guides/${g.id}`}
                  imageSrc={homeCoverSrc(g.photo, 'guide')}
                  imageAlt={`${g.headline} — guide @${g.username}`}
                  title={g.headline}
                  rating={{ avg: g.rating_avg, count: g.rating_count }}
                  meta={`@${g.username}${g.hourly_rate ? ` · from ${g.hourly_rate}/hr` : ''}`}
                  featured={Boolean(g.is_featured_partner)}
                  partnerLabel={g.partner_label}
                />
              ))}
            </div>
          </HomeSection>

          {noFace ? null : (
          <section className="home-section ta-rail home-preview-section" aria-labelledby="home-community">
            <div className="ta-rail__head">
              <div>
                <h2 id="home-community" className="ta-rail__title">
                  Ask locals
                </h2>
                <p className="ta-rail__sub">Questions, tips, and tags from people on the ground.</p>
              </div>
              <div className="home-section__head-actions">
                <Link to="/create/ask" className="home-section-cta">
                  Ask
                </Link>
                <Link to="/create/tip" className="home-section-cta">
                  Tip
                </Link>
                <Link to="/community" className="section-see-all">
                  See all
                </Link>
              </div>
            </div>

            {loadingCommunity ? (
              <ListSkeleton count={3} />
            ) : !hasCommunityPreview ? (
              <div className="home-community-empty">
                <Link to="/create/ask" className="cm-qa-card home-qa-card home-qa-card--empty">
                  <p className="cm-qa-card__question">Be the first to ask about routes, safety, or prices.</p>
                </Link>
                <Link to="/create/tip" className="cm-qa-card home-qa-card home-qa-card--empty">
                  <p className="cm-qa-card__question">Share a tip locals wish travellers knew sooner.</p>
                </Link>
              </div>
            ) : (
              <div className="home-community-preview">
                {homeTags.length > 0 ? (
                  <div className="home-community-tags" role="list" aria-label="Trending community tags">
                    {homeTags.map((tag) => (
                      <Link
                        key={tag.slug}
                        to={communityTagPath(tag.slug)}
                        className="home-community-tags__chip"
                        role="listitem"
                      >
                        <Hash size={12} strokeWidth={2.35} aria-hidden />
                        {tag.slug}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="cm-qa-list home-preview-qa">
                  {homeQuestions.map((q) => {
                    const name = q.author.display_name || q.author.username
                    const answer = q.accepted_answer?.body?.trim()
                    const answerAuthor =
                      q.accepted_answer?.author?.display_name?.trim() ||
                      q.accepted_answer?.author?.username ||
                      'Local'
                    return (
                      <Link key={`q-${q.id}`} to={communityPostPermalinkPath(q.id)} className="cm-qa-card home-qa-card">
                        <div className="cm-qa-card__header">
                          <span className="cm-qa-card__avatar" aria-hidden>
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <div className="cm-qa-card__meta">
                            <span className="cm-qa-card__name">{name}</span>
                            <span className="cm-qa-card__time">{formatQuestionTime(q.created_at)}</span>
                          </div>
                          <span className="home-qa-card__kind">Question</span>
                          <span className="cm-qa-card__region-tag">{q.place_label || q.region || 'Ask locals'}</span>
                        </div>
                        <p className="cm-qa-card__question">{clipCommunityBody(q.body)}</p>
                        {answer ? (
                          <p className="home-qa-card__answer">
                            <strong>{answerAuthor}</strong>
                            {` answered: ${clipCommunityBody(answer, 100)}`}
                          </p>
                        ) : null}
                        <div className="cm-qa-card__footer">
                          <span className="cm-qa-card__answers-btn">
                            <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
                            {answer
                              ? 'Accepted answer'
                              : `${q.comments_count ?? 0} ${(q.comments_count ?? 0) === 1 ? 'answer' : 'answers'}`}
                          </span>
                        </div>
                      </Link>
                    )
                  })}

                  {homeTips.map((tip) => {
                    const name = tip.author.display_name || tip.author.username
                    return (
                      <Link
                        key={`tip-${tip.id}`}
                        to={communityPostPermalinkPath(tip.id)}
                        className="cm-qa-card home-qa-card home-qa-card--tip"
                      >
                        <div className="cm-qa-card__header">
                          <span className="cm-qa-card__avatar" aria-hidden>
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <div className="cm-qa-card__meta">
                            <span className="cm-qa-card__name">{name}</span>
                            <span className="cm-qa-card__time">{formatQuestionTime(tip.created_at)}</span>
                          </div>
                          <span className="home-qa-card__kind home-qa-card__kind--tip">Tip</span>
                          <span className="cm-qa-card__region-tag">{tip.place_label || tip.region || 'Local tip'}</span>
                        </div>
                        <p className="cm-qa-card__question">{clipCommunityBody(tip.body)}</p>
                        <div className="cm-qa-card__footer">
                          <span className="cm-qa-card__answers-btn">
                            <Lightbulb size={14} strokeWidth={2.25} aria-hidden />
                            Helpful tip
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
          )}
        </HomeAct>

        <HomeMoment
          className="home-moment--secondary"
          image={HOME_CHAPTER_IMAGES.share}
          alt="Travellers on the road"
          caption="Bring the trip home as notes the next person can use."
        />

        <HomeAct
          index="04"
          title="Bring the trip back."
          body="Routes and notes from people who went — so the next traveller starts wiser."
        >
          {noFace ? null : (
            <HomeSection
              id="rail-delvers"
              title="Delvers"
              sub="Moments and tips from travellers on the road."
              seeAllTo="/delvers"
              loading={loadingDelvers}
              count={delversItems.length}
              emptyMessage="No Delvers posts yet."
              headless
            >
              <div className="home-rail">
                {delversItems.map((post) => {
                  const name = post.author.display_name || post.author.username
                  const place = post.region?.trim() || post.delvers_board?.trim() || 'Delvers'
                  return (
                    <HomeCard
                      key={post.id}
                      to={postPermalinkPath(post.id)}
                      imageSrc={homeCoverSrc(delversCoverSrc(post), 'delvers')}
                      imageAlt={delversPreviewText(post)}
                      title={delversPreviewText(post)}
                      meta={`${name} · ${place}`}
                      imageFallback="delvers"
                    />
                  )
                })}
              </div>
            </HomeSection>
          )}

          {noFace ? null : (
            <HomeSection
              id="home-journeys"
              title="Real journeys"
              sub="Routes, costs, photos, and tips."
              seeAllTo="/journeys"
              loading={loadingJourneys}
              count={journeyItems.length}
              emptyMessage="No journeys yet."
              className="home-preview-section"
              headless
            >
              <div className="home-rail home-rail--journeys">
                {journeyItems.map((t) => (
                  <JourneyHomeCard
                    key={t.id}
                    to={`/journeys/${t.id}`}
                    imageSrc={homeCoverSrc(t.cover_image, 'journey')}
                    imageAlt={t.title}
                    title={t.title}
                    author={t.author.display_name}
                    days={t.days}
                    route={journeyRouteLabel(t.stops)}
                    featured={Boolean(t.is_featured)}
                  />
                ))}
              </div>
            </HomeSection>
          )}

          <HomeSection
            id="rail-events"
            title="Events"
            sub="What’s on nearby."
            seeAllTo="/events"
            loading={eventsLoading}
            count={eventItems.length}
            emptyMessage="No events listed yet."
          >
            <div className="home-rail">
              {eventItems.map((e) => (
                <HomeCard
                  key={e.id}
                  to={`/events/${e.id}`}
                  imageSrc={homeCoverSrc(e.cover_image, 'event')}
                  imageAlt={`${e.title} — ${e.venue || e.region}`}
                  title={e.title}
                  meta={`${new Date(e.starts_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })} · ${e.venue || e.region}`}
                  featured={Boolean(e.is_featured_partner)}
                  partnerLabel={e.partner_label}
                />
              ))}
            </div>
          </HomeSection>
        </HomeAct>
      </div>
    </div>
  )
}
