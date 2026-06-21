import type { HostStoryPost } from '../data/hostAccommodationStories'
import type { TransportStoryPost } from '../data/hostTransportStories'

export type MockProfile = {
  username: string
  email: string
  user_type: 'normal' | 'service_provider'
  is_staff?: boolean
  display_name: string
  bio: string
  region: string
  city: string
  country_code: string
  preferred_currency: string
  avatar: string | null
  email_verified: boolean
  is_private: boolean
  posts_visibility: 'public' | 'only_me'
  allow_messages: boolean
  show_in_search: boolean
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
  vehicle_type: string
  price_per_day: string
  region: string
  city: string
  cover_image: string | null
  description?: string
  pickup_location?: string
  included_features?: string[]
  gallery_images?: string[]
  required_renter_documents?: string[]
  owner_username?: string
  owner_display_name?: string
  owner_bio?: string
  owner_region?: string
  owner_city?: string
  owner_avatar?: string | null
}

export type MockBusTrip = {
  id: number
  owner_username?: string
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    gallery_images?: string[]
  }
  departs_at: string
  arrives_at: string
  price: string
  total_seats: number
  /** Seed occupied seats; availability is recomputed in mock API when session bookings exist. */
  occupied_seats: number[]
  available_seats: number
  amenities?: string[]
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
  organizer_display_name?: string
  is_free?: boolean
  price?: string
  ticket_url?: string
  capacity?: number
}

import type { VenueStoryChannelInput } from '../components/food/stories/types'

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
  is_open?: boolean
  tagline?: string | null
  popular_dish?: string | null
  closes_at?: string | null
  venue_stories?: VenueStoryChannelInput[]
}

export type MockGuide = {
  id: number
  user: number
  headline: string
  bio: string
  languages: string[]
  regions: string[]
  hourly_rate: string | null
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg: string
  rating_count: number
  guest_reviews?: unknown
  response_hours_typical?: number
  tour_packages?: {
    id: string
    title: string
    hours: number
    price: string
    photo?: string | null
    description?: string
    photos?: string[]
    gallery?: { src: string; caption?: string }[]
    reviews?: { name: string; place?: string; rating: number; body: string }[]
  }[]
  years_guiding?: number | null
  certifications?: string[]
  licensed_guide?: boolean
  languages_detail?: { language: string; level: string }[]
  portfolio_gallery?: { src: string; caption?: string }[]
  default_meeting_point?: string
  specialities?: string[]
}

const U = {
  dunes: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70',
  coast: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=70',
  city: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
  food: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70',
  foodCafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  foodGrill: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  foodSeafood: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  foodBakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  foodPizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  foodBar: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
  foodStreet: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  foodDessert: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
  foodBreakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
  safari: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70',
  map: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=70',
  wheel: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70',
  stay1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
  stay2: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=70',
}

/** Accommodation-first gallery shots (bedroom → exterior → view → bathroom/living). */
const STAY = {
  bedroom: 'https://images.unsplash.com/photo-1631049307264-da0ec9fad704?auto=format&fit=crop&w=1200&q=70',
  bedroomTwin: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=70',
  suite: 'https://images.unsplash.com/photo-1566665797739-1674de7a215a?auto=format&fit=crop&w=1200&q=70',
  exterior: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
  lodgeExterior: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=70',
  balcony: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70',
  roomView: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=70',
  bathroom: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=70',
  living: 'https://images.unsplash.com/photo-1611892440504-42a792e56d7d?auto=format&fit=crop&w=1200&q=70',
  breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e3f1e0?auto=format&fit=crop&w=1200&q=70',
  pool: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=70',
  coastalRoom: 'https://images.unsplash.com/photo-1590490360182-c33d9a6b35d8?auto=format&fit=crop&w=1200&q=70',
  guesthouse: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=70',
  bbHouse: 'https://images.unsplash.com/photo-1568605114967-5810f7d0c869?auto=format&fit=crop&w=1200&q=70',
  glamping: 'https://images.unsplash.com/photo-1478131143081-c8824962e68b?auto=format&fit=crop&w=1200&q=70',
}

