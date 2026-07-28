import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy highlight path — preserve general highlight query parameters. */
export function StoriesNewRedirect() {
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()
  return <Navigate to={`/create/highlight${qs ? `?${qs}` : ''}`} replace />
}
