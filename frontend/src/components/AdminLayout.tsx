import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/businesses', label: 'Businesses' },
  { to: '/admin/bookings', label: 'Bookings' },
]

export function AdminLayout() {
  const { profile, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.is_staff) return <Navigate to="/" replace />

  return (
    <div className="adm-shell">
      <aside className={`adm-shell__sidebar${mobileOpen ? ' adm-shell__sidebar--open' : ''}`}>
        <div className="adm-shell__brand">
          <Link to="/">← DELVE</Link>
          <span>Platform admin</span>
        </div>
        <nav className="adm-shell__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'adm-shell__link adm-shell__link--active' : 'adm-shell__link'
              }
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/provider" className="adm-shell__foot" onClick={() => setMobileOpen(false)}>
          Provider area
        </Link>
      </aside>

      <div className="adm-shell__main">
        <header className="adm-shell__top">
          <button type="button" className="adm-shell__menu" onClick={() => setMobileOpen((v) => !v)}>
            ☰
          </button>
          <strong>DELVE platform admin</strong>
          <span>@{profile.username}</span>
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
