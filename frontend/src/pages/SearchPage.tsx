import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'
import { EmptyState, ListSkeleton, PageHeader } from '../components/ui'
import { QuickFilterChips } from '../components/marketplace'

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⌕' },
  { id: 'stays', label: 'Stays', emoji: '🏨' },
  { id: 'food', label: 'Food', emoji: '🍽' },
  { id: 'guides', label: 'Guides', emoji: '🧭' },
  { id: 'events', label: 'Events', emoji: '🎟' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'delvers', label: 'Delvers', emoji: '📸' },
] as const

type SearchCategory = (typeof SEARCH_CATEGORIES)[number]['id']

type Results = {
  accommodation: { id: number; title: string; region: string; cover_image: string | null }[]
  vehicles: { id: number; title: string; region: string; cover_image: string | null }[]
  bus_trips: { id: number; route_detail: { origin: string; destination: string }; departs_at: string }[]
  events: { id: number; title: string; venue: string }[]
  food: { id: number; name: string; region: string }[]
  guides: { id: number; headline: string }[]
  posts: { id: number; body: string; image: string | null; video: string | null }[]
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q')?.trim() ?? ''
  const [q, setQ] = useState(urlQ)
  const [submitted, setSubmitted] = useState(urlQ.length >= 2 ? urlQ : '')
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all')

  useEffect(() => {
    const next = searchParams.get('q')?.trim() ?? ''
    setQ(next)
    setSubmitted(next.length >= 2 ? next : '')
  }, [searchParams])

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', submitted],
    enabled: submitted.length >= 2,
    queryFn: () => apiFetch<Results>(`/api/search/?q=${encodeURIComponent(submitted)}`, { auth: false }),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    setSubmitted(trimmed.length >= 2 ? trimmed : '')
    if (trimmed) setSearchParams({ q: trimmed })
    else setSearchParams({})
  }

  const totalResults = data
    ? data.accommodation.length +
      data.vehicles.length +
      data.bus_trips.length +
      data.events.length +
      data.food.length +
      data.guides.length +
      data.posts.length
    : 0

  const showSection = (key: SearchCategory) => activeCategory === 'all' || activeCategory === key

  return (
    <div className="acc-page search-page mk-page">
      <PageHeader
        title="Search DELVE"
        subtitle="Search across stays, food, guides, events, transport, and Delvers."
      />
      <QuickFilterChips
        ariaLabel="Search categories"
        chips={SEARCH_CATEGORIES.map((c) => ({
          id: c.id,
          label: c.label,
          emoji: c.emoji,
          active: activeCategory === c.id,
        }))}
        onChipClick={(id) => setActiveCategory(id as SearchCategory)}
      />
      <form className="search-page__form" onSubmit={onSubmit}>
        <div className="acc-page__search">
          <label className="visually-hidden" htmlFor="global-search-q">
            Search DELVE
          </label>
          <div className="acc-page__search-inner">
            <span className="acc-page__search-icon" aria-hidden>⌕</span>
            <input
              id="global-search-q"
              type="search"
              className="acc-page__search-input input"
              placeholder="Paris, Tokyo, hotel, bus…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block search-page__submit">
          Search
        </button>
      </form>
      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="page-sub search-page__hint">Enter at least 2 characters to search.</p>
      )}
      {isError && (
        <EmptyState
          icon="⌕"
          title="We couldn't run that search"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      )}
      {isFetching && !isError && <ListSkeleton count={3} variant="row" />}
      {data && totalResults === 0 && (
        <EmptyState
          icon="⌕"
          title="No results found"
          sub="Try searching a city, place, event, route, food, or guide."
        />
      )}
      {data && totalResults > 0 && (
        <div className="search-page__results">
          {showSection('stays') && (
          <Section title="Stays">
            {data.accommodation.map((a) => (
              <Link key={a.id} to={`/accommodation/${a.id}`} className="card search-page__result-card">
                {a.cover_image && (
                  <img src={mediaUrl(a.cover_image)} alt="" className="search-page__result-thumb" loading="lazy" />
                )}
                <div>
                  <strong>{a.title}</strong>
                  <div className="search-page__result-meta">{a.region}</div>
                </div>
              </Link>
            ))}
            {data.accommodation.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('transport') && (
          <Section title="Car rental">
            {data.vehicles.map((v) => (
              <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="card search-page__result-card search-page__result-card--block">
                <strong>{v.title}</strong>
                <div className="search-page__result-meta">{v.region}</div>
              </Link>
            ))}
            {data.vehicles.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('transport') && (
          <Section title="Bus trips">
            {data.bus_trips.map((t) => (
              <Link key={t.id} to={`/transport/bus/${t.id}`} className="card search-page__result-card search-page__result-card--block">
                {t.route_detail.origin} → {t.route_detail.destination}
                <div className="search-page__result-meta">{new Date(t.departs_at).toLocaleString()}</div>
              </Link>
            ))}
            {data.bus_trips.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('events') && (
          <Section title="Events">
            {data.events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="card search-page__result-card search-page__result-card--block">
                <strong>{ev.title}</strong>
                <div className="search-page__result-meta">{ev.venue}</div>
              </Link>
            ))}
            {data.events.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('food') && (
          <Section title="Food & drink">
            {data.food.map((f) => (
              <Link key={f.id} to={`/food/${f.id}`} className="card search-page__result-card search-page__result-card--block">
                <strong>{f.name}</strong>
                <div className="search-page__result-meta">{f.region}</div>
              </Link>
            ))}
            {data.food.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('guides') && (
          <Section title="Guides">
            {data.guides.map((g) => (
              <Link key={g.id} to={`/guides/${g.id}`} className="card search-page__result-card search-page__result-card--block">
                {g.headline}
              </Link>
            ))}
            {data.guides.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
          {showSection('delvers') && (
          <Section title="Delvers posts">
            {data.posts.map((p) => (
              <Link
                key={p.id}
                to={`/posts/${p.id}`}
                className="card card--flat search-post-hit search-page__result-card--block"
              >
                {(p.image || p.video) && (
                  <div className="search-page__post-media">
                    <PostMedia image={p.image} video={p.video} variant="feed" alt="" />
                  </div>
                )}
                <div className="search-page__post-body">
                  {p.body.slice(0, 200)}
                  {p.body.length > 200 ? '…' : ''}
                </div>
              </Link>
            ))}
            {data.posts.length === 0 && (
              <EmptyState compact title="No matches" sub="Try a different search term." />
            )}
          </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="ui-section-title search-page__section-title">
        {title}
      </h2>
      <div className="search-page__section-list">{children}</div>
    </section>
  )
}

