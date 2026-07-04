import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy highlight path — preserve query params (e.g. host_story, listing). */
export function StoriesNewRedirect() {
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()
  return <Navigate to={`/create/highlight${qs ? `?${qs}` : ''}`} replace />
}
