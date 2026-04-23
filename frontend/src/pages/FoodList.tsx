import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { FilterSheet } from '../components/FilterSheet'

type Fv = {
  id: number
  name: string
  cuisine: string
  region: string
  price_level: number
  cover_image: string | null
}

export function FoodList() {
  const [open, setOpen] = useState(false)
  const [cuisine, setCuisine] = useState('')
  const [region, setRegion] = useState('')

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (cuisine) p.set('cuisine', cuisine)
    if (region) p.set('region', region)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [cuisine, region])

  const { data } = useQuery({
    queryKey: ['food', qs],
    queryFn: () => apiFetch<Fv[]>(`/api/food/venues/${qs}`, { auth: false }),
  })

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="display">Food & drinks</h1>
          <p className="page-sub">Best places to eat, coffee, and nightlife</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
          Filter
        </button>
      </header>
      <FilterSheet open={open} title="Filters" onClose={() => setOpen(false)}>
        <div className="field">
          <label className="label">Cuisine</label>
          <input className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="local, grill…" />
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
        {data?.map((f) => (
          <Link key={f.id} to={`/food/${f.id}`} className="media-card">
            {f.cover_image ? (
              <img className="media-card__img" src={mediaUrl(f.cover_image) || ''} alt="" />
            ) : (
              <div
                className="media-card__img"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, rgba(0,170,108,0.10), rgba(37,99,235,0.10))',
                  color: 'var(--text-tertiary)',
                  fontWeight: 800,
                }}
              >
                Food
              </div>
            )}
            <div className="media-card__body">
              <h2 className="media-card__title">{f.name}</h2>
              <div className="rating-row" style={{ marginBottom: 6 }}>
                <span className="rating-bubble">{'$'.repeat(f.price_level || 1)}</span>
                <span className="rating-text">
                  {f.cuisine} · {f.region}
                </span>
              </div>
              <p className="media-card__meta">Tap for details, photos, and provider info</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
