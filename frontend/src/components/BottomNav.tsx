import { NavLink } from 'react-router-dom'
import type { FC } from 'react'
import { useAuth } from '../auth/AuthContext'

const leftItems: { to: string; label: string; end?: boolean; Icon: FC<{ active: boolean }> }[] = [
  { to: '/', label: 'Home', end: true, Icon: IconHome },
  { to: '/search', label: 'Search', Icon: IconSearch },
]

const rightItems: { to: string; label: string; Icon: FC<{ active: boolean }> }[] = [
  { to: '/community', label: 'Community', Icon: IconCommunity },
  { to: '/account', label: 'Profile', Icon: IconProfile },
]

export function BottomNav() {
  const { profile } = useAuth()

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {leftItems.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <i.Icon active={isActive} />
              <span className="bottom-nav__label">{i.label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Centre post button — links to /create, only shown when logged in, greyed otherwise */}
      <NavLink
        to={profile ? '/create' : '/login'}
        className="bottom-nav__post"
        aria-label="Create a post"
      >
        <span className="bottom-nav__post-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </NavLink>

      {rightItems.map((i) => (
        <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <i.Icon active={isActive} />
              <span className="bottom-nav__label">{i.label}</span>
            </>
          )}
        </NavLink>
      ))}
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

function IconCommunity({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <circle cx="8" cy="7" r="3" strokeLinecap="round" />
      <path d="M3 20v-1a4.5 4.5 0 014.5-4.5H8" strokeLinecap="round" />
      <circle cx="16" cy="7" r="3" strokeLinecap="round" />
      <path d="M13 20v-1a4.5 4.5 0 014.5-4.5H16" strokeLinecap="round" />
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
