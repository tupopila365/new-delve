import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { MAIN_NAV_SECTIONS } from '../data/mainNavSections'
import { ProfileMenu } from './ProfileMenu'

export function TopNav() {
  const { profile } = useAuth()

  return (
    <header className="app-topnav" aria-label="Main navigation">
      <Link to="/" className="app-topnav__logo" aria-label="DELVE home">
        DELVE
      </Link>

      <nav className="app-topnav__links" aria-label="Site sections">
        {MAIN_NAV_SECTIONS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              isActive ? 'app-topnav__link app-topnav__link--active' : 'app-topnav__link'
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="app-topnav__actions">
        <Link to="/search" className="app-topnav__icon-btn" aria-label="Search">
          <IconSearch />
        </Link>

        <Link to="/messages" className="app-topnav__icon-btn" aria-label="Messages">
          <IconMessages />
        </Link>

        <Link
          to={profile ? '/create' : '/login'}
          className="app-topnav__post-btn"
          aria-label="Create a post"
        >
          <IconPlus />
          Post
        </Link>

        <ProfileMenu avatarClassName="app-topnav__avatar" />
      </div>
    </header>
  )
}

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  )
}

function IconMessages() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

