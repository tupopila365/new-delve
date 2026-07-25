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
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Percent,
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
import { formatDisplayMoney } from '../lib/displayMoney'
import { fetchTagTrending, type TagSummary } from '../api/tags'
import { useAuth } from '../auth/AuthContext'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
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
import { DealsRail } from '../components/deals'
import { RatesKnowHowStrip } from '../components/deals/RatesKnowHowStrip'
import { WelcomeRatesTip } from '../components/deals/WelcomeRatesTip'
import { AffordableTripsRail } from '../components/journeys/AffordableTripsRail'
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
import { useExploreDestination } from '../hooks/useExploreDestination'
import { useForYou } from '../hooks/useForYou'
import { useForYouDeep } from '../hooks/useForYouDeep'
import { useMyDelveHome } from '../hooks/useMyDelveHome'
import { forYouVerticalLabel, type ForYouVertical } from '../lib/forYou'
import { listingTasteTags } from '../lib/forYouDeep'
import { ExploreDestinationSwitcher } from '../components/explore/ExploreDestinationSwitcher'
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
  { to: '/accommodation', label: 'Stays', Icon: HomeIcon, vertical: 'stays' as ForYouVertical | null },
  { to: '/partners', label: 'Partners', Icon: HeartHandshake, vertical: null },
  { to: '/deals', label: 'Deals', Icon: Percent, vertical: null },
  { to: '/food', label: 'Foodies', Icon: Utensils, vertical: 'food' as ForYouVertical | null },
  { to: '/activities', label: 'Activities and Leisure', Icon: Mountain, vertical: 'activities' as ForYouVertical | null },
  { to: '/guides', label: 'Guides', Icon: Users, vertical: 'guides' as ForYouVertical | null },
  { to: '/events', label: 'Events', Icon: Ticket, vertical: 'events' as ForYouVertical | null },
  { to: '/transport', label: 'Transport', Icon: Car, vertical: 'transport' as ForYouVertical | null },
  { to: '/shop', label: 'Shops', Icon: ShoppingBag, vertical: 'shop' as ForYouVertical | null },
  { to: '/coin-toss', label: 'Coin toss', Icon: Sparkles, vertical: null },
  { to: '/journeys', label: 'Journeys', Icon: MapIcon, vertical: 'journeys' as ForYouVertical | null },
  { to: '/community', label: 'Ask locals', Icon: MessageCircle, vertical: null },
  { to: '/delvers', label: 'Delvers', Icon: Camera, vertical: null },
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
  property_type?: string | null
  niche_tags?: string[] | null
  amenities?: string[] | null
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
  city?: string | null
  cover_image: string | null
  rating_avg: string | number
  rating_count: number
  niche_tags?: string[] | null
  popular_dish?: string | null
  amenities?: string[] | null
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
  currency: string,
  limit = 10,
): TransportHomeItem[] {
  const vehicleRows: TransportHomeItem[] = vehicles.slice(0, limit).map((v) => {
    const location = v.city ? `${v.city}, ${v.region}` : v.region
    const price = formatDisplayMoney(v.price_per_day, currency, { suffix: '/day', from: true })
    return {
      key: `vehicle-${v.id}`,
      kind: 'vehicle',
      id: v.id,
      title: v.title,
      cover: v.cover_image,
      meta: `${location} · ${price.replace(/^From /, 'from ')}`,
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
    meta: `${formatTripDeparture(t.departs_at)} · ${t.route_detail.operator_name} · ${formatDisplayMoney(t.price, currency)}`,
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
  const { country, countryLabel, label: exploreLabel, exploring } = useExploreDestination()
  const { currency: exploreCurrency, format: formatMoney } = useDisplayMoney()
  const { topVertical, rankVerticals } = useForYou()
  const { itemBoost, subtitle: forYouSubtitle, tasteTags } = useForYouDeep()
  const [heroSearch, setHeroSearch] = useState('')
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  const { data: stays = [], isLoading: staysLoading } = useFeaturedPlacement<StayHomeItem>(
    `home-stays-${exploring ? `${country}-${region}` : 'my-delve'}`,
    featuredUrl(FEATURED_API.stays, exploring ? region : undefined),
  )
  const { data: events = [], isLoading: eventsLoading } = useFeaturedPlacement<EventHomeItem>(
    `home-events-${exploring ? `${country}-${region}` : 'my-delve'}`,
    featuredUrl(FEATURED_API.events, exploring ? region : undefined),
  )
  const { data: food = [], isLoading: foodLoading } = useFeaturedPlacement<FoodHomeItem>(
    `home-food-${exploring ? `${country}-${region}` : 'my-delve'}`,
    featuredUrl(FEATURED_API.food, exploring ? region : undefined),
  )
  const { data: guides = [], isLoading: guidesLoading } = useFeaturedPlacement<GuideHomeItem>(
    `home-guides-${exploring ? `${country}-${region}` : 'my-delve'}`,
    featuredUrl(FEATURED_API.guides, exploring ? region : undefined),
  )

  const { data: homeVehicles = [], isLoading: loadingHomeVehicles } = useQuery({
    queryKey: ['home-transport-vehicles', exploring ? country : 'my-delve', exploring ? region : ''],
    queryFn: async () => {
      try {
        return asArray<TransportVehicleHomeItem>(
          await apiFetch(
            `/api/transport/vehicles/${transportListQuery(exploring ? region : '')}`,
            { auth: false },
          ),
        )
      } catch {
        return []
      }
    },
    staleTime: 45_000,
  })

  const { data: homeTrips = [], isLoading: loadingHomeTrips } = useQuery({
    queryKey: ['home-transport-trips', exploring ? country : 'my-delve'],
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
    queryFn: () => apiFetch<ApiJourney[]>('/api/journeys/?limit=16', { auth: false }),
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

  const stayItems = useMemo(() => {
    const rows = stays.slice(0, 10)
    if (exploring) return rows
    return [...rows].sort(
      (a, b) =>
        itemBoost('stays', b.id, listingTasteTags(b)) - itemBoost('stays', a.id, listingTasteTags(a)),
    )
  }, [stays, exploring, itemBoost])

  const foodItems = useMemo(() => {
    const rows = food.slice(0, 10)
    if (exploring) return rows
    return [...rows].sort(
      (a, b) =>
        itemBoost('food', b.id, listingTasteTags(b)) - itemBoost('food', a.id, listingTasteTags(a)),
    )
  }, [food, exploring, itemBoost])

  const eventItems = events.slice(0, 10)
  const guideItems = guides.slice(0, 10)
  const transportItems = useMemo(
    () => mergeTransportHomeItems(homeVehicles, homeTrips, exploreCurrency, 10),
    [homeVehicles, homeTrips, exploreCurrency],
  )
  const loadingTransport = loadingHomeVehicles || loadingHomeTrips

  const {
    continueBrowsing,
    savedCards,
    likedCards,
    loadingContinue,
    loadingSaved,
  } = useMyDelveHome({
    enabled: !exploring,
    loggedIn: Boolean(profile),
    stayPool: stayItems,
    foodPool: foodItems,
    guidePool: guideItems,
  })

  const rankedCategories = useMemo(() => {
    const order = rankVerticals([
      'stays',
      'food',
      'guides',
      'events',
      'transport',
      'shop',
      'activities',
      'journeys',
    ])
    const rank = new Map(order.map((v, i) => [v, i]))
    return [...categoryShortcuts].sort((a, b) => {
      const ar = a.vertical ? (rank.get(a.vertical) ?? 99) : 99
      const br = b.vertical ? (rank.get(b.vertical) ?? 99) : 99
      if (ar !== br) return ar - br
      return 0
    })
  }, [rankVerticals])

  const forYouRail = useMemo(() => {
    if (!topVertical) return null

    const byDeep = <T extends { id: number }>(
      vertical: ForYouVertical,
      rows: T[],
      tagsFor: (row: T) => string[],
    ) =>
      [...rows].sort(
        (a, b) =>
          itemBoost(vertical, b.id, tagsFor(b)) - itemBoost(vertical, a.id, tagsFor(a)),
      )

    if (topVertical === 'food' && foodItems.length > 0) {
      const ranked = byDeep('food', foodItems, (f) => listingTasteTags(f))
      return {
        vertical: topVertical,
        title: 'Eat and drink',
        seeAllTo: '/food',
        loading: foodLoading,
        cards: ranked.map((f) => ({
          key: String(f.id),
          to: `/food/${f.id}`,
          imageSrc: homeCoverSrc(f.cover_image, 'food'),
          imageAlt: `${f.name} — ${f.cuisine}, ${f.region}`,
          title: f.name,
          rating: { avg: f.rating_avg, count: f.rating_count },
          meta: `${f.cuisine} · ${f.region}`,
          featured: Boolean(f.is_featured_partner),
          partnerLabel: f.partner_label,
        })),
      }
    }
    if (topVertical === 'stays' && stayItems.length > 0) {
      const ranked = byDeep('stays', stayItems, (s) => listingTasteTags(s))
      return {
        vertical: topVertical,
        title: 'Places to stay',
        seeAllTo: '/accommodation',
        loading: staysLoading,
        cards: ranked.map((s) => ({
          key: String(s.id),
          to: `/accommodation/${s.id}`,
          imageSrc: homeCoverSrc(s.cover_image, 'stay'),
          imageAlt: `${s.title}, ${s.city ? `${s.city}, ` : ''}${s.region}`,
          title: s.title,
          rating: { avg: s.rating_avg, count: s.rating_count },
          meta: `${s.city ? `${s.city}, ` : ''}${s.region} · ${formatMoney(s.price_per_night, { suffix: '/night', from: true }).replace(/^From /, 'from ')}`,
          featured: Boolean(s.is_featured_partner),
          partnerLabel: s.partner_label,
        })),
      }
    }
    if (topVertical === 'guides' && guideItems.length > 0) {
      return {
        vertical: topVertical,
        title: 'Local guides',
        seeAllTo: '/guides',
        loading: guidesLoading,
        cards: guideItems.map((g) => ({
          key: String(g.id),
          to: `/guides/${g.id}`,
          imageSrc: homeCoverSrc(g.photo, 'guide'),
          imageAlt: `${g.headline} — guide @${g.username}`,
          title: g.headline,
          rating: { avg: g.rating_avg, count: g.rating_count },
          meta: `@${g.username}${g.hourly_rate ? ` · from ${g.hourly_rate}/hr` : ''}`,
          featured: Boolean(g.is_featured_partner),
          partnerLabel: g.partner_label,
        })),
      }
    }
    if (topVertical === 'events' && eventItems.length > 0) {
      return {
        vertical: topVertical,
        title: 'Events',
        seeAllTo: '/events',
        loading: eventsLoading,
        cards: eventItems.map((e) => ({
          key: String(e.id),
          to: `/events/${e.id}`,
          imageSrc: homeCoverSrc(e.cover_image, 'event'),
          imageAlt: `${e.title} — ${e.venue || e.region}`,
          title: e.title,
          rating: undefined as { avg: string | number; count: number } | undefined,
          meta: e.venue || e.region,
          featured: Boolean(e.is_featured_partner),
          partnerLabel: e.partner_label,
        })),
      }
    }
    if (topVertical === 'transport' && transportItems.length > 0) {
      return {
        vertical: topVertical,
        title: 'Getting around',
        seeAllTo: '/transport',
        loading: loadingTransport,
        cards: transportItems.map((item) => ({
          key: item.key,
          to: item.kind === 'vehicle' ? `/transport/vehicle/${item.id}` : `/transport/bus/${item.id}`,
          imageSrc: homeCoverSrc(item.cover, 'transport'),
          imageAlt: item.title,
          title: item.title,
          rating: item.rating,
          meta: item.meta,
          featured: false,
          partnerLabel: undefined as string | undefined,
        })),
      }
    }
    return null
  }, [
    topVertical,
    foodItems,
    stayItems,
    guideItems,
    eventItems,
    transportItems,
    foodLoading,
    staysLoading,
    guidesLoading,
    eventsLoading,
    loadingTransport,
    exploreCurrency,
    itemBoost,
    formatMoney,
  ])
  const delversItems = useMemo(() => selectDelversPreview(delversFeed, 4), [delversFeed])
  const homeQuestions = useMemo(() => pickHomeQuestions(communityQuestions, 2), [communityQuestions])
  const homeTips = useMemo(() => communityTips.slice(0, 2), [communityTips])
  const homeTags = useMemo(() => communityTags.slice(0, 8), [communityTags])
  const loadingCommunity = loadingCommunityQuestions || loadingCommunityTips || loadingCommunityTags
  const hasCommunityPreview = homeQuestions.length > 0 || homeTips.length > 0 || homeTags.length > 0
  const journeyItems = useMemo(
    () => mergeJourneyFeeds(apiJourneys, journeyListFallback()).slice(0, 12),
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
      <WelcomeRatesTip className="home-welcome-rates" />
      <section className="ta-hero ta-hero--bleed ta-hero--home" aria-label="Welcome to DELVE">
        <div
          className="ta-hero__bg"
          style={{ backgroundImage: `url(${HOME_HERO_BG})` }}
          role="img"
          aria-label="Scenic travel landscape"
        />
        <div className="ta-hero__scrim" aria-hidden />
        <div className="ta-hero__inner ta-hero__inner--home">
          <h1 className="ta-hero__title ta-hero__title--home">Experience the world in one place.</h1>
          <p className="ta-hero__sub ta-hero__sub--home">
            {exploring
              ? `You’re exploring ${exploreLabel} — stays, tables, guides, and routes for this trip.`
              : 'Stays, tables, guides, and routes — shaped by what you’ve liked, saved, and watched.'}
          </p>
          <div className="ta-hero__actions ta-hero__actions--home">
            <div className="ta-hero__cta-row">
              <Link to={exploring ? '/search' : '/explore'} className="btn btn-primary">
                {exploring ? 'Search this place' : 'Start exploring'}
              </Link>
              <Link to={exploring ? '/accommodation' : '/food'} className="ta-hero__ghost">
                {exploring ? 'Browse stays' : 'For you'}
              </Link>
            </div>
            <form className="ta-hero__searchform" onSubmit={onHeroSearch} role="search" aria-label="Search DELVE">
              <label htmlFor="home-hero-search" className="visually-hidden">
                {exploring ? 'Search this destination' : 'Search your Delve'}
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
                placeholder={exploring ? `Search in ${exploreLabel}…` : 'Search what you love…'}
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
              {exploring ? 'Where will you go next?' : 'For you'}
            </h2>
            <p className="home-discover__lead">
              {exploring ? (
                <>
                  Exploring <strong>{exploreLabel}</strong> — pick a mood, or open a category.
                </>
              ) : (
                <>
                  You’re in <strong>My Delve</strong> — continue browsing, saved picks, and rails
                  shaped by your taste. Or{' '}
                  <Link to="/explore">start exploring a destination</Link>.
                </>
              )}
            </p>
            <div className="home-discover__explore">
              <ExploreDestinationSwitcher />
            </div>
          </header>

          {exploring ? (
            <HomeRegionPicker
              region={region}
              source={regionSource}
              canPick={canPickRegion}
              regions={exploreRegions}
              countryLabel={countryLabel}
              onSelect={setGuestRegion}
              onClear={clearGuestRegion}
            />
          ) : null}

          {!exploring && tasteTags.length > 0 ? (
            <div className="home-discover__moods" role="list" aria-label="Your tastes">
              {tasteTags.map((t) => (
                <Link
                  key={`${t.vertical}-${t.tag}`}
                  to={`/search?q=${encodeURIComponent(t.tag)}`}
                  className="ta-mood-chip"
                  role="listitem"
                >
                  Because you like {t.tag}
                </Link>
              ))}
            </div>
          ) : null}

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
              (noFace
                ? rankedCategories.filter(
                    (c) => c.to !== '/delvers' && c.to !== '/journeys' && c.to !== '/community',
                  )
                : rankedCategories
              ).map(({ to, label, Icon }) => ({ to, label, Icon }))
            }
          />

          {!exploring && (continueBrowsing.length > 0 || loadingContinue) ? (
            <HomeSection
              id="rail-continue"
              title="Continue browsing"
              sub="Pick up where you left off this session."
              seeAllTo="/search"
              loading={loadingContinue && continueBrowsing.length === 0}
              count={continueBrowsing.length}
              emptyMessage="Browse a stay or food spot to resume here."
            >
              <div className="home-rail">
                {continueBrowsing.map((card) => (
                  <HomeCard
                    key={card.key}
                    to={card.to}
                    imageSrc={card.imageSrc}
                    imageAlt={card.imageAlt}
                    title={card.title}
                    rating={card.rating}
                    meta={card.meta}
                  />
                ))}
              </div>
            </HomeSection>
          ) : null}

          {!exploring && profile && (savedCards.length > 0 || loadingSaved) ? (
            <HomeSection
              id="rail-saved"
              title="Saved for later"
              sub="Stays, tables, and guides you’ve bookmarked."
              seeAllTo="/dashboard"
              loading={loadingSaved && savedCards.length === 0}
              count={savedCards.length}
              emptyMessage="Save a listing to see it here."
            >
              <div className="home-rail">
                {savedCards.map((card) => (
                  <HomeCard
                    key={card.key}
                    to={card.to}
                    imageSrc={card.imageSrc}
                    imageAlt={card.imageAlt}
                    title={card.title}
                    rating={card.rating}
                    meta={card.meta}
                  />
                ))}
              </div>
            </HomeSection>
          ) : null}

          {!exploring && likedCards.length > 0 ? (
            <HomeSection
              id="rail-liked"
              title="You’ve liked"
              sub="Strong signals from hearts and deep engagement."
              seeAllTo="/search"
              loading={false}
              count={likedCards.length}
              emptyMessage="Like a listing to build this rail."
            >
              <div className="home-rail">
                {likedCards.map((card) => (
                  <HomeCard
                    key={card.key}
                    to={card.to}
                    imageSrc={card.imageSrc}
                    imageAlt={card.imageAlt}
                    title={card.title}
                    rating={card.rating}
                    meta={card.meta}
                  />
                ))}
              </div>
            </HomeSection>
          ) : null}

          {forYouRail ? (
            <HomeSection
              id="rail-for-you"
              title={`For you · ${forYouVerticalLabel(forYouRail.vertical)}`}
              sub={forYouSubtitle}
              seeAllTo={forYouRail.seeAllTo}
              loading={forYouRail.loading}
              count={forYouRail.cards.length}
              emptyMessage={
                exploring
                  ? 'Keep exploring — we’ll personalize this rail.'
                  : 'Like, save, or watch listings — we’ll personalize this rail.'
              }
            >
              <div className="home-rail">
                {forYouRail.cards.map((card) => (
                  <HomeCard
                    key={card.key}
                    to={card.to}
                    imageSrc={card.imageSrc}
                    imageAlt={card.imageAlt}
                    title={card.title}
                    rating={card.rating}
                    meta={card.meta}
                    featured={card.featured}
                    partnerLabel={card.partnerLabel}
                  />
                ))}
              </div>
            </HomeSection>
          ) : null}

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
          <DealsRail
            region={exploring ? region || undefined : undefined}
            className="home-deals-rail"
          />
          <RatesKnowHowStrip compact className="home-rates-knowhow" />
          {noFace ? null : <AffordableTripsRail trips={journeyItems} className="home-affordable-trips" />}
          <HomeSection
            id="rail-stays"
            title="Places to stay"
            sub={
              exploring
                ? `What’s live while exploring ${exploreLabel}.`
                : 'Ranked from what you’ve liked and saved.'
            }
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
                  meta={`${s.city ? `${s.city}, ` : ''}${s.region} · ${formatMoney(s.price_per_night, { suffix: '/night', from: true }).replace(/^From /, 'from ')}`}
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
            sub={
              exploring
                ? `Food in ${exploreLabel} — cafés, grills, and local spots.`
                : 'Ranked from your tastes and what you’ve saved.'
            }
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
              sub="Full trip costs — not just one listing price."
              seeAllTo="/journeys?mode=budget"
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
