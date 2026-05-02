import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
import { Community } from './Community'
import { MiniRating } from '../components/MiniRating'
import { TripsList } from './TripsList'

/** World travel hero — wide landscape crop; CSS adds soft blur + scrim. */
const HERO_BG =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=78'

const moodChips = [
  { label: 'Weekend away', q: 'weekend' },
  { label: 'With family', q: 'family' },
  { label: 'Mountains & peaks', q: 'mountains' },
  { label: 'Beach & coast', q: 'beach' },
  { label: 'Easy on the wallet', q: 'budget' },
  { label: 'First time exploring', q: 'first-time' },
  { label: 'Evenings out', q: 'night' },
]



type HomeTab = 'discover' | 'community' | 'journeys'

export function Home() {
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')
  const [activeTab, setActiveTab] = useState<HomeTab>('journeys')

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

  function onHeroSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = heroSearch.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <div className="page-home">
      {/* ── Compact hero ── */}
      <section className="ta-hero ta-hero--bleed ta-hero--compact" aria-label="Search DELVE">
        <div className="ta-hero__bg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="ta-hero__scrim" />
        <div className="ta-hero__grain" aria-hidden />
        <div className="ta-hero__inner ta-hero__inner--compact">
          <h1 className="ta-hero__title ta-hero__title--compact">Explore the world your way</h1>
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
                placeholder="Paris, Tokyo, hotel, bus…"
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

      {/* ── Tab bar ── */}
      <div className="home-tabs" role="tablist" aria-label="Home sections">
        <button
          role="tab"
          aria-selected={activeTab === 'discover'}
          className={`home-tab${activeTab === 'discover' ? ' home-tab--active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'community'}
          className={`home-tab${activeTab === 'community' ? ' home-tab--active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          Community
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'journeys'}
          className={`home-tab${activeTab === 'journeys' ? ' home-tab--active' : ''}`}
          onClick={() => setActiveTab('journeys')}
        >
          Journeys
        </button>
      </div>

      {/* ── Discover tab ── */}
      {activeTab === 'discover' && (
        <div className="page-home__inset home-tab-panel" role="tabpanel" aria-label="Discover">
          <div className="ta-mood-scroll" role="list" aria-label="Browse by mood">
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

          <section className="ta-rail" aria-labelledby="rail-stays">
            <div className="ta-rail__head">
              <div>
                <h2 id="rail-stays" className="ta-rail__title">Places to stay</h2>
                <p className="ta-rail__sub">Rooms and guesthouses at different price points.</p>
              </div>
              <Link to="/accommodation" className="ta-rail__link">See all</Link>
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
                        {s.city ? `${s.city}, ` : ''}{s.region} · from ${s.price_per_night}/night
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
                <h2 id="rail-events" className="ta-rail__title">Events &amp; gatherings</h2>
                <p className="ta-rail__sub">Community moments — free and paid.</p>
              </div>
              <Link to="/events" className="ta-rail__link">See all</Link>
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
                        {new Date(e.starts_at).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}{' · '}{e.venue || e.region}
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
                <h2 id="rail-food" className="ta-rail__title">Eat &amp; drink</h2>
                <p className="ta-rail__sub">Everyday spots and treat-yourself places.</p>
              </div>
              <Link to="/food" className="ta-rail__link">See all</Link>
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
                      <div className="mini-card__meta">{f.cuisine} · {f.region}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="ta-rail" aria-labelledby="rail-guides">
            <div className="ta-rail__head">
              <div>
                <h2 id="rail-guides" className="ta-rail__title">Guides on DELVE</h2>
                <p className="ta-rail__sub">Private tours and local hosts in cities worldwide.</p>
              </div>
              <Link to="/guides" className="ta-rail__link">See all</Link>
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
                        @{g.username}{g.hourly_rate ? ` · from ${g.hourly_rate}/hr` : ''}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <div className="home-tab-bottom-pad" />
        </div>
      )}

      {/* ── Community tab ── */}
      {activeTab === 'community' && (
        <div className="page-home__inset home-tab-panel" role="tabpanel" aria-label="Community">
          <Community embedded />
          <div className="home-tab-bottom-pad" />
        </div>
      )}

      {/* ── Journeys tab ── */}
      {activeTab === 'journeys' && (
        <div className="page-home__inset home-tab-panel" role="tabpanel" aria-label="Journeys">
          <TripsList />
          <div className="home-tab-bottom-pad" />
        </div>
      )}
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
