import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { loginHrefWithReturn } from '../../utils/authRedirect'

type Props = {
  children: ReactNode
  /** Optional custom return path; defaults to current location. */
  next?: string
  /** Shown while auth bootstrap is in flight. */
  fallback?: ReactNode
}

/**
 * Hard gate for authenticated routes. Uses replace so logout → back
 * does not resurrect /provider or Settings from history.
 */
export function RequireAuth({ children, next, fallback = null }: Props) {
  const { profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return <>{fallback}</>
  if (!profile) {
    const returnTo = next ?? `${loc.pathname}${loc.search}`
    return <Navigate to={loginHrefWithReturn(returnTo)} replace />
  }
  return <>{children}</>
}
