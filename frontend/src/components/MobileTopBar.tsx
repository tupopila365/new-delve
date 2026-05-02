import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mediaUrl } from '../api/client'

export function MobileTopBar() {
  const { profile } = useAuth()
  const loc = useLocation()
  const onHome = loc.pathname === '/'

  return (
    <header className="mobile-topbar">
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
        <Link to="/account" className="mobile-topbar__icon" aria-label="Account">
          {profile?.avatar ? (
            <img
              src={mediaUrl(profile.avatar) || ''}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                objectFit: 'cover',
                border: onHome ? '2px solid var(--accent)' : '2px solid var(--hairline)',
              }}
            />
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

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" strokeLinecap="round" />
    </svg>
  )
}
