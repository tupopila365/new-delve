// ─── Types ────────────────────────────────────────────────────────────────

export type DealType =
  | 'percentage' | 'fixed-saving' | 'special-rate' | 'local-rate'
  | 'resident-rate' | 'student-rate' | 'group-rate' | 'package'
  | 'early-booking' | 'last-minute' | 'limited' | 'free-extra' | 'bundle'

export type DealStatus =
  | 'active' | 'ending-soon' | 'scheduled' | 'expired' | 'paused'
  | 'unavailable' | 'sold-out' | 'limited'

export type DealCategory =
  | 'Stay' | 'Road transport' | 'Air transport' | 'Water transport'
  | 'Food & drink' | 'Activity' | 'Event' | 'Guide' | 'Shop' | 'All'

export type ClaimMethod =
  | 'book' | 'request' | 'show-code' | 'message' | 'show-proof'
  | 'external' | 'in-person' | 'checkout'

export type EligibilityStatus =
  | 'everyone' | 'may-qualify' | 'eligible' | 'not-eligible'
  | 'proof-required' | 'unknown' | 'sign-in' | 'custom'

export interface DealFull {
  id: string
  dealType: DealType
  typeLabel: string
  title: string
  description: string
  business: string
  businessAvatar: string
  serviceCategory: DealCategory
  transportGroup?: 'road' | 'air' | 'water'
  transportMode?: string
  origin?: string
  destination: string
  image: string
  currentPrice: string
  referencePrice?: string
  currency: string
  priceBasis: string
  savingAmount?: string
  savingPercentage?: string
  eligibility: EligibilityStatus
  eligibilityNote: string
  proofRequired: string | null
  availability: string
  endsAt: string
  bookBy?: string
  claimMethod: ClaimMethod
  claimMethodNote: string
  included: string[]
  excluded: string[]
  terms: string
  cancellation: string
  fees: string | null
  verification: { verified: boolean; label: string }
  sponsored: boolean
  status: DealStatus
  rating?: number
  reviewCount?: number
}

