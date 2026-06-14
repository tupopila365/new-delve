import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BedDouble,
  Camera,
  Car,
  Compass,
  Search,
  Ticket,
  Utensils,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'
import { EmptyState, ListSkeleton } from '../components/ui'
import { QuickFilterChips } from '../components/marketplace'

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', Icon: Search },
  { id: 'stays', label: 'Stays', Icon: BedDouble },
  { id: 'food', label: 'Food & drink', Icon: Utensils },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'events', label: 'Events', Icon: Ticket },
  { id: 'transport', label: 'Transport', Icon: Car },
  { id: 'delvers', label: 'Delvers', Icon: Camera },
] as const

const CATEGORY_LABELS: Record<Exclude<SearchCategory, 'all'>, string> = {
  stays: 'Stays',
  food: 'Food & drink',
  guides: 'Guides',
  events: 'Events',
  transport: 'Transport',
  delvers: 'Delvers',
}

const SUGGESTED_SEARCHES = ['Windhoek', 'Etosha', 'Swakopmund', 'sushi', 'weekend', 'bus'] as const

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

function totalResults(data: Results) {
  return (
    data.accommodation.length +
    data.vehicles.length +
    data.bus_trips.length +
    data.events.length +
    data.food.length +
    data.guides.length +
    data.posts.length
  )
}

function categoryCount(data: Results, category: SearchCategory) {
  switch (category) {
    case 'all':
      return totalResults(data)
    case 'stays':
      return data.accommodation.length
    case 'food':
      return data.food.length
    case 'guides':
      return data.guides.length
    case 'events':
      return data.events.length
    case 'transport':
      return data.vehicles.length + data.bus_trips.length
    case 'delvers':
      return data.posts.length
    default:
      return 0
  }
}

function categoryEmptyMessage(category: SearchCategory) {
  switch (category) {
    case 'stays':
      return 'No stays found'
    case 'food':
      return 'No food results found'
    case 'guides':
      return 'No guide results found'
    case 'events':
      return 'No events found'
    case 'transport':
      return 'No transport results found'
    case 'delvers':
      return 'No Delvers posts found'
    default:
      return 'No results found'
  }
}

function resultSummary(submitted: string, category: SearchCategory, count: number) {
  if (!submitted) return 'Start typing to search across DELVE.'
  if (category === 'all') {
    return `${count} result${count === 1 ? '' : 's'} for “${submitted}”`
  }
  return `Showing ${CATEGORY_LABELS[category]} results for “${submitted}”`
}

type SearchResultCardProps = {
  to: string
  title: ReactNode
  meta?: string
  badge: string
  imageSrc?: string | null
  imageAlt?: string
}

function SearchResultCard({ to, title, meta, badge, imageSrc, imageAlt }: SearchResultCardProps) {
  return (
    <Link to={to} className="search-page__hit">
      {imageSrc ? (
        <div className="search-page__hit-media">
          <img src={imageSrc} alt={imageAlt ?? ''} loading="lazy" />
        </div>
      ) : (
        <div className="search-page__hit-media search-page__hit-media--placeholder" aria-hidden />
      )}
      <div className="search-page__hit-body">
        <span className="search-page__hit-badge">{badge}</span>
        <p className="search-page__hit-title">{title}</p>
        {meta ? <p className="search-page__hit-meta">{meta}</p> : null}
      </div>
      <ArrowRight className="search-page__hit-arrow" size={18} strokeWidth={2.25} aria-hidden />
    </Link>
  )
}

type SearchSectionProps = {
  title: string
  count: number
  hideWhenEmpty?: boolean
  children: ReactNode
}

