import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Camera,
  Car,
  Home as HomeIcon,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Search,
  Ticket,
  User,
  Users,
  Utensils,
} from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'
import { communityPostPermalinkPath } from '../utils/postPermalink'
import { HomeStoriesRow } from '../components/HomeStoriesRow'
import { HomeCategoryGrid } from '../components/home/HomeCategoryGrid'
import { MiniRating } from '../components/MiniRating'
import { ListSkeleton, EmptyState } from '../components/ui'
import { HOME_HERO_BG, homeCoverSrc } from '../data/homeDefaults'
import { journeyListFallback, mergeJourneyFeeds, type ApiJourney } from '../utils/journeyApi'
import { FEATURED_API, useFeaturedPlacement } from '../hooks/useFeaturedPlacement'
import type { FeaturedPartnerFields } from '../hooks/useFeaturedPlacement'

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
  { to: '/food', label: 'Food & drink', Icon: Utensils },
  { to: '/guides', label: 'Guides', Icon: Users },
  { to: '/events', label: 'Events', Icon: Ticket },
  { to: '/transport', label: 'Transport', Icon: Car },
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

function journeyRouteLabel(stops: { place_name: string }[]) {
  const places = stops.map((s) => s.place_name)
  if (places.length <= 2) return places.join(' · ')
  return `${places[0]} · ${places[places.length - 1]}`
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
}: HomeSectionProps) {
  return (
    <section className={`home-section ta-rail ${className}`.trim()} aria-labelledby={id}>
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
}

function HomeCard({ to, imageSrc, imageAlt, title, meta, rating, featured, partnerLabel }: HomeCardProps) {
  return (
    <Link to={to} className="home-card mini-card ta-mini-card ta-mini-card--calm">
      <div className="home-card__media ta-mini-card__media">
        <img className="home-card__img ta-mini-card__img" src={imageSrc} alt={imageAlt} loading="lazy" />
        {featured ? (
          <span className="home-card__partner">{partnerLabel?.trim() || 'Featured'}</span>
        ) : null}
      </div>
      <div className="mini-card__body home-card__body">
        <p className="mini-card__title home-card__title">{title}</p>
        {rating != null ? <MiniRating rating={rating.avg} count={rating.count} /> : null}
        <p className="mini-card__meta home-card__meta">{meta}</p>
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
  return (
    <Link to={to} className="home-card home-card--journey mini-card ta-mini-card ta-mini-card--calm journey-card">
      <div className="home-card__media ta-mini-card__media">
        <img className="home-card__img ta-mini-card__img" src={imageSrc} alt={imageAlt} loading="lazy" />
        {featured ? <span className="home-card__partner">Featured</span> : null}
      </div>
      <div className="journey-card__body mini-card__body home-card__body">
        <p className="journey-card__title mini-card__title home-card__title">{title}</p>
        <div className="journey-card__meta-row">
          <span className="journey-card__meta-item">
            <User size={13} strokeWidth={2.25} aria-hidden />
            {author}
          </span>
          <span className="journey-card__meta-item">
            <Calendar size={13} strokeWidth={2.25} aria-hidden />
            {days} {days === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="journey-card__route">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          <span>{route}</span>
        </p>
      </div>
    </Link>
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
  const [heroSearch, setHeroSearch] = useState('')
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)
  const region = profile?.region?.trim() ?? ''

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

  const { data: announcement } = useQuery({
    queryKey: ['home-announcement'],
    queryFn: () => apiFetch<HomeAnnouncement>('/api/accounts/announcement/', { auth: false }),
    staleTime: 60_000,
  })

  const { data: communityQuestions = [] } = useQuery({
    queryKey: ['home-community-questions', profile?.region ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({ kind: 'question', limit: '4' })
      if (profile?.region?.trim()) params.set('region', profile.region.trim())
      const rows = await apiFetch<FeedPost[]>(`/api/social/feed/?${params}`, { auth: Boolean(profile) })
      return asArray<FeedPost>(rows)
    },
  })

  const { data: apiJourneys = [], isLoading: loadingJourneys } = useQuery({
    queryKey: ['journeys', 'home', 'featured-first'],
    queryFn: () => apiFetch<ApiJourney[]>('/api/journeys/?featured_first=1&limit=8', { auth: false }),
  })

  const stayItems = stays.slice(0, 10)
  const eventItems = events.slice(0, 10)
  const foodItems = food.slice(0, 10)
  const guideItems = guides.slice(0, 10)
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
      <section className="ta-hero ta-hero--bleed ta-hero--home" aria-label="Discover DELVE">
        <div className="ta-hero__bg" style={{ backgroundImage: `url(${HOME_HERO_BG})` }} role="img" aria-label="Scenic travel landscape" />
        <div className="ta-hero__scrim" aria-hidden />
        <div className="ta-hero__grain" aria-hidden />
        <div className="ta-hero__inner ta-hero__inner--home">
          <p className="ta-hero__eyebrow ta-hero__eyebrow--home">Travel. Request. Share. Ask locals.</p>
          <h1 className="ta-hero__title ta-hero__title--home">Discover, plan, request, and share real travel experiences.</h1>
          <p className="ta-hero__sub ta-hero__sub--home">
            Find stays, food, guides, events, transport, routes, and local tips in one trusted travel-social marketplace.
          </p>
          <div className="ta-hero__actions ta-hero__actions--home">
            <form className="ta-hero__searchform" onSubmit={onHeroSearch} role="search" aria-label="Search DELVE">
              <label htmlFor="home-hero-search" className="visually-hidden">
                Search places, stays, events, food, guides, and transport
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
                placeholder="Search places, stays, events, food, guides, transport..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="ta-hero__searchform-submit">
                Search
              </button>
            </form>
            <div className="ta-hero__cta-row">
              <Link to="/search" className="btn btn-primary">
                Start exploring
              </Link>
              <Link to="/create/ask" className="ta-hero__ghost">
                Ask locals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="home-content">
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

        <section className="home-section ta-rail home-preview-section" aria-labelledby="home-highlights">
          <div className="ta-rail__head">
            <div>
              <h2 id="home-highlights" className="ta-rail__title">
                Highlights
              </h2>
              <p className="ta-rail__sub">Quick travel paths across stays, transport, events, food, guides, and Delvers.</p>
            </div>
          </div>
          <HomeStoriesRow />
        </section>

        <HomeCategoryGrid items={categoryShortcuts} />

        <section className="home-mood-section" aria-labelledby="home-mood-heading">
          <div className="home-mood-section__head">
            <h2 id="home-mood-heading" className="home-mood-section__title">
              Explore by mood
            </h2>
          </div>
          <div className="ta-mood-scroll home-mood-scroll" role="list" aria-label="Explore by mood">
            {moodChips.map((m) => (
              <Link key={m.q} to={`/search?q=${encodeURIComponent(m.q)}`} className="ta-mood-chip" role="listitem">
                {m.label}
              </Link>
            ))}
          </div>
        </section>

        <HomeSection
          id="rail-stays"
          title="Places to stay"
          sub="Guesthouses, lodges, apartments, and unique stays for every kind of trip."
          seeAllTo="/accommodation"
          loading={staysLoading}
          count={stayItems.length}
          emptyMessage="No stays listed yet."
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
          id="rail-events"
          title="Events happening soon"
          sub="Markets, music, culture, meetups, and local gatherings."
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

        <HomeSection
          id="rail-food"
          title="Eat and drink"
          sub="Restaurants, cafes, grills, and local food spots travellers talk about."
          seeAllTo="/food"
          loading={foodLoading}
          count={foodItems.length}
          emptyMessage="No food venues listed yet."
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

        <HomeSection
          id="rail-guides"
          title="Local guides"
          sub="Request local experts for culture, food, wildlife, city walks, and hidden places."
          seeAllTo="/guides"
          loading={guidesLoading}
          count={guideItems.length}
          emptyMessage="No guides listed yet."
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

        <section className="home-section ta-rail home-preview-section" aria-labelledby="home-community">
          <div className="ta-rail__head">
            <div>
              <h2 id="home-community" className="ta-rail__title">
                Ask locals and travellers
              </h2>
              <p className="ta-rail__sub">Get practical answers about safety, prices, routes, stays, food, and events.</p>
            </div>
            <div className="home-section__head-actions">
              <Link to="/create/ask" className="home-section-cta">
                Ask locals
              </Link>
              <Link to="/community" className="section-see-all">
                See all
              </Link>
            </div>
          </div>
          <div className="cm-qa-list home-preview-qa">
            {communityQuestions.length === 0 ? (
              <Link to="/create/ask" className="cm-qa-card home-qa-card home-qa-card--empty">
                <p className="cm-qa-card__question">Be the first to ask locals about routes, safety, or prices.</p>
              </Link>
            ) : (
              communityQuestions.map((q) => {
                const name = q.author.display_name || q.author.username
                return (
                  <Link key={q.id} to={communityPostPermalinkPath(q.id)} className="cm-qa-card home-qa-card">
                    <div className="cm-qa-card__header">
                      <span className="cm-qa-card__avatar" aria-hidden>
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div className="cm-qa-card__meta">
                        <span className="cm-qa-card__name">{name}</span>
                        <span className="cm-qa-card__time">{formatQuestionTime(q.created_at)}</span>
                      </div>
                      <span className="cm-qa-card__region-tag">{q.place_label || q.region || 'Ask locals'}</span>
                    </div>
                    <p className="cm-qa-card__question">{q.body}</p>
                    <div className="cm-qa-card__footer">
                      <span className="cm-qa-card__answers-btn">
                        <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
                        {q.accepted_answer
                          ? 'Accepted answer'
                          : `${q.comments_count ?? 0} ${(q.comments_count ?? 0) === 1 ? 'answer' : 'answers'}`}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <HomeSection
          id="home-journeys"
          title="Real journeys"
          sub="Routes, costs, photos, and tips from travellers who went there."
          seeAllTo="/journeys"
          loading={loadingJourneys}
          count={journeyItems.length}
          emptyMessage="No journeys yet."
          className="home-preview-section"
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
      </div>
    </div>
  )
}
