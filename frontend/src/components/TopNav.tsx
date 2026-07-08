import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { PRIMARY_NAV_SECTIONS, SECONDARY_NAV_SECTIONS } from '../data/mainNavSections'
import { useNavBadges } from '../hooks/useNavBadges'
import { NavBadge } from './NavBadge'
import { ProfileMenu } from './ProfileMenu'
import './community/community-feed-cards.css'

export function TopNav() {
  const { profile } = useAuth()
  const { unreadMessages } = useNavBadges()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <header className="app-topnav" aria-label="Main navigation">
      <Link to="/" className="app-topnav__logo" aria-label="DELVE home">
        DELVE
      </Link>

      <nav className="app-topnav__links" aria-label="Site sections">
        {PRIMARY_NAV_SECTIONS.map((l) => (
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

        <div className="app-topnav__more" ref={moreRef}>
          <button
            type="button"
            className={`app-topnav__link app-topnav__more-btn${moreOpen ? ' app-topnav__more-btn--open' : ''}`}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </button>
          {moreOpen ? (
            <div className="app-topnav__more-panel" role="menu">
              {SECONDARY_NAV_SECTIONS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="app-topnav__more-item"
                  role="menuitem"
                  onClick={() => setMoreOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      <div className="app-topnav__actions">
        <Link to="/search" className="app-topnav__icon-btn" aria-label="Search">
          <IconSearch />
        </Link>

        <Link to="/messages" className="app-topnav__icon-btn app-topnav__icon-btn--badge" aria-label="Messages">
          <IconMessages />
          <NavBadge count={unreadMessages} />
        </Link>

        <Link
          to={profile ? '/create' : '/login'}
          className="cm-feed-toolbar__item cm-feed-toolbar__item--action app-topnav__post-btn"
          aria-label={profile ? 'Post photo, story, or journey' : 'Sign in to post'}
        >
          <span className="cm-feed-toolbar__circle" aria-hidden>
            <Plus size={20} strokeWidth={2.5} aria-hidden />
          </span>
          <span className="cm-feed-toolbar__label">Post</span>
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