// ─── Extended detail type (same base + extra fields) ──────────────────────
export interface DealDetail extends DealFull {
  priceBreakdown: { label: string; amount: string }[]
  claimSteps: string[]
  relatedDeals: string[]  // ids
  businessDescription: string
  businessContact: string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

export const allDeals: DealFull[] = [
  // ── Stays ──
  {
    id: 'deal-s1',
    dealType: 'percentage',
    typeLabel: '20% off',
    title: 'Weekend Beachfront Bungalow',
    description: 'Stay 2 nights and pay the weekend rate — 20% below the walk-in price. Includes breakfast for two.',
    business: 'Swakop Beach Escapes',
    businessAvatar: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Stay',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=700&h=460&fit=crop&auto=format',
    currentPrice: '680',
    referencePrice: '850',
    currency: 'N$',
    priceBasis: 'night',
    savingAmount: '170',
    savingPercentage: '20',
    eligibility: 'everyone',
    eligibilityNote: 'Available to all travelers.',
    proofRequired: null,
    availability: 'This weekend only — 3 bungalows left',
    endsAt: 'Sun 10 Aug 2026',
    claimMethod: 'book',
    claimMethodNote: 'Book directly through Delve. Confirmation sent by email.',
    included: ['Breakfast for two', 'Ocean-view patio', 'Free parking', 'Late checkout on request'],
    excluded: ['Dinner', 'Laundry', 'Minibar'],
    terms: 'Rate valid Fri–Sun check-in only. Minimum 2-night stay. Subject to availability.',
    cancellation: 'Free cancellation up to 48 hours before check-in.',
    fees: null,
    verification: { verified: true, label: 'Verified accommodation' },
    sponsored: false,
    status: 'ending-soon',
    rating: 4.7,
    reviewCount: 184,
  },
  {
    id: 'deal-s2',
    dealType: 'package',
    typeLabel: 'Stay 3, pay 2',
    title: 'Desert Lodge — Pay for 2, stay 3',
    description: 'Stay three nights at Sossusvlei and only pay for two. Includes guided sunrise dune walk.',
    business: 'Desert Lodge Sossusvlei',
    businessAvatar: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Stay',
    destination: 'Sossusvlei',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=700&h=460&fit=crop&auto=format',
    currentPrice: '1 400',
    currency: 'N$',
    priceBasis: 'night',
    savingAmount: '1 400',
    eligibility: 'everyone',
    eligibilityNote: 'Open to all travelers. Minimum party of 2.',
    proofRequired: null,
    availability: 'Available Aug – Sep 2026',
    endsAt: '30 Sep 2026',
    claimMethod: 'request',
    claimMethodNote: 'Submit a booking request. Lodge confirms within 24 hours.',
    included: ['Guided sunrise dune walk', 'All meals', 'Stargazing session'],
    excluded: ['Flights', 'Transport to lodge', 'Alcoholic beverages'],
    terms: 'Third night at no charge when booking 3 consecutive nights. Cannot be combined with other offers.',
    cancellation: 'Free cancellation up to 7 days before arrival.',
    fees: null,
    verification: { verified: true, label: 'Verified lodge' },
    sponsored: false,
    status: 'active',
    rating: 4.9,
    reviewCount: 312,
  },

  // ── Road transport ──
  {
    id: 'deal-r1',
    dealType: 'special-rate',
    typeLabel: 'Special rate',
    title: 'Airport Transfer — Windhoek',
    description: 'Fixed-price airport transfer from Hosea Kutako to your Windhoek accommodation. Meet & greet included.',
    business: 'Swift Transfers NM',
    businessAvatar: 'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Road transport',
    transportGroup: 'road',
    transportMode: 'Airport transfer',
    origin: 'Hosea Kutako International Airport',
    destination: 'Windhoek',
    image: 'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=700&h=460&fit=crop&auto=format',
    currentPrice: '900',
    currency: 'N$',
    priceBasis: 'transfer',
    eligibility: 'everyone',
    eligibilityNote: 'Up to 4 passengers. Additional passengers on request.',
    proofRequired: null,
    availability: 'Book minimum 24 hours in advance',
    endsAt: 'Ongoing',
    claimMethod: 'request',
    claimMethodNote: 'Request the transfer. Operator confirms your pickup details.',
    included: ['Meet & greet at arrivals', 'Luggage assistance', 'WiFi in vehicle'],
    excluded: ['Gratuity', 'Waiting fees beyond 30 minutes'],
    terms: 'Price fixed for up to 4 passengers. Additional stops charged separately.',
    cancellation: 'Free cancellation up to 24 hours before pickup.',
    fees: 'Waiting fee applies after 30 minutes: N$ 50 per 15 minutes.',
    verification: { verified: true, label: 'Registered transfer operator' },
    sponsored: false,
    status: 'active',
    rating: 4.8,
    reviewCount: 194,
  },
  {
    id: 'deal-r2',
    dealType: 'local-rate',
    typeLabel: 'Local rate',
    title: 'Guided Dune Quad Experience',
    description: 'Resident and long-stay traveler rate for the 2-hour guided quad ride through the Swakopmund dunes.',
    business: 'Dune Riders Swakop',
    businessAvatar: 'https://images.unsplash.com/photo-1769251297155-718a0012f72e?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Activity',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&h=460&fit=crop&auto=format',
    currentPrice: '550',
    referencePrice: '720',
    currency: 'N$',
    priceBasis: 'person',
    savingAmount: '170',
    savingPercentage: '24',
    eligibility: 'may-qualify',
    eligibilityNote: 'Residents and travelers staying 7+ nights in Namibia.',
    proofRequired: 'Namibian ID or accommodation proof showing 7+ consecutive nights.',
    availability: 'Ongoing — limited daily slots',
    endsAt: 'Ongoing',
    bookBy: 'Book 48 hrs in advance',
    claimMethod: 'show-proof',
    claimMethodNote: 'Show your ID or accommodation proof at the meeting point before the ride.',
    included: ['Helmet and safety gear', '2-hour guided ride', 'Guide gratuity'],
    excluded: ['Transport to meeting point', 'Photography service'],
    terms: 'Local rate available Tue–Sun. Maximum 8 riders per session. Minimum age 18.',
    cancellation: 'Full refund if cancelled 48 hours before. No refund after that.',
    fees: null,
    verification: { verified: true, label: 'Verified activity operator' },
    sponsored: true,
    status: 'active',
    rating: 4.5,
    reviewCount: 88,
  },

  // ── Air transport ──
  {
    id: 'deal-a1',
    dealType: 'special-rate',
    typeLabel: 'Regional fare',
    title: 'Windhoek → Swakopmund Regional Flight',
    description: 'Westair Aviation regional fare. 50-minute flight. Seats limited — book early.',
    business: 'Westair Aviation',
    businessAvatar: 'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Air transport',
    transportGroup: 'air',
    transportMode: 'Regional flight',
    origin: 'Windhoek (WDH)',
    destination: 'Swakopmund (SWP)',
    image: 'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=700&h=460&fit=crop&auto=format',
    currentPrice: '2 400',
    currency: 'N$',
    priceBasis: 'person',
    eligibility: 'everyone',
    eligibilityNote: 'Open to all travelers. Valid travel document required.',
    proofRequired: 'Valid ID or passport at check-in.',
    availability: '6 seats remaining on Mon 11 Aug',
    endsAt: 'Mon 11 Aug 2026',
    claimMethod: 'external',
    claimMethodNote: 'Booking continues on the Westair Aviation website.',
    included: ['15 kg checked bag', '5 kg cabin bag'],
    excluded: ['Overweight baggage', 'Seat selection fee', 'Airport taxes (included in fare)'],
    terms: 'Fare conditions apply. Check at time of booking. Soft luggage only — weigh bags before travel.',
    cancellation: 'Fare conditions apply. Consult Westair Aviation for refund rules.',
    fees: null,
    verification: { verified: true, label: 'Licensed airline' },
    sponsored: false,
    status: 'limited',
    rating: 4.6,
    reviewCount: 520,
  },

  // ── Water transport ──
  {
    id: 'deal-w1',
    dealType: 'group-rate',
    typeLabel: 'Group rate',
    title: 'Walvis Bay Ferry — Group of 4+',
    description: 'Book 4 or more seats on the Walvis Bay Ferry and get the group rate. Daily departures.',
    business: 'Walvis Bay Ferry Services',
    businessAvatar: 'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Water transport',
    transportGroup: 'water',
    transportMode: 'Ferry',
    origin: 'Walvis Bay Harbour',
    destination: 'Pelican Point',
    image: 'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=700&h=460&fit=crop&auto=format',
    currentPrice: '260',
    referencePrice: '320',
    currency: 'N$',
    priceBasis: 'person',
    savingAmount: '60',
    savingPercentage: '19',
    eligibility: 'may-qualify',
    eligibilityNote: 'Groups of 4 or more booking together.',
    proofRequired: null,
    availability: '22 passenger seats available',
    endsAt: 'Ongoing',
    claimMethod: 'book',
    claimMethodNote: 'Select 4+ seats. Group rate applies automatically at checkout.',
    included: ['Life jacket', 'Wildlife commentary from crew'],
    excluded: ['Refreshments', 'Photography equipment rental'],
    terms: 'Group rate requires minimum 4 passengers on a single booking. Rate not combinable with other offers.',
    cancellation: 'Full refund up to 24 hours before departure.',
    fees: null,
    verification: { verified: true, label: 'Licensed ferry operator' },
    sponsored: false,
    status: 'active',
    rating: 4.2,
    reviewCount: 189,
  },

  // ── Food & drink ──
  {
    id: 'deal-f1',
    dealType: 'special-rate',
    typeLabel: 'Set menu',
    title: 'Set Lunch at Sardinia\'s',
    description: 'Weekday set lunch — starter, main, and coffee — at a fixed price. Walk-in welcome.',
    business: "Sardinia's Bistro",
    businessAvatar: 'https://images.unsplash.com/photo-1599033183537-54ff77f58f75?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Food & drink',
    destination: 'Windhoek',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&h=460&fit=crop&auto=format',
    currentPrice: '195',
    currency: 'N$',
    priceBasis: 'person',
    eligibility: 'everyone',
    eligibilityNote: 'Walk-in or advance booking. Valid weekdays only.',
    proofRequired: null,
    availability: 'Mon–Fri lunch service',
    endsAt: 'End of Aug 2026',
    claimMethod: 'in-person',
    claimMethodNote: 'Walk in or book ahead. Mention the Delve set-lunch rate.',
    included: ['Starter', 'Main course', 'Filter coffee or tea'],
    excluded: ['Alcoholic drinks', 'Dessert', 'Service charge'],
    terms: 'Set menu available 12:00–14:30 Mon–Fri only. Menu changes weekly.',
    cancellation: 'No booking required — walk in anytime.',
    fees: 'Service charge at discretion.',
    verification: { verified: false, label: 'Unverified — community listing' },
    sponsored: false,
    status: 'active',
    rating: 4.3,
    reviewCount: 97,
  },

  // ── Activity ──
  {
    id: 'deal-act1',
    dealType: 'early-booking',
    typeLabel: 'Early booking',
    title: 'Sandwich Harbour 4x4 Day Tour',
    description: 'Full-day guided 4x4 tour into Sandwich Harbour via the Namib dunes. Book 7+ days early and save.',
    business: 'Desert Explorers Swakop',
    businessAvatar: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=80&h=80&fit=crop&auto=format',
    serviceCategory: 'Activity',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=700&h=460&fit=crop&auto=format',
    currentPrice: '750',
    referencePrice: '850',
    currency: 'N$',
    priceBasis: 'person',
    savingAmount: '100',
    savingPercentage: '12',
    eligibility: 'everyone',
    eligibilityNote: 'Open to all. Minimum age 10.',
    proofRequired: null,
    availability: 'Daily departures — 4 spots left on Sat 9 Aug',
    endsAt: '31 Aug 2026',
    bookBy: 'Book at least 7 days before your tour date',
    claimMethod: 'book',
    claimMethodNote: 'Book and pay through Delve. Rate locked at the time of booking.',
    included: ['Packed lunch and drinks', 'Guide', 'Park entry fee', 'Binoculars'],
    excluded: ['Transport to Swakopmund', 'Gratuity'],
    terms: 'Early booking rate requires booking at least 7 days before departure. Non-transferable.',
    cancellation: 'Full refund if cancelled 5+ days before. 50% refund within 5 days.',
    fees: null,
    verification: { verified: true, label: 'Verified activity operator' },
    sponsored: false,
    status: 'active',
    rating: 4.8,
    reviewCount: 312,
  },
]

// ─── Category filter config ────────────────────────────────────────────────

export const dealCategories: { label: DealCategory | 'All'; icon: string }[] = [
  { label: 'All',             icon: '🏷️' },
  { label: 'Stay',            icon: '🏨' },
  { label: 'Road transport',  icon: '🚗' },
  { label: 'Air transport',   icon: '✈️' },
  { label: 'Water transport', icon: '⛴️' },
  { label: 'Food & drink',    icon: '🍽️' },
  { label: 'Activity',        icon: '🪂' },
  { label: 'Event',           icon: '🎟️' },
  { label: 'Shop',            icon: '🛍️' },
]

export const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'best-saving', label: 'Best saving' },
  { value: 'price-asc',   label: 'Price low to high' },
  { value: 'ending-soon', label: 'Ending soon' },
  { value: 'newest',      label: 'Newest' },
  { value: 'most-saved',  label: 'Most saved' },
]
