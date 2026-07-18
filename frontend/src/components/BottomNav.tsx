import { NavLink, useLocation } from 'react-router-dom'
import type { FC } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useNoFace } from '../hooks/useNoFace'

const navItems: { to: string; label: string; end?: boolean; Icon: FC<{ active: boolean }> }[] = [
  { to: '/', label: 'Explore', end: true, Icon: IconHome },
  { to: '/search', label: 'Search', Icon: IconSearch },
  { to: '/delvers', label: 'Delvers', Icon: IconDelvers },
  { to: '/journeys', label: 'Journeys', Icon: IconJourneys },
]

export function BottomNav() {
  const { profile } = useAuth()
  const { enabled: noFace } = useNoFace()
  const location = useLocation()
  const onDelvers = location.pathname === '/delvers' || location.pathname.startsWith('/delvers/')
  const profileTo = profile ? `/u/${profile.username}` : '/account'

  // No Face: Explore + Search + Profile only (no social tabs).
  const visibleItems = noFace
    ? navItems.filter((i) => i.to !== '/delvers' && i.to !== '/journeys')
    : navItems

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {visibleItems.map((i) => {
        const to = i.to === '/search' && onDelvers ? '/search?types=delvers' : i.to

        return (
          <NavLink key={i.to} to={to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {({ isActive }) => (
              <>
                <i.Icon active={isActive || (i.to === '/search' && location.pathname === '/search')} />
                <span className="bottom-nav__label">{i.label}</span>
              </>
            )}
          </NavLink>
        )
      })}

      <NavLink to={profileTo} className={({ isActive }) => (isActive ? 'active' : '')}>
        {({ isActive }) => (
          <>
            <IconProfile active={isActive} />
            <span className="bottom-nav__label">Profile</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}

function IconHome({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  )
}

function IconDelvers({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function IconJourneys({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <path d="M3 12h18M3 6h18M3 18h12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="18" r="2" />
    </svg>
  )
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" strokeLinecap="round" />
    </svg>
  )
}
