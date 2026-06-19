import { CalendarDays, Clock, Sparkles } from 'lucide-react'
import { ListingSection } from '../listing'
import {
  buildGoogleCalendarUrl,
  eventCountdownLabel,
  eventTimeRange,
  formatEventDateLong,
  type EventDetail,
} from '../../utils/eventListing'
import './event-detail.css'

type Props = {
  event: EventDetail
  className?: string
}

export function EventDateShowcase({ event, className = '' }: Props) {
  const start = formatEventDateLong(event.starts_at)
  const timeLabel = eventTimeRange(event)
  const countdown = eventCountdownLabel(event.starts_at)
  const gcalUrl = buildGoogleCalendarUrl(event)

  if (!start.valid) return null

  return (
    <ListingSection title="Save the date" className={`ev-date-showcase ${className}`.trim()}>
      <div className="ev-date-showcase__inner">
        <div className="ev-date-showcase__visual" aria-label={`${start.month} ${start.day}`}>
          <span className="ev-date-showcase__month">{start.month}</span>
          <span className="ev-date-showcase__day">{start.day}</span>
        </div>

        <div className="ev-date-showcase__body">
          <p className="ev-date-showcase__weekday">{start.weekday}</p>
          <p className="ev-date-showcase__full">{start.date}</p>
          <p className="ev-date-showcase__time">
            <Clock size={14} strokeWidth={2.25} aria-hidden />
            {timeLabel}
          </p>
          {countdown ? (
            <span className="ev-date-showcase__countdown">
              <Sparkles size={12} strokeWidth={2.25} aria-hidden />
              {countdown}
            </span>
          ) : null}
        </div>

        <div className="ev-date-showcase__actions">
          <a
            href={gcalUrl}
            className="ev-date-showcase__cal-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
            Add to calendar
          </a>
        </div>
      </div>
    </ListingSection>
  )
}
