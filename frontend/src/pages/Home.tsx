import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
import { HomeStoriesRow } from '../components/HomeStoriesRow'
import { IgPostCard, type FeedPost } from '../components/IgPostCard'
import { MiniRating } from '../components/MiniRating'
import { useAuth, type Profile } from '../auth/AuthContext'
import { useStoryPreview } from '../hooks/useStoryPreview'

function greetingName(p: Profile) {
  const raw = (p.display_name || p.username || '').trim()
  const word = raw.split(/\s+/)[0]
  return word || 'there'
}

const HERO_BG =
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1400&q=80'

const shortcuts: { to: string; label: string; classSuffix: string; emoji: string }[] = [
  { to: '/accommodation', label: 'Stays', classSuffix: '1', emoji: '🛏' },
  { to: '/delvers', label: 'Delvers', classSuffix: '2', emoji: '📌' },
  { to: '/transport', label: 'Go', classSuffix: '3', emoji: '🚐' },
  { to: '/events', label: 'Events', classSuffix: '4', emoji: '🎟' },
  { to: '/food', label: 'Food', classSuffix: '5', emoji: '🍽' },
  { to: '/guides', label: 'Guides', classSuffix: '6', emoji: '🧭' },
  { to: '/messages', label: 'Inbox', classSuffix: '7', emoji: '💬' },
  { to: '/settings', label: 'You', classSuffix: '8', emoji: '⚙' },
]

const moodChips = [
  { label: 'Weekend away', q: 'weekend' },
  { label: 'With family', q: 'family' },
  { label: 'Desert & dunes', q: 'dunes' },
  { label: 'Coast & cafés', q: 'coast' },
  { label: 'Easy on the wallet', q: 'budget' },
  { label: 'First time exploring', q: 'namibia' },
  { label: 'Evenings out', q: 'night' },
]

const trendingPlaces = [
  { label: 'Windhoek', q: 'Windhoek' },
  { label: 'Swakopmund', q: 'Swakopmund' },
  { label: 'Sossusvlei', q: 'Sossusvlei' },
  { label: 'Etosha', q: 'Etosha' },
  { label: 'Walvis Bay', q: 'Walvis Bay' },
]

