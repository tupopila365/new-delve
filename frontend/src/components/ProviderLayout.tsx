import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mediaUrl } from '../api/client'
import { BUSINESS_TYPE_LABELS } from '../data/businessProfiles'
import { useBusinessAccess, type MyBusiness } from '../hooks/useBusinessAccess'

const NAV = [
  { to: '/provider', label: 'Overview', end: true },
  { to: '/provider/listings', label: 'Listings' },
  { to: '/provider/bookings', label: 'Bookings' },
  { to: '/provider/messages', label: 'Messages', external: '/messages' },
  { to: '/provider/reviews', label: 'Reviews' },
  { to: '/provider/settings', label: 'Settings', external: '/settings' },
] as const

const MODULE_LINKS = [
  { to: '/provider/stays', label: 'Stays', emoji: '🏨' },
  { to: '/provider/guides', label: 'Guides', emoji: '🧭' },
  { to: '/provider/transport', label: 'Transport', emoji: '🚗' },
  { to: '/provider/food', label: 'Food & drink', emoji: '🍽' },
]

export function ProviderLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null)
  const { businesses, activeBusiness, canManageListings, canManageBookings, isViewerOnly } =
    useBusinessAccess(activeBusinessId)

  const resolvedBusiness: MyBusiness | undefined =
    businesses.find((b) => b.id === (activeBusinessId ?? activeBusiness?.id)) ?? activeBusiness

  if (!profile) return <Navigate to="/login" replace />
  if (profile.user_type !== 'service_provider') return <Navigate to="/" replace />

  const isModule = MODULE_LINKS.some((m) => location.pathname.startsWith(m.to))

  return (
    <div className="prov-shell prov-shell--polished">
      <aside className={`prov-sidebar${mobileOpen ? ' prov-sidebar--open' : ''}`}>
        <div className="prov-sidebar__brand">
          <Link to="/" className="prov-sidebar__home">
            ← DELVE
          </Link>
          <span className="prov-sidebar__tag">Business dashboard</span>
        </div>

        {businesses.length > 0 ? (
          <label className="prov-sidebar__switcher">
            <span>Managing</span>
            <select
              value={resolvedBusiness?.id ?? ''}
              onChange={(e) => setActiveBusinessId(Number(e.target.value))}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.business_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <nav className="prov-sidebar__nav" aria-label="Provider dashboard">
          {NAV.map((item) =>
            'external' in item && item.external ? (
              <Link
                key={item.to}
                to={item.external}
                className="prov-sidebar__link"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  isActive && !isModule ? 'prov-sidebar__link prov-sidebar__link--active' : 'prov-sidebar__link'
                }
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="prov-sidebar__modules">
          <p className="prov-sidebar__modules-label">Categories</p>
          {MODULE_LINKS.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                isActive ? 'prov-sidebar__module prov-sidebar__module--active' : 'prov-sidebar__module'
              }
              onClick={() => setMobileOpen(false)}
            >
              <span aria-hidden>{m.emoji}</span> {m.label}
            </NavLink>
          ))}
        </div>

        <div className="prov-sidebar__foot">
          {resolvedBusiness ? (
            <Link to={`/business/${resolvedBusiness.id}`} className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
              View public business profile
            </Link>
          ) : null}
          {!canManageBookings ? (
            <p className="prov-sidebar__perm-hint">Bookings: view or reply only</p>
          ) : null}
          <Link to={`/u/${profile.username}`} className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
            Personal profile
          </Link>
        </div>
      </aside>

      <div className="prov-main">
        <header className="prov-topbar">
          <button
            type="button"
            className="prov-topbar__menu"
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="prov-topbar__title">
            <strong>{resolvedBusiness?.business_name ?? 'Provider dashboard'}</strong>
            {resolvedBusiness ? (
              <span>
                {resolvedBusiness.role ? `${resolvedBusiness.role} · ` : ''}
                {isViewerOnly ? 'View only · ' : ''}
                {!canManageListings && !isViewerOnly ? '' : ''}
                {resolvedBusiness.business_types
                  .filter((t) => t !== 'multi_provider')
                  .map((t) => BUSINESS_TYPE_LABELS[t as keyof typeof BUSINESS_TYPE_LABELS] ?? t)
                  .join(' · ') || 'Provider'}
              </span>
            ) : null}
          </div>
          {profile.avatar ? (
            <img className="prov-topbar__av" src={mediaUrl(profile.avatar) || ''} alt="" />
          ) : (
            <span className="prov-topbar__av prov-topbar__av--init">
              {(profile.display_name || profile.username).charAt(0).toUpperCase()}
            </span>
          )}
        </header>

        <div className="prov-content">
          <Outlet
            context={{
              activeBusiness: resolvedBusiness,
              businesses,
              canManageListings,
              canManageBookings,
            }}
          />
        </div>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="prov-sidebar__backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </div>
  )
}

export type ProviderOutletContext = {
  activeBusiness?: MyBusiness
  businesses: MyBusiness[]
  canManageListings: boolean
  canManageBookings: boolean
}