function SearchSection({ title, count, hideWhenEmpty, children }: SearchSectionProps) {
  if (hideWhenEmpty && count === 0) return null

  return (
    <section className="search-page__section" aria-labelledby={`search-section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="search-page__section-head">
        <h2 id={`search-section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="search-page__section-title">
          {title}
        </h2>
        {count > 0 ? <span className="search-page__section-count">{count}</span> : null}
      </div>
      <div className="search-page__section-list">{children}</div>
    </section>
  )
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

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim()
    setQ(trimmed)
    setSubmitted(trimmed.length >= 2 ? trimmed : '')
    if (trimmed) setSearchParams({ q: trimmed })
    else setSearchParams({})
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(q)
  }

  const showSection = (key: SearchCategory) => activeCategory === 'all' || activeCategory === key
  const hideEmptySections = activeCategory === 'all'
  const filteredCount = data ? categoryCount(data, activeCategory) : 0
  const allCount = data ? totalResults(data) : 0

  return (
    <div className="acc-page search-page mk-page">
      <header className="search-page__header">
        <div className="search-page__header-copy">
          <h1 className="search-page__title">Search DELVE</h1>
          <p className="search-page__sub">
            Find stays, food, guides, events, transport, routes, posts, and local tips across the whole platform.
          </p>
          <p className="search-page__support">Search by city, place, business, route, food, guide, or event.</p>
        </div>

        <form className="search-page__form" onSubmit={onSubmit} role="search" aria-label="Search DELVE">
          <div className="search-page__form-row">
            <label className="visually-hidden" htmlFor="global-search-q">
              Search DELVE
            </label>
            <div className="search-page__input-wrap acc-page__search-inner">
              <Search className="search-page__input-icon" size={18} strokeWidth={2.25} aria-hidden />
              <input
                id="global-search-q"
                type="search"
                className="acc-page__search-input input search-page__input"
                placeholder="Search Windhoek, sushi, Etosha, guide, bus, event…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <button type="submit" className="btn btn-primary search-page__submit">
              Search
            </button>
          </div>
          {q.trim().length > 0 && q.trim().length < 2 && (
            <p className="search-page__hint" role="status">
              Enter at least 2 characters to search.
            </p>
          )}
        </form>

        <QuickFilterChips
          ariaLabel="Search categories"
          className="search-page__categories"
          chips={SEARCH_CATEGORIES.map((c) => ({
            id: c.id,
            label: c.label,
            Icon: c.Icon,
            active: activeCategory === c.id,
          }))}
          onChipClick={(id) => setActiveCategory(id as SearchCategory)}
        />
      </header>

      <p className="search-page__summary" role="status">
        {submitted && isFetching && !isError
          ? `Searching DELVE for “${submitted}”…`
          : data
            ? resultSummary(submitted, activeCategory, activeCategory === 'all' ? allCount : filteredCount)
            : resultSummary(submitted, activeCategory, 0)}
      </p>

      {isError && (
        <EmptyState
          iconElement={<Search size={28} strokeWidth={1.75} />}
          title="We couldn't run that search"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
          className="search-page__state"
        />
      )}

      {isFetching && !isError && submitted.length >= 2 && (
        <div className="search-page__loading">
          <ListSkeleton count={4} variant="row" />
        </div>
      )}

      {!isError && !isFetching && !submitted && (
        <div className="search-page__prompt">
          <EmptyState
            iconElement={<Search size={28} strokeWidth={1.75} />}
            title="Search all of DELVE"
            sub="Try a city, place, food spot, event, guide, transport route, or travel question."
            className="search-page__state search-page__state--prompt"
          />
          <div className="search-page__suggestions" role="group" aria-label="Suggested searches">
            {SUGGESTED_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                className="search-page__suggestion"
                onClick={() => runSearch(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isError && !isFetching && submitted && data && filteredCount === 0 && (
        <EmptyState
          iconElement={<Search size={28} strokeWidth={1.75} />}
          title={activeCategory === 'all' ? 'No results found' : categoryEmptyMessage(activeCategory)}
          sub="Try a different city, place, route, food, guide, or event."
          className="search-page__state"
        />
      )}

      {!isError && !isFetching && submitted && data && filteredCount > 0 && (
        <div className="search-page__results">
          {showSection('stays') && (
            <SearchSection title="Stays" count={data.accommodation.length} hideWhenEmpty={hideEmptySections}>
              {data.accommodation.map((a) => (
                <SearchResultCard
                  key={a.id}
                  to={`/accommodation/${a.id}`}
                  badge="Stay"
                  title={a.title}
                  meta={a.region}
                  imageSrc={a.cover_image ? mediaUrl(a.cover_image) : null}
                  imageAlt={`${a.title}, ${a.region}`}
                />
              ))}
              {!hideEmptySections && data.accommodation.length === 0 && (
                <EmptyState compact title="No stays found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('transport') && (
            <SearchSection title="Transport: vehicles" count={data.vehicles.length} hideWhenEmpty={hideEmptySections}>
              {data.vehicles.map((v) => (
                <SearchResultCard
                  key={v.id}
                  to={`/transport/vehicle/${v.id}`}
                  badge="Vehicle"
                  title={v.title}
                  meta={v.region}
                  imageSrc={v.cover_image ? mediaUrl(v.cover_image) : null}
                  imageAlt={`${v.title}, ${v.region}`}
                />
              ))}
              {!hideEmptySections && data.vehicles.length === 0 && (
                <EmptyState compact title="No vehicles found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('transport') && (
            <SearchSection title="Transport: bus trips" count={data.bus_trips.length} hideWhenEmpty={hideEmptySections}>
              {data.bus_trips.map((t) => (
                <SearchResultCard
                  key={t.id}
                  to={`/transport/bus/${t.id}`}
                  badge="Bus trip"
                  title={
                    <span className="search-page__route">
                      <span>{t.route_detail.origin}</span>
                      <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
                      <span>{t.route_detail.destination}</span>
                    </span>
                  }
                  meta={new Date(t.departs_at).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                />
              ))}
              {!hideEmptySections && data.bus_trips.length === 0 && (
                <EmptyState compact title="No bus trips found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('events') && (
            <SearchSection title="Events" count={data.events.length} hideWhenEmpty={hideEmptySections}>
              {data.events.map((ev) => (
                <SearchResultCard
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  badge="Event"
                  title={ev.title}
                  meta={ev.venue}
                />
              ))}
              {!hideEmptySections && data.events.length === 0 && (
                <EmptyState compact title="No events found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('food') && (
            <SearchSection title="Food & drink" count={data.food.length} hideWhenEmpty={hideEmptySections}>
              {data.food.map((f) => (
                <SearchResultCard
                  key={f.id}
                  to={`/food/${f.id}`}
                  badge="Food & drink"
                  title={f.name}
                  meta={f.region}
                />
              ))}
              {!hideEmptySections && data.food.length === 0 && (
                <EmptyState compact title="No food results found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('guides') && (
            <SearchSection title="Guides" count={data.guides.length} hideWhenEmpty={hideEmptySections}>
              {data.guides.map((g) => (
                <SearchResultCard
                  key={g.id}
                  to={`/guides/${g.id}`}
                  badge="Guide"
                  title={g.headline}
                />
              ))}
              {!hideEmptySections && data.guides.length === 0 && (
                <EmptyState compact title="No guide results found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}

          {showSection('delvers') && (
            <SearchSection title="Delvers posts" count={data.posts.length} hideWhenEmpty={hideEmptySections}>
              {data.posts.map((p) => (
                <Link key={p.id} to={`/posts/${p.id}`} className="search-page__hit search-page__hit--post">
                  {(p.image || p.video) && (
                    <div className="search-page__hit-media search-page__hit-media--post">
                      <PostMedia
                        image={p.image}
                        video={p.video}
                        variant="feed"
                        alt={p.body.slice(0, 80) || 'Delvers post'}
                      />
                    </div>
                  )}
                  <div className="search-page__hit-body">
                    <span className="search-page__hit-badge">Delvers</span>
                    <p className="search-page__hit-title search-page__hit-title--post">
                      {p.body.slice(0, 200)}
                      {p.body.length > 200 ? '…' : ''}
                    </p>
                  </div>
                  <ArrowRight className="search-page__hit-arrow" size={18} strokeWidth={2.25} aria-hidden />
                </Link>
              ))}
              {!hideEmptySections && data.posts.length === 0 && (
                <EmptyState compact title="No Delvers posts found" sub="Try a different search term." />
              )}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  )
}
