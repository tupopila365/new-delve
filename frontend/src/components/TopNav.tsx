import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mediaUrl } from '../api/client'

const navLinks: { to: string; label: string; end?: boolean }[] = [
  { to: '/accommodation', label: 'Stays' },
  { to: '/transport', label: 'Transport' },
  { to: '/events', label: 'Events' },
  { to: '/food', label: 'Food & drink' },
  { to: '/guides', label: 'Guides' },
  { to: '/delvers', label: 'Delvers' },
  { to: '/community', label: 'Community' },
]

export function TopNav() {
  const { profile } = useAuth()

  return (
    <header className="app-topnav" aria-label="Main navigation">
      <Link to="/" className="app-topnav__logo" aria-label="DELVE home">
        DELVE
      </Link>

      <nav className="app-topnav__links" aria-label="Site sections">
        {navLinks.map((l) => (
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

        <Link to="/account" className="app-topnav__avatar" aria-label="Account">
          {profile?.avatar ? (
            <img
              src={mediaUrl(profile.avatar) || ''}
              alt=""
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : profile ? (
            <span className="app-topnav__avatar-letter" aria-hidden>
              {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
            </span>
          ) : (
            <IconUser />
          )}
        </Link>
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

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" strokeLinecap="round" />
    </svg>
  )
}
