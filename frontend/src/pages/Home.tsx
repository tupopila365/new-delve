import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  Car,
  Home as HomeIcon,
  Map,
  MessageCircle,
  Ticket,
  Users,
  Utensils,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { MiniRating } from '../components/MiniRating'
import { homeCoverSrc } from '../data/homeDefaults'
import { mockTrips } from '../data/mockTrips'
import { EmptyState, ListSkeleton } from '../components/ui'

const HERO_BG =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=78'

const MIN_RAIL_ITEMS = 3

const moodChips = [
  { label: 'Weekend away', q: 'weekend' },
  { label: 'With family', q: 'family' },
  { label: 'Mountains & peaks', q: 'mountains' },
  { label: 'Beach & coast', q: 'beach' },
  { label: 'Easy on the wallet', q: 'budget' },
  { label: 'First time exploring', q: 'first-time' },
  { label: 'Evenings out', q: 'night' },
]

const categoryShortcuts = [
  { to: '/accommodation', label: 'Find places to stay', desc: 'Hotels, lodges & unique stays', Icon: HomeIcon, color: 1 },
  { to: '/food', label: 'Eat & drink', desc: 'Restaurants, cafés & local spots', Icon: Utensils, color: 5 },
  { to: '/guides', label: 'Find a guide', desc: 'Culture, wildlife & city walks', Icon: Users, color: 7 },
  { to: '/events', label: 'Events near you', desc: 'Concerts, markets & meetups', Icon: Ticket, color: 4 },
  { to: '/transport', label: 'Transport', desc: 'Car rental & bus routes', Icon: Car, color: 2 },
  { to: '/journeys', label: 'Real journeys', desc: 'Routes, costs & traveller tips', Icon: Map, color: 6 },
  { to: '/community', label: 'Ask locals', desc: 'Safety, prices & hidden places', Icon: MessageCircle, color: 8 },
  { to: '/delvers', label: 'Delvers', desc: 'Photos, tips & travel clips', Icon: Camera, color: 3 },
] as const

const communityPreview = [
  {
    id: '1',
    author: 'Mila K.',
    initial: 'M',
    time: '2h ago',
    region: 'Khomas',
    question: 'Where can I pick up a SIM card in Windhoek on a Sunday afternoon?',
    answers: 2,
  },
  {
    id: '2',
    author: 'Alex R.',
    initial: 'A',
    time: 'Yesterday',
    region: 'Erongo',
    question: 'Is the D1913 gravel stretch to Walvis safe for a small hatchback after rain?',
    answers: 1,
  },
]

