import { Link } from 'react-router-dom'
import { Building2, LayoutDashboard, UserRound } from 'lucide-react'
import './profile-identity-links.css'

export type IdentityBusiness = {
  id: number
  business_name: string
}

type Props = {
  username: string
  businesses?: IdentityBusiness[]
  showDashboard?: boolean
  showPersonal?: boolean
  className?: string
}

export function ProfileIdentityLinks({
  username,
  businesses = [],
  showDashboard = false,
  showPersonal = true,
  className = '',
}: Props) {
  const hasBusiness = businesses.length > 0
  const primary = businesses[0]

  return (
    <nav className={`profile-identity${className ? ` ${className}` : ''}`} aria-label="Profile connections">
      {showPersonal ? (
        <Link to={`/u/${username}`} className="profile-identity__item">
          <UserRound size={15} strokeWidth={2.25} aria-hidden />
          <span>
            <strong>Personal</strong>
            <small>@{username}</small>
          </span>
        </Link>
      ) : null}
      {hasBusiness ? (
        businesses.map((b) => (
          <Link key={b.id} to={`/business/${b.id}`} className="profile-identity__item">
            <Building2 size={15} strokeWidth={2.25} aria-hidden />
            <span>
              <strong>{b.business_name}</strong>
              <small>Business profile</small>
            </span>
          </Link>
        ))
      ) : showDashboard ? (
        <Link to="/provider/onboarding" className="profile-identity__item profile-identity__item--muted">
          <Building2 size={15} strokeWidth={2.25} aria-hidden />
          <span>
            <strong>Set up business</strong>
            <small>Complete provider onboarding</small>
          </span>
        </Link>
      ) : null}
      {showDashboard ? (
        <Link to="/provider" className="profile-identity__item">
          <LayoutDashboard size={15} strokeWidth={2.25} aria-hidden />
          <span>
            <strong>Provider dashboard</strong>
            <small>{primary ? `Manage ${primary.business_name}` : 'Listings & bookings'}</small>
          </span>
        </Link>
      ) : null}
    </nav>
  )
}
