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

// ─── Search results ───────────────────────────────────────────────────────

export const mockSearchResults: SearchResult[] = []


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
