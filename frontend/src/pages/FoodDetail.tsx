import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'

export function FoodDetail() {
  const { id } = useParams()
  const { data } = useQuery({
    queryKey: ['food', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{
        name: string
        description: string
        cuisine: string
        region: string
        city: string
        price_level: number
        cover_image: string | null
        owner_username: string
      }>(`/api/food/venues/${id}/`, { auth: false }),
  })

  if (!data) return <div className="skeleton" style={{ height: 200 }} />

  return (
    <div>
      {data.cover_image && <img src={mediaUrl(data.cover_image)} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }} />}
      <h1 className="display" style={{ fontSize: '1.5rem' }}>{data.name}</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        {data.city ? `${data.city}, ` : ''}
        {data.region} · {data.owner_username}
      </p>
      <div className="pill">{data.cuisine}</div>
      <p>Price level: {'$'.repeat(data.price_level || 1)}</p>
      <p>{data.description}</p>
    </div>
  )
}
