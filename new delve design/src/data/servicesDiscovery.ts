import { allListings, type ListingFull, type ListingType } from './listingData'

/** Services browse excludes stays — those belong on a dedicated Stays surface. */
export const serviceListings: ListingFull[] = allListings.filter(l => l.listingType !== 'stay')

// ─── Category → listingType ────────────────────────────────────────────────

const categoryType: Record<string, ListingType | undefined> = {
  All: undefined,
  Food: 'food',
  Activity: 'activity',
  Guide: 'guide',
  Event: 'event',
  Shop: 'shop',
}

export function listingMatchesCategory(listing: ListingFull, category: string) {
  if (listing.listingType === 'stay') return false
  if (category === 'All') return true
  const type = categoryType[category]
  if (type) return listing.listingType === type
  return listing.serviceCategory === category
}

// ─── Needs by category ─────────────────────────────────────────────────────

export const needsByCategory: Record<string, string[]> = {
  All: ['Tonight', 'Family', 'Under N$500', 'Verified'],
  Food: ['Open now', 'Outdoor', 'Local cuisine', 'Verified'],
  Activity: ['Half-day', 'Adventure', 'Kid-friendly', 'Verified'],
  Guide: ['English', 'Verified', 'Day trip', 'Private'],
  Event: ['This weekend', 'Free entry', 'Live music', 'Verified'],
  Shop: ['Crafts', 'Open today', 'Local makers', 'Verified'],
}

export function getNeedsForCategory(category: string): string[] {
  return needsByCategory[category] ?? needsByCategory.All
}

// ─── Need predicates ───────────────────────────────────────────────────────

