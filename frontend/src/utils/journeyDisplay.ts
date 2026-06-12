import type { MockTrip } from '../data/mockTrips'

const HOOK_BY_TAG: Record<string, string> = {
  '4x4': 'Best for a first-time desert road trip',
  budget: 'Includes fuel, stay, and food estimates',
  solo: 'Ideal for independent travellers',
  family: 'Family-friendly pace and practical stops',
  wildlife: 'Wildlife routes with camp and park tips',
  coast: 'Coastal drives, lagoon stops, and seafood',
  weekend: 'Perfect for a long weekend escape',
  hiking: 'Trail days with gear and timing notes',
  photography: 'Golden-hour spots and photo timing',
  etosha: 'Self-drive park route without a tour group',
  'cross-border': 'Border crossing tips and fuel stops',
  'first-timer': 'First-time friendly — no tour group needed',
  kayaking: 'Water activities and lagoon-side stays',
  dunes: 'Dune sunrise routes and camp nights',
}

export function journeyHook(trip: MockTrip): string {
  for (const tag of trip.tags) {
    const hook = HOOK_BY_TAG[tag]
    if (hook) return hook
  }
  if (trip.party === 'couple') return 'Great for couples planning together'
  if (trip.party === 'family') return 'Paced for families with clear costs'
  if (trip.total_cost < 2500) return 'Strong value — full cost breakdown inside'
  return 'Real route with prices, stops, and local tips'
}

export function journeyAccentBadge(trip: MockTrip): string | null {
  if (trip.likes_count >= 80) return 'Popular'
  if (trip.total_cost < 2000) return 'Budget'
  if (trip.tags.includes('coast') || trip.tags.includes('kayaking')) return 'Coastal'
  if (trip.tags.includes('wildlife') || trip.tags.includes('etosha')) return 'Wildlife'
  if (trip.days <= 4 || trip.tags.includes('weekend')) return 'Weekend'
  if (trip.countries.length > 1) return 'Cross-border'
  if (trip.tags.includes('4x4')) return '4×4 route'
  return null
}

export function isWeekendTrip(t: MockTrip) {
  return t.days <= 4 || t.tags.includes('weekend')
}

export function isBudgetTrip(t: MockTrip) {
  return t.total_cost < 5000 || t.tags.includes('budget')
}
