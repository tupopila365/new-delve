import { useState } from 'react'

import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

import { mediaUrl } from '../api/client'

import { BUSINESS_TYPE_LABELS } from '../data/businessProfiles'

import { useBusinessAccess, type MyBusiness } from '../hooks/useBusinessAccess'

import { useNavBadges } from '../hooks/useNavBadges'

import { NavBadge } from './NavBadge'

import { ProviderAccessGate } from './provider'

import { ListSkeleton } from './ui'



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

] as const



const EVENTS_LINK = { to: '/events/new', label: 'Events', emoji: '🎟', hint: 'Create & manage' }



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

  const { businesses, activeBusiness, canManageListings, canManageBookings, isViewerOnly, isLoading, canAccessProvider } =

    useBusinessAccess(activeBusinessId)



  const resolvedBusiness: MyBusiness | undefined =

    businesses.find((b) => b.id === (activeBusinessId ?? activeBusiness?.id)) ?? activeBusiness



  const { pendingProviderBookings } = useNavBadges()



  if (!profile) return <Navigate to="/login" replace />



  if (isLoading) {

    return (

      <div className="prov-shell prov-shell--polished">

        <div className="prov-content prov-page">

          <p className="prov-page__sub">Loading provider dashboard…</p>

          <ListSkeleton count={4} variant="row" />

        </div>

      </div>

    )

  }



  if (!canAccessProvider) {

    return (

      <div className="prov-shell prov-shell--polished">

        <div className="prov-content">

          <ProviderAccessGate />

        </div>

      </div>

    )

  }



  const isModule = MODULE_LINKS.some((m) => location.pathname.startsWith(m.to))

  const noBusiness = businesses.length === 0



  return (

    <div className="prov-shell prov-shell--polished">

      <aside className={`prov-sidebar${mobileOpen ? ' prov-sidebar--open' : ''}`}>

        <div className="prov-sidebar__brand">

          <Link to="/" className="prov-sidebar__home" onClick={() => setMobileOpen(false)}>

            ← DELVE

          </Link>

          <span className="prov-sidebar__tag">Provider dashboard</span>

        </div>



        {businesses.length > 1 ? (

          <label className="prov-sidebar__switcher">

            <span>Active business</span>

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

        ) : resolvedBusiness ? (

          <div className="prov-sidebar__biz-card">

            <strong>{resolvedBusiness.business_name}</strong>

            <span>{verificationLabel(resolvedBusiness.verification_status)}</span>

          </div>

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

                {item.to === '/provider/bookings' && pendingProviderBookings > 0 ? (

                  <NavBadge count={pendingProviderBookings} className="prov-sidebar__badge" />

                ) : null}

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

          <Link to={EVENTS_LINK.to} className="prov-sidebar__module prov-sidebar__module--planned" onClick={() => setMobileOpen(false)}>

            <span aria-hidden>{EVENTS_LINK.emoji}</span> {EVENTS_LINK.label}

            <small>{EVENTS_LINK.hint}</small>

          </Link>

        </div>



        <div className="prov-sidebar__foot">

          {resolvedBusiness ? (

            <Link to={`/business/${resolvedBusiness.id}`} className="prov-sidebar__public" onClick={() => setMobileOpen(false)}>

              Public business profile

            </Link>

          ) : null}

          {!canManageBookings ? (

            <p className="prov-sidebar__perm-hint">Bookings: view or reply only</p>

          ) : null}

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

            ☰

          </button>

          <div className="prov-topbar__title">

            <strong>{resolvedBusiness?.business_name ?? 'Provider dashboard'}</strong>

            {resolvedBusiness ? (

              <span>

                {resolvedBusiness.role ? `${resolvedBusiness.role} · ` : ''}

                {isViewerOnly ? 'View only · ' : ''}

                {verificationLabel(resolvedBusiness.verification_status)} ·{' '}

                {resolvedBusiness.business_types

                  .filter((t) => t !== 'multi_provider')

                  .map((t) => BUSINESS_TYPE_LABELS[t as keyof typeof BUSINESS_TYPE_LABELS] ?? t)

                  .join(' · ') || 'Provider'}

              </span>

            ) : (

              <span>Business tools</span>

            )}

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

          {noBusiness ? (

            <ProviderAccessGate

              title="You need a business profile to use provider tools"

              sub="Connect or create a business profile to manage listings, bookings, messages, and reviews on DELVE."

            />

          ) : (

            <Outlet

              context={{

                activeBusiness: resolvedBusiness,

                businesses,

                canManageListings,

                canManageBookings,

              }}

            />

          )}

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


