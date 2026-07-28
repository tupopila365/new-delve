import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy route — Stay provider media now lives in Stay Admin Host Highlights. */
export function AccommodationStoryNew() {
  const [searchParams] = useSearchParams()
  const listing = searchParams.get('listing')?.trim()
  const params = new URLSearchParams({ tab: 'highlights' })
  if (listing) params.set('listing', listing)
  return <Navigate to={`/provider/stays?${params.toString()}`} replace />
}
