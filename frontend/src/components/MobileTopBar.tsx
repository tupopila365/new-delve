import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { PRIMARY_NAV_SECTIONS, SECONDARY_NAV_SECTIONS } from '../data/mainNavSections'
import { useNavBadges } from '../hooks/useNavBadges'
import { NavBadge } from './NavBadge'
import { ProfileMenu } from './ProfileMenu'
import './community/community-feed-cards.css'

export function MobileTopBar() {
  const { profile } = useAuth()
  const { unreadMessages } = useNavBadges()
  const [moreOpen, setMoreOpen] = useState(false)

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
          <Link
            to={profile ? '/create' : '/login'}
            className="cm-feed-toolbar__item cm-feed-toolbar__item--action mobile-topbar__post-btn"
            aria-label={profile ? 'Post photo, story, or journey' : 'Sign in to post'}
          >
            <span className="cm-feed-toolbar__circle" aria-hidden>
              <Plus size={20} strokeWidth={2.5} aria-hidden />
            </span>
          </Link>
          <Link to="/messages" className="mobile-topbar__icon mobile-topbar__icon--badge" aria-label="Messages">
            <IconMessage />
            <NavBadge count={unreadMessages} />
          </Link>
          <ProfileMenu avatarClassName="mobile-topbar__icon mobile-topbar__profile-menu" />
        </div>
      </div>

      <nav className="mobile-topbar__sections" aria-label="Site sections">
        <div className="mobile-topbar__sections-scroll">
          {PRIMARY_NAV_SECTIONS.map((l) => (
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
          <button
            type="button"
            className={`mobile-topbar__sect mobile-topbar__sect--more${moreOpen ? ' mobile-topbar__sect--active' : ''}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div className="mobile-topbar__more-panel">
          {SECONDARY_NAV_SECTIONS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="mobile-topbar__more-item"
              onClick={() => setMoreOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
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