function parseListingPrice(price: string): number {
  if (!price || price === '0') return 0
  const n = parseInt(price.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function listingText(listing: ListingFull): string {
  return [
    listing.title,
    listing.subtitle,
    listing.description,
    listing.serviceCategory,
    listing.propertyType,
    listing.duration,
    listing.ageGuidance,
    listing.fitnessLevel,
    listing.experience,
    listing.openingHours,
    listing.eventDate,
    listing.venue,
    ...(listing.highlights ?? []),
    ...(listing.amenities ?? []),
    ...(listing.cuisine ?? []),
    ...(listing.languages ?? []),
    ...(listing.dietaryTags ?? []),
    ...(listing.areas ?? []),
    ...(listing.fulfillmentOptions ?? []),
    ...(listing.packages?.map(p => `${p.name} ${p.duration} ${p.description}`) ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Real predicates for discovery chips; unknown needs fall back to text match. */
export function listingMatchesNeed(listing: ListingFull, need: string): boolean {
  const blob = listingText(listing)
  const price = parseListingPrice(listing.price)
  const openish =
    listing.availability === 'available' || listing.availability === 'limited'

  switch (need) {
    case 'Verified':
      return listing.verification.verified

    case 'Under N$500':
      return price > 0 ? price <= 500 : listing.price === '0'

    case 'Tonight':
      return openish

    case 'Family':
      return (
        blob.includes('family') ||
        blob.includes('children') ||
        blob.includes('kid') ||
        (listing.maxGuests != null && listing.maxGuests >= 4) ||
        /all ages|suitable for all/i.test(listing.ageGuidance ?? '')
      )

    case 'Beach':
      return (
        blob.includes('beach') ||
        blob.includes('ocean') ||
        blob.includes('atlantic') ||
        blob.includes('coastal') ||
        blob.includes('waterfront')
      )

    case 'Self-catering':
      return blob.includes('self-catering') || blob.includes('kitchen')

    case 'Open now':
      return listing.listingType === 'food' && openish && !!listing.openingHours

    case 'Outdoor':
      return (
        blob.includes('outdoor') ||
        blob.includes('terrace') ||
        blob.includes('patio') ||
        blob.includes('waterfront') ||
        blob.includes('deck')
      )

    case 'Local cuisine':
      return (
        listing.cuisine?.some(c => /namibian|local|south african/i.test(c)) === true ||
        blob.includes('namibian') ||
        blob.includes('local cuisine') ||
        blob.includes('bobotie')
      )

    case 'Half-day':
      return (
        /half[-\s]?day/i.test(blob) ||
        /^(3|4)\s*hours?/i.test(listing.duration ?? '') ||
        /3–4|3-4|2–4|2-4/i.test(listing.duration ?? '') ||
        listing.packages?.some(p => /half|3 hour|4 hour/i.test(`${p.name} ${p.duration}`)) === true
      )

    case 'Adventure':
      return (
        blob.includes('adventure') ||
        blob.includes('sandboard') ||
        blob.includes('quad') ||
        blob.includes('dune') ||
        blob.includes('hiking') ||
        !!listing.fitnessLevel
      )

    case 'Kid-friendly':
      return (
        blob.includes('kid') ||
        blob.includes('family') ||
        blob.includes('children') ||
        blob.includes('all levels') ||
        /all ages|suitable for all/i.test(listing.ageGuidance ?? '')
      )

    case 'English':
      return listing.languages?.some(lang => /english/i.test(lang)) === true || blob.includes('english')

    case 'Day trip':
      return (
        /day trip|full[-\s]?day|half[-\s]?day/i.test(blob) ||
        /8–10|8-10|full day/i.test(listing.duration ?? '') ||
        listing.packages?.some(p => /day/i.test(`${p.name} ${p.duration}`)) === true
      )

    case 'Private':
      return (
        blob.includes('private') ||
        blob.includes('custom') ||
        (listing.groupSizeMax != null && listing.groupSizeMax <= 4) ||
        listing.packages?.some(p => /1–4|1-4|private/i.test(`${p.groupSize} ${p.name}`)) === true
      )

    case 'This weekend':
      return (
        listing.listingType === 'event' &&
        (/fri|sat|weekend/i.test(listing.eventDate ?? '') || blob.includes('weekend'))
      )

    case 'Free entry':
      return listing.price === '0' || blob.includes('free entry') || blob.includes('free')

    case 'Live music':
      return blob.includes('live music') || blob.includes('music')

    case 'Crafts':
      return (
        blob.includes('craft') ||
        blob.includes('handmade') ||
        blob.includes('basket') ||
        blob.includes('artisan')
      )

    case 'Open today':
      return openish && listing.listingType === 'shop'

    case 'Local makers':
      return (
        blob.includes('local') ||
        blob.includes('artisan') ||
        blob.includes('handmade') ||
        blob.includes('fair-trade') ||
        blob.includes('fair trade')
      )

    default:
      return blob.includes(need.toLowerCase())
  }
}

export function listingMatchesNeeds(
  listing: ListingFull,
  needs: Iterable<string>,
): boolean {
  const list = [...needs]
  if (list.length === 0) return true
  return list.every(need => listingMatchesNeed(listing, need))
}

// ─── Popular destinations ──────────────────────────────────────────────────

export type PopularDestination = {
  name: string
  countLabel: string
  img: string
}

/** Short place names used for filtering (matched with listing.destination includes). */
const destinationSeeds: { name: string; img: string }[] = [
  {
    name: 'Swakopmund',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=120&h=100&fit=crop&auto=format',
  },
  {
    name: 'Sossusvlei',
    img: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=120&h=100&fit=crop&auto=format',
  },
  {
    name: 'Windhoek',
    img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=120&h=100&fit=crop&auto=format',
  },
  {
    name: 'Etosha',
    img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=120&h=100&fit=crop&auto=format',
  },
]

export const popularDestinations: PopularDestination[] = destinationSeeds
  .map(d => {
    const count = serviceListings.filter(l =>
      l.destination.toLowerCase().includes(d.name.toLowerCase()),
    ).length
    return {
      name: d.name,
      img: d.img,
      countLabel: `${count} listing${count !== 1 ? 's' : ''}`,
    }
  })
  .filter(d => parseInt(d.countLabel, 10) > 0)
  .sort((a, b) => {
    const ca = parseInt(a.countLabel, 10)
    const cb = parseInt(b.countLabel, 10)
    return cb - ca
  })


// ─── Top picks ─────────────────────────────────────────────────────────────

export function getTopPicks(
  category: string,
  destination: string | null = null,
  limit = 3,
  needs: Iterable<string> = [],
): ListingFull[] {
  return serviceListings
    .filter(l => listingMatchesCategory(l, category))
    .filter(l => !destination || l.destination.toLowerCase().includes(destination.toLowerCase()))
    .filter(l => listingMatchesNeeds(l, needs))
    .filter(l => l.availability !== 'unavailable' && l.availability !== 'sold-out')
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit)
}

export function topPicksTitle(category: string) {
  if (category === 'All') return 'Top rated'
  if (category === 'Food') return 'Top food nearby'
  if (category === 'Activity') return 'Top experiences'
  if (category === 'Guide') return 'Top guides'
  if (category === 'Event') return 'Upcoming picks'
  if (category === 'Shop') return 'Popular shops'
  return `Top ${category}`
}
