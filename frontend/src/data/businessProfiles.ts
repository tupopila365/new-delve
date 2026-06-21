/** Business / provider profiles — public presence separate from user accounts. */

export type BusinessType =
  | 'accommodation'
  | 'transport'
  | 'event_organiser'
  | 'food_drink'
  | 'guide'
  | 'journeys'
  | 'ask_locals'
  | 'delve_us'
  | 'multi_provider'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'suspended' | 'rejected'

export type BusinessTeamRole = 'owner' | 'manager' | 'staff' | 'viewer'

export type BusinessProfile = {
  id: number
  slug: string
  owner_username: string
  business_name: string
  business_types: BusinessType[]
  verification_status: VerificationStatus
  description: string
  tagline?: string
  logo: string | null
  cover_image: string | null
  region: string
  city: string
  rating_avg?: string
  rating_count?: number
  listings_count?: number
  response_hours?: number
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  accommodation: 'Accommodation',
  transport: 'Transport',
  event_organiser: 'Events',
  food_drink: 'Food & drink',
  guide: 'Local guide',
  journeys: 'Journeys',
  ask_locals: 'Ask locals',
  delve_us: 'Delve us',
  multi_provider: 'Multi-category',
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending review',
  verified: 'Verified provider',
  suspended: 'Suspended',
  rejected: 'Not verified',
}

export const mockBusinessProfiles: BusinessProfile[] = [
  {
    id: 1,
    slug: 'desert-stays',
    owner_username: 'demo_provider',
    business_name: 'Desert Stays',
    business_types: ['multi_provider', 'accommodation', 'guide'],
    verification_status: 'verified',
    description:
      'Boutique stays and guided desert experiences across Namibia. Family-run team with coastal lodges and local expert guides.',
    tagline: 'Stays & guided tours across Namibia',
    logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80',
    cover_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
    region: 'Erongo',
    city: 'Swakopmund',
    rating_avg: '4.8',
    rating_count: 124,
    listings_count: 5,
    response_hours: 3,
  },
  {
    id: 2,
    slug: 'dune-stays-namibia',
    owner_username: 'stays_host',
    business_name: 'Dune Stays Namibia',
    business_types: ['accommodation'],
    verification_status: 'verified',
    description: 'Boutique lodges and guesthouses across the Namibian coast and heartland.',
    tagline: 'Coastal lodges & city guesthouses',
    logo: null,
    cover_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
    region: 'Erongo',
    city: 'Swakopmund',
    rating_avg: '4.7',
    rating_count: 89,
    listings_count: 2,
    response_hours: 4,
  },
  {
    id: 3,
    slug: 'kaoko-safari-guides',
    owner_username: 'guide_pro',
    business_name: 'Kaoko Safari Guides',
    business_types: ['guide'],
    verification_status: 'verified',
    description: 'Licensed local experts for desert routes, wildlife days, and cultural walks.',
    tagline: 'Desert, culture & wildlife guiding',
    logo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80',
    cover_image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70',
    region: 'Khomas',
    city: 'Windhoek',
    rating_avg: '4.9',
    rating_count: 128,
    listings_count: 1,
    response_hours: 4,
  },
  {
    id: 4,
    slug: 'namibia-wheels',
    owner_username: 'transport_mgr',
    business_name: 'Namibia Wheels',
    business_types: ['transport'],
    verification_status: 'verified',
    description: '4×4 rentals, intercity buses, and airport transfers with transparent pricing.',
    tagline: 'Rentals, buses & transfers',
    logo: null,
    cover_image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=1200&q=70',
    region: 'Khomas',
    city: 'Windhoek',
    rating_avg: '4.6',
    rating_count: 56,
    listings_count: 4,
    response_hours: 6,
  },
  {
    id: 5,
    slug: 'taste-of-namibia',
    owner_username: 'food_owner',
    business_name: 'Taste of Namibia',
    business_types: ['food_drink'],
    verification_status: 'verified',
    description: 'Restaurants, grills, and cafés showcasing Namibian flavours and coastal seafood.',
    tagline: 'Local food & drink venues',
    logo: null,
    cover_image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70',
    region: 'Khomas',
    city: 'Windhoek',
    rating_avg: '4.5',
    rating_count: 210,
    listings_count: 3,
    response_hours: 2,
  },
]

export function findBusinessById(id: number): BusinessProfile | undefined {
  return mockBusinessProfiles.find((b) => b.id === id)
}

export function findBusinessBySlug(slug: string): BusinessProfile | undefined {
  return mockBusinessProfiles.find((b) => b.slug === slug)
}

export function businessesForOwner(username: string): BusinessProfile[] {
  return mockBusinessProfiles.filter((b) => b.owner_username === username)
}

export function primaryBusinessForOwner(username: string): BusinessProfile | undefined {
  return businessesForOwner(username)[0]
}