function journeyRouteLabel(stops: { place_name: string }[]) {
  const places = stops.map((s) => s.place_name)
  if (places.length <= 2) return places.join(' → ')
  return `${places[0]} → … → ${places[places.length - 1]}`
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
  if (!loading && count < MIN_RAIL_ITEMS) return null

  return (
    <section className={`home-section ta-rail ${className}`.trim()} aria-labelledby={id}>
      <div className="ta-rail__head">
        <div>
          <h2 id={id} className="ta-rail__title">{title}</h2>
          <p className="ta-rail__sub">{sub}</p>
        </div>
        <Link to={seeAllTo} className="section-see-all">
          See all
        </Link>
      </div>
      {loading ? (
        <ListSkeleton count={5} />
      ) : count === 0 ? (
        <EmptyState compact title={emptyMessage} />
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
  journey?: boolean
}

function HomeCard({ to, imageSrc, imageAlt, title, meta, rating, journey }: HomeCardProps) {
  return (
    <Link
      to={to}
      className={`home-card mini-card ta-mini-card ta-mini-card--calm${journey ? ' journey-card' : ''}`}
    >
      <div className="ta-mini-card__media">
        <img className="ta-mini-card__img home-card__img" src={imageSrc} alt={imageAlt} loading="lazy" />
      </div>
      <div className="journey-card__body mini-card__body home-card__body">
        <p className="journey-card__title mini-card__title home-card__title">{title}</p>
        {rating != null && <MiniRating rating={rating.avg} count={rating.count} />}
        <p className="mini-card__meta home-card__meta">{meta}</p>
      </div>
    </Link>
  )
}

export function Home() {
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')

  const { data: stays, isLoading: staysLoading } = useQuery({
    queryKey: ['home-stays'],
    queryFn: () =>
      apiFetch<
        {
          id: number
          title: string
          region: string
          city: string
          cover_image: string | null
          price_per_night: string
          rating_avg: string | number
          rating_count: number
        }[]
      >('/api/accommodation/listings/?ordering=-created_at', { auth: false }),
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: () =>
      apiFetch<
        { id: number; title: string; venue: string; starts_at: string; cover_image: string | null; region: string }[]
      >('/api/events/?ordering=starts_at', { auth: false }),
  })

  const { data: food, isLoading: foodLoading } = useQuery({
    queryKey: ['home-food'],
    queryFn: () =>
      apiFetch<
        {
          id: number
          name: string
          cuisine: string
          region: string
          cover_image: string | null
          rating_avg: string | number
          rating_count: number
        }[]
      >('/api/food/venues/?ordering=name', { auth: false }),
  })

  const { data: guides, isLoading: guidesLoading } = useQuery({
    queryKey: ['home-guides'],
    queryFn: () =>
      apiFetch<
        {
          id: number
          headline: string
          username: string
          photo: string | null
          hourly_rate: string | null
          rating_avg: string | number
          rating_count: number
        }[]
      >('/api/guides/profiles/?ordering=-created_at', { auth: false }),
  })

  const stayItems = stays?.slice(0, 10) ?? []
  const eventItems = events?.slice(0, 10) ?? []
  const foodItems = food?.slice(0, 10) ?? []
  const guideItems = guides?.slice(0, 10) ?? []
  const journeyItems = mockTrips.slice(0, 8)

  function onHeroSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = heroSearch.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <div className="page-home">
      <section className="ta-hero ta-hero--bleed ta-hero--home" aria-label="Search DELVE">
        <div className="ta-hero__bg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="ta-hero__scrim" />
        <div className="ta-hero__grain" aria-hidden />
        <div className="ta-hero__inner ta-hero__inner--home">
          <h1 className="ta-hero__title ta-hero__title--home">
            Discover, plan, book, and share real travel experiences.
          </h1>
          <p className="ta-hero__sub ta-hero__sub--home">
            Find stays, food, guides, events, transport, routes, and local tips — all in one travel-social marketplace.
          </p>
          <div className="ta-hero__actions">
            <form className="ta-hero__searchform" onSubmit={onHeroSearch} role="search" aria-label="Search DELVE">
              <label htmlFor="home-hero-search" className="visually-hidden">
                Search places, stays, events, food, and guides
              </label>
              <span className="ta-hero__searchform-icon" aria-hidden>
                ⌕
              </span>
              <input
                id="home-hero-search"
                className="ta-hero__searchform-input"
                type="search"
                name="q"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search places, stays, events, food, guides…"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="ta-hero__searchform-submit">
                Search
              </button>
            </form>
            <div className="mk-hero__ctas ta-hero__cta-row">
              <Link to="/search" className="btn btn-primary">
                Start exploring
              </Link>
              <Link to="/community" className="btn btn-ghost">
                Ask locals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="home-content">
        <nav className="mk-action-grid" aria-label="Browse DELVE">
          {categoryShortcuts.map((s) => (
            <Link key={s.label} to={s.to} className={`mk-action-card category-tile category-tile--${s.color}`}>
              <s.Icon className="mk-action-card__icon category-tile__icon" size={24} strokeWidth={2} aria-hidden />
              <span className="mk-action-card__title">{s.label}</span>
              <p className="mk-action-card__desc">{s.desc}</p>
            </Link>
          ))}
        </nav>

        <div className="ta-mood-scroll home-mood-scroll" role="list" aria-label="Browse by mood">
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

        <HomeSection
          id="rail-stays"
          title="Places to stay"
          sub="Rooms and guesthouses at different price points."
          seeAllTo="/accommodation"
          loading={staysLoading}
          count={stayItems.length}
          emptyMessage="No stays listed yet. Check back soon."
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
              />
            ))}
          </div>
        </HomeSection>

        <HomeSection
          id="rail-events"
          title="Events & gatherings"
          sub="Community moments — free and paid."
          seeAllTo="/events"
          loading={eventsLoading}
          count={eventItems.length}
          emptyMessage="No events yet. Check back soon."
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
              />
            ))}
          </div>
        </HomeSection>

        <HomeSection
          id="rail-food"
          title="Eat & drink"
          sub="Everyday spots and treat-yourself places."
          seeAllTo="/food"
          loading={foodLoading}
          count={foodItems.length}
          emptyMessage="No food venues yet. Check back soon."
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
              />
            ))}
          </div>
        </HomeSection>

        <HomeSection
          id="rail-guides"
          title="Guides on DELVE"
          sub="Private tours and local hosts in cities worldwide."
          seeAllTo="/guides"
          loading={guidesLoading}
          count={guideItems.length}
          emptyMessage="No guides listed yet. Check back soon."
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
              />
            ))}
          </div>
        </HomeSection>

        <section className="home-section ta-rail home-preview-section" aria-labelledby="home-community">
          <div className="ta-rail__head">
            <div>
              <h2 id="home-community" className="ta-rail__title">Community</h2>
              <p className="ta-rail__sub">Ask locals, see what&apos;s trending, and join challenges.</p>
            </div>
            <Link to="/community" className="section-see-all">
              See all
            </Link>
          </div>
          <div className="cm-qa-list home-preview-qa">
            {communityPreview.map((q) => (
              <Link key={q.id} to="/community" className="cm-qa-card">
                <div className="cm-qa-card__header">
                  <span className="cm-qa-card__avatar" aria-hidden>
                    {q.initial}
                  </span>
                  <div className="cm-qa-card__meta">
                    <span className="cm-qa-card__name">{q.author}</span>
                    <span className="cm-qa-card__time">{q.time}</span>
                  </div>
                  <span className="cm-qa-card__region-tag">{q.region}</span>
                </div>
                <p className="cm-qa-card__question">{q.question}</p>
                <div className="cm-qa-card__footer">
                  <span className="cm-qa-card__answers-btn">
                    {q.answers} {q.answers === 1 ? 'answer' : 'answers'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <HomeSection
          id="home-journeys"
          title="Journeys"
          sub="Real travel diaries — places, prices, and moments."
          seeAllTo="/journeys"
          loading={false}
          count={journeyItems.length}
          emptyMessage="No journeys yet. Check back soon."
          className="home-preview-section"
        >
          <div className="home-rail home-rail--journeys">
            {journeyItems.map((t) => (
              <HomeCard
                key={t.id}
                journey
                to={`/journeys/${t.id}`}
                imageSrc={homeCoverSrc(t.cover_image, 'journey')}
                imageAlt={t.title}
                title={t.title}
                meta={`${t.author.display_name} · ${t.days} ${t.days === 1 ? 'day' : 'days'} · ${journeyRouteLabel(t.stops)}`}
              />
            ))}
          </div>
        </HomeSection>
      </div>
    </div>
  )
}