/** Vehicle-first gallery shots (exterior → side → interior → road). */
const VEH = {
  hiluxFront: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=70',
  suvSide: 'https://images.unsplash.com/photo-1519641471654-76ce0107a85b?auto=format&fit=crop&w=1200&q=70',
  interior: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=70',
  road: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=70',
  hatchback: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=70',
  van: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=70',
  luxury: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=70',
  pickup: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=70',
}

/** Short CC0 / demo MP4s for Delvers video pins (URLs pass through `mediaUrl`). */
const V = {
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  joyrides: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  blazes: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  escapes: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  fun: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
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

/** Demo provider stories on Transport — rings + viewer; no API. */
export const mockTransportStoryPins: TransportStoryPost[] = [
  {
    id: 9601,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'Hilux back from service — diff lock checked, tyres fresh for gravel runs.',
    region: 'Khomas',
    image: U.wheel,
    video: null,
    vehicle: { id: 201, title: 'Toyota Hilux 4x4' },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 9602,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'Coast-to-dune run tips: tyre pressures, spare water, and where we refuel.',
    region: 'Erongo',
    image: U.map,
    video: null,
    vehicle: { id: 202, title: 'Compact City Runner' },
    created_at: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
  },
  {
    id: 9603,
    author: { username: 'demo_provider', display_name: 'Desert Stays', avatar: HOST_STORY_AVATARS.desertStays },
    body: 'Weekend handover: walk-around checklist with every renter.',
    region: 'Erongo',
    image: null,
    video: V.flower,
    vehicle: { id: 201, title: 'Toyota Hilux 4x4' },
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 9610,
    author: { username: 'windhoek_inns', display_name: 'Windhoek Inns', avatar: HOST_STORY_AVATARS.windhoekInns },
    body: 'Airport runs and day hires — keys sanitized, tanks topped before pickup.',
    region: 'Khomas',
    image: U.city,
    video: null,
    vehicle: { id: 201, title: 'Toyota Hilux 4x4' },
    created_at: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
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
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  anna: {
    username: 'anna',
    email: 'anna@example.com',
    user_type: 'normal',
    display_name: 'Anna K.',
    bio: 'Planning a coastal stay in Namibia.',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  james: {
    username: 'james',
    email: 'james@example.com',
    user_type: 'normal',
    display_name: 'James O.',
    bio: 'Safari and desert tour enthusiast.',
    region: 'Erongo',
    city: 'Swakopmund',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  maria: {
    username: 'maria',
    email: 'maria@example.com',
    user_type: 'normal',
    display_name: 'Maria S.',
    bio: 'Road trip across the Namib.',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  tobias: {
    username: 'tobias',
    email: 'tobias@example.com',
    user_type: 'normal',
    display_name: 'Tobias L.',
    bio: 'Food and culture traveller.',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  priya: {
    username: 'priya',
    email: 'priya@example.com',
    user_type: 'normal',
    display_name: 'Priya N.',
    bio: 'Family holiday along the coast.',
    region: 'Erongo',
    city: 'Walvis Bay',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  demo_provider: {
    username: 'demo_provider',
    email: 'provider@delve.local',
    user_type: 'service_provider',
    display_name: 'Desert Stays',
    bio: 'Boutique stays and guided tours across Namibia.',
    region: 'Erongo',
    city: 'Swakopmund',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: HOST_STORY_AVATARS.desertStays,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  stays_host: {
    username: 'stays_host',
    email: 'stays@delve.local',
    user_type: 'service_provider',
    display_name: 'Dune Stays Namibia',
    bio: 'Boutique lodges and guesthouses across the Namibian coast and heartland.',
    region: 'Erongo',
    city: 'Swakopmund',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  guide_pro: {
    username: 'guide_pro',
    email: 'guide@delve.local',
    user_type: 'service_provider',
    display_name: 'Kaoko Safari Guides',
    bio: 'Licensed wilderness guides for Etosha, Sossusvlei, Damaraland, and beyond.',
    region: 'Kunene',
    city: 'Opuwo',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  transport_mgr: {
    username: 'transport_mgr',
    email: 'transport@delve.local',
    user_type: 'service_provider',
    display_name: 'Namibia Wheels',
    bio: '4×4 rentals and cross-country shuttles. Airport handovers, unlimited km, gravel-ready fleet.',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  food_owner: {
    username: 'food_owner',
    email: 'food@delve.local',
    user_type: 'service_provider',
    display_name: 'Taste of Namibia',
    bio: 'Authentic Namibian grill and coastal café experiences. Dine in or take away.',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
  demo_admin: {
    username: 'demo_admin',
    email: 'admin@delve.local',
    user_type: 'normal',
    is_staff: true,
    display_name: 'DELVE Admin',
    bio: 'Platform operations',
    region: 'Khomas',
    city: 'Windhoek',
    country_code: 'NA',
    preferred_currency: 'NAD',
    avatar: null,
    email_verified: true,
    is_private: false,
    posts_visibility: 'public',
    allow_messages: true,
    show_in_search: true,
  },
}

export const mockStays: MockStay[] = [
  {
    id: 101,
    title: 'Freesia Hotel',
    description: 'Clean, calm, and central — perfect for a Windhoek weekend.',
    region: 'Khomas',
    city: 'Windhoek',
    // owned by stays_host demo account
    price_per_night: '350',
    max_guests: 2,
    bedrooms: 1,
    amenities: ['wifi', 'breakfast', 'parking'],
    cover_image: STAY.bedroom,
    media_gallery: [
      { kind: 'image', src: STAY.bedroom },
      { kind: 'image', src: STAY.exterior },
      { kind: 'image', src: STAY.roomView },
      { kind: 'image', src: STAY.bathroom },
      { kind: 'image', src: STAY.breakfast },
    ],
    owner_username: 'stays_host',
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
    cover_image: STAY.coastalRoom,
    media_gallery: [
      { kind: 'image', src: STAY.coastalRoom },
      { kind: 'image', src: STAY.guesthouse },
      { kind: 'image', src: STAY.living },
      { kind: 'image', src: U.coast },
    ],
    owner_username: 'stays_host',
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
    cover_image: STAY.balcony,
    media_gallery: [
      { kind: 'image', src: STAY.balcony },
      { kind: 'image', src: STAY.lodgeExterior },
      { kind: 'image', src: STAY.pool },
      { kind: 'image', src: STAY.bedroomTwin },
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
    cover_image: STAY.glamping,
    media_gallery: [
      { kind: 'image', src: STAY.glamping },
      { kind: 'image', src: U.dunes },
      { kind: 'image', src: STAY.lodgeExterior },
      { kind: 'image', src: STAY.balcony },
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
    cover_image: STAY.bedroomTwin,
    media_gallery: [
      { kind: 'image', src: STAY.bedroomTwin },
      { kind: 'image', src: STAY.bbHouse },
      { kind: 'image', src: STAY.breakfast },
      { kind: 'image', src: STAY.living },
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
    owner_username: 'transport_mgr',
    owner_display_name: 'Namibia Wheels',
    owner_bio:
      'Family-run rentals since 2014 — airport handovers, cross-country kits, and honest advice before you hit gravel.',
    owner_region: 'Khomas',
    owner_city: 'Windhoek',
    owner_avatar: null,
    title: 'Toyota Hilux 4x4',
    make: 'Toyota',
    model: 'Hilux',
    year: 2022,
    transmission: 'manual',
    seats: 5,
    vehicle_type: '4x4',
    price_per_day: '780',
    region: 'Khomas',
    city: 'Windhoek',
    cover_image: VEH.hiluxFront,
    description:
      'Double-cab 4x4 with canopy — gravel roads and washaways are no problem. Popular for Etosha and the coast.',
    pickup_location: 'Windhoek CBD — exact street shared on confirmation.',
    included_features: [
      'Airport pickup',
      'Full comprehensive insurance',
      'Unlimited kilometres',
      'Child seat on request',
    ],
    required_renter_documents: ['driver_license_front', 'driver_license_back', 'national_id'],
    gallery_images: [VEH.hiluxFront, VEH.suvSide, VEH.interior, VEH.road],
  },
  {
    id: 202,
    owner_username: 'coastal_rentals',
    owner_display_name: 'Coastal Rentals Swakop',
    owner_bio: 'Small fleet focused on coast & desert loops — flexible returns and WhatsApp support.',
    owner_region: 'Erongo',
    owner_city: 'Swakopmund',
    owner_avatar: null,
    title: 'Compact City Runner',
    make: 'VW',
    model: 'Polo',
    year: 2021,
    transmission: 'automatic',
    seats: 5,
    vehicle_type: 'hatchback',
    price_per_day: '420',
    region: 'Erongo',
    city: 'Swakopmund',
    cover_image: VEH.hatchback,
    gallery_images: [VEH.hatchback, VEH.interior, VEH.road],
    description: 'Compact automatic for town runs and the coast road — easy parking in Swakop.',
    pickup_location: 'Swakopmund centre — handover at your guesthouse when possible.',
    included_features: ['Basic insurance', 'Roadside support', 'Clean vehicle'],
  },
  {
    id: 203,
    owner_username: 'transport_mgr',
    owner_display_name: 'Namibia Wheels',
    owner_bio:
      'Family-run rentals since 2014 — airport handovers, cross-country kits, and honest advice before you hit gravel.',
    owner_region: 'Khomas',
    owner_city: 'Windhoek',
    owner_avatar: null,
    title: 'Mercedes V-Class People Mover',
    make: 'Mercedes-Benz',
    model: 'V-Class',
    year: 2020,
    transmission: 'automatic',
    seats: 7,
    vehicle_type: 'van',
    price_per_day: '1250',
    region: 'Khomas',
    city: 'Windhoek',
    cover_image: VEH.van,
    gallery_images: [VEH.van, VEH.interior, VEH.road],
    description: 'Spacious people mover for families and small groups — airport meet & greet available.',
    pickup_location: 'Windhoek — Hosea Kutako airport or city handover.',
    included_features: ['Airport pickup', 'Basic insurance', 'Child seats on request'],
  },
  {
    id: 204,
    owner_username: 'luxdrive_na',
    owner_display_name: 'LuxDrive Namibia',
    owner_bio: 'Executive sedans and SUVs for corporate travel and events — meet & greet at Hosea Kutako.',
    owner_region: 'Khomas',
    owner_city: 'Windhoek',
    owner_avatar: null,
    title: 'BMW 5 Series',
    make: 'BMW',
    model: '520d',
    year: 2023,
    transmission: 'automatic',
    seats: 5,
    vehicle_type: 'luxury',
    price_per_day: '980',
    region: 'Khomas',
    city: 'Windhoek',
    cover_image: VEH.luxury,
    gallery_images: [VEH.luxury, VEH.interior, VEH.road],
    description: 'Executive sedan for corporate travel and events — polished and quiet on tar.',
    pickup_location: 'Windhoek — hotel or airport handover.',
    included_features: ['Meet & greet', 'Premium insurance', 'Unlimited kilometres'],
  },
]

export const mockBusTrips: MockBusTrip[] = [
  {
    id: 301,
    owner_username: 'transport_mgr',
    route_detail: {
      origin: 'Windhoek',
      destination: 'Swakopmund',
      operator_name: 'Namibia Link Coaches',
      cover_image:
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=72',
      gallery_images: [
        'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=900&q=72',
        'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=900&q=72',
        'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=72',
      ],
    },
    departs_at: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    arrives_at: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    price: '180',
    total_seats: 32,
    occupied_seats: [1, 2, 16],
    available_seats: 29,
    amenities: ['Air conditioning', 'Onboard toilet', 'Luggage hold', 'USB charging'],
    is_active: true,
  },
  {
    id: 302,
    owner_username: 'transport_mgr',
    route_detail: {
      origin: 'Windhoek',
      destination: 'Oshakati',
      operator_name: 'Northern Express',
      cover_image:
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=900&q=72',
      gallery_images: [
        'https://images.unsplash.com/photo-1520437358207-323b43b50729?auto=format&fit=crop&w=900&q=72',
        'https://images.unsplash.com/photo-1524401596648-3b9b0f24d1f4?auto=format&fit=crop&w=900&q=72',
      ],
    },
    departs_at: new Date(Date.now() + 1000 * 60 * 60 * 40).toISOString(),
    arrives_at: new Date(Date.now() + 1000 * 60 * 60 * 46).toISOString(),
    price: '240',
    total_seats: 40,
    occupied_seats: [4, 5, 6, 20],
    available_seats: 36,
    amenities: ['Air conditioning', 'Luggage hold'],
    is_active: true,
  },
  {
    id: 303,
    owner_username: 'transport_mgr',
    route_detail: {
      origin: 'Windhoek',
      destination: 'Swakopmund',
      operator_name: 'Namibia Link Coaches',
      cover_image:
        'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=72',
      gallery_images: [
        'https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=900&q=72',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=72',
      ],
    },
    departs_at: new Date(Date.now() + 1000 * 60 * 60 * 50).toISOString(),
    arrives_at: new Date(Date.now() + 1000 * 60 * 60 * 54).toISOString(),
    price: '180',
    total_seats: 32,
    occupied_seats: [],
    available_seats: 32,
    amenities: ['Air conditioning', 'Onboard toilet', 'Luggage hold', 'USB charging'],
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
    organizer_display_name: 'Windhoek Events Co.',
    is_free: true,
    capacity: 500,
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
    organizer_display_name: 'Coastal Vibes',
    is_free: false,
    price: '150',
    ticket_url: 'https://example.com/tickets/coastal-sunset',
    capacity: 200,
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
    cover_image: U.foodGrill,
    owner_username: 'food_owner',
    rating_avg: '4.55',
    rating_count: 210,
    is_open: true,
    tagline: 'Fresh local plates, lunch specials, and dinner favourites.',
    popular_dish: 'Flame-grilled oryx steak',
    closes_at: '9 PM',
    venue_stories: [
      {
        id: 'grill-night',
        label: 'Grill night',
        coverSrc: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80',
        slides: [
          {
            headline: 'Fire up Friday',
            sub: 'Live flame grill from 6pm — first round of local brews on the house for tables of four.',
            src: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80',
          },
          {
            headline: 'Ask for the oryx',
            sub: 'Our signature flame-grilled oryx steak — medium-rare with chimichurri.',
            src: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=80',
          },
        ],
      },
    ],
  },
  {
    id: 502,
    name: 'Coastal Café',
    description: 'Pastries, espresso, and a sea breeze.',
    cuisine: 'cafe',
    region: 'Erongo',
    city: 'Swakopmund',
    price_level: 1,
    cover_image: U.foodCafe,
    owner_username: 'food_owner',
    rating_avg: '4.40',
    rating_count: 67,
    is_open: true,
    tagline: 'Ocean-view brunch and single-origin espresso.',
    popular_dish: 'Sea-salt croissant',
    closes_at: '6 PM',
  },
  {
    id: 503,
    name: 'Sunrise Breakfast Co.',
    description: 'Early opens, big plates, and fresh juice.',
    cuisine: 'cafe',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 1,
    cover_image: U.foodBreakfast,
    owner_username: 'food_owner',
    rating_avg: '4.62',
    rating_count: 94,
    is_open: true,
    tagline: 'The go-to morning stop before a road trip.',
    popular_dish: 'Farmhouse breakfast bowl',
    closes_at: '2 PM',
  },
  {
    id: 504,
    name: 'Atlantic Seafood Table',
    description: 'Catch-of-the-day and oyster specials.',
    cuisine: 'seafood',
    region: 'Erongo',
    city: 'Walvis Bay',
    price_level: 3,
    cover_image: U.foodSeafood,
    owner_username: 'food_owner',
    rating_avg: '4.71',
    rating_count: 156,
    is_open: true,
    tagline: 'Harbour-fresh plates with a sunset deck.',
    popular_dish: 'Grilled kingklip',
    closes_at: '10 PM',
  },
  {
    id: 505,
    name: 'Crumb & Crust Bakery',
    description: 'Sourdough, pastries, and weekend markets.',
    cuisine: 'bakery',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 1,
    cover_image: U.foodBakery,
    owner_username: 'food_owner',
    rating_avg: '4.48',
    rating_count: 88,
    is_open: true,
    tagline: 'Warm bread by 7am — sell out by noon.',
    popular_dish: 'Cinnamon morning bun',
    closes_at: '4 PM',
  },
  {
    id: 506,
    name: 'Napoli Stone Pizza',
    description: 'Wood-oven pies and late-night slices.',
    cuisine: 'pizza',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 2,
    cover_image: U.foodPizza,
    owner_username: 'food_owner',
    rating_avg: '4.36',
    rating_count: 132,
    is_open: false,
    tagline: 'Thin crust, local toppings, family portions.',
    popular_dish: 'Peri-peri chicken pizza',
    closes_at: '11 PM',
  },
  {
    id: 507,
    name: 'Savannah Local Grill',
    description: 'Braai nights and sharing platters.',
    cuisine: 'grill',
    region: 'Oshana',
    city: 'Oshakati',
    price_level: 2,
    cover_image: U.foodGrill,
    owner_username: 'food_owner',
    rating_avg: '4.44',
    rating_count: 73,
    is_open: true,
    tagline: 'Weekend braai with live local music.',
    popular_dish: 'Mixed braai platter',
    closes_at: '11 PM',
  },
  {
    id: 508,
    name: 'Skyline Rooftop Bar',
    description: 'Cocktails, small plates, and city views.',
    cuisine: 'bar',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 3,
    cover_image: U.foodBar,
    owner_username: 'food_owner',
    rating_avg: '4.58',
    rating_count: 201,
    is_open: true,
    tagline: 'Golden-hour drinks above the CBD.',
    popular_dish: 'Smoked chilli margarita',
    closes_at: '12 AM',
  },
  {
    id: 509,
    name: 'Night Market Lane',
    description: 'Street food stalls and live DJs.',
    cuisine: 'local',
    region: 'Khomas',
    city: 'Windhoek',
    price_level: 1,
    cover_image: U.foodStreet,
    owner_username: 'food_owner',
    rating_avg: '4.29',
    rating_count: 312,
    is_open: true,
    tagline: 'Cheap eats, loud energy, open late Fridays.',
    popular_dish: 'Kapana with chilli relish',
    closes_at: '1 AM',
  },
  {
    id: 510,
    name: 'Dolce Dessert Studio',
    description: 'Cakes, gelato, and coffee flights.',
    cuisine: 'bakery',
    region: 'Erongo',
    city: 'Swakopmund',
    price_level: 2,
    cover_image: U.foodDessert,
    owner_username: 'food_owner',
    rating_avg: '4.67',
    rating_count: 54,
    is_open: true,
    tagline: 'Perfect after-dinner stop near the waterfront.',
    popular_dish: 'Salted caramel tart',
    closes_at: '9 PM',
  },
  {
    id: 511,
    name: 'Harbour Fish & Chips',
    description: 'Paper-wrapped classics by the quay.',
    cuisine: 'seafood',
    region: 'Erongo',
    city: 'Walvis Bay',
    price_level: 1,
    cover_image: U.foodSeafood,
    owner_username: 'food_owner',
    rating_avg: '4.33',
    rating_count: 119,
    is_open: false,
    tagline: 'Quick harbour lunch — queues at noon.',
    popular_dish: 'Beer-battered hake',
    closes_at: '5 PM',
  },
  {
    id: 512,
    name: 'Bean Theory Espresso',
    description: 'Third-wave coffee and light bites.',
    cuisine: 'cafe',
    region: 'Erongo',
    city: 'Swakopmund',
    price_level: 2,
    cover_image: U.foodCafe,
    owner_username: 'food_owner',
    rating_avg: '4.51',
    rating_count: 41,
    is_open: true,
    tagline: 'Serious espresso in a calm coastal room.',
    popular_dish: 'Flat white & almond croissant',
    closes_at: '7 PM',
  },
]

export const mockGuides: MockGuide[] = [
  {
    id: 601,
    user: 2,
    headline: 'Sossusvlei & Namib desert',
    bio: 'Ten years guiding photographers and families across the dunes.',
    languages: ['English', 'Afrikaans'],
    regions: ['Africa', 'Southern Africa'],
    hourly_rate: '450',
    photo: U.safari,
    username: 'guide_pro',
    display_name: 'Kaoko Safari Guides',
    rating_avg: '4.95',
    rating_count: 142,
    response_hours_typical: 2,
    years_guiding: 12,
    licensed_guide: true,
    certifications: ['First aid certified', '4×4 recovery training'],
    languages_detail: [
      { language: 'English', level: 'Fluent' },
      { language: 'Afrikaans', level: 'Fluent' },
    ],
    guest_reviews: [
      {
        name: 'Sarah M.',
        place: 'Cape Town',
        rating: 5,
        body:
          'Unforgettable dunes at golden hour — our guide knew every viewpoint and kept the pace perfect for our family. Kids still talk about the oryx sighting.',
      },
      {
        name: 'Jonas K.',
        place: 'Berlin',
        rating: 4.8,
        body: 'Professional, warm, and deeply knowledgeable about the desert ecology. Worth every minute.',
      },
    ],
    tour_packages: [
      {
        id: 'dunes-half',
        title: 'Dunes & deadvlei half-day',
        hours: 4,
        price: '1800',
        photo: U.dunes,
        description:
          'Morning pick-up toward Sossusvlei with time on the pans, Deadvlei walk, and a shaded coffee break before return. Pace matched to heat and fitness.',
        photos: [U.safari, U.wheel],
        reviews: [
          {
            name: 'Marta V.',
            place: 'Johannesburg',
            rating: 5,
            body: 'We booked the half-day specifically for Deadvlei — timing at the clay pan was perfect for photos and our kids coped fine in the heat.',
          },
          {
            name: 'Chris D.',
            place: 'Chicago',
            rating: 4.9,
            body: 'Crystal-clear briefing the night before and a calm driver. Felt like this exact route was what we paid for, not a rushed generic tour.',
          },
        ],
      },
      {
        id: 'dunes-full',
        title: 'Full Namib loop & picnic',
        hours: 8,
        price: '3200',
        photo: U.safari,
        photos: [U.dunes, U.stay1],
        reviews: [
          {
            name: 'Elena R.',
            place: 'Valencia',
            rating: 5,
            body: 'The full-day loop with picnic was worth it — one long day but we saw dunes, dry riverbeds, and wildlife we would have missed on our own.',
          },
        ],
      },
    ],
    portfolio_gallery: [
      { src: U.dunes, caption: 'Sossusvlei at sunrise' },
      { src: U.safari, caption: 'Guests at Deadvlei' },
    ],
    default_meeting_point: 'Sesriem gate visitor parking — look for the silver Land Cruiser with DELVE sign.',
    specialities: ['Photography', 'Family-friendly', 'Nature'],
  },
  {
    id: 602,
    user: 1,
    headline: 'Windhoek — architecture & culture',
    bio: 'City walks, galleries, and the stories behind the streets.',
    languages: ['English'],
    regions: ['Africa', 'Southern Africa'],
    hourly_rate: '280',
    photo: null,
    username: 'demo_user',
    display_name: 'Kaoko Explorer',
    rating_avg: '4.70',
    rating_count: 38,
    response_hours_typical: 4,
    years_guiding: 5,
    licensed_guide: false,
    certifications: [],
    guest_reviews: [],
    tour_packages: [
      {
        id: 'windhoek-walk',
        title: 'Old centre architecture walk',
        hours: 2,
        price: '560',
        photo: U.city,
        photos: [U.map, U.city],
        reviews: [
          {
            name: 'Thabo N.',
            place: 'Windhoek',
            rating: 4.7,
            body: 'Two hours flew by — good mix of German colonial pockets and Independence-era stories.',
          },
        ],
      },
      {
        id: 'windhoek-food',
        title: 'Market & coffee circuit',
        hours: 3,
        price: '840',
        photo: U.food,
        photos: [U.city],
        reviews: [
          {
            name: 'Lina F.',
            place: 'Walvis Bay',
            rating: 4.8,
            body: 'Stopped at places we never would have found solo; the market tasting was delicious.',
          },
        ],
      },
    ],
    portfolio_gallery: [],
    default_meeting_point: 'Independence Memorial Museum steps',
    specialities: ['Urban walks', 'History'],
  },
  {
    id: 603,
    user: 2,
    headline: 'Tokyo after dark — food & neon',
    bio: 'Small groups through izakaya alleys, late trains, and quiet shrines.',
    languages: ['English', 'Japanese'],
    regions: ['Asia'],
    hourly_rate: '85',
    photo: U.city,
    username: 'demo_provider',
    display_name: 'Desert Stays',
    rating_avg: '4.88',
    rating_count: 512,
    response_hours_typical: 1,
    years_guiding: 8,
    licensed_guide: true,
    certifications: ['Japan National Guide (EN)', 'Food safety'],
    languages_detail: [
      { language: 'English', level: 'Native' },
      { language: 'Japanese', level: 'Fluent' },
    ],
    guest_reviews: [
      {
        name: 'Alex P.',
        place: 'London',
        rating: 5,
        body: 'Best food crawl we have done anywhere. Felt like a night out with a friend who happens to know every hidden spot.',
      },
    ],
    tour_packages: [
      {
        id: 'tokyo-neon',
        title: 'Neon & izakaya trail',
        hours: 3,
        price: '240',
        photo: U.city,
        photos: [U.food, U.city],
        reviews: [
          {
            name: 'Alex P.',
            place: 'London',
            rating: 5,
            body: 'This exact neon route was unbelievable — yakitori stop then quiet backstreets we never saw on blogs.',
          },
        ],
      },
      {
        id: 'tokyo-late',
        title: 'Late-night Shinjuku deep dive',
        hours: 4,
        price: '320',
        photo: U.food,
        photos: [U.city],
        reviews: [
          {
            name: 'Sam W.',
            place: 'Sydney',
            rating: 4.9,
            body: 'Felt totally safe weaving late-night Shinjuku; guide knew where to linger for photos vs where to move on.',
          },
        ],
      },
    ],
    portfolio_gallery: [{ src: U.city, caption: 'Shinjuku crossing' }],
    default_meeting_point: 'Shinjuku Station — east exit, central pillar B',
    specialities: ['Food', 'Night photography'],
  },
  {
    id: 604,
    user: 1,
    headline: 'Lisbon tiles, light & Atlantic breeze',
    bio: 'Alfama to Belém: history without the lecture, with tram and pastry stops.',
    languages: ['English', 'Portuguese'],
    regions: ['Europe'],
    hourly_rate: '55',
    photo: U.coast,
    username: 'demo_user',
    display_name: 'Kaoko Explorer',
    rating_avg: '4.92',
    rating_count: 203,
    response_hours_typical: 3,
    years_guiding: 6,
    tour_packages: [
      {
        id: 'lisbon-tiles',
        title: 'Old City tiles & viewpoints',
        hours: 2,
        price: '90',
        photo: U.coast,
        photos: [U.city, U.coast],
        reviews: [
          {
            name: 'Inês M.',
            place: 'Porto',
            rating: 4.95,
            body: 'Viewpoints we repeated the next day on our own — the tile stories in Alfama stuck with us.',
          },
        ],
      },
      {
        id: 'lisbon-food',
        title: 'Sunset food trail',
        hours: 4,
        price: '175',
        photo: U.food,
        photos: [U.coast],
        reviews: [
          {
            name: 'Jordan T.',
            place: 'Boston',
            rating: 5,
            body: 'Sunset + pastel + bifana in one stroll — pacing was perfect.',
          },
        ],
      },
    ],
    portfolio_gallery: [{ src: U.coast, caption: 'Belém waterfront' }],
    default_meeting_point: 'Praça do Comércio, south side fountain',
    specialities: ['History', 'Food'],
  },
  {
    id: 605,
    user: 2,
    headline: 'NYC bridges & downtown rhythm',
    bio: 'Photography-friendly routes through Manhattan and Brooklyn waterfronts.',
    languages: ['English', 'Spanish'],
    regions: ['Americas'],
    hourly_rate: '120',
    photo: U.map,
    username: 'demo_provider',
    display_name: 'Desert Stays',
    rating_avg: '4.85',
    rating_count: 891,
    response_hours_typical: 2,
    tour_packages: [
      {
        id: 'nyc-bridges',
        title: 'Brooklyn Bridge & DUMBO',
        hours: 2,
        price: '240',
        photo: U.map,
        photos: [U.city],
        reviews: [
          {
            name: 'Priya K.',
            place: 'Toronto',
            rating: 4.9,
            body: 'Classic bridge shots without jostling — guide timed it between pedestrian peaks.',
          },
        ],
      },
      {
        id: 'nyc-downtown',
        title: 'Downtown skyline walk',
        hours: 3,
        price: '360',
        photo: U.city,
        photos: [U.map],
        reviews: [
          {
            name: 'Leo G.',
            place: 'Miami',
            rating: 4.85,
            body: 'Waterfront pacing was great — we paused where light hit the skyline just right.',
          },
        ],
      },
    ],
    portfolio_gallery: [{ src: U.map, caption: 'Manhattan skyline' }],
    default_meeting_point: 'City Hall Park — north entrance',
    specialities: ['Photography', 'Architecture'],
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
    image: null,
    video: V.joyrides,
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
    image: null,
    video: V.escapes,
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
    image: null,
    video: V.fun,
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
    image: null,
    video: V.joyrides,
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
    image: null,
    video: V.blazes,
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
    image: null,
    video: V.escapes,
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

