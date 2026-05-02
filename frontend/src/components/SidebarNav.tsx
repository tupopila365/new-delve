import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

const links: { to: string; label: string; end?: boolean; Icon: FC }[] = [
  { to: '/', label: 'Home', end: true, Icon: IHome },
  { to: '/accommodation', label: 'Accommodation', Icon: IBed },
  { to: '/journeys', label: 'Journeys', Icon: IJourney },
  { to: '/delvers', label: 'Delvers', Icon: IPin },
  { to: '/transport', label: 'Transport', Icon: ICar },
  { to: '/events', label: 'Events', Icon: ICal },
  { to: '/food', label: 'Food & drinks', Icon: IFork },
  { to: '/guides', label: 'Tour guides', Icon: IMap },
  { to: '/search', label: 'Search', Icon: ISearch },
  { to: '/messages', label: 'Messages', Icon: IMsg },
  { to: '/account', label: 'Account', Icon: IUser },
  { to: '/settings', label: 'Settings', Icon: IGear },
]

export function SidebarNav() {
  return (
    <aside className="app-sidebar" aria-label="Main menu">
      <div className="app-sidebar__brand">DELVE</div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <l.Icon />
          {l.label}
        </NavLink>
      ))}
    </aside>
  )
}

const ik = { strokeWidth: 2, stroke: 'currentColor', fill: 'none' as const }

function IHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  )
}
function IBed() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M3 14v7M3 14l4-6h10l4 6M7 8V5a2 2 0 012-2h6a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IJourney() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M3 12h18M3 6h18M3 18h12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="18" r="2" />
    </svg>
  )
}
function IPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
function ICar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M7 17h10l1-5H6l1 5zM5 12l2-4h10l2 4M9 17v2M15 17v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="19" r="1.5" />
      <circle cx="16" cy="19" r="1.5" />
    </svg>
  )
}
function ICal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  )
}
function IFork() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M11 3v9M8 3v5a3 3 0 006 0V3M8 12v9M16 12v9" strokeLinecap="round" />
    </svg>
  )
}
function IMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path d="M9 20l-4 2V6l4-2 6 2 4-2v16l-4 2-6-2z" strokeLinejoin="round" />
    </svg>
  )
}
function ISearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  )
}
function IMsg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" strokeLinecap="round" />
    </svg>
  )
}
function IGear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...ik}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        strokeLinecap="round"
      />
    </svg>
  )
}
