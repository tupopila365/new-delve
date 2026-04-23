import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'

export function EventDetail() {
  const { id } = useParams()
  const { data } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{
        title: string
        description: string
        category: string
        starts_at: string
        ends_at: string | null
        venue: string
        region: string
        cover_image: string | null
        organizer_username: string
      }>(`/api/events/${id}/`, { auth: false }),
  })

  if (!data) return <div className="skeleton" style={{ height: 200 }} />

  return (
    <div>
      {data.cover_image && <img src={mediaUrl(data.cover_image)} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 240, objectFit: 'cover' }} />}
      <h1 className="display" style={{ fontSize: '1.5rem' }}>{data.title}</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        By {data.organizer_username} · {data.region}
      </p>
      <div className="pill">{data.category}</div>
      <p>
        <strong>When:</strong> {new Date(data.starts_at).toLocaleString()}
        {data.ends_at && ` – ${new Date(data.ends_at).toLocaleString()}`}
      </p>
      <p>
        <strong>Where:</strong> {data.venue || 'TBA'}
      </p>
      <p>{data.description}</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ticketing (mock) can plug in later.</p>
    </div>
  )
}
