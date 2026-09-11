import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface ProtectedRouteProps {
  children?: ReactNode
  redirectPath?: string
}

/**
 * ProtectedRoute wrapper component:
 * - Checks `isAuthenticated` and `isLoading` from `useAuth()`.
 * - While the initial auth check is in flight, renders a loading state to prevent premature redirection.
 * - If unauthenticated, redirects to `/login` while saving intended destination in `state.from`.
 * - If authenticated, renders `children` or `<Outlet />`.
 */
export function ProtectedRoute({
  children,
  redirectPath = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--fg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
            Verifying session…
          </span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
