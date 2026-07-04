import { Navigate, useParams } from 'react-router-dom'

/** Legacy route — all event moments go through the shared create studio. */
export function EventMomentNew() {
  const { id } = useParams()
  const eventId = id && Number.isFinite(Number(id)) ? id : ''
  const to = eventId ? `/create/post?event=${encodeURIComponent(eventId)}` : '/create/post'
  return <Navigate to={to} replace />
}
