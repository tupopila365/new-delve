import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdminAccessGate } from './admin'
import { ListSkeleton } from './ui'

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/businesses', label: 'Businesses' },
  { to: '/admin/bookings', label: 'Bookings' },
] as const

const NAV_SOON = [
  { to: '/admin#verifications', label: 'Verifications', hint: 'Preview' },
  { to: '/admin#reports', label: 'Reports', hint: 'Preview' },
  { to: '/admin#content', label: 'Content', hint: 'Preview' },
  { to: '/admin#analytics', label: 'Analytics', hint: 'Preview' },
  { to: '/admin#settings', label: 'Settings', hint: 'Soon' },
] as const

/** @deprecated Traveller app no longer hosts admin UI — use PlatformAdminHandoff + Delve Admin app. */
export function AdminLayout() {
  const { profile, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div className="adm-shell">
        <div className="adm-shell__content" style={{ padding: '1.5rem' }}>
          <p className="adm-head__sub">Loading platform admin…</p>
          <ListSkeleton count={4} variant="row" />
        </div>
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />

  if (!profile.is_staff) {
    return (
      <div className="adm-shell adm-shell--gate">
        <div className="adm-shell__content">
          <AdminAccessGate />
        </div>
      </div>
    )
  }

  return (
    <div className="adm-shell">
      <aside className={`adm-shell__sidebar${mobileOpen ? ' adm-shell__sidebar--open' : ''}`}>
        <div className="adm-shell__brand">
          <Link to="/" onClick={() => setMobileOpen(false)}>
            ← DELVE
          </Link>
          <span>Platform admin</span>
        </div>

        <nav className="adm-shell__nav" aria-label="Platform admin">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                isActive ? 'adm-shell__link adm-shell__link--active' : 'adm-shell__link'
              }
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-shell__nav-soon">
          <p className="adm-shell__nav-label">More tools</p>
          {NAV_SOON.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="adm-shell__link adm-shell__link--soon"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
              <small>{item.hint}</small>
            </Link>
          ))}
        </div>

        <div className="adm-shell__foot-links">
          <Link to="/provider" className="adm-shell__foot" onClick={() => setMobileOpen(false)}>
            Provider area
          </Link>
          <Link to="/dashboard" className="adm-shell__foot" onClick={() => setMobileOpen(false)}>
            Travel dashboard
          </Link>
        </div>
      </aside>

      <div className="adm-shell__main">
        <header className="adm-shell__top">
          <button
            type="button"
            className="adm-shell__menu"
            aria-label="Open admin menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="adm-shell__top-copy">
            <strong>Platform admin</strong>
            <span>@{profile.username}</span>
          </div>
        </header>
        <div className="adm-shell__content">
          <Outlet />
        </div>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="adm-shell__backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </div>
  )
}
