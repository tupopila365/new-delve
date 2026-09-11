import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface PublicOnlyRouteProps {
  children?: ReactNode
  redirectPath?: string
}

/**
 * Route wrapper for public-only auth routes (e.g., /login, /signup).
 * If the user is already authenticated, automatically redirects them
 * to their saved destination (`location.state.from`) or to `/account`.
 */
export function PublicOnlyRoute({
  children,
  redirectPath = '/account',
}: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--fg)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string; search?: string } })?.from
    const destination = from
      ? `${from.pathname ?? ''}${from.search ?? ''}`
      : redirectPath
    return <Navigate to={destination || '/account'} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default PublicOnlyRoute
