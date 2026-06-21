import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Car, Compass, Hotel, Menu, Utensils, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess, type MyBusiness } from '../hooks/useBusinessAccess'
import { useNavBadges } from '../hooks/useNavBadges'
import { NavBadge } from './NavBadge'
import { ProfileMenu } from './ProfileMenu'
import { ProviderAccessGate } from './provider'
import { ListSkeleton } from './ui'

const NAV = [
  { to: '/provider', label: 'Overview', end: true },
  { to: '/provider/listings', label: 'Listings' },
  { to: '/provider/promotions', label: 'Promotions' },
  { to: '/provider/bookings', label: 'Bookings' },
  { to: '/provider/messages', label: 'Messages' },
  { to: '/provider/reviews', label: 'Reviews' },
  { to: '/provider/analytics', label: 'Analytics' },
  { to: '/provider/settings', label: 'Settings', end: false },
] as const

const MODULE_LINKS: { to: string; label: string; Icon: LucideIcon; serviceType: string }[] = [
  { to: '/provider/stays', label: 'Stays', Icon: Hotel, serviceType: 'accommodation' },
  { to: '/provider/guides', label: 'Guides', Icon: Compass, serviceType: 'guide' },
  { to: '/provider/transport', label: 'Transport', Icon: Car, serviceType: 'transport' },
  { to: '/provider/food', label: 'Food & drink', Icon: Utensils, serviceType: 'food_drink' },
]

function verificationLabel(status?: string) {
  if (status === 'verified') return 'Verified'
  if (status === 'pending') return 'Verification pending'
  if (status === 'suspended') return 'Suspended'
  return 'Unverified'
}

export function ProviderLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null)

  const { businesses, activeBusiness, canManageListings, canManageBookings, isLoading, canAccessProvider } =
    useBusinessAccess(activeBusinessId)

  const resolvedBusiness: MyBusiness | undefined =
    businesses.find((b) => b.id === (activeBusinessId ?? activeBusiness?.id)) ?? activeBusiness

  const { pendingProviderBookings } = useNavBadges()

  if (!profile) return <Navigate to="/login" replace />

  if (isLoading) {
    return (
      <div className="prov-shell prov-shell--polished prov-shell--dark">
        <div className="prov-content prov-page">
          <p className="prov-page__sub">Loading provider dashboard…</p>
          <ListSkeleton count={4} variant="row" />
        </div>
      </div>
    )
  }

  if (!canAccessProvider) {
    return (
      <div className="prov-shell prov-shell--polished prov-shell--dark">
        <div className="prov-content">
          <ProviderAccessGate />
        </div>
      </div>
    )
  }

  const isModule = MODULE_LINKS.some((m) => location.pathname.startsWith(m.to))
  const noBusiness = businesses.length === 0
  const onboardingIncomplete = resolvedBusiness && resolvedBusiness.onboarding_completed === false

  const activeTypes = resolvedBusiness?.business_types ?? []
  const visibleModules = MODULE_LINKS.filter(
    (m) => activeTypes.includes(m.serviceType) || activeTypes.includes('multi_provider'),
  )

  if (noBusiness || onboardingIncomplete) {
    return <Navigate to="/provider/onboarding" replace />
  }

  return (
    <div className="prov-shell prov-shell--polished prov-shell--dark">
      <aside className={`prov-sidebar${mobileOpen ? ' prov-sidebar--open' : ''}`}>
        <div className="prov-sidebar__brand">
          <Link to="/" className="prov-sidebar__home" onClick={() => setMobileOpen(false)}>
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            DELVE
          </Link>
          <span className="prov-sidebar__tag">Provider dashboard</span>
        </div>

        {businesses.length > 1 ? (
          <label className="prov-sidebar__switcher">
            <span>Active business</span>
            <select value={resolvedBusiness?.id ?? ''} onChange={(e) => setActiveBusinessId(Number(e.target.value))}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.business_name}
                </option>
              ))}
            </select>
          </label>
        ) : resolvedBusiness ? (
          <div className="prov-sidebar__biz-card">
            <strong>{resolvedBusiness.business_name}</strong>
            <span>{verificationLabel(resolvedBusiness.verification_status)}</span>
          </div>
        ) : null}

        <nav className="prov-sidebar__nav" aria-label="Provider dashboard">
          {NAV.map((item) => (
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
                {item.to === '/provider/bookings' && pendingProviderBookings > 0 ? (
                  <NavBadge count={pendingProviderBookings} />
                ) : null}
              </NavLink>
            ))}
        </nav>

        <div className="prov-sidebar__modules">
          <p className="prov-sidebar__modules-label">Categories</p>
          {visibleModules.map((m) => {
            const Icon = m.Icon
            return (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  isActive ? 'prov-sidebar__module prov-sidebar__module--active' : 'prov-sidebar__module'
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} strokeWidth={2.25} aria-hidden />
                {m.label}
              </NavLink>
            )
          })}
        </div>

        <div className="prov-sidebar__foot">
          {resolvedBusiness ? (
            <Link to={`/business/${resolvedBusiness.id}`} className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
              Public business profile
            </Link>
          ) : null}
          {!canManageBookings ? <p className="prov-sidebar__perm-hint">Bookings: view or reply only</p> : null}
          <Link to={`/u/${profile.username}`} className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
            Personal profile
          </Link>
          <Link to="/dashboard" className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
            Travel dashboard
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
            <Menu size={20} strokeWidth={2.25} aria-hidden />
          </button>
          <div className="prov-topbar__title">
            <strong>{resolvedBusiness?.business_name ?? 'Provider dashboard'}</strong>
          </div>
          <ProfileMenu className="prov-topbar__profile" avatarClassName="prov-topbar__av" />
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
