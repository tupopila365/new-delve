import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { FilterSheet } from '../components/FilterSheet'

type Ev = {
  id: number
  title: string
  category: string
  starts_at: string
  venue: string
  region: string
  cover_image: string | null
}

const cats = ['music', 'sports', 'culture', 'business', 'food', 'other']

export function EventsList() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('')

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (region) p.set('region', region)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [category, region])

  const { data } = useQuery({
    queryKey: ['events', qs],
    queryFn: () => apiFetch<Ev[]>(`/api/events/${qs}`, { auth: false }),
  })

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="display">Events</h1>
          <p className="page-sub">What’s happening near you — discover and plan</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
          Filter
        </button>
      </header>
      <FilterSheet open={open} title="Event filters" onClose={() => setOpen(false)}>
        <div className="field">
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Region</label>
          <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
          Apply
        </button>
      </FilterSheet>
      <div style={{ display: 'grid', gap: 18, marginTop: 8 }}>
        {data?.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`} className="media-card">
            {e.cover_image ? (
              <img className="media-card__img" src={mediaUrl(e.cover_image) || ''} alt="" />
            ) : (
              <div
                className="media-card__img"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(219,39,119,0.12))',
                  color: 'var(--text-tertiary)',
                  fontWeight: 800,
                }}
              >
                Event
              </div>
            )}
            <div className="media-card__body">
              <h2 className="media-card__title">{e.title}</h2>
              <div className="rating-row" style={{ marginBottom: 6 }}>
                <span className="rating-bubble">{e.category.toUpperCase()}</span>
                <span className="rating-text">{e.region ? `${e.region} · ` : ''}{new Date(e.starts_at).toLocaleString()}</span>
              </div>
              <p className="media-card__meta">{e.venue || 'Venue TBA'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
