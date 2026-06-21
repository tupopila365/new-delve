import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  Compass,
  Eye,
  Hotel,
  MessageCircle,
  Utensils,
} from 'lucide-react'

type Shortcut = {
  to: string
  label: string
  Icon: LucideIcon
}

type Props = {
  businessTypes: string[]
  businessId?: number
}

const CATEGORY_SHORTCUTS: { type: string; label: string; to: string; Icon: LucideIcon }[] = [
  { type: 'accommodation', label: 'Stays', to: '/provider/stays', Icon: Hotel },
  { type: 'guide', label: 'Guides', to: '/provider/guides', Icon: Compass },
  { type: 'transport', label: 'Transport', to: '/provider/transport', Icon: Car },
  { type: 'food_drink', label: 'Food & drink', to: '/provider/food', Icon: Utensils },
]

export function ProviderDashboardShortcuts({ businessTypes, businessId }: Props) {
  const categories = CATEGORY_SHORTCUTS.filter(
    (c) => businessTypes.includes(c.type) || businessTypes.includes('multi_provider'),
  )

  const main: Shortcut[] = [
    { to: '/provider/analytics', label: 'Analytics', Icon: BarChart3 },
    { to: '/provider/bookings', label: 'Bookings', Icon: CalendarDays },
    { to: '/provider/messages', label: 'Inbox', Icon: MessageCircle },
    { to: '/provider/listings', label: 'Listings', Icon: ClipboardList },
  ]

  const all = [
    ...main,
    ...categories.map((c) => ({ to: c.to, label: c.label, Icon: c.Icon })),
    ...(businessId ? [{ to: `/business/${businessId}`, label: 'Public profile', Icon: Eye }] : []),
  ]

  const seen = new Set<string>()
  const links = all.filter((item) => {
    const key = `${item.to}-${item.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <section>
      <h2 className="prov-ui__section-title">Quick links</h2>
      <div className="prov-ui__shortcuts">
        {links.map(({ to, label, Icon }) => (
          <Link key={`${to}-${label}`} to={to} className="prov-ui__shortcut">
            <Icon size={18} strokeWidth={2.25} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
