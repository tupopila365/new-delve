import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess, type MyBusiness } from '../hooks/useBusinessAccess'
import { useNavBadges } from '../hooks/useNavBadges'
import { canResubmitVerification, verificationStatusHint } from '../utils/businessVerification'
import {
  MANAGE_ICON_SIZE,
  MANAGE_MODULE_ICONS,
  MANAGE_MODULE_LABELS,
  MANAGE_MODULE_PATHS,
  MANAGE_NAV_ICONS,
  type ManageModuleId,
  type ManageNavId,
} from './provider/manageIcons'
import { NavBadge } from './NavBadge'
import { ProfileMenu } from './ProfileMenu'
import { ProviderAccessGate } from './provider'
import { ListSkeleton } from './ui'
import '../components/provider/settings/provider-settings.css'
import '../components/provider/provider-manage-shell.css'

const NAV: { to: string; label: string; id: ManageNavId; end?: boolean }[] = [
  { to: '/provider', label: 'Overview', id: 'overview', end: true },
  { to: '/provider/listings', label: 'Listings', id: 'listings' },
  { to: '/provider/promotions', label: 'Promotions', id: 'promotions' },
  { to: '/provider/bookings', label: 'Bookings', id: 'bookings' },
  { to: '/provider/questions', label: 'Questions', id: 'questions' },
  { to: '/provider/messages', label: 'Messages', id: 'messages' },
  { to: '/provider/reviews', label: 'Reviews', id: 'reviews' },
  { to: '/provider/analytics', label: 'Analytics', id: 'analytics' },
  { to: '/provider/settings', label: 'Settings', id: 'settings', end: false },
]

const MODULE_IDS: ManageModuleId[] = [
  'accommodation',
  'guide',
  'transport',
  'food_drink',
  'retail_shop',
  'event_organiser',
]

function verificationLabel(status?: string) {
  if (status === 'verified') return 'Verified'
  if (status === 'pending') return 'Verification pending'
  if (status === 'rejected') return 'Verification rejected'
  if (status === 'suspended') return 'Suspended'
  return 'Unverified'
}

function shellClassName() {
  return 'manage-theme manage-theme--light prov-shell prov-shell--polished prov-shell--manage'
}

export function ProviderLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null)

  const { businesses, activeBusiness, canManageListings, canManageBookings, isLoading, canAccessProvider, canManageSettings } =
    useBusinessAccess(activeBusinessId)

  const resolvedBusiness: MyBusiness | undefined =
    businesses.find((b) => b.id === (activeBusinessId ?? activeBusiness?.id)) ?? activeBusiness

  const { pendingProviderBookings } = useNavBadges()

  if (!profile) return <Navigate to="/login" replace />

  if (isLoading) {
    return (
      <div className={shellClassName()}>
        <div className="prov-content prov-page">
          <p className="prov-page__sub">Loading provider dashboard…</p>
          <ListSkeleton count={4} variant="row" />
        </div>
      </div>
    )
  }

  if (!canAccessProvider) {
    return (
      <div className={shellClassName()}>
        <div className="prov-content">
          <ProviderAccessGate />
        </div>
      </div>
    )
  }

  const isModule = MODULE_IDS.some((id) => location.pathname.startsWith(MANAGE_MODULE_PATHS[id]))
  const noBusiness = businesses.length === 0
  const onboardingIncomplete = resolvedBusiness && resolvedBusiness.onboarding_completed === false

  const activeTypes = resolvedBusiness?.business_types ?? []
  const visibleModules = MODULE_IDS.filter(
    (id) => activeTypes.includes(id) || activeTypes.includes('multi_provider'),
  )

  if (noBusiness || onboardingIncomplete) {
    return <Navigate to="/provider/onboarding" replace />
  }

  return (
    <div className={shellClassName()}>
      <aside className={`prov-sidebar${mobileOpen ? ' prov-sidebar--open' : ''}`}>
        <div className="prov-sidebar__brand">
          <Link to="/" className="prov-sidebar__home" onClick={() => setMobileOpen(false)}>
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            DELVE
          </Link>
          <span className="prov-sidebar__tag">Provider</span>
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
          {NAV.map((item) => {
            const Icon = MANAGE_NAV_ICONS[item.id]
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  isActive && !isModule ? 'prov-sidebar__link prov-sidebar__link--active' : 'prov-sidebar__link'
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon
                  className="prov-sidebar__link-icon"
                  size={MANAGE_ICON_SIZE.nav}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span>{item.label}</span>
                {item.to === '/provider/bookings' && pendingProviderBookings > 0 ? (
                  <NavBadge count={pendingProviderBookings} />
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="prov-sidebar__modules">
          <p className="prov-sidebar__modules-label">Categories</p>
          {visibleModules.map((id) => {
            const Icon = MANAGE_MODULE_ICONS[id]
            const to = MANAGE_MODULE_PATHS[id]
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'prov-sidebar__module prov-sidebar__module--active' : 'prov-sidebar__module'
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={MANAGE_ICON_SIZE.module} strokeWidth={2.25} aria-hidden />
                {MANAGE_MODULE_LABELS[id]}
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
          {resolvedBusiness &&
          resolvedBusiness.verification_status !== 'verified' &&
          resolvedBusiness.verification_status !== 'unverified' ? (
            <div
              className={`prov-layout-banner${resolvedBusiness.verification_status === 'rejected' || resolvedBusiness.verification_status === 'suspended' ? ' prov-layout-banner--bad' : ''}`}
              role="status"
            >
              {verificationStatusHint(resolvedBusiness.verification_status, resolvedBusiness.verification_notes)}
              {canResubmitVerification(resolvedBusiness.verification_status) ? (
                <>
                  {' '}
                  <Link to="/provider/onboarding">Resubmit documents</Link>
                </>
              ) : null}
            </div>
          ) : null}
          <Outlet
            context={{
              activeBusiness: resolvedBusiness,
              businesses,
              canManageListings,
              canManageBookings,
              canManageSettings,
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
  canManageSettings: boolean
}
