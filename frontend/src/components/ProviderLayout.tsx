import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Menu, Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess, type MyBusiness } from '../hooks/useBusinessAccess'
import { useNavBadges } from '../hooks/useNavBadges'
import { canResubmitVerification, verificationStatusHint } from '../utils/businessVerification'
import {
  concreteBusinessTypes,
  readActiveBusinessId,
  writeActiveBusinessId,
} from '../utils/activeBusiness'
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
import { ProviderOnboarding } from '../pages/ProviderOnboarding'
import { loginHrefWithReturn } from '../utils/authRedirect'
import '../components/provider/settings/provider-settings.css'
import '../components/provider/provider-manage-shell.css'
import '../components/provider/onboarding/provider-onboarding.css'

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
  'activity',
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
  const [searchParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(() =>
    readActiveBusinessId(profile?.username),
  )

  useEffect(() => {
    setActiveBusinessId(readActiveBusinessId(profile?.username))
  }, [profile?.username])

  const selectBusiness = (id: number | null) => {
    setActiveBusinessId(id)
    writeActiveBusinessId(profile?.username, id)
  }

  const {
    businesses,
    activeBusiness,
    canManageListings,
    canManageBookings,
    isLoading,
    canAccessProvider,
    canManageSettings,
  } = useBusinessAccess(activeBusinessId)

  const paramBusinessId = Number(searchParams.get('business') || 0) || null
  const forceNew = searchParams.get('new') === '1'
  const forceSetup = searchParams.get('setup') === '1'

  useEffect(() => {
    if (paramBusinessId && businesses.some((b) => b.id === paramBusinessId)) {
      selectBusiness(paramBusinessId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL business param once
  }, [paramBusinessId, businesses])

  useEffect(() => {
    if (!businesses.length || activeBusinessId == null) return
    if (!businesses.some((b) => b.id === activeBusinessId)) {
      selectBusiness(businesses[0]?.id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, activeBusinessId])

  const resolvedBusiness: MyBusiness | undefined =
    businesses.find((b) => b.id === (activeBusinessId ?? activeBusiness?.id)) ?? activeBusiness

  const incompleteBusiness = businesses.find((b) => b.onboarding_completed === false)
  const noBusiness = businesses.length === 0

  const showOnboarding =
    noBusiness ||
    forceNew ||
    forceSetup ||
    Boolean(resolvedBusiness && resolvedBusiness.onboarding_completed === false) ||
    Boolean(incompleteBusiness && !resolvedBusiness)

  const { pendingProviderBookings } = useNavBadges()

  if (!profile) return <Navigate to={loginHrefWithReturn('/provider')} replace />

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
  const activeTypes = concreteBusinessTypes(resolvedBusiness?.business_types)
  const visibleModules = MODULE_IDS.filter((id) => activeTypes.includes(id))

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

        {showOnboarding ? (
          <div className="prov-sidebar__biz-card">
            <strong>
              {forceNew
                ? 'New business'
                : resolvedBusiness?.business_name ||
                  incompleteBusiness?.business_name ||
                  'Business setup'}
            </strong>
            <span>
              {noBusiness || forceNew || incompleteBusiness
                ? 'Finish setup to unlock tools'
                : 'Update verification'}
            </span>
          </div>
        ) : businesses.length > 1 ? (
          <label className="prov-sidebar__switcher">
            <span>Active business</span>
            <select
              value={resolvedBusiness?.id ?? ''}
              onChange={(e) => selectBusiness(Number(e.target.value))}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.business_name}
                  {b.onboarding_completed === false ? ' (setup)' : ''}
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

        {!showOnboarding ? (
          <>
            <nav className="prov-sidebar__nav" aria-label="Provider dashboard">
              {NAV.map((item) => {
                const Icon = MANAGE_NAV_ICONS[item.id]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    className={({ isActive }) =>
                      isActive && !isModule
                        ? 'prov-sidebar__link prov-sidebar__link--active'
                        : 'prov-sidebar__link'
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
                      isActive
                        ? 'prov-sidebar__module prov-sidebar__module--active'
                        : 'prov-sidebar__module'
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={MANAGE_ICON_SIZE.module} strokeWidth={2.25} aria-hidden />
                    {MANAGE_MODULE_LABELS[id]}
                  </NavLink>
                )
              })}
            </div>
          </>
        ) : (
          <nav className="prov-sidebar__nav" aria-label="Provider setup">
            <NavLink
              to="/provider"
              end
              className="prov-sidebar__link prov-sidebar__link--active"
              onClick={() => setMobileOpen(false)}
            >
              <span>Business setup</span>
            </NavLink>
          </nav>
        )}

        <div className="prov-sidebar__foot">
          {canManageSettings && !showOnboarding ? (
            <Link to="/provider?new=1" className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>
              <Plus size={14} strokeWidth={2.25} aria-hidden /> Add business
            </Link>
          ) : null}
          {resolvedBusiness && !showOnboarding ? (
            <Link
              to={`/business/${resolvedBusiness.id}`}
              className="prov-sidebar__public"
              onClick={() => setMobileOpen(false)}
            >
              Public business profile
            </Link>
          ) : null}
          {!showOnboarding && !canManageBookings ? (
            <p className="prov-sidebar__perm-hint">Bookings: view or reply only</p>
          ) : null}
          <Link
            to={`/u/${profile.username}`}
            className="prov-sidebar__public"
            onClick={() => setMobileOpen(false)}
          >
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
            <strong>
              {showOnboarding
                ? 'Business setup'
                : (resolvedBusiness?.business_name ?? 'Provider dashboard')}
            </strong>
          </div>
          <ProfileMenu className="prov-topbar__profile" avatarClassName="prov-topbar__av" />
        </header>

        <div className="prov-content">
          {showOnboarding ? (
            <ProviderOnboarding
              embedded
              key={forceNew ? 'new' : `biz-${paramBusinessId || incompleteBusiness?.id || resolvedBusiness?.id || 'setup'}`}
            />
          ) : (
            <>
              {resolvedBusiness &&
              resolvedBusiness.verification_status !== 'verified' &&
              resolvedBusiness.verification_status !== 'unverified' ? (
                <div
                  className={`prov-layout-banner${
                    resolvedBusiness.verification_status === 'rejected' ||
                    resolvedBusiness.verification_status === 'suspended'
                      ? ' prov-layout-banner--bad'
                      : ''
                  }`}
                  role="status"
                >
                  {verificationStatusHint(
                    resolvedBusiness.verification_status,
                    resolvedBusiness.verification_notes,
                  )}
                  {canResubmitVerification(resolvedBusiness.verification_status) ? (
                    <>
                      {' '}
                      <Link to={`/provider?setup=1&business=${resolvedBusiness.id}`}>
                        Resubmit documents
                      </Link>
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
                  setActiveBusinessId: selectBusiness,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export type ProviderOutletContext = {
  activeBusiness?: MyBusiness
  businesses: MyBusiness[]
  canManageListings: boolean
  canManageBookings: boolean
  canManageSettings?: boolean
  setActiveBusinessId?: (id: number | null) => void
}
