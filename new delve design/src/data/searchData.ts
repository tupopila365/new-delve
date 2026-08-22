// ─── Base types ───────────────────────────────────────────────────────────

export type ResultType =
  | 'all' | 'deal' | 'place' | 'stay' | 'transport'
  | 'food' | 'activity' | 'event' | 'guide' | 'shop'
  | 'journey' | 'delvers' | 'community'

export type SortOption = 'recommended' | 'price-asc' | 'rating' | 'most-reviewed' | 'soonest' | 'nearest' | 'best-deal'

export interface SearchResult {
  id: string
  resultType: ResultType
  title: string
  subtitle: string
  destination: string
  image: string
  price?: string
  currency?: string
  priceBasis?: string
  rating?: number
  reviewCount?: number
  verification?: { verified: boolean; label: string }
  sponsored: boolean
  explanation?: string
  actionLabel: string
}

export interface DealSearchResult extends SearchResult {
  resultType: 'deal'
  saving: string
  expiry: string
  category: string
  business: string
}

export interface TransportSearchResult extends SearchResult {
  resultType: 'transport'
  transportGroup: 'road' | 'air' | 'water'
  transportMode: string
  operator: string
  origin: string
  departure: string
  duration: string
  seatsLeft?: number
  bookingMethod: string
}

export interface JourneySearchResult extends SearchResult {
  resultType: 'journey'
  creator: string
  creatorAvatar: string
  stops: number
  transportModes: string[]
}

export interface DelversSearchResult extends SearchResult {
  resultType: 'delvers'
  creator: string
  creatorAvatar: string
  handle: string
  postType: string
}

export interface PlaceSearchResult extends SearchResult {
  resultType: 'place'
  category: string
  openNow?: boolean
}

// ─── Autocomplete suggestions ─────────────────────────────────────────────

export interface AutocompleteSuggestion {
  id: string
  label: string
  context: string
  type: string
  group: 'recent' | 'place' | 'transport' | 'deal' | 'journey' | 'creator'
}

export const autocompleteSuggestions: AutocompleteSuggestion[] = [
  { id: 'ac1', label: 'Swakopmund', context: 'Place · Coastal town, Namibia', type: 'Place', group: 'place' },
  { id: 'ac2', label: 'Windhoek to Walvis Bay', context: 'Transport route · Bus, Car rental', type: 'Transport', group: 'transport' },
  { id: 'ac3', label: 'Airport transfer in Windhoek', context: 'Transport · Road', type: 'Transport', group: 'transport' },
  { id: 'ac4', label: 'Weekend coast deals', context: 'Deals · Swakopmund area', type: 'Deal', group: 'deal' },
  { id: 'ac5', label: 'Desert roads to the coast', context: 'Journey · 3 stops · 2 days', type: 'Journey', group: 'journey' },
  { id: 'ac6', label: 'Etosha Horizon Safaris', context: 'Business · Activities · Etosha', type: 'Business', group: 'place' },
  { id: 'ac7', label: 'Ferry to Pelican Point', context: 'Transport · Water · Walvis Bay', type: 'Transport', group: 'transport' },
  { id: 'ac8', label: 'Family stay near Windhoek', context: 'Stays · From N$ 850/night', type: 'Stay', group: 'deal' },
  { id: 'ac9', label: 'Sossusvlei', context: 'Place · Desert · Hardap Region', type: 'Place', group: 'place' },
  { id: 'ac10', label: 'Community ride Windhoek → Swakop', context: 'Transport · Road · N$ 240/seat', type: 'Transport', group: 'transport' },
]

// ─── Popular searches ─────────────────────────────────────────────────────

export const popularSearches = [
  'Things to do this weekend',
  'Airport transfer',
  'Budget transport',
  'Coastal route',
  'Family activities',
  'Local food Windhoek',
  'Charter flight Sossusvlei',
  'Community ride',
]

// ─── Suggested destinations ───────────────────────────────────────────────

export interface DestinationSuggestion {
  id: string
  name: string
  tagline: string
  image: string
}

