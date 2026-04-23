import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'

type G = {
  id: number
  headline: string
  bio: string
  hourly_rate: string | null
  regions: string[]
  photo: string | null
  username: string
}

export function GuidesList() {
  const { data } = useQuery({
    queryKey: ['guides'],
    queryFn: () => apiFetch<G[]>('/api/guides/profiles/', { auth: false }),
  })

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="display">Tour guides</h1>
          <p className="page-sub">Local experts for your next trip</p>
        </div>
      </header>
      <div style={{ display: 'grid', gap: 18, marginTop: 8 }}>
        {data?.map((g) => (
          <Link key={g.id} to={`/guides/${g.id}`} className="media-card">
            {g.photo ? (
              <img className="media-card__img" src={mediaUrl(g.photo) || ''} alt="" />
            ) : (
              <div
                className="media-card__img"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, rgba(0,170,108,0.10), rgba(124,58,237,0.10))',
                  color: 'var(--text-tertiary)',
                  fontWeight: 800,
                }}
              >
                Guide
              </div>
            )}
            <div className="media-card__body">
              <h2 className="media-card__title">{g.headline}</h2>
              <div className="rating-row" style={{ marginBottom: 6 }}>
                <span className="rating-bubble">@{g.username}</span>
                <span className="rating-text">{(g.regions || []).slice(0, 3).join(', ') || 'Namibia'}</span>
              </div>
              {g.hourly_rate && (
                <div className="media-card__price">
                  N${g.hourly_rate}{' '}
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>/ hour</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
