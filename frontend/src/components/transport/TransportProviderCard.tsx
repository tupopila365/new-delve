import { Link } from 'react-router-dom'
import { Building2, MapPin, MessageCircle, UserRound } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { ListingSection } from '../listing'
import { MessageProviderLink } from '../messages'

type VehicleProviderProps = {
  displayName: string
  username?: string
  bio?: string | null
  city?: string | null
  region?: string | null
  avatar?: string | null
  className?: string
}

export function VehicleProviderCard({
  displayName,
  username,
  bio,
  city,
  region,
  avatar,
  className = '',
}: VehicleProviderProps) {
  const profileHref = username ? `/u/${encodeURIComponent(username)}` : null

  return (
    <ListingSection title="Provider" className={`tp-provider-section ${className}`.trim()}>
      <div className="tp-detail__provider-card">
        <div className="tp-detail__provider-avatar" aria-hidden>
          {avatar ? (
            <img
              src={/^https?:\/\//i.test(avatar) ? avatar : mediaUrl(avatar) || avatar}
              alt=""
            />
          ) : (
            <UserRound size={22} strokeWidth={2} />
          )}
        </div>
        <div className="tp-detail__provider-body">
          <p className="tp-detail__provider-kicker">Transport provider</p>
          <p className="tp-detail__provider-name">{displayName}</p>
          {(city || region) && (
            <p className="tp-detail__provider-loc">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {[city, region].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="tp-detail__provider-bio">
            {bio?.trim() || 'Passenger transport on DELVE. Message for pickup times, rental terms, and seat confirmation.'}
          </p>
          <div className="tp-detail__provider-actions">
            {profileHref ? (
              <Link to={profileHref} className="btn btn-ghost btn-sm">
                <UserRound size={14} strokeWidth={2.25} aria-hidden />
                View provider profile
              </Link>
            ) : null}
            <MessageProviderLink username={username} size="sm" variant="ghost" />
          </div>
        </div>
      </div>
    </ListingSection>
  )
}

type BusOperatorProps = {
  operatorName: string
  className?: string
}

export function BusOperatorCard({ operatorName, className = '' }: BusOperatorProps) {
  return (
    <ListingSection title="Operator" className={`tp-provider-section ${className}`.trim()}>
      <div className="tp-detail__provider-card">
        <div className="tp-detail__provider-avatar" aria-hidden>
          <Building2 size={22} strokeWidth={2} />
        </div>
        <div className="tp-detail__provider-body">
          <p className="tp-detail__provider-kicker">Transport operator</p>
          <p className="tp-detail__provider-name">{operatorName}</p>
          <p className="tp-detail__provider-bio">
            Passenger trips on DELVE. Message the operator for boarding times, stops, and fare confirmation.
          </p>
          <div className="tp-detail__provider-actions">
            <Link to="/messages" className="btn btn-ghost btn-sm">
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              Message operator
            </Link>
            <Link to="/transport" className="btn btn-ghost btn-sm">
              Browse transport
            </Link>
          </div>
        </div>
      </div>
    </ListingSection>
  )
}