export const suggestedDestinations: DestinationSuggestion[] = [
  { id: 'd1', name: 'Swakopmund', tagline: 'Coastal adventure hub', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop&auto=format' },
  { id: 'd2', name: 'Etosha', tagline: 'Wildlife & safaris', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=300&fit=crop&auto=format' },
  { id: 'd3', name: 'Sossusvlei', tagline: 'Red dune landscapes', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop&auto=format' },
  { id: 'd4', name: 'Walvis Bay', tagline: 'Flamingos & the lagoon', image: 'https://images.unsplash.com/photo-1557429287-b2e26467db2d?w=400&h=300&fit=crop&auto=format' },
  { id: 'd5', name: 'Lüderitz', tagline: 'Desert meets the Atlantic', image: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=400&h=300&fit=crop&auto=format' },
]

// ─── Recent searches (mock) ───────────────────────────────────────────────

export const recentSearches = [
  'Swakopmund',
  'Airport transfer',
  'Weekend deals',
  'Ferry Walvis Bay',
]

// ─── Mock search results ──────────────────────────────────────────────────

export const mockSearchResults: SearchResult[] = [
  // Deals
  {
    id: 'sr-d1',
    resultType: 'deal',
    title: '20% off coastal quad biking',
    subtitle: 'Swakopmund Quad Adventures · Until 31 Aug',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop&auto=format',
    price: '320',
    currency: 'N$',
    priceBasis: 'person',
    rating: 4.6,
    reviewCount: 88,
    verification: { verified: true, label: 'Verified business' },
    sponsored: false,
    explanation: 'Popular deal near Swakopmund',
    actionLabel: 'Claim deal',
    saving: '20%',
    expiry: '31 Aug 2026',
    category: 'Activities',
    business: 'Swakopmund Quad Adventures',
  } as DealSearchResult,
  {
    id: 'sr-d2',
    resultType: 'deal',
    title: 'Stay 3 nights, pay 2',
    subtitle: 'Desert Lodge Sossusvlei · Limited availability',
    destination: 'Sossusvlei',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=400&fit=crop&auto=format',
    price: '1 400',
    currency: 'N$',
    priceBasis: 'night',
    rating: 4.8,
    reviewCount: 214,
    verification: { verified: true, label: 'Verified lodge' },
    sponsored: false,
    explanation: 'Good value this weekend',
    actionLabel: 'View deal',
    saving: '1 free night',
    expiry: '30 Sep 2026',
    category: 'Stay',
    business: 'Desert Lodge Sossusvlei',
  } as DealSearchResult,

  // Places
  {
    id: 'sr-p1',
    resultType: 'place',
    title: 'Swakopmund Waterfront',
    subtitle: 'Restaurants, shops & ocean views',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=400&fit=crop&auto=format',
    rating: 4.5,
    reviewCount: 1203,
    verification: { verified: true, label: 'Verified place' },
    sponsored: false,
    explanation: 'Near Swakopmund',
    actionLabel: 'Explore',
    category: 'Waterfront',
    openNow: true,
  } as PlaceSearchResult,
  {
    id: 'sr-p2',
    resultType: 'place',
    title: 'Etosha National Park',
    subtitle: 'Big Five wildlife reserve · 22 270 km²',
    destination: 'Etosha',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=400&fit=crop&auto=format',
    rating: 4.9,
    reviewCount: 4580,
    verification: { verified: true, label: 'Verified park' },
    sponsored: false,
    explanation: "Namibia's most-visited destination",
    actionLabel: 'Explore',
    category: 'Nature reserve',
    openNow: true,
  } as PlaceSearchResult,

  // Transport
  {
    id: 'sr-t1',
    resultType: 'transport',
    title: 'Intercape Bus · Windhoek → Swakopmund',
    subtitle: 'Daily · 07:00 departure · 4 hrs',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1635858780418-2eeb9e75768f?w=600&h=400&fit=crop&auto=format',
    price: '380',
    currency: 'N$',
    priceBasis: 'seat',
    rating: 4.3,
    reviewCount: 641,
    verification: { verified: true, label: 'Licensed bus operator' },
    sponsored: false,
    explanation: 'Matches your route',
    actionLabel: 'Choose seats',
    transportGroup: 'road',
    transportMode: 'Bus',
    operator: 'Intercape Namibia',
    origin: 'Windhoek Bus Terminal',
    departure: 'Daily · 07:00',
    duration: '4h',
    seatsLeft: 14,
    bookingMethod: 'instant',
  } as TransportSearchResult,
  {
    id: 'sr-t2',
    resultType: 'transport',
    title: 'Westair Regional Flight · WDH → SWP',
    subtitle: 'Mon 11 Aug · 08:15 · 50 min',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=600&h=400&fit=crop&auto=format',
    price: '2 400',
    currency: 'N$',
    priceBasis: 'person',
    rating: 4.6,
    reviewCount: 520,
    verification: { verified: true, label: 'Licensed airline' },
    sponsored: false,
    explanation: 'Fastest option',
    actionLabel: 'View flight',
    transportGroup: 'air',
    transportMode: 'Regional flight',
    operator: 'Westair Aviation',
    origin: 'Windhoek (WDH)',
    departure: 'Mon 11 Aug · 08:15',
    duration: '50 min',
    seatsLeft: 6,
    bookingMethod: 'external',
  } as TransportSearchResult,
  {
    id: 'sr-t3',
    resultType: 'transport',
    title: 'Walvis Bay Ferry · Harbour → Pelican Point',
    subtitle: 'Daily · 09:00 · 1h 30m',
    destination: 'Walvis Bay',
    image: 'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=600&h=400&fit=crop&auto=format',
    price: '320',
    currency: 'N$',
    priceBasis: 'person',
    rating: 4.2,
    reviewCount: 189,
    verification: { verified: true, label: 'Licensed ferry operator' },
    sponsored: false,
    explanation: 'Scenic water route',
    actionLabel: 'View ferry',
    transportGroup: 'water',
    transportMode: 'Ferry',
    operator: 'Walvis Bay Ferry Services',
    origin: 'Walvis Bay Harbour',
    departure: 'Daily · 09:00',
    duration: '1h 30m',
    seatsLeft: 22,
    bookingMethod: 'instant',
  } as TransportSearchResult,

  // Journeys
  {
    id: 'sr-j1',
    resultType: 'journey',
    title: 'Desert Roads to the Coast',
    subtitle: 'Windhoek → Swakopmund · 2 days · 3 stops',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1510060662584-0fdbad3a0a5a?w=600&h=400&fit=crop&auto=format',
    rating: 4.7,
    reviewCount: 32,
    verification: { verified: true, label: 'Verified Delver' },
    sponsored: false,
    explanation: 'Similar to your search',
    actionLabel: 'View journey',
    creator: 'Lena B.',
    creatorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=60&h=60&fit=crop&auto=format',
    stops: 3,
    transportModes: ['Car rental', 'Community ride'],
  } as JourneySearchResult,

  // Delvers
  {
    id: 'sr-del1',
    resultType: 'delvers',
    title: 'Morning light at Sandwich Harbour',
    subtitle: 'Photography · Swakopmund',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=400&fit=crop&auto=format',
    rating: undefined,
    reviewCount: 0,
    verification: { verified: true, label: 'Verified Delver' },
    sponsored: false,
    explanation: 'From the Delve community',
    actionLabel: 'View post',
    creator: 'Marcus V.',
    creatorAvatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=60&h=60&fit=crop&auto=format',
    handle: '@marcusv',
    postType: 'Photo',
  } as DelversSearchResult,

  // Food
  {
    id: 'sr-f1',
    resultType: 'food',
    title: 'The Jetty Seafood Restaurant',
    subtitle: 'Seafood · Swakopmund Waterfront',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop&auto=format',
    price: '250',
    currency: 'N$',
    priceBasis: 'person avg',
    rating: 4.4,
    reviewCount: 567,
    verification: { verified: true, label: 'Verified restaurant' },
    sponsored: false,
    explanation: 'Highly rated near Swakopmund',
    actionLabel: 'View menu',
  },

  // Activity
  {
    id: 'sr-a1',
    resultType: 'activity',
    title: 'Sandwich Harbour 4x4 Day Tour',
    subtitle: 'Guided · Full day · Swakopmund',
    destination: 'Swakopmund',
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&h=400&fit=crop&auto=format',
    price: '850',
    currency: 'N$',
    priceBasis: 'person',
    rating: 4.8,
    reviewCount: 312,
    verification: { verified: true, label: 'Verified operator' },
    sponsored: false,
    explanation: 'Popular this weekend',
    actionLabel: 'Book activity',
  },
]

// ─── Categories for explore grid ──────────────────────────────────────────

export interface ExploreCategory {
  label: string
  icon: string
  tab: ResultType
}

export const exploreCategories: ExploreCategory[] = [
  { label: 'Places',      icon: '📍', tab: 'place' },
  { label: 'Deals',       icon: '🏷️', tab: 'deal' },
  { label: 'Stays',       icon: '🏨', tab: 'stay' },
  { label: 'Transport',   icon: '🚗', tab: 'transport' },
  { label: 'Food',        icon: '🍽️', tab: 'food' },
  { label: 'Activities',  icon: '🪂', tab: 'activity' },
  { label: 'Events',      icon: '🎟️', tab: 'event' },
  { label: 'Guides',      icon: '📖', tab: 'guide' },
  { label: 'Shops',       icon: '🛍️', tab: 'shop' },
  { label: 'Journeys',    icon: '🗺️', tab: 'journey' },
  { label: 'Delvers',     icon: '👤', tab: 'delvers' },
  { label: 'Local Q&A',   icon: '💬', tab: 'all' },
]

// ─── Transport shortcuts ───────────────────────────────────────────────────

export const transportShortcuts = [
  { label: 'Windhoek → Swakop', query: 'Windhoek to Swakopmund transport' },
  { label: 'Airport transfers', query: 'Airport transfer Windhoek' },
  { label: 'Coastal ferry',     query: 'Ferry Walvis Bay' },
  { label: 'Charter flights',   query: 'Charter flight Namibia' },
]
