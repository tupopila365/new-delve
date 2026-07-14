import { Link } from 'react-router-dom'
import { Building2, MessageCircle, UserRound } from 'lucide-react'
import { ListingSection } from '../listing'
import { usePrimaryBusiness } from '../../hooks/useOwnerBusinesses'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { organizerLabel, type EventDetail } from '../../utils/eventListing'
import './event-detail.css'

type Props = {
  event: EventDetail
  className?: string
}

export function EventOrganizerCard({ event, className = '' }: Props) {
  const organizerName = organizerLabel(event)
  const profileHref = event.organizer_username
    ? `/u/${encodeURIComponent(event.organizer_username)}`
    : null
  const messageHref = event.organizer_username
    ? messageProviderPath(
        event.organizer_username,
        {
          type: 'event',
          id: event.id,
          label: event.title,
        },
        event.business ?? null,
      )
    : null
  const { primary: business } = usePrimaryBusiness(event.organizer_username)
  const businessHref = business ? `/business/${business.id}` : null

  return (
    <ListingSection title="Organizer" className={`ev-organizer-section ${className}`.trim()}>
      <div className="evd-organizer-card">
        <div className="evd-organizer-card__avatar" aria-hidden>
          <UserRound size={22} strokeWidth={2} />
        </div>
        <div className="evd-organizer-card__body">
          <p className="evd-organizer-card__kicker">Event organizer</p>
          <p className="evd-organizer__name">{organizerName}</p>
          <p className="evd-organizer__copy">
            Hosted on DELVE. Message the organizer for tickets, group bookings, or accessibility questions.
          </p>
          <div className="evd-organizer-card__actions">
            {businessHref ? (
              <Link to={businessHref} className="btn btn-ghost btn-sm">
                <Building2 size={14} strokeWidth={2.25} aria-hidden />
                View business
              </Link>
            ) : null}
            {profileHref ? (
              <Link to={profileHref} className="btn btn-ghost btn-sm">
                <UserRound size={14} strokeWidth={2.25} aria-hidden />
                View profile
              </Link>
            ) : null}
            {messageHref ? (
              <Link to={messageHref} className="btn btn-ghost btn-sm">
                <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                Message organizer
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </ListingSection>
  )
}
