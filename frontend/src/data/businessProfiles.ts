/** Business / provider profiles — public presence separate from user accounts. */

export type BusinessType =
  | 'accommodation'
  | 'transport'
  | 'event_organiser'
  | 'food_drink'
  | 'retail_shop'
  | 'activity'
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
  showcase_as_partner?: boolean
  how_we_help?: string
  community_impact?: string
  travel_offers?: Array<{
    id: number
    title: string
    summary?: string
    offer_kind: string
    eligibility: string
    eligibility_label?: string
    eligibility_display?: string
    price_label?: string
    categories?: string[]
    details?: string
    how_to_claim?: string
    proof_required?: string
    terms_note?: string
    cover_image?: string | null
    gallery_images?: Array<string | { src: string; kind?: string }>
    is_active?: boolean
    starts_on?: string | null
    ends_on?: string | null
  }>
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  accommodation: 'Accommodation',
  transport: 'Transport',
  event_organiser: 'Events',
  food_drink: 'Foodies',
  retail_shop: 'Shop & makers',
  activity: 'Activities',
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
    showcase_as_partner: true,
    how_we_help:
      'We publish clear SADC resident rates and student weekend packages so a desert trip feels attainable — not only for international full-price travellers.',
    community_impact:
      'Our lodges hire locally, source food from nearby farms, and support school sports programmes in Erongo.',
    travel_offers: [
      {
        id: 101,
        title: 'SADC resident rate',
        summary: 'Half-price midweek stays for travellers with a SADC passport.',
        offer_kind: 'eligibility',
        eligibility: 'sadc',
        eligibility_display: 'SADC residents',
        price_label: '50% off',
        categories: ['stays'],
        details:
          'Book a midweek lodge night at half the published rack rate. Valid at participating Desert Stays properties in Swakopmund and the Erongo coast. Breakfast included when the full-price rate includes it.',
        how_to_claim:
          '1. Open Message on this offer or on the Desert Stays profile and say you want the SADC resident rate.\n2. Share your preferred dates and property.\n3. When you check in, show a valid SADC passport or national ID.\n4. Pay the discounted rate confirmed in the chat — no promo code needed.',
        proof_required: 'Valid SADC passport or national ID at check-in',
        terms_note:
          'Sunday–Thursday arrivals only. Public holidays and peak festival weekends excluded. One room per passport-holding guest. Cannot combine with other packages.',
        cover_image:
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=70',
        gallery_images: [
          {
            src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
          {
            src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
          {
            src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
        ],
        is_active: true,
      },
      {
        id: 102,
        title: 'Student weekend package',
        summary: 'Guided coastal weekend in December — lodge night, transfer, and guide included.',
        offer_kind: 'package',
        eligibility: 'student',
        eligibility_display: 'Students',
        price_label: 'From N$1,200',
        categories: ['stays', 'guides', 'transport'],
        details:
          'A Friday–Sunday coastal weekend designed for students: one lodge night near Swakopmund, shared transfer from Windhoek, and a half-day guided dune or harbour walk. Group size is capped so the trip stays affordable.',
        how_to_claim:
          '1. Message Desert Stays with “Student weekend package” and your student card details.\n2. Pick a December weekend from the dates they send back.\n3. Pay the deposit they quote to hold your spot.\n4. Bring your student card on the departure day — the guide will check it before boarding.',
        proof_required: 'Current student card (university / college) matching your booking name',
        terms_note:
          'December weekends only while seats remain. Deposit is non-refundable within 7 days of departure. Shared rooms may apply depending on group size.',
        cover_image:
          'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=70',
        gallery_images: [
          {
            src: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
          {
            src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
        ],
        starts_on: '2026-12-01',
        ends_on: '2026-12-31',
        is_active: true,
      },
    ],
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
    owner_username: 'guide_mgr',
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
    showcase_as_partner: true,
    how_we_help:
      'Local resident weekday rates and student shuttle packages so getting around Namibia does not have to mean tourist-only pricing.',
    community_impact: 'We train local drivers and keep routes that connect smaller towns, not only tourist hubs.',
    travel_offers: [
      {
        id: 201,
        title: 'SADC driver rate',
        summary: 'Reduced daily rate on 4×4 rentals for SADC licence holders.',
        offer_kind: 'eligibility',
        eligibility: 'sadc',
        eligibility_display: 'SADC residents',
        price_label: '20% off',
        categories: ['transport'],
        details:
          'Weekday 4×4 rentals at 20% below the standard daily rate for drivers who live in a SADC country. Unlimited local kilometres within Namibia; cross-border needs a separate permit.',
        how_to_claim:
          '1. Message Namibia Wheels with the vehicle class and pickup dates.\n2. Ask for the SADC driver rate.\n3. Bring your SADC licence and passport when you collect the vehicle.\n4. Sign the rental agreement at the discounted daily rate.',
        proof_required: 'Valid SADC driver’s licence and matching passport / ID',
        terms_note: 'Weekday pickups only. Insurance excess unchanged. One-way drop-offs may have an extra fee.',
        cover_image:
          'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=70',
        gallery_images: [
          {
            src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=900&q=70',
            kind: 'image',
          },
        ],
        is_active: true,
      },
    ],
  },
  {
    id: 5,
    slug: 'taste-of-namibia',
    owner_username: 'food_mgr',
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
