import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { FilterSheet } from '../components/FilterSheet'

type Vehicle = {
  id: number
  title: string
  make: string
  model: string
  price_per_day: string
  region: string
  cover_image: string | null
}

type Trip = {
  id: number
  route_detail: { origin: string; destination: string; operator_name: string }
  departs_at: string
  price: string
  available_seats: number
}

export function Transport() {
  const [tab, setTab] = useState<'car' | 'bus'>('car')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [region, setRegion] = useState('')
  const [minP, setMinP] = useState('')
  const [maxP, setMaxP] = useState('')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')

  const vQs = useMemo(() => {
    const p = new URLSearchParams()
    if (region) p.set('region', region)
    if (minP) p.set('min_price', minP)
    if (maxP) p.set('max_price', maxP)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [region, minP, maxP])

  const bQs = useMemo(() => {
    const p = new URLSearchParams()
    if (origin) p.set('route_origin', origin)
    if (dest) p.set('route_destination', dest)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [origin, dest])

  const { data: vehicles } = useQuery({
    queryKey: ['veh', vQs],
    enabled: tab === 'car',
    queryFn: () => apiFetch<Vehicle[]>(`/api/transport/vehicles/${vQs}`, { auth: false }),
  })

  const { data: trips } = useQuery({
    queryKey: ['bus', bQs],
    enabled: tab === 'bus',
    queryFn: () => apiFetch<Trip[]>(`/api/transport/bus/trips/${bQs}`, { auth: false }),
  })

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="display">Transport</h1>
          <p className="page-sub">Rent a car or book a bus seat online</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Transport tabs">
          <button type="button" className={tab === 'car' ? 'active' : ''} onClick={() => setTab('car')} role="tab" aria-selected={tab === 'car'}>
            Car rental
          </button>
          <button type="button" className={tab === 'bus' ? 'active' : ''} onClick={() => setTab('bus')} role="tab" aria-selected={tab === 'bus'}>
            Public bus
          </button>
        </div>
      </header>

      <button type="button" className="btn btn-ghost" style={{ marginBottom: '0.75rem' }} onClick={() => setFiltersOpen(true)}>
        Filter & sort
      </button>
      <FilterSheet open={filtersOpen} title={tab === 'car' ? 'Car filters' : 'Bus filters'} onClose={() => setFiltersOpen(false)}>
        {tab === 'car' ? (
          <>
            <div className="field">
              <label className="label">Region</label>
              <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Min price / day</label>
              <input className="input" type="number" value={minP} onChange={(e) => setMinP(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Max price / day</label>
              <input className="input" type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label className="label">Origin contains</label>
              <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Windhoek" />
            </div>
            <div className="field">
              <label className="label">Destination contains</label>
              <input className="input" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Swakopmund" />
            </div>
          </>
        )}
        <button type="button" className="btn btn-primary btn-block" onClick={() => setFiltersOpen(false)}>
          Apply
        </button>
      </FilterSheet>

      {tab === 'car' && (
        <div style={{ display: 'grid', gap: 18 }}>
          {vehicles?.map((v) => (
            <Link key={v.id} to={`/transport/vehicle/${v.id}`} className="media-card">
              {v.cover_image ? (
                <img className="media-card__img" src={mediaUrl(v.cover_image) || ''} alt="" />
              ) : (
                <div
                  className="media-card__img"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, rgba(0,170,108,0.10), rgba(249,115,22,0.10))',
                    color: 'var(--text-tertiary)',
                    fontWeight: 800,
                  }}
                >
                  Car
                </div>
              )}
              <div className="media-card__body">
                <h2 className="media-card__title">{v.title}</h2>
                <div className="rating-row" style={{ marginBottom: 6 }}>
                  <span className="rating-bubble">NEW</span>
                  <span className="rating-text">
                    {v.make} {v.model} · {v.region}
                  </span>
                </div>
                <div className="media-card__price">
                  N${v.price_per_day}{' '}
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>/ day</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'bus' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {trips?.map((t) => (
            <Link key={t.id} to={`/transport/bus/${t.id}`} className="card" style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>
                  {t.route_detail.origin} → {t.route_detail.destination}
                </strong>
                <span className="pill pill--accent">Bus</span>
              </div>
              <div className="rating-row" style={{ marginTop: 6 }}>
                <span className="rating-bubble">LIVE</span>
                <span className="rating-text">{t.route_detail.operator_name}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {new Date(t.departs_at).toLocaleString()}
                </div>
                <div style={{ fontWeight: 900, color: 'var(--accent-hover)' }}>N${t.price}</div>
              </div>
              <div className="pill" style={{ marginTop: 10, display: 'inline-block' }}>
                {t.available_seats} seats left
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
