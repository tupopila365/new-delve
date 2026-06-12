import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { MAIN_NAV_SECTIONS } from '../data/mainNavSections'
import { ProfileMenu } from './ProfileMenu'

export function MobileTopBar() {
  const { profile } = useAuth()

  return (
    <header className="mobile-topbar">
      <div className="mobile-topbar__top">
        <Link to="/" className="mobile-topbar__logo" aria-label="DELVE home">
          DELVE
        </Link>
        <div className="mobile-topbar__actions">
          <Link to="/search" className="mobile-topbar__icon" aria-label="Search">
            <IconSearch />
          </Link>
          {profile && (
            <Link to="/create" className="mobile-topbar__icon" aria-label="Create">
              <IconPlus />
            </Link>
          )}
          <Link to="/messages" className="mobile-topbar__icon" aria-label="Messages">
            <IconMessage />
          </Link>
          <ProfileMenu avatarClassName="mobile-topbar__icon mobile-topbar__profile-menu" />
        </div>
      </div>

      <nav className="mobile-topbar__sections" aria-label="Site sections">
        <div className="mobile-topbar__sections-scroll">
          {MAIN_NAV_SECTIONS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                isActive ? 'mobile-topbar__sect mobile-topbar__sect--active' : 'mobile-topbar__sect'
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}

function IconSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function IconMessage() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

