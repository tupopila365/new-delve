import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy route — host stories use the shared highlight studio. */
export function AccommodationStoryNew() {
  const [searchParams] = useSearchParams()
  const listing = searchParams.get('listing')?.trim()
  const returnTo = searchParams.get('return')?.trim() || '/provider/stays'
  const params = new URLSearchParams({
    host_story: '1',
    return: returnTo,
  })
  if (listing) params.set('listing', listing)
  return <Navigate to={`/create/highlight?${params.toString()}`} replace />
}
