import type { CommunityCategory } from '@delve/contracts'

export const COMMUNITY_CATEGORIES: { id: CommunityCategory; label: string }[] = [
  { id: 'DESTINATION', label: 'Destination' },
  { id: 'BACKPACKING', label: 'Backpacking' },
  { id: 'ROAD_TRIPS', label: 'Road Trips' },
  { id: 'SOLO_TRAVEL', label: 'Solo Travel' },
  { id: 'BUDGET_TRAVEL', label: 'Budget Travel' },
  { id: 'LUXURY_TRAVEL', label: 'Luxury Travel' },
  { id: 'FOOD', label: 'Food' },
  { id: 'PHOTOGRAPHY', label: 'Photography' },
  { id: 'ADVENTURE', label: 'Adventure' },
  { id: 'TRANSPORT', label: 'Transport' },
  { id: 'ACCOMMODATION', label: 'Accommodation' },
  { id: 'DIGITAL_NOMADS', label: 'Digital Nomads' },
  { id: 'LOCAL_ADVICE', label: 'Local Advice' },
  { id: 'EVENTS', label: 'Events' },
  { id: 'STUDENT_TRAVEL', label: 'Student Travel' },
  { id: 'FAMILY_TRAVEL', label: 'Family Travel' },
  { id: 'WOMEN_TRAVELERS', label: 'Women Travelers' },
  { id: 'OTHER', label: 'Other' },
]

export function categoryLabel(id: CommunityCategory | string) {
  return COMMUNITY_CATEGORIES.find(c => c.id === id)?.label ?? id.replace(/_/g, ' ')
}

export type CommunityDiscoverFilter = 'forYou' | 'trending' | 'nearby' | 'joined' | 'new' | 'mine'

export const COMMUNITY_DISCOVER_FILTERS: { id: CommunityDiscoverFilter; label: string }[] = [
  { id: 'forYou', label: 'For You' },
  { id: 'trending', label: 'Trending' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'joined', label: 'Joined' },
  { id: 'new', label: 'New' },
  { id: 'mine', label: 'My Communities' },
]
