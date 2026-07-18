import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from './UserAvatar'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { adminConsoleUrl } from '../utils/adminAppUrl'
import { useNavBadges } from '../hooks/useNavBadges'
import { useNoFace } from '../hooks/useNoFace'
import { NavBadge } from './NavBadge'

type Props = {
  className?: string
  avatarClassName?: string
}

export function ProfileMenu({ className = '', avatarClassName = '' }: Props) {
  const { profile, logout } = useAuth()
  const { enabled: noFace } = useNoFace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses-menu'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })
  const isProvider = profile?.user_type === 'service_provider'
  const { pendingUserBookings } = useNavBadges()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!profile) {
    return (
      <Link to="/login" className={`profile-menu__trigger ${avatarClassName}`} aria-label="Sign in">
        <IconUser />
      </Link>
    )
  }

  const onLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className={`profile-menu ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`profile-menu__trigger ${avatarClassName}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <UserAvatar
          src={profile.avatar}
          name={profile.display_name || profile.username}
          fill
          className="profile-menu__avatar-inner"
        />
      </button>

      {open ? (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__head">
            <strong>{profile.display_name || profile.username}</strong>
            <span>@{profile.username}</span>
          </div>

          <p className="profile-menu__section-label">You</p>
          <Link to={`/u/${profile.username}`} className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            View profile
          </Link>
          <Link to="/dashboard" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            My travel dashboard
          </Link>
          <Link to="/dashboard#bookings" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            My bookings
            {pendingUserBookings > 0 ? <NavBadge count={pendingUserBookings} className="profile-menu__badge" /> : null}
          </Link>
          <Link to="/dashboard#saved" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Saved places
          </Link>
          {noFace ? null : (
            <Link to="/messages" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              Messages
            </Link>
          )}

          {isProvider || businesses.length > 0 ? (
            <>
              <div className="profile-menu__divider" role="separator" />
              <p className="profile-menu__section-label">Provider tools</p>
              <Link to="/provider" className="profile-menu__item profile-menu__item--accent" role="menuitem" onClick={() => setOpen(false)}>
                Business dashboard
              </Link>
              {businesses.map((b) => (
                <Link
                  key={b.id}
                  to={`/business/${b.id}`}
                  className="profile-menu__item profile-menu__item--sub"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {b.business_name}
                </Link>
              ))}
              <Link to="/provider/listings" className="profile-menu__item profile-menu__item--sub" role="menuitem" onClick={() => setOpen(false)}>
                Listings
              </Link>
              <Link to="/provider/bookings" className="profile-menu__item profile-menu__item--sub" role="menuitem" onClick={() => setOpen(false)}>
                Bookings
              </Link>
              <Link to="/provider/reviews" className="profile-menu__item profile-menu__item--sub" role="menuitem" onClick={() => setOpen(false)}>
                Reviews
              </Link>
            </>
          ) : null}

          {profile.is_staff ? (
            <>
              <div className="profile-menu__divider" role="separator" />
              <p className="profile-menu__section-label">Admin tools</p>
              <a
                href={adminConsoleUrl()}
                className="profile-menu__item profile-menu__item--accent"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Delve Admin console
              </a>
              <a
                href={adminConsoleUrl('/users')}
                className="profile-menu__item profile-menu__item--sub"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Users
              </a>
              <a
                href={adminConsoleUrl('/verifications')}
                className="profile-menu__item profile-menu__item--sub"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Verifications
              </a>
              <a
                href={adminConsoleUrl('/email-verification')}
                className="profile-menu__item profile-menu__item--sub"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Email verification
              </a>
            </>
          ) : null}

          <div className="profile-menu__divider" role="separator" />
          <p className="profile-menu__section-label">Account</p>
          <Link to="/account" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Account
          </Link>
          <Link to="/settings" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button type="button" className="profile-menu__item profile-menu__item--danger" role="menuitem" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
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
