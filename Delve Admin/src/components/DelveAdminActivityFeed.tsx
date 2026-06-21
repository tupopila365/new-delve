import type { ActivityItem } from '../api/types'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  MessageSquare,
  Star,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<ActivityItem['type'], LucideIcon> = {
  user: UserPlus,
  business: Building2,
  booking: CalendarDays,
  report: AlertTriangle,
  listing: Building2,
  review: Star,
  system: MessageSquare,
}

type Props = {
  items: ActivityItem[]
  title?: string
  limit?: number
}

export function DelveAdminActivityFeed({ items, title = 'Recent activity', limit }: Props) {
  const rows = limit ? items.slice(0, limit) : items
  const showTitle = Boolean(title)

  return (
    <section className="da-activity">
      {showTitle ? <h2 className="da-activity__title">{title}</h2> : null}
      {rows.length === 0 ? (
        <p className="da-activity__empty">No recent activity.</p>
      ) : (
        <ul className="da-activity__list">
          {rows.map((item) => {
            const Icon = ICONS[item.type] ?? MessageSquare
            return (
              <li key={item.id} className={`da-activity__item da-activity__item--${item.type}`}>
                <span className="da-activity__icon" aria-hidden>
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <div className="da-activity__body">
                  <span className="da-activity__text">{item.text}</span>
                  <time className="da-activity__time">{item.time}</time>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
