import type { ListingCategory } from '../data/providerData'

const TYPE_TO_CATEGORY: Record<string, ListingCategory> = {
  accommodation: 'Stay',
  guide: 'Guide',
  transport: 'Transport',
  food_drink: 'Food',
  event_organiser: 'Event',
  retail_shop: 'Shop',
}

const TYPE_LABELS: Record<string, string> = {
  accommodation: 'accommodation',
  guide: 'guide',
  transport: 'transport',
  food_drink: 'food & drink',
  retail_shop: 'shop & makers',
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
  Food: 'Food & drink',
  Event: 'Events',
  Shop: 'Shop',
}

export function listingTypeChips(types: string[]): { id: string; label: string }[] {
  const cats = categoriesForBusinessTypes(types)
  const chips: { id: string; label: string }[] = [{ id: 'All', label: 'All' }]
  for (const c of cats) {
    chips.push({ id: c, label: c === 'Food' ? 'Food & drink' : c })
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

export function categoryModuleLinks(types: string[]): { label: string; to: string; emoji: string }[] {
  const modules: { type: string; label: string; to: string; emoji: string }[] = [
    { type: 'accommodation', label: 'Stays', to: '/provider/stays', emoji: '🏨' },
    { type: 'guide', label: 'Guides', to: '/provider/guides', emoji: '🧭' },
    { type: 'transport', label: 'Transport', to: '/provider/transport', emoji: '🚗' },
    { type: 'food_drink', label: 'Food & drink', to: '/provider/food', emoji: '🍽' },
    { type: 'retail_shop', label: 'Shop', to: '/provider/shop', emoji: '🛍' },
    { type: 'event_organiser', label: 'Events', to: '/provider/events', emoji: '🎟' },
  ]
  return modules.filter((m) => types.includes(m.type) || types.includes('multi_provider'))
}
