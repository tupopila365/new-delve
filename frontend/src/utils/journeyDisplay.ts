import type { MockTrip } from '../data/mockTrips'
import { partyDisplayLabel } from '../components/journeys/PartyPicker'

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

const COUNTRY_NAMES: Record<string, string> = {
  NA: 'Namibia',
  BW: 'Botswana',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
}

const TRANSPORT_LABELS: Record<string, string> = {
  car: 'Self-drive',
  bus: 'Bus',
  flight: 'Flight',
  train: 'Train',
  boat: 'Boat',
  walk: 'Walking',
}

export const JOURNEY_DEFAULT_IMAGE = '/images/default-journey.jpg'

export function dayLabel(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

export function countryLabel(code: string) {
  return COUNTRY_NAMES[code] ?? code
}

export function routeLabel(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length === 0) return trip.countries.map(countryLabel).join(', ')
  if (places.length <= 2) return places.join(' → ')
  return `${places[0]} → ${places[places.length - 1]}`
}

export function stopsPreviewLabel(trip: MockTrip, max = 3) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length === 0) return null
  if (places.length <= max) return places.join(' · ')
  return `${places.slice(0, max).join(' · ')} +${places.length - max} more`
}

export function partyLabel(party: string) {
  return partyDisplayLabel(party)
}

export function transportLabel(modes: string[]) {
  if (modes.length === 0) return 'Mixed transport'
  return modes.map((mode) => TRANSPORT_LABELS[mode] ?? mode.replace(/_/g, ' ')).join(' · ')
}

export function formatJourneyCost(amount: number, currency = 'NAD') {
  const prefix = currency === 'NAD' ? 'N$' : `${currency} `
  return `${prefix}${amount.toLocaleString()}`
}

export function journeyCoverSrc(cover: string | null | undefined) {
  return cover?.trim() ? cover : JOURNEY_DEFAULT_IMAGE
}

export function fmtJourneyDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtJourneyDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}

export function nightsBetween(arrived: string, left: string) {
  return Math.max(1, Math.round((new Date(left).getTime() - new Date(arrived).getTime()) / 86400000))
}

export function dayRangeLabel(arrived: string, left: string) {
  const a = fmtJourneyDateShort(arrived)
  const b = fmtJourneyDateShort(left)
  return a === b ? `Day ${a}` : `${a} – ${b}`
}

export function buildJourneyGalleryImages(
  trip: MockTrip,
  photoItems: { src: string; caption: string; place: string }[],
): import('../components/listing/types').ListingGalleryItem[] {
  const images: import('../components/listing/types').ListingGalleryItem[] = []
  const cover = journeyCoverSrc(trip.cover_image)
  if (cover) {
    images.push({ id: 'cover', src: cover, alt: trip.title })
  }
  for (const [i, p] of photoItems.entries()) {
    if (images.some((img) => img.src === p.src)) continue
    images.push({
      id: `photo-${i}`,
      src: p.src,
      alt: p.caption || p.place,
      caption: p.place,
    })
  }
  return images.length > 0 ? images : [{ src: JOURNEY_DEFAULT_IMAGE, alt: trip.title }]
}

export function journeyStyleTags(trip: MockTrip): string[] {
  const accent = journeyAccentBadge(trip)
  const tags: string[] = []
  if (accent) tags.push(accent)
  if (trip.tags.includes('photography') && !tags.includes('Photography')) tags.push('Photography')
  if (trip.tags.includes('4x4') && !tags.some((tag) => tag.includes('4'))) tags.push('4×4 route')
  if (trip.tags.includes('food') && !tags.includes('Food')) tags.push('Food')
  return tags.slice(0, 3)
}
