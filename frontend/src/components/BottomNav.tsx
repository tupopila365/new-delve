import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

const items: { to: string; label: string; end?: boolean; Icon: FC<{ active: boolean }> }[] = [
  { to: '/', label: 'Home', end: true, Icon: IconHome },
  { to: '/delvers', label: 'Delvers', Icon: IconDelvers },
  { to: '/search', label: 'Search', Icon: IconSearch },
  { to: '/messages', label: 'Messages', Icon: IconMessages },
  { to: '/account', label: 'Profile', end: true, Icon: IconProfile },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
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

function IconDelvers({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <circle cx="6" cy="8" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
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

function IconMessages({ active }: { active: boolean }) {
  const c = active ? 'var(--accent-hover)' : 'var(--text)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
      <path d="M21 12a8 8 0 01-8 8H6l-4 3V8a8 8 0 018-8h9a8 8 0 018 8z" strokeLinejoin="round" />
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
