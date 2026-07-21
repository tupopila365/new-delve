import type { LucideIcon } from 'lucide-react'
import type { ListingCategory } from '../data/providerData'
import {
  MANAGE_MODULE_ICONS,
  MANAGE_MODULE_LABELS,
  MANAGE_MODULE_PATHS,
  type ManageModuleId,
} from '../components/provider/manageIcons'

const TYPE_TO_CATEGORY: Record<string, ListingCategory> = {
  accommodation: 'Stay',
  guide: 'Guide',
  transport: 'Transport',
  food_drink: 'Food',
  event_organiser: 'Event',
  retail_shop: 'Shop',
  activity: 'Activity',
}

const TYPE_LABELS: Record<string, string> = {
  accommodation: 'accommodation',
  guide: 'guide',
  transport: 'transport',
  food_drink: 'food & drink',
  retail_shop: 'shop & makers',
  activity: 'activities',
}

export function categoriesForBusinessTypes(types: string[]): ListingCategory[] {
  const cats = types
    .filter((t) => t !== 'multi_provider')
    .map((t) => TYPE_TO_CATEGORY[t])
    .filter((c): c is ListingCategory => Boolean(c))
  if (cats.length > 0) return [...new Set(cats)]
  return []
}

export function bookingsPageSubtitle(types: string[]): string {
  const parts = types.filter((t) => t !== 'multi_provider').map((t) => TYPE_LABELS[t] ?? t.replace(/_/g, ' '))
  if (parts.length === 0) return 'Manage your booking requests.'
  if (parts.length === 1) return `Manage ${parts[0]} booking requests.`
  const last = parts.pop()
  return `Manage ${parts.join(', ')} and ${last} booking requests.`
}

const CATEGORY_CHIP_LABELS: Record<ListingCategory, string> = {
  Stay: 'Stays',
  Guide: 'Guides',
  Transport: 'Transport',
  Food: 'Foodies',
  Event: 'Events',
  Shop: 'Shop',
  Activity: 'Activities',
}

export function listingTypeChips(types: string[]): { id: string; label: string }[] {
  const cats = categoriesForBusinessTypes(types)
  const chips: { id: string; label: string }[] = [{ id: 'All', label: 'All' }]
  for (const c of cats) {
    chips.push({ id: c, label: c === 'Food' ? 'Foodies' : c })
  }
  return chips
}

export function reviewListingChips(types: string[]): { id: string; label: string }[] {
  const cats = categoriesForBusinessTypes(types)
  const chips: { id: string; label: string }[] = [{ id: 'All listings', label: 'All listings' }]
  for (const c of cats) {
    chips.push({ id: CATEGORY_CHIP_LABELS[c], label: CATEGORY_CHIP_LABELS[c] })
  }
  return chips
}

export function listingsPageSubtitle(businessName: string, types: string[]): string {
  const parts = types.filter((t) => t !== 'multi_provider').map((t) => TYPE_LABELS[t] ?? t.replace(/_/g, ' '))
  if (parts.length === 0) return `All listings for ${businessName}.`
  if (parts.length === 1) return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} listings for ${businessName}.`
  return `Listings for ${businessName} — ${parts.join(', ')}.`
}

const MODULE_ORDER: ManageModuleId[] = [
  'accommodation',
  'guide',
  'transport',
  'food_drink',
  'retail_shop',
  'activity',
  'event_organiser',
]

export function categoryModuleLinks(
  types: string[],
): { label: string; to: string; Icon: LucideIcon; type: ManageModuleId }[] {
  return MODULE_ORDER.filter((type) => types.includes(type)).map((type) => ({
    type,
    label: MANAGE_MODULE_LABELS[type],
    to: MANAGE_MODULE_PATHS[type],
    Icon: MANAGE_MODULE_ICONS[type],
  }))
}