export function Home() {
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')
  const { profile } = useAuth()
  const qk = ['feed', profile?.region] as const
  const { data: posts, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiFetch<FeedPost[]>(
        `/api/social/feed/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
        { auth: false },
      ),
  })

  const storyPreview = useStoryPreview()

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

  const spotlight = stays?.[0]

  function onHeroSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = heroSearch.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const heroSub = profile?.region
    ? `Around ${profile.region} and beyond — buses, rooms, food, and things to do. Filter by what fits your life; browsing costs nothing.`
    : `Stays, shared rides, food, events, and ideas from real people. Set your region in Account when you want picks closer to home — looking around is always free.`

  return (
    <div className="page-home">
      <section className="ta-hero ta-hero--bleed" aria-label="Welcome to DELVE">
        <div className="ta-hero__bg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="ta-hero__scrim" />
        <div className="ta-hero__grain" aria-hidden />
        <div className="ta-hero__inner">
          <p className="ta-hero__eyebrow">
            <span aria-hidden>◇</span> Namibia — for everyone
          </p>
          <h1 className="ta-hero__title">You&apos;re welcome here</h1>
          <p className="ta-hero__sub">{heroSub}</p>
          <div className="ta-hero__actions">
            <form className="ta-hero__searchform" onSubmit={onHeroSearch} role="search" aria-label="Search DELVE">
              <label htmlFor="home-hero-search" className="visually-hidden">
                Search stays, rides, food, and posts
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
                placeholder="Windhoek, braai, bus, lodge…"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="ta-hero__searchform-submit">
                Search
              </button>
            </form>
            <Link to="/delvers" className="ta-hero__ghost">
              Browse ideas
            </Link>
          </div>
        </div>
      </section>

      <div className="page-home__inset">
      {profile ? (
        <aside className="page-home__welcome" aria-label="Personal welcome">
          <p className="page-home__welcome-kicker">Good to see you</p>
          <p className="page-home__welcome-text">
            <strong>{greetingName(profile)}</strong>, there&apos;s no single &ldquo;right&rdquo; way to use DELVE — take your time. Whether you&apos;re planning a trip, a commute, or a meal out, you belong in this space.
          </p>
        </aside>
      ) : (
        <aside className="page-home__welcome page-home__welcome--guest" aria-label="Welcome">
          <p className="page-home__welcome-kicker">No pressure</p>
          <p className="page-home__welcome-text">
            You don&apos;t need a big budget or a travel plan to look around. Explore listings and posts freely — create a free account when you want to book, save, or share.
          </p>
          <div className="page-home__welcome-actions">
            <Link to="/register">Join free</Link>
            <span className="page-home__welcome-dot" aria-hidden>
              ·
            </span>
            <Link to="/login">Sign in</Link>
          </div>
        </aside>
      )}

      <div className="page-home__values" role="list">
        <div className="page-home__value" role="listitem">
          <p className="page-home__value-title">Browse first</p>
          <p className="page-home__value-text">No payment or membership required to search and discover.</p>
        </div>
        <div className="page-home__value" role="listitem">
          <p className="page-home__value-title">Every budget</p>
          <p className="page-home__value-text">From shared seats to guesthouses — filters help you match what you can spend.</p>
        </div>
        <div className="page-home__value" role="listitem">
          <p className="page-home__value-title">Locals &amp; visitors</p>
          <p className="page-home__value-text">Built for people who live here and people just passing through.</p>
        </div>
      </div>

      <p className="ta-mood-label">What kind of day is it?</p>
      <div className="ta-mood-scroll" role="list">
        {moodChips.map((m) => (
          <Link
            key={m.q}
            to={`/search?q=${encodeURIComponent(m.q)}`}
            className="ta-mood-chip"
            role="listitem"
          >
            <span className="ta-mood-chip__emoji" aria-hidden>
              ✦
            </span>
            {m.label}
          </Link>
        ))}
      </div>

      <p className="ta-trend-label">Try a place name</p>
      <div className="ta-trend-links">
        {trendingPlaces.map((t) => (
          <Link key={t.q} to={`/search?q=${encodeURIComponent(t.q)}`}>
            {t.label}
          </Link>
        ))}
      </div>

      <section className="page-home__highlights" aria-labelledby="home-highlights-heading">
        <h2 id="home-highlights-heading" className="page-home__highlights-label">
          Highlights
        </h2>
        <p className="page-home__highlights-sub">Tap a ring for a quick tour — stays, transport, events, and more.</p>
        <HomeStoriesRow preview={storyPreview} />
      </section>

      {spotlight && (
        <Link to={`/accommodation/${spotlight.id}`} className="ta-spotlight">
          {spotlight.cover_image ? (
            <img
              className="ta-spotlight__img"
              src={mediaUrl(spotlight.cover_image) || ''}
              alt={`${spotlight.title} — ${spotlight.city ? `${spotlight.city}, ` : ''}${spotlight.region}`}
            />
          ) : (
            <div className="ta-spotlight__placeholder" aria-hidden />
          )}
          <div className="ta-spotlight__scrim" />
          <div className="ta-spotlight__body">
            <span className="ta-spotlight__badge">Host listing</span>
            <h2 className="ta-spotlight__title">{spotlight.title}</h2>
            <MiniRating
              className="ta-spotlight__rating"
              rating={spotlight.rating_avg}
              count={spotlight.rating_count}
              variant="onDark"
            />
            <div className="ta-spotlight__meta">
              <span>
                {spotlight.city ? `${spotlight.city}, ` : ''}
                {spotlight.region}
              </span>
              <span>· from N${spotlight.price_per_night}/night</span>
              <span>· open listing</span>
            </div>
          </div>
        </Link>
      )}

      <p className="explore-section-label">Find your way</p>
      <div className="explore-grid">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className={`explore-tile explore-tile--${s.classSuffix}`}>
            <span className="explore-tile__emoji" aria-hidden>
              {s.emoji}
            </span>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>

      <section className="ta-rail" aria-labelledby="rail-stays">
        <div className="ta-rail__head">
          <div>
            <h2 id="rail-stays" className="ta-rail__title">
              Places to stay
            </h2>
            <p className="ta-rail__sub">Rooms and guesthouses at different price points — yours to compare.</p>
          </div>
          <Link to="/accommodation" className="ta-rail__link">
            See all
          </Link>
        </div>
        <div className="h-scroll">
          {staysLoading ? (
            <HomeRailSkeleton />
          ) : (
            stays?.slice(0, 12).map((s) => (
            <Link key={s.id} to={`/accommodation/${s.id}`} className="mini-card ta-mini-card ta-mini-card--calm">
              <div className="ta-mini-card__media">
                {s.cover_image ? (
                  <img
                    className="ta-mini-card__img"
                    src={mediaUrl(s.cover_image) || ''}
                    alt={`${s.title}, ${s.city ? `${s.city}, ` : ''}${s.region}`}
                  />
                ) : (
                  <div className="ta-mini-card__placeholder">Stay</div>
                )}
              </div>
              <div className="mini-card__body">
                <p className="mini-card__title">{s.title}</p>
                <MiniRating rating={s.rating_avg} count={s.rating_count} />
                <div className="mini-card__meta">
                  {s.city ? `${s.city}, ` : ''}
                  {s.region} · from N${s.price_per_night}/night
                </div>
              </div>
            </Link>
            ))
          )}
        </div>
      </section>

      <section className="ta-rail" aria-labelledby="rail-events">
        <div className="ta-rail__head">
          <div>
            <h2 id="rail-events" className="ta-rail__title">
              Events &amp; gatherings
            </h2>
            <p className="ta-rail__sub">Community moments — free and paid — when you want to be out with others.</p>
          </div>
          <Link to="/events" className="ta-rail__link">
            See all
          </Link>
        </div>
        <div className="h-scroll">
          {eventsLoading ? (
            <HomeRailSkeleton />
          ) : (
            events?.slice(0, 12).map((e) => (
            <Link key={e.id} to={`/events/${e.id}`} className="mini-card ta-mini-card ta-mini-card--calm">
              <div className="ta-mini-card__media">
                {e.cover_image ? (
                  <img
                    className="ta-mini-card__img"
                    src={mediaUrl(e.cover_image) || ''}
                    alt={`${e.title} — ${e.venue || e.region}`}
                  />
                ) : (
                  <div className="ta-mini-card__placeholder">Event</div>
                )}
              </div>
              <div className="mini-card__body">
                <p className="mini-card__title">{e.title}</p>
                <div className="mini-card__meta">
                  {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                  {e.venue || e.region}
                </div>
              </div>
            </Link>
            ))
          )}
        </div>
      </section>

      <section className="ta-rail" aria-labelledby="rail-food">
        <div className="ta-rail__head">
          <div>
            <h2 id="rail-food" className="ta-rail__title">
              Eat &amp; drink
            </h2>
            <p className="ta-rail__sub">Everyday spots and treat-yourself places — all listed without snobbery.</p>
          </div>
          <Link to="/food" className="ta-rail__link">
            See all
          </Link>
        </div>
        <div className="h-scroll">
          {foodLoading ? (
            <HomeRailSkeleton />
          ) : (
            food?.slice(0, 12).map((f) => (
            <Link key={f.id} to={`/food/${f.id}`} className="mini-card ta-mini-card ta-mini-card--calm">
              <div className="ta-mini-card__media">
                {f.cover_image ? (
                  <img
                    className="ta-mini-card__img"
                    src={mediaUrl(f.cover_image) || ''}
                    alt={`${f.name} — ${f.cuisine}, ${f.region}`}
                  />
                ) : (
                  <div className="ta-mini-card__placeholder">Food</div>
                )}
              </div>
              <div className="mini-card__body">
                <p className="mini-card__title">{f.name}</p>
                <MiniRating rating={f.rating_avg} count={f.rating_count} />
                <div className="mini-card__meta">
                  {f.cuisine} · {f.region}
                </div>
              </div>
            </Link>
            ))
          )}
        </div>
      </section>

      <section className="ta-rail" aria-labelledby="rail-guides">
        <div className="ta-rail__head">
          <div>
            <h2 id="rail-guides" className="ta-rail__title">
              Local guides
            </h2>
            <p className="ta-rail__sub">People offering walks and tours — read profiles and choose someone you trust.</p>
          </div>
          <Link to="/guides" className="ta-rail__link">
            See all
          </Link>
        </div>
        <div className="h-scroll">
          {guidesLoading ? (
            <HomeRailSkeleton />
          ) : (
            guides?.slice(0, 12).map((g) => (
            <Link key={g.id} to={`/guides/${g.id}`} className="mini-card ta-mini-card ta-mini-card--calm">
              <div className="ta-mini-card__media">
                {g.photo ? (
                  <img
                    className="ta-mini-card__img"
                    src={mediaUrl(g.photo) || ''}
                    alt={`${g.headline} — guide @${g.username}`}
                  />
                ) : (
                  <div className="ta-mini-card__placeholder">Guide</div>
                )}
              </div>
              <div className="mini-card__body">
                <p className="mini-card__title">{g.headline}</p>
                <MiniRating rating={g.rating_avg} count={g.rating_count} />
                <div className="mini-card__meta">
                  @{g.username}
                  {g.hourly_rate ? ` · from N${g.hourly_rate}/hr` : ''}
                </div>
              </div>
            </Link>
            ))
          )}
        </div>
      </section>

      <Link to="/transport" className="ta-plan">
        <p className="ta-plan__kicker">Getting around</p>
        <h3 className="ta-plan__title">Cars to rent, buses to board</h3>
        <p className="ta-plan__text">
          Same app for a lift across town or a longer drive. Checkout is a safe demo — no real charge while you explore the flow.
        </p>
        <span className="ta-plan__cta">
          See transport options <span aria-hidden>→</span>
        </span>
      </Link>

      <section className="page-home__feed" aria-labelledby="home-feed-heading">
        <header className="ta-feed-head">
          <h2 id="home-feed-heading" className="ta-feed-head__title">
            Voices from the community
          </h2>
          <p className="ta-feed-head__sub">
            Photos and words from neighbors and travelers — not a polished brochure. Save what resonates; skip what doesn&apos;t.
          </p>
        </header>

        {isLoading && (
          <>
            <div className="skeleton ig-post" style={{ height: 320, marginBottom: 16, borderRadius: 0 }} />
            <div className="skeleton ig-post" style={{ height: 280, borderRadius: 0 }} />
          </>
        )}
        {!isLoading && posts && posts.length === 0 && (
          <p className="page-home__feed-empty">
            Nothing in the feed yet — that&apos;s okay. When you&apos;re ready, share a corner of your day or follow people you like. This space is yours too.
          </p>
        )}
        {posts?.map((p) => (
          <IgPostCard key={p.id} post={p} queryKey={[...qk]} />
        ))}
      </section>
      </div>
    </div>
  )
}

function HomeRailSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="mini-card ta-mini-card page-home__rail-skel-card" aria-hidden>
          <div className="ta-mini-card__media">
            <div className="skeleton page-home__rail-skel-img" />
          </div>
          <div className="mini-card__body page-home__rail-skel-body">
            <div className="skeleton page-home__rail-skel-line page-home__rail-skel-line--title" />
            <div className="skeleton page-home__rail-skel-line page-home__rail-skel-line--meta" />
          </div>
        </div>
      ))}
    </>
  )
}
