/**
 * Canonical Lucide icons for Provider manage modules.
 * Never use emoji in provider chrome, shortcuts, or category strips.
 */
import {
  Bus,
  CalendarDays,
  Car,
  ClipboardList,
  Compass,
  Hotel,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Settings,
  ShoppingBag,
  Star,
  Ticket,
  TrendingUp,
  Utensils,
} from 'lucide-react'

export type ManageModuleId =
  | 'accommodation'
  | 'guide'
  | 'transport'
  | 'food_drink'
  | 'retail_shop'
  | 'event_organiser'

export type ManageNavId =
  | 'overview'
  | 'listings'
  | 'promotions'
  | 'bookings'
  | 'questions'
  | 'messages'
  | 'reviews'
  | 'analytics'
  | 'settings'

/** Vertical modules (sidebar + dashboard shortcuts). */
export const MANAGE_MODULE_ICONS: Record<ManageModuleId, LucideIcon> = {
  accommodation: Hotel,
  guide: Compass,
  transport: Car,
  food_drink: Utensils,
  retail_shop: ShoppingBag,
  event_organiser: Ticket,
}

export const MANAGE_MODULE_LABELS: Record<ManageModuleId, string> = {
  accommodation: 'Stays',
  guide: 'Guides',
  transport: 'Transport',
  food_drink: 'Food & drink',
  retail_shop: 'Shop',
  event_organiser: 'Events',
}

export const MANAGE_MODULE_PATHS: Record<ManageModuleId, string> = {
  accommodation: '/provider/stays',
  guide: '/provider/guides',
  transport: '/provider/transport',
  food_drink: '/provider/food',
  retail_shop: '/provider/shop',
  event_organiser: '/provider/events',
}

/** Primary provider nav (sidebar). */
export const MANAGE_NAV_ICONS: Record<ManageNavId, LucideIcon> = {
  overview: LayoutDashboard,
  listings: ClipboardList,
  promotions: TrendingUp,
  bookings: CalendarDays,
  questions: Inbox,
  messages: MessageSquare,
  reviews: Star,
  analytics: TrendingUp,
  settings: Settings,
}

/** Bus-specific affordances inside Transport (optional). */
export const MANAGE_TRANSPORT_BUS_ICON: LucideIcon = Bus

export const MANAGE_ICON_SIZE = {
  nav: 18,
  module: 18,
  inline: 16,
  empty: 28,
} as const
