import React from 'react'
import {
  Bed,
  Utensils,
  Bus,
  Car,
  Compass,
  UserCheck,
  Zap,
  Globe,
  ShoppingBag,
  Calendar,
  Landmark,
  Sparkles,
  Music,
  Building2,
  type LucideIcon,
} from 'lucide-react'

export interface BusinessCategoryDefinition {
  id: string
  label: string
  description: string
  iconName: string
  popular?: boolean
}

export const BUSINESS_CATEGORIES: BusinessCategoryDefinition[] = [
  {
    id: 'Accommodation',
    label: 'Accommodation',
    description: 'Hotels, lodges, guesthouses, safari camps, boutique stays, villas',
    iconName: 'Bed',
    popular: true,
  },
  {
    id: 'Restaurant & Food',
    label: 'Restaurant & Food',
    description: 'Restaurants, cafes, bakeries, bars, street food, culinary experiences',
    iconName: 'Utensils',
    popular: true,
  },
  {
    id: 'Transport',
    label: 'Transport',
    description: 'Airport transfers, regional shuttles, bus lines, charter transport',
    iconName: 'Bus',
    popular: true,
  },
  {
    id: 'Car Rental',
    label: 'Car Rental',
    description: 'Self-drive 4x4s, safari vehicles, sedans, campers, fleet rentals',
    iconName: 'Car',
    popular: true,
  },
  {
    id: 'Tours',
    label: 'Tours',
    description: 'Multi-day safaris, guided day tours, scenic flights, cultural trips',
    iconName: 'Compass',
    popular: true,
  },
  {
    id: 'Tour Guide',
    label: 'Tour Guide',
    description: 'Independent licensed guides, safari trackers, local specialists',
    iconName: 'UserCheck',
  },
  {
    id: 'Activities & Experiences',
    label: 'Activities & Experiences',
    description: 'Quad biking, sandboarding, skydiving, boat cruises, ocean safaris',
    iconName: 'Zap',
    popular: true,
  },
  {
    id: 'Travel Agency',
    label: 'Travel Agency',
    description: 'Tour operators, full itinerary planners, corporate travel agents',
    iconName: 'Globe',
  },
  {
    id: 'Shop',
    label: 'Shop',
    description: 'Local crafts, artisan goods, souvenirs, outdoor gear, farm stalls',
    iconName: 'ShoppingBag',
  },
  {
    id: 'Events',
    label: 'Events',
    description: 'Event spaces, wedding venues, conference centers, festival hosts',
    iconName: 'Calendar',
  },
  {
    id: 'Attractions',
    label: 'Attractions',
    description: 'Living museums, national heritage sites, wildlife sanctuaries',
    iconName: 'Landmark',
  },
  {
    id: 'Wellness & Spa',
    label: 'Wellness & Spa',
    description: 'Day spas, hot springs, retreats, massage therapists, holistic health',
    iconName: 'Sparkles',
  },
  {
    id: 'Entertainment',
    label: 'Entertainment',
    description: 'Live music venues, night clubs, cultural performances, theater',
    iconName: 'Music',
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Other traveler-relevant services and specialty businesses',
    iconName: 'Building2',
  },
]

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Bed,
  Utensils,
  Bus,
  Car,
  Compass,
  UserCheck,
  Zap,
  Globe,
  ShoppingBag,
  Calendar,
  Landmark,
  Sparkles,
  Music,
  Building2,
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return CATEGORY_ICON_MAP[iconName] ?? Building2
}

export function findBusinessCategory(categoryIdOrLabel?: string | null): BusinessCategoryDefinition | null {
  if (!categoryIdOrLabel) return null
  const query = categoryIdOrLabel.trim().toLowerCase()
  return (
    BUSINESS_CATEGORIES.find(
      c => c.id.toLowerCase() === query || c.label.toLowerCase() === query,
    ) ?? null
  )
}
