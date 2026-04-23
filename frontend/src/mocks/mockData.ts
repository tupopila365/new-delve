import type { HostStoryPost } from '../data/hostAccommodationStories'

export type MockProfile = {
  username: string
  email: string
  user_type: 'normal' | 'service_provider'
  display_name: string
  bio: string
  region: string
  city: string
  avatar: string | null
  email_verified: boolean
}

export type MockPost = {
  id: number
  author: { username: string; display_name: string; avatar: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  delvers_board: string
  is_delvers: boolean
  is_accommodation_story?: boolean
  listing?: { id: number; title: string } | null
  created_at: string
  likes_count: number
  saves_count: number
  comments_count: number
  liked_by_me: boolean
  saved_by_me: boolean
}

export type MockStayMedia = { kind: 'image' | 'video'; src: string }

export type MockStayFaq = { question: string; answer: string }

export type MockStayReview = {
  name: string
  place: string
  rating: number
  body: string
  /** Profile photo URL; initials shown if omitted or broken. */
  avatar?: string | null
}

/** Room or unit category within a stay listing (hotels, B&Bs, camps, etc.). */
export type MockRoomType = {
  name: string
  description?: string
  max_guests?: number
  bedrooms?: number
  /** Short bed layout, e.g. "1 king bed" */
  bed_summary?: string
  /** Nightly rate for this category; omit to mean "same as listing from price". */
  price_per_night?: string
  image?: string | null
}

export type MockStay = {
  id: number
  title: string
  description: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  bedrooms: number
  amenities: string[]
  cover_image: string | null
  /** Extra photos / clips for the detail carousel (first item can match cover). */
  media_gallery?: MockStayMedia[]
  check_in_from?: string
  check_out_until?: string
  house_rules?: string
  cancellation_policy?: string
  faqs?: MockStayFaq[]
  guest_reviews?: MockStayReview[]
  /** Distinct bookable room or unit types the host offers. */
  room_types?: MockRoomType[]
  owner_username: string
  rating_avg: string
  rating_count: number
  property_type: string
  pet_friendly: boolean
  wifi: boolean
  parking: boolean
  pool: boolean
  kitchen: boolean
  breakfast: boolean
}

export type MockVehicle = {
  id: number
  title: string
  make: string
  model: string
  year: number
  transmission: string
  seats: number
  price_per_day: string
  region: string
  city: string
  cover_image: string | null
}

export type MockBusTrip = {
  id: number
  route_detail: { origin: string; destination: string; operator_name: string }
  departs_at: string
  arrives_at: string
  price: string
  total_seats: number
  available_seats: number
  is_active: boolean
}

export type MockEvent = {
  id: number
  title: string
  description: string
  category: string
  starts_at: string
  ends_at: string | null
  venue: string
  region: string
  city: string
  cover_image: string | null
  organizer_username: string
}

export type MockFoodVenue = {
  id: number
  name: string
  description: string
  cuisine: string
  region: string
  city: string
  price_level: number
  cover_image: string | null
  owner_username: string
  rating_avg: string
  rating_count: number
}

export type MockGuide = {
  id: number
  headline: string
  bio: string
  languages: string[]
  regions: string[]
  hourly_rate: string | null
  photo: string | null
  username: string
  rating_avg: string
  rating_count: number
}

const U = {
  dunes: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70',
  coast: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=70',
  city: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
  food: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70',
  safari: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70',
  map: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=70',
  wheel: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70',
  stay1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
  stay2: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=70',
}

const V = {
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
}

/** Profile photos for story rings (full URLs so `mediaUrl` passes them through). */
const HOST_STORY_AVATARS = {
  desertStays:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80',
  windhoekInns:
    'https://images.unsplash.com/photo-1573496359142-b8d87734a14a?auto=format&fit=crop&w=256&h=256&q=80',
}

/** Square crops for guest reviews on accommodation detail. */
const GUEST_REVIEW_AVATARS = {
  rv1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80',
  rv2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80',
  rv3: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80',
  rv4: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=128&h=128&q=80',
  rv5: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=128&h=128&q=80',
  rv6: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
  rv7: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&h=128&q=80',
}

/** Demo host stories for the accommodation page (rings + viewer; no API). */
export const mockHostAccommodationStoryPins: HostStoryPost[] = [
  {
    id: 9501,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'New linen, sea breeze, coffee on the deck — coastal rooms ready for you.',
    region: 'Erongo',
    image: U.coast,
    video: null,
    listing: { id: 102, title: 'Coastal Guesthouse' },
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 9502,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'Golden hour from the dune-view deck — slow mornings, quiet nights.',
    region: 'Hardap',
    image: U.dunes,
    video: null,
    listing: { id: 103, title: 'Dune View Lodge' },
    created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
  {
    id: 9503,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'Behind the scenes: prepping the pool deck for summer stays.',
    region: 'Hardap',
    image: null,
    video: V.flower,
    listing: { id: 104, title: 'Desert Quiver Camp' },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 9504,
    author: { username: 'windhoek_inns', display_name: 'Windhoek Inns', avatar: HOST_STORY_AVATARS.windhoekInns },
    body: 'City centre rooms — walk to cafés, quiet enough to sleep well.',
    region: 'Khomas',
    image: U.stay1,
    video: null,
    listing: { id: 101, title: 'Freesia Hotel' },
    created_at: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
  },
  {
    id: 9505,
    author: { username: 'windhoek_inns', display_name: 'Windhoek Inns', avatar: HOST_STORY_AVATARS.windhoekInns },
    body: 'Breakfast spread is live — fresh fruit, vetkoek, and good coffee.',
    region: 'Khomas',
    image: U.food,
    video: null,
    listing: { id: 105, title: 'Klein Windhoek B&B' },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
]

export const mockProfiles: Record<string, MockProfile> = {
  demo_user: {
    username: 'demo_user',
    email: 'demo@delve.local',
    user_type: 'normal',
    display_name: 'Kaoko Explorer',
    bio: 'Chasing sunsets, good coffee, and hidden stays.',
    region: 'Khomas',
    city: 'Windhoek',
    avatar: null,
    email_verified: true,
  },
  demo_provider: {
    username: 'demo_provider',
    email: 'provider@delve.local',
    user_type: 'service_provider',
    display_name: 'Desert Stays',
    bio: 'Boutique stays and guided tours across Namibia.',
    region: 'Erongo',
    city: 'Swakopmund',
    avatar: HOST_STORY_AVATARS.desertStays,
    email_verified: true,
  },
}

export const mockStays: MockStay[] = [
  {
    id: 101,
    title: 'Freesia Hotel',
    description: 'Clean, calm, and central — perfect for a Windhoek weekend.',
    region: 'Khomas',
    city: 'Windhoek',
    price_per_night: '350',
    max_guests: 2,
    bedrooms: 1,
    amenities: ['wifi', 'breakfast', 'parking'],
    cover_image: U.city,
    media_gallery: [
      { kind: 'image', src: U.city },
      { kind: 'image', src: U.stay1 },
      { kind: 'image', src: U.stay2 },
      { kind: 'video', src: V.flower },
    ],
    owner_username: 'demo_provider',
    rating_avg: '4.65',
    rating_count: 128,
    property_type: 'hotel',
    pet_friendly: false,
    wifi: true,
    parking: true,
    pool: false,
    kitchen: false,
    breakfast: true,
    check_in_from: '14:00',
    check_out_until: '11:00',
    house_rules:
      'No parties or events in rooms.\nRegistered guests only after 22:00 — please advise reception if expecting visitors.\nKeep balcony doors closed when the AC is on.',
    cancellation_policy:
      'Free cancellation until 18:00 one day before check-in. Same-day cancellations forfeit the first night (demo pricing only).',
    faqs: [
      {
        question: 'Is parking included?',
        answer: 'Yes — one bay per room in the underground garage. Height limit 2.1 m.',
      },
      {
        question: 'When is breakfast?',
        answer: 'Weekdays 06:30–09:30, weekends 07:00–10:30 in the ground-floor dining room.',
      },
    ],
    guest_reviews: [
      {
        name: 'Anna K.',
        place: 'Namibia',
        rating: 4.5,
        avatar: GUEST_REVIEW_AVATARS.rv4,
        body: 'Central and clean. Reception moved us to a quieter courtyard room when we mentioned street noise from Independence Ave. Housekeeping was thorough without hovering. The gym is small but fine for a quick indoor workout. Vegan options at breakfast were limited, yet the kitchen plated something warm when we asked. Wi‑Fi held up across two full work-from-room days. We would book again for Windhoek meetings.',
      },
      {
        name: 'Jonas',
        place: 'Germany',
        rating: 4.7,
        avatar: GUEST_REVIEW_AVATARS.rv3,
        body: 'Solid Wi‑Fi for video calls. Bed was firm but we slept well.',
      },
    ],
    room_types: [
      {
        name: 'Standard king',
        description: 'High-floor city view, desk, rain shower. Breakfast included.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 king bed',
        price_per_night: '420',
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9fad704?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Courtyard twin',
        description: 'Quieter rooms facing the inner courtyard.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '2 single beds',
        price_per_night: '350',
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Junior suite',
        description: 'Separate lounge, sofa bed for kids, double vanity.',
        max_guests: 4,
        bedrooms: 1,
        bed_summary: '1 king + sofa bed',
        price_per_night: '620',
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a215a?auto=format&fit=crop&w=900&q=70',
      },
    ],
  },
  {
    id: 102,
    title: 'Coastal Guesthouse',
    description: 'Minutes from the dunes. Coffee, Wi‑Fi, secure parking.',
    region: 'Erongo',
    city: 'Swakopmund',
    price_per_night: '950',
    max_guests: 4,
    bedrooms: 2,
    amenities: ['wifi', 'parking', 'kitchen'],
    cover_image: U.coast,
    media_gallery: [
      { kind: 'image', src: U.coast },
      { kind: 'image', src: U.dunes },
      { kind: 'video', src: V.flower },
    ],
    owner_username: 'demo_provider',
    rating_avg: '4.82',
    rating_count: 94,
    property_type: 'guesthouse',
    pet_friendly: true,
    wifi: true,
    parking: true,
    pool: false,
    kitchen: true,
    breakfast: false,
    check_in_from: '15:00',
    check_out_until: '10:30',
    house_rules:
      'No smoking inside guest rooms or shared corridors.\nQuiet hours 22:00–07:00.\nPets allowed — keep dogs leashed in the garden.',
    cancellation_policy:
      'Free cancellation until 48 hours before check-in. Within 48 hours, the first night is charged.',
    faqs: [
      {
        question: 'Is breakfast included?',
        answer: 'Self-catering kitchen is stocked for a light first morning; full breakfast on request (fee).',
      },
      {
        question: 'Where can I park?',
        answer: 'One reserved space per booking behind the gate.',
      },
    ],
    guest_reviews: [
      {
        name: 'Lina M.',
        place: 'Germany',
        rating: 4.8,
        avatar: GUEST_REVIEW_AVATARS.rv1,
        body: 'Spotless rooms and fresh bread on arrival. Short walk to the promenade.',
      },
    ],
    room_types: [
      {
        name: 'Coastal queen suite',
        description: 'Sea-facing lounge, full kitchen, private patio.',
        max_guests: 4,
        bedrooms: 2,
        bed_summary: '1 queen + 2 singles',
        price_per_night: '1100',
        image: 'https://images.unsplash.com/photo-1611892440504-42a792e56d7d?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Garden twin room',
        description: 'Quiet side of the house, kitchenette, garden access.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '2 single beds',
        price_per_night: '820',
        image: 'https://images.unsplash.com/photo-1590490360182-c33d9a6b35d8?auto=format&fit=crop&w=900&q=70',
      },
    ],
  },
  {
    id: 103,
    title: 'Dune View Lodge',
    description: 'Golden hour views, quiet nights, and dreamy mornings.',
    region: 'Hardap',
    city: 'Sesriem',
    price_per_night: '1400',
    max_guests: 2,
    bedrooms: 1,
    amenities: ['wifi', 'pool', 'sunset deck'],
    cover_image: U.dunes,
    media_gallery: [
      { kind: 'image', src: U.dunes },
      { kind: 'image', src: U.safari },
      { kind: 'image', src: U.coast },
      { kind: 'video', src: V.flower },
    ],
    owner_username: 'demo_provider',
    rating_avg: '4.90',
    rating_count: 56,
    property_type: 'lodge',
    pet_friendly: false,
    wifi: true,
    parking: true,
    pool: true,
    kitchen: false,
    breakfast: false,
    check_in_from: '15:00',
    check_out_until: '10:00',
    house_rules:
      'No open fires except the designated sunset deck brazier.\nPool closes at 21:00 — shower before entering.\nRespect wildlife — do not feed animals.',
    cancellation_policy:
      'Cancel 7+ days before arrival for a full refund. Within 7 days, 50% retained; within 48 hours, full stay charged.',
    faqs: [
      {
        question: 'Is the pool heated?',
        answer: 'Solar-heated in summer; cooler in winter months — best for a quick dip after the dunes.',
      },
    ],
    guest_reviews: [
      {
        name: 'Chris & Sam',
        place: 'UK',
        rating: 4.9,
        avatar: GUEST_REVIEW_AVATARS.rv7,
        body: 'Unreal stars at night. Staff organised a sunrise drive — seamless.',
      },
    ],
    room_types: [
      {
        name: 'Dune-view chalet',
        description: 'Private deck, outdoor shower, best sunset sightlines.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 king bed',
        price_per_night: '1400',
        image: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Garden bungalow',
        description: 'Closer to the pool and main lodge — slightly larger bathroom.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 queen bed',
        price_per_night: '1550',
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=70',
      },
    ],
  },
  {
    id: 104,
    title: 'Desert Quiver Camp',
    description: 'Glamping under the stars — private deck, shared pool, fire pit.',
    region: 'Hardap',
    city: 'Sesriem',
    price_per_night: '1180',
    max_guests: 2,
    bedrooms: 1,
    amenities: ['wifi', 'pool', 'parking', 'kitchenette'],
    cover_image: U.dunes,
    media_gallery: [
      { kind: 'image', src: U.dunes },
      { kind: 'image', src: U.stay2 },
      { kind: 'video', src: V.flower },
    ],
    owner_username: 'demo_provider',
    rating_avg: '4.75',
    rating_count: 44,
    property_type: 'camping_glamping',
    pet_friendly: false,
    wifi: true,
    parking: true,
    pool: true,
    kitchen: true,
    breakfast: false,
    check_in_from: '15:00',
    check_out_until: '10:00',
    house_rules:
      'No open fires except designated fire pit.\nGenerator curfew 22:00–06:00.\nRespect wildlife — do not feed animals.',
    cancellation_policy:
      'Within 7 days of arrival, 50% of the stay is retained. Within 48 hours, full stay is charged.',
    faqs: [
      {
        question: 'Is water drinkable?',
        answer: 'Filtered water in each unit; bring refill bottles. Bottled water sold on site.',
      },
    ],
    guest_reviews: [
      {
        name: 'Renée',
        place: 'France',
        rating: 4.7,
        avatar: GUEST_REVIEW_AVATARS.rv5,
        body: 'Glamping done right — comfortable bed, great shower pressure.',
      },
    ],
    room_types: [
      {
        name: 'Quiver chalet (double)',
        description: 'Private deck, en-suite shower, battery lighting after generator curfew.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 queen bed',
        price_per_night: '1180',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Family meru tent',
        description: 'Two sleeping areas — great for kids; shared bathroom block nearby.',
        max_guests: 4,
        bedrooms: 1,
        bed_summary: '1 queen + 2 camp beds',
        price_per_night: '1450',
        image: 'https://images.unsplash.com/photo-1478131143081-c8824962e68b?auto=format&fit=crop&w=900&q=70',
      },
    ],
  },
  {
    id: 105,
    title: 'Klein Windhoek B&B',
    description: 'Three rooms, garden breakfast, quiet residential street.',
    region: 'Khomas',
    city: 'Windhoek',
    price_per_night: '480',
    max_guests: 2,
    bedrooms: 1,
    amenities: ['wifi', 'breakfast', 'parking'],
    cover_image: U.city,
    media_gallery: [
      { kind: 'image', src: U.city },
      { kind: 'image', src: U.food },
      { kind: 'image', src: U.stay1 },
    ],
    owner_username: 'demo_provider',
    rating_avg: '4.92',
    rating_count: 67,
    property_type: 'bed_and_breakfast',
    pet_friendly: true,
    wifi: true,
    parking: true,
    pool: false,
    kitchen: false,
    breakfast: true,
    check_in_from: '13:00',
    check_out_until: '11:00',
    house_rules:
      'Residential area — no loud music outdoors.\nBreakfast 07:30–09:30 in the dining room.\nA friendly house cat lives on the property — not in guest rooms.',
    cancellation_policy:
      'Free cancellation up to 5 days before check-in. Later cancellations: first two nights retained.',
    faqs: [
      {
        question: 'Is the B&B child-friendly?',
        answer: 'Yes — travel cot on request. Small play corner in the garden.',
      },
    ],
    guest_reviews: [
      {
        name: 'Petra',
        place: 'Austria',
        rating: 5.0,
        avatar: GUEST_REVIEW_AVATARS.rv6,
        body: 'Garden breakfast was a highlight. Hosts gave brilliant Windhoek tips.',
      },
      {
        name: 'Michael',
        place: 'USA',
        rating: 4.8,
        avatar: GUEST_REVIEW_AVATARS.rv2,
        body: 'Quiet street, easy rides into town. Cosy room.',
      },
    ],
    room_types: [
      {
        name: 'Garden deluxe',
        description: 'French doors to the garden, rainfall shower.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 king bed',
        price_per_night: '520',
        image: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=70',
      },
      {
        name: 'Cosy standard',
        description: 'Street-facing, compact — same breakfast as all rooms.',
        max_guests: 2,
        bedrooms: 1,
        bed_summary: '1 queen bed',
        price_per_night: '480',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=70',
      },
    ],
  },
]

export const mockVehicles: MockVehicle[] = [
  {
    id: 201,
    title: 'Toyota Hilux 4x4',
    make: 'Toyota',
    model: 'Hilux',
    year: 2022,
    transmission: 'manual',
    seats: 5,
    price_per_day: '780',
    region: 'Khomas',
    city: 'Windhoek',
    cover_image: U.wheel,
  },
  {
    id: 202,
    title: 'Compact City Runner',
    make: 'VW',
    model: 'Polo',
    year: 2021,
    transmission: 'automatic',
    seats: 5,
    price_per_day: '420',
    region: 'Erongo',
    city: 'Swakopmund',
    cover_image: null,
  },
]

export const mockBusTrips: MockBusTrip[] = [
  {
    id: 301,
    route_detail: { origin: 'Windhoek', destination: 'Swakopmund', operator_name: 'Namibia Link Coaches' },
    departs_at: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    arrives_at: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    price: '180',
    total_seats: 32,
    available_seats: 12,
    is_active: true,
  },
  {
    id: 302,
    route_detail: { origin: 'Windhoek', destination: 'Oshakati', operator_name: 'Northern Express' },
    departs_at: new Date(Date.now() + 1000 * 60 * 60 * 40).toISOString(),
    arrives_at: new Date(Date.now() + 1000 * 60 * 60 * 46).toISOString(),
    price: '240',
    total_seats: 40,
    available_seats: 18,
    is_active: true,
  },
]

export const mockEvents: MockEvent[] = [
  {
    id: 401,
    title: 'Windhoek Night Market',
    description: 'Food trucks, live music, local makers.',
    category: 'food',
    starts_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    ends_at: null,
    venue: 'Warehouse district',
    region: 'Khomas',
    city: 'Windhoek',
    cover_image: U.food,
    organizer_username: 'demo_user',
  },
  {
    id: 402,
    title: 'Coastal Sunset Picnic',
    description: 'Golden hour views and chill beats by the sea.',
    category: 'music',
    starts_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString(),
    ends_at: null,
    venue: 'Swakopmund shore',
    region: 'Erongo',
    city: 'Swakopmund',
    cover_image: U.coast,
    organizer_username: 'demo_provider',
  },
]

export const mockFood: MockFoodVenue[] = [
  {
    id: 501,
    name: 'Oryx Grill House',
    description: 'Wood-fired grill and local brews.',
    cuisine: 'grill',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 2,
    cover_image: U.food,
    owner_username: 'demo_provider',
    rating_avg: '4.55',
    rating_count: 210,
  },
  {
    id: 502,
    name: 'Coastal Café',
    description: 'Pastries, espresso, and a sea breeze.',
    cuisine: 'cafe',
    region: 'Erongo',
    city: 'Swakopmund',
    price_level: 1,
    cover_image: null,
    owner_username: 'demo_provider',
    rating_avg: '4.40',
    rating_count: 67,
  },
]

export const mockGuides: MockGuide[] = [
  {
    id: 601,
    headline: 'Sossusvlei & Namib tours',
    bio: 'Ten years guiding photographers and families across the desert.',
    languages: ['English', 'Afrikaans'],
    regions: ['Hardap', 'Khomas'],
    hourly_rate: '450',
    photo: U.safari,
    username: 'demo_provider',
    rating_avg: '4.95',
    rating_count: 142,
  },
  {
    id: 602,
    headline: 'City walks: Windhoek stories',
    bio: 'Architecture, culture, and hidden food spots.',
    languages: ['English'],
    regions: ['Khomas'],
    hourly_rate: '280',
    photo: null,
    username: 'demo_user',
    rating_avg: '4.70',
    rating_count: 38,
  },
]

export const mockPosts: MockPost[] = [
  {
    id: 701,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Weekend craft fair at Grove Mall — local ceramics and coffee.',
    region: 'Windhoek',
    image: U.city,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likes_count: 48,
    saves_count: 12,
    comments_count: 3,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 702,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Sunset over the dunes — best light at 18:30. Save this spot.',
    region: 'Swakopmund',
    image: null,
    video: V.flower,
    delvers_board: 'Namibia views',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    likes_count: 112,
    saves_count: 64,
    comments_count: 6,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 703,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Road trip mood: pack water, playlist, and your camera.',
    region: 'Khomas',
    image: U.map,
    video: null,
    delvers_board: 'Weekend trips',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    likes_count: 76,
    saves_count: 51,
    comments_count: 2,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 704,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Morning coffee and vetkoek — market side before the heat.',
    region: 'Windhoek',
    image: U.food,
    video: null,
    delvers_board: 'Eat local',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes_count: 34,
    saves_count: 28,
    comments_count: 1,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 705,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Promenade walk — salt air and slow sunsets.',
    region: 'Swakopmund',
    image: U.coast,
    video: null,
    delvers_board: 'Coast life',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    likes_count: 89,
    saves_count: 72,
    comments_count: 4,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 706,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Dune ridge at golden hour — no filter needed.',
    region: 'Hardap',
    image: U.dunes,
    video: null,
    delvers_board: 'Namibia views',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    likes_count: 156,
    saves_count: 98,
    comments_count: 9,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 707,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Guesthouse courtyard — shade, tea, and a good book.',
    region: 'Swakopmund',
    image: U.stay2,
    video: null,
    delvers_board: 'Stays we love',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    likes_count: 41,
    saves_count: 33,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 708,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Windhoek skyline from the ridge — short hike, big view.',
    region: 'Khomas',
    image: U.city,
    video: null,
    delvers_board: 'Weekend trips',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    likes_count: 62,
    saves_count: 44,
    comments_count: 3,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 709,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Safari drive pause — elephants at the waterhole.',
    region: 'Oshikoto',
    image: U.safari,
    video: null,
    delvers_board: 'Wild Namibia',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    likes_count: 203,
    saves_count: 141,
    comments_count: 12,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 710,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Road trip fuel stop views — long roads, good radio.',
    region: 'Khomas',
    image: U.wheel,
    video: null,
    delvers_board: 'On the road',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    likes_count: 55,
    saves_count: 39,
    comments_count: 2,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 711,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Short clip: waves and gulls — sound on later.',
    region: 'Walvis Bay',
    image: null,
    video: V.flower,
    delvers_board: 'Coast life',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
    likes_count: 71,
    saves_count: 48,
    comments_count: 5,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 712,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Map night: tracing routes for next month — pencil and dreams.',
    region: 'Windhoek',
    image: U.map,
    video: null,
    delvers_board: 'Plan slow',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    likes_count: 28,
    saves_count: 56,
    comments_count: 1,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 713,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Lodge pool reflecting the ridge — cool water, hot day.',
    region: 'Hardap',
    image: U.stay1,
    video: null,
    delvers_board: 'Stays we love',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    likes_count: 94,
    saves_count: 67,
    comments_count: 4,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 714,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Street braai smoke and laughter — Friday energy.',
    region: 'Windhoek',
    image: U.food,
    video: null,
    delvers_board: 'Eat local',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 68).toISOString(),
    likes_count: 118,
    saves_count: 52,
    comments_count: 7,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 715,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Kite season on the lagoon — wide sand, gentle wind.',
    region: 'Erongo',
    image: U.coast,
    video: null,
    delvers_board: 'Coast life',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    likes_count: 67,
    saves_count: 41,
    comments_count: 2,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 716,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Farm stall melons and homemade bread — worth the detour.',
    region: 'Khomas',
    image: U.food,
    video: null,
    delvers_board: 'Eat local',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 76).toISOString(),
    likes_count: 52,
    saves_count: 38,
    comments_count: 1,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 717,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Night market lights — kids dancing, vendors calling, warm air.',
    region: 'Khomas',
    image: U.city,
    video: null,
    delvers_board: 'Weekend trips',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    likes_count: 91,
    saves_count: 59,
    comments_count: 4,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 718,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Skeleton Coast mist rolling in — jacket weather, big sky.',
    region: 'Erongo',
    image: U.dunes,
    video: null,
    delvers_board: 'Namibia views',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString(),
    likes_count: 178,
    saves_count: 112,
    comments_count: 8,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 719,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Back-road shortcut: red dust, cattle grid, smile from a passer-by.',
    region: 'Khomas',
    image: U.wheel,
    video: null,
    delvers_board: 'On the road',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 90).toISOString(),
    likes_count: 44,
    saves_count: 31,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 720,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Deck chairs at dusk — first stars, no rush.',
    region: 'Hardap',
    image: U.stay2,
    video: null,
    delvers_board: 'Stays we love',
    is_delvers: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    likes_count: 63,
    saves_count: 55,
    comments_count: 3,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 721,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Free walking tour meetup — Independence Ave, Saturday 9am.',
    region: 'Khomas',
    image: U.city,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    likes_count: 22,
    saves_count: 6,
    comments_count: 1,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 722,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'New coffee spot near Maerua — quiet tables, good for work.',
    region: 'Khomas',
    image: U.food,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    likes_count: 35,
    saves_count: 9,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 723,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Community garden open day — seedlings, tips, and iced tea.',
    region: 'Khomas',
    image: U.map,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    likes_count: 41,
    saves_count: 11,
    comments_count: 2,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 724,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Live jazz at the warehouse district — tickets at the door.',
    region: 'Khomas',
    image: U.city,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    likes_count: 88,
    saves_count: 24,
    comments_count: 5,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 725,
    author: { username: 'demo_user', display_name: 'Kaoko Explorer', avatar: null },
    body: 'Shared taxi etiquette: small notes help, a greeting goes far.',
    region: 'Khomas',
    image: U.wheel,
    video: null,
    delvers_board: '',
    is_delvers: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    likes_count: 56,
    saves_count: 18,
    comments_count: 7,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 850,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'New coastal rooms — soft light, sea breeze, coffee on the deck.',
    region: 'Erongo',
    image: U.coast,
    video: null,
    delvers_board: '',
    is_delvers: false,
    is_accommodation_story: true,
    listing: { id: 102, title: 'Coastal Guesthouse' },
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    likes_count: 12,
    saves_count: 4,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
  },
  {
    id: 851,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: null },
    body: 'Behind the scenes: getting the dune-view rooms ready for guests.',
    region: 'Hardap',
    image: null,
    video: V.flower,
    delvers_board: '',
    is_delvers: false,
    is_accommodation_story: true,
    listing: { id: 103, title: 'Dune View Lodge' },
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    likes_count: 8,
    saves_count: 2,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
  },
]

