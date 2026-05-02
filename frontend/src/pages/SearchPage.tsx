import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { PostMedia } from '../components/PostMedia'

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

  useEffect(() => {
    const next = searchParams.get('q')?.trim() ?? ''
    setQ(next)
    setSubmitted(next.length >= 2 ? next : '')
  }, [searchParams])

  const { data, isFetching } = useQuery({
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

  return (
    <div className="acc-page search-page">
      <h1 className="display search-page__title">Explore</h1>
      <p className="page-sub search-page__sub">
        Search across stays, transport, events, food, guides, and posts.
      </p>
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
      {isFetching && <div className="skeleton" style={{ height: 80 }} />}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Section title="Accommodation">
            {data.accommodation.map((a) => (
              <Link key={a.id} to={`/accommodation/${a.id}`} className="card" style={{ display: 'flex', gap: 10, padding: 10, textDecoration: 'none', color: 'inherit' }}>
                {a.cover_image && (
                  <img src={mediaUrl(a.cover_image)} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                )}
                <div>
                  <strong>{a.title}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.region}</div>
                </div>
              </Link>
            ))}
            {data.accommodation.length === 0 && <Empty />}
          </Section>
          <Section title="Car rental">
            {data.vehicles.map((v) => (
              <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="card" style={{ display: 'block', padding: 10, textDecoration: 'none', color: 'inherit' }}>
                <strong>{v.title}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{v.region}</div>
              </Link>
            ))}
            {data.vehicles.length === 0 && <Empty />}
          </Section>
          <Section title="Bus trips">
            {data.bus_trips.map((t) => (
              <Link key={t.id} to={`/transport/bus/${t.id}`} className="card" style={{ display: 'block', padding: 10, textDecoration: 'none', color: 'inherit' }}>
                {t.route_detail.origin} → {t.route_detail.destination}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(t.departs_at).toLocaleString()}</div>
              </Link>
            ))}
            {data.bus_trips.length === 0 && <Empty />}
          </Section>
          <Section title="Events">
            {data.events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="card" style={{ display: 'block', padding: 10, textDecoration: 'none', color: 'inherit' }}>
                <strong>{ev.title}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ev.venue}</div>
              </Link>
            ))}
            {data.events.length === 0 && <Empty />}
          </Section>
          <Section title="Food & drinks">
            {data.food.map((f) => (
              <Link key={f.id} to={`/food/${f.id}`} className="card" style={{ display: 'block', padding: 10, textDecoration: 'none', color: 'inherit' }}>
                <strong>{f.name}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f.region}</div>
              </Link>
            ))}
            {data.food.length === 0 && <Empty />}
          </Section>
          <Section title="Tour guides">
            {data.guides.map((g) => (
              <Link key={g.id} to={`/guides/${g.id}`} className="card" style={{ display: 'block', padding: 10, textDecoration: 'none', color: 'inherit' }}>
                {g.headline}
              </Link>
            ))}
            {data.guides.length === 0 && <Empty />}
          </Section>
          <Section title="Posts & reels">
            {data.posts.map((p) => (
              <Link
                key={p.id}
                to={`/posts/${p.id}`}
                className="card card--flat search-post-hit"
                style={{ overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
              >
                {(p.image || p.video) && (
                  <div style={{ maxHeight: 200, overflow: 'hidden' }}>
                    <PostMedia image={p.image} video={p.video} variant="feed" alt="" />
                  </div>
                )}
                <div style={{ padding: 12, fontSize: 14 }}>
                  {p.body.slice(0, 200)}
                  {p.body.length > 200 ? '…' : ''}
                </div>
              </Link>
            ))}
            {data.posts.length === 0 && <Empty />}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="ui-section-title" style={{ marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  )
}

function Empty() {
  return <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No matches</span>
}
