// ─── Types ────────────────────────────────────────────────────────────────

export type ListingType =
  | 'stay' | 'food' | 'activity' | 'guide' | 'event' | 'shop'

export type BookingMethod =
  | 'book' | 'request' | 'reserve' | 'message' | 'external' | 'add-to-cart' | 'check-availability'

export type AvailabilityStatus =
  | 'available' | 'limited' | 'unavailable' | 'sold-out' | 'request' | 'checking'

export interface ReviewItem {
  id: string
  author: string
  authorAvatar: string
  rating: number
  date: string
  body: string
  verified: boolean          // came from a completed booking
  businessResponse?: string
}

export interface QuestionItem {
  id: string
  author: string
  authorAvatar: string
  question: string
  timeAgo: string
  answers: {
    body: string
    fromBusiness: boolean
    author: string
    timeAgo: string
  }[]
}

export interface ListingFull {
  id: string
  listingType: ListingType
  serviceCategory: string
  title: string
  subtitle: string
  business: string
  businessAvatar: string
  businessDescription: string
  destination: string
  media: string[]
  rating: number
  reviewCount: number
  price: string
  currency: string
  priceBasis: string
  verification: { verified: boolean; label: string; scope: string }
  availability: AvailabilityStatus
  availabilityNote: string
  sponsored: boolean
  description: string
  highlights: string[]
  included: string[]
  excluded: string[]
  terms: string
  cancellation: string
  safety: string | null
  bookingMethod: BookingMethod
  bookingActionLabel: string
  activeDealId?: string          // ref to dealsData if applicable
  reviews: ReviewItem[]
  questions: QuestionItem[]
  // ── Stay ──────────────────────────────────────────────────
  propertyType?: string
  amenities?: string[]
  checkIn?: string
  checkOut?: string
  bedrooms?: number
  beds?: number
  bathrooms?: number
  maxGuests?: number
  houseRules?: string[]
  roomOptions?: { id: string; name: string; price: string; beds: string; guests: number; image: string }[]
  // ── Food ──────────────────────────────────────────────────
  cuisine?: string[]
  priceLevel?: number
  openingHours?: string
  address?: string
  menuItems?: { name: string; price: string; description: string; image?: string }[]
  dietaryTags?: string[]
  takesReservations?: boolean
  // ── Activity ──────────────────────────────────────────────
  duration?: string
  meetingPoint?: string
  groupSizeMin?: number
  groupSizeMax?: number
  ageGuidance?: string
  fitnessLevel?: string
  requirements?: string[]
  whatToBring?: string[]
  schedule?: { date: string; time: string; spotsLeft: number }[]
  // ── Guide ─────────────────────────────────────────────────
  languages?: string[]
  areas?: string[]
  experience?: string
  tripsCompleted?: number
  packages?: { id: string; name: string; duration: string; price: string; groupSize: string; description: string }[]
  // ── Event ─────────────────────────────────────────────────
  eventDate?: string
  eventTime?: string
  doorsOpen?: string
  venue?: string
  venueAddress?: string
  ageRestriction?: string
  ticketOptions?: { id: string; name: string; price: string; available: boolean; description: string }[]
  // ── Shop ──────────────────────────────────────────────────
  productVariants?: { name: string; options: string[] }[]
  stockStatus?: 'in-stock' | 'limited' | 'out-of-stock'
  stockCount?: number
  fulfillmentOptions?: string[]
  returnPolicy?: string
}

// ─── Mock listings ────────────────────────────────────────────────────────

export const allListings: ListingFull[] = [

  // ── STAY ──────────────────────────────────────────────────────────────
  {
    id: 'lst-stay-1',
    listingType: 'stay',
    serviceCategory: 'Stay',
    title: 'Dune View Guesthouse',
    subtitle: 'Boutique guesthouse on the edge of Sossusvlei',
    business: 'Desert Lodge Sossusvlei',
    businessAvatar: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'A family-run lodge offering guided dune experiences, home-cooked meals, and direct access to the Namib-Naukluft National Park.',
    destination: 'Sossusvlei, Namibia',
    media: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1549294413-26f195200c16?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.9,
    reviewCount: 214,
    price: '1 400',
    currency: 'N$',
    priceBasis: 'night',
    verification: { verified: true, label: 'Listing reviewed', scope: 'Accommodation details, operator identity, and photos reviewed by Delve.' },
    availability: 'available',
    availabilityNote: 'Available most dates in August and September 2026',
    sponsored: false,
    description: 'Set against the rust-red dunes of Sossusvlei, Dune View Guesthouse offers eight en-suite rooms with uninterrupted desert views. Each room has its own private veranda, a handwoven ceiling, and locally sourced furnishings. Guests have direct walk-out access to NamibRand Nature Reserve and a guided dune-walk program included with every stay.',
    highlights: ['Desert-view verandas', 'All meals included', 'Guided dune walks', 'NamibRand reserve access', 'Pool', 'Free parking'],
    included: ['Breakfast, lunch and dinner', 'Two guided dune walks', 'Park entry fees', 'Stargazing session', 'Airport shuttle from Sesriem'],
    excluded: ['Alcoholic beverages', 'Hot-air balloon flight', 'Scenic flight'],
    terms: 'Minimum stay 2 nights. All-inclusive rate applies to the booked party only. Changes to party size after check-in may affect rate.',
    cancellation: 'Free cancellation up to 7 days before arrival. 50% charge within 7 days. No refund within 48 hours.',
    safety: 'Guests must stay on marked paths after dark. Wildlife is present. Emergency contacts and evacuation procedures posted in every room.',
    bookingMethod: 'request',
    bookingActionLabel: 'Request to book',
    propertyType: 'Guesthouse',
    amenities: ['Pool', 'Free Wi-Fi', 'Air conditioning', 'Private bathroom', 'Veranda', 'Guided tours', 'Restaurant', 'Bar', 'Safe', 'Laundry'],
    checkIn: '14:00',
    checkOut: '10:00',
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    maxGuests: 2,
    houseRules: ['No smoking indoors', 'Quiet hours after 22:00', 'Pets not permitted', 'Children welcome (all ages)'],
    roomOptions: [
      { id: 'r1', name: 'Desert Standard', price: '1 400', beds: '1 Queen', guests: 2, image: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=400&h=260&fit=crop&auto=format' },
      { id: 'r2', name: 'Dune Suite', price: '1 900', beds: '1 King', guests: 2, image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&h=260&fit=crop&auto=format' },
      { id: 'r3', name: 'Family Room', price: '2 400', beds: '1 King + 2 Single', guests: 4, image: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=400&h=260&fit=crop&auto=format' },
    ],
    reviews: [
      { id: 'rv1', author: 'Lena B.', authorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Absolutely breathtaking. The guided dune walk at sunrise was the highlight of our entire Namibia trip. Staff are incredibly warm and the food is excellent.', verified: true, businessResponse: 'Thank you Lena — sunrise on Dune 45 never gets old for us either. Hope to see you again soon!' },
      { id: 'rv2', author: 'Theo P.', authorAvatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'June 2026', body: 'The stargazing session after dinner was unforgettable. No light pollution whatsoever. Rooms are comfortable and well air-conditioned.', verified: true },
      { id: 'rv3', author: 'Priya K.', authorAvatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', rating: 4, date: 'May 2026', body: 'Lovely property in a stunning location. Wi-Fi is very slow but that is expected in the desert. The shuttle from Sesriem is a great inclusion.', verified: false },
    ],
    questions: [
      { id: 'q1', author: 'Marcus V.', authorAvatar: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=80&h=80&fit=crop&auto=format', question: 'Is there electricity after 22:00?', timeAgo: '3 days ago', answers: [{ body: 'Yes — the generator runs 24 hours. Solar backup covers the rooms at all times.', fromBusiness: true, author: 'Desert Lodge Sossusvlei', timeAgo: '2 days ago' }] },
      { id: 'q2', author: 'Clara M.', authorAvatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', question: 'Can we book just the dune walk without a full stay?', timeAgo: '1 week ago', answers: [{ body: 'The dune walks are currently for guests only, but message the lodge directly to ask about day-visitor options.', fromBusiness: false, author: 'Lena B.', timeAgo: '6 days ago' }] },
    ],
  },

  // ── STAY 2 ────────────────────────────────────────────────────────────
  {
    id: 'lst-stay-2',
    listingType: 'stay',
    serviceCategory: 'Stay',
    title: 'Swakop Beach Bungalow',
    subtitle: 'Self-catering beachfront bungalow steps from the Atlantic',
    business: 'Swakop Beach Escapes',
    businessAvatar: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'Three self-catering beachfront bungalows in a quiet residential lane 50 metres from the Swakopmund beach. Family-owned since 2009.',
    destination: 'Swakopmund, Namibia',
    media: [
      'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.7,
    reviewCount: 184,
    price: '980',
    currency: 'N$',
    priceBasis: 'night',
    verification: { verified: true, label: 'Listing reviewed', scope: 'Accommodation details and host identity verified by Delve.' },
    availability: 'limited',
    availabilityNote: '1 bungalow left this weekend',
    sponsored: false,
    description: 'A fully self-catering bungalow with direct beach access. The open-plan kitchen and living area look out over a private garden with a braai. All three bungalows sleep up to four guests and are cleaned daily. Guests get a dedicated parking bay and a keycode entry.',
    highlights: ['50m from the beach', 'Private braai', 'Self-catering kitchen', 'Daily cleaning', 'Free parking', 'Free Wi-Fi'],
    included: ['Linen and towels', 'Daily cleaning', 'Welcome basket', 'Free parking'],
    excluded: ['Breakfast', 'Airport transfer'],
    terms: 'Minimum 2-night stay on weekends. No smoking inside. Quiet hours after 22:00.',
    cancellation: 'Free cancellation up to 5 days before check-in. 50% charge within 5 days.',
    safety: null,
    bookingMethod: 'book',
    bookingActionLabel: 'Book now',
    propertyType: 'Bungalow',
    amenities: ['Beach access', 'Free Wi-Fi', 'Self-catering kitchen', 'Private braai', 'Air conditioning', 'Parking', 'Daily cleaning', 'Smart TV'],
    checkIn: '14:00',
    checkOut: '10:00',
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    maxGuests: 4,
    houseRules: ['No smoking indoors', 'No parties', 'Quiet hours after 22:00', 'Pets on request'],
    roomOptions: [
      { id: 'r1', name: 'Standard Bungalow', price: '980', beds: '2 Bedrooms', guests: 4, image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=260&fit=crop&auto=format' },
    ],
    reviews: [
      { id: 'rv1', author: 'Clara M.', authorAvatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Perfect for our family of four. The braai on the deck with ocean sounds in the background was just magical. Spotlessly clean.', verified: true },
      { id: 'rv2', author: 'Theo P.', authorAvatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', rating: 4, date: 'June 2026', body: 'Great location and great value. The kitchen has everything you need. Would have appreciated a few more spare towels for beach use.', verified: true },
    ],
    questions: [
      { id: 'q1', author: 'Priya K.', authorAvatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', question: 'Is there a beach shower to rinse off sand?', timeAgo: '5 days ago', answers: [{ body: 'Yes — there is an outdoor shower at the garden gate, ideal for rinsing off after the beach.', fromBusiness: true, author: 'Swakop Beach Escapes', timeAgo: '4 days ago' }] },
    ],
  },

  // ── STAY 3 ────────────────────────────────────────────────────────────
  {
    id: 'lst-stay-3',
    listingType: 'stay',
    serviceCategory: 'Stay',
    title: 'Etosha Safari Camp — Tented Suite',
    subtitle: 'Luxury tented camp on the Etosha National Park boundary',
    business: 'Etosha Edge Camps',
    businessAvatar: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'A small-footprint luxury tented camp on a private reserve sharing a 12km fence with Etosha National Park. Self-guided day drives and guided night drives available.',
    destination: 'Etosha, Namibia',
    media: [
      'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.8,
    reviewCount: 97,
    price: '3 200',
    currency: 'N$',
    priceBasis: 'night',
    verification: { verified: true, label: 'Operator verified', scope: 'Operator licensing, conservation permits, and campsite classification reviewed.' },
    availability: 'available',
    availabilityNote: 'Available August and September 2026',
    sponsored: false,
    description: 'Six luxury safari tents positioned to overlook a natural waterhole — lion, elephant, and rhino are regular visitors. Each tent has a king bed, en-suite bathroom with outdoor shower, and a private viewing deck. Full board with sundowner drives is included.',
    highlights: ['Waterhole views', 'Big Five area', 'All meals included', 'Guided night drives', 'Outdoor shower', 'Private deck'],
    included: ['All meals', 'Morning and evening game drives', 'Park fees (day drives)', 'Laundry', 'Sundowner on the deck'],
    excluded: ['Etosha gate fees (self-drive)', 'Alcoholic beverages', 'Gratuities'],
    terms: 'Minimum 2-night stay. Rate is per tent, per night. Conservation fee of N$ 120 per person per night not included.',
    cancellation: 'Free cancellation up to 14 days before arrival. 30% deposit retained within 14 days. No refund within 7 days.',
    safety: 'Electric fence surrounds the camp perimeter. Do not leave the tent area after dark without a guide escort.',
    bookingMethod: 'request',
    bookingActionLabel: 'Request availability',
    propertyType: 'Safari camp',
    amenities: ['All-inclusive meals', 'Game drives', 'Outdoor shower', 'King bed', 'Mosquito net', 'Solar power', 'Viewing deck', 'Wi-Fi (limited)'],
    checkIn: '13:00',
    checkOut: '10:00',
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    maxGuests: 2,
    houseRules: ['No children under 12', 'No open fires outside designated areas', 'Quiet hours after 21:30'],
    roomOptions: [
      { id: 'r1', name: 'Waterhole Tent', price: '3 200', beds: '1 King', guests: 2, image: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=400&h=260&fit=crop&auto=format' },
      { id: 'r2', name: 'Bush Suite (larger)', price: '4 100', beds: '1 King + daybed', guests: 3, image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=260&fit=crop&auto=format' },
    ],
    reviews: [
      { id: 'rv1', author: 'Amara S.', authorAvatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Three elephants came to the waterhole at 3am. I watched them from the tent in complete silence. This is what Africa is supposed to feel like.', verified: true, businessResponse: 'This is exactly why we built the camp where we did, Amara. Thank you for sharing.' },
      { id: 'rv2', author: 'Marcus V.', authorAvatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'June 2026', body: 'The food alone is worth the trip. The guided night drive was extraordinary — spotted two leopards.', verified: true },
    ],
    questions: [
      { id: 'q1', author: 'Lena B.', authorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', question: 'Is malaria prophylaxis recommended for this area?', timeAgo: '1 week ago', answers: [{ body: 'Yes — Etosha is a low-to-moderate malaria risk area. Consult your doctor before arrival. We also supply mosquito nets and repellent.', fromBusiness: true, author: 'Etosha Edge Camps', timeAgo: '6 days ago' }] },
    ],
  },

  // ── STAY 4 ────────────────────────────────────────────────────────────
  {
    id: 'lst-stay-4',
    listingType: 'stay',
    serviceCategory: 'Stay',
    title: 'Klein Windhoek Guesthouse',
    subtitle: 'Quiet guesthouse in a residential suburb, 10 min from the city centre',
    business: 'Klein Windhoek Lodge',
    businessAvatar: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'A ten-room owner-managed guesthouse in the leafy Klein Windhoek suburb. Popular with business travelers, families, and overlanders.',
    destination: 'Windhoek, Namibia',
    media: [
      'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.5,
    reviewCount: 308,
    price: '750',
    currency: 'N$',
    priceBasis: 'night',
    verification: { verified: true, label: 'Listing reviewed', scope: 'Photos and amenities verified by Delve on a site inspection.' },
    availability: 'available',
    availabilityNote: 'Good availability most dates',
    sponsored: false,
    description: 'Ten individually decorated rooms with a shared pool and garden. Breakfast is included and the in-house team can arrange car hire, city tours, and transfers. Secure off-street parking. The guesthouse is a 10-minute drive or 30-minute walk from Independence Avenue.',
    highlights: ['Breakfast included', 'Pool', 'Secure parking', 'City transfers', 'Free Wi-Fi', 'Airport shuttle'],
    included: ['Full breakfast', 'Free parking', 'Airport shuttle (on request)'],
    excluded: ['Dinner', 'Laundry (additional fee)', 'Tours and transfers (priced separately)'],
    terms: 'Rates per room per night. Breakfast is served 07:00–09:30. Check-in from 14:00, check-out by 11:00.',
    cancellation: 'Free cancellation up to 48 hours before arrival.',
    safety: null,
    bookingMethod: 'book',
    bookingActionLabel: 'Book now',
    propertyType: 'Guesthouse',
    amenities: ['Pool', 'Free Wi-Fi', 'Breakfast', 'Air conditioning', 'Secure parking', 'Airport transfer', 'Restaurant', 'Safe', 'Laundry'],
    checkIn: '14:00',
    checkOut: '11:00',
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    maxGuests: 2,
    houseRules: ['No smoking in rooms', 'Quiet hours after 22:00', 'Pets not permitted'],
    roomOptions: [
      { id: 'r1', name: 'Standard Double', price: '750', beds: '1 Double', guests: 2, image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=260&fit=crop&auto=format' },
      { id: 'r2', name: 'Superior Twin', price: '850', beds: '2 Single', guests: 2, image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=260&fit=crop&auto=format' },
      { id: 'r3', name: 'Family Suite', price: '1 350', beds: '1 Double + 2 Single', guests: 4, image: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=400&h=260&fit=crop&auto=format' },
    ],
    reviews: [
      { id: 'rv1', author: 'Priya K.', authorAvatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Warm, welcoming, and great value for Windhoek. The staff arranged our car hire and a city tour seamlessly. Breakfast is excellent.', verified: true },
      { id: 'rv2', author: 'Ben T.', authorAvatar: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=80&h=80&fit=crop&auto=format', rating: 4, date: 'May 2026', body: 'Good location, clean rooms. The pool is small but very welcome in the Windhoek heat. Recommend the family suite for groups.', verified: false },
    ],
    questions: [
      { id: 'q1', author: 'Clara M.', authorAvatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', question: 'Do they have electric vehicle charging?', timeAgo: '2 days ago', answers: [{ body: 'We have one standard 220V socket in the parking area — not a dedicated EV charger, but it works for a slow overnight charge.', fromBusiness: true, author: 'Klein Windhoek Lodge', timeAgo: '1 day ago' }] },
    ],
  },

  // ── STAY 5 ────────────────────────────────────────────────────────────
  {
    id: 'lst-stay-5',
    listingType: 'stay',
    serviceCategory: 'Stay',
    title: 'Fish River Canyon Rim Retreat',
    subtitle: 'Remote off-grid chalets on the edge of Africa\'s largest canyon',
    business: 'Canyon View Retreats',
    businessAvatar: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'Four off-grid stone chalets perched on the Fish River Canyon rim. No generators — solar-powered, with the Milky Way visible every clear night.',
    destination: 'Fish River Canyon, Namibia',
    media: [
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.9,
    reviewCount: 61,
    price: '1 800',
    currency: 'N$',
    priceBasis: 'night',
    verification: { verified: false, label: 'Information not verified', scope: 'This listing has not been independently reviewed by Delve.' },
    availability: 'limited',
    availabilityNote: 'Only 4 chalets — books quickly in winter',
    sponsored: false,
    description: 'Four stone chalets built directly on the canyon rim. No generators — only solar. At night, the only light is from the stars. The chalets have compost toilets and solar-heated showers. Breakfast is delivered to your door at sunrise. Hiking trail access is included.',
    highlights: ['Canyon-rim views', 'Solar powered', 'Zero light pollution', 'Sunrise breakfast', 'Hiking access', 'Private deck'],
    included: ['Sunrise breakfast', 'Hiking trail access', 'Firewood', 'Linen and towels'],
    excluded: ['Dinner (bring your own or book in advance)', 'Alcoholic beverages', 'Transfer from Ai-Ais'],
    terms: 'Minimum 2 nights. No pets. Road is gravel — 4x4 recommended in wet season. Mobile signal is very limited.',
    cancellation: 'Free cancellation up to 10 days before arrival. No refund within 10 days.',
    safety: 'The canyon rim has no barriers in places. Do not approach the edge after dark. Keep to marked paths.',
    bookingMethod: 'request',
    bookingActionLabel: 'Request to book',
    propertyType: 'Chalet',
    amenities: ['Canyon views', 'Solar power', 'Solar shower', 'Private deck', 'Braai', 'Hiking access', 'Stargazing deck'],
    checkIn: '15:00',
    checkOut: '10:00',
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    maxGuests: 2,
    houseRules: ['No pets', 'No campfires outside designated area', 'No generators', 'Children 12+ only'],
    roomOptions: [
      { id: 'r1', name: 'Canyon Rim Chalet', price: '1 800', beds: '1 King', guests: 2, image: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=400&h=260&fit=crop&auto=format' },
    ],
    reviews: [
      { id: 'rv1', author: 'Lena B.', authorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'June 2026', body: "The most dramatic location I have ever slept in. The canyon is 600 metres deep and you can hear the river from the deck. Completely addictive.", verified: true },
    ],
    questions: [],
  },

  // ── FOOD & DRINK ──────────────────────────────────────────────────────
  {
    id: 'lst-food-1',
    listingType: 'food',
    serviceCategory: 'Food & drink',
    title: 'Tug Restaurant',
    subtitle: 'Seafood and Namibian cuisine at the Swakopmund waterfront',
    business: 'Tug Restaurant Swakopmund',
    businessAvatar: 'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'A Swakopmund institution since 1995 — housed in a restored tugboat on the jetty, serving the best Namibian seafood in the country.',
    destination: 'Swakopmund, Namibia',
    media: [
      'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1599033183537-54ff77f58f75?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.6,
    reviewCount: 381,
    price: '180',
    currency: 'N$',
    priceBasis: 'main course',
    verification: { verified: true, label: 'Business verified', scope: 'Trading registration and health certificate confirmed.' },
    availability: 'available',
    availabilityNote: 'Open daily. Reservations recommended for dinner.',
    sponsored: false,
    description: 'The Tug sits on the historic jetty in the heart of Swakopmund, offering 180-degree ocean views and a menu built around Namibian seafood. The kingklip, oysters, and line fish are sourced daily from local fishermen. The wine list focuses on South African and Namibian producers.',
    highlights: ['Ocean-view tables', 'Fresh daily fish', 'Oyster bar', 'Award-winning wine list', 'Waterfront terrace', 'Breakfast to dinner'],
    included: [],
    excluded: [],
    terms: 'Menu and prices subject to availability and seasonality. Reservations held for 15 minutes.',
    cancellation: 'Cancel or amend a reservation at any time. No charge.',
    safety: null,
    bookingMethod: 'reserve',
    bookingActionLabel: 'Reserve a table',
    cuisine: ['Seafood', 'Namibian', 'South African', 'Steakhouse'],
    priceLevel: 3,
    openingHours: 'Mon–Sun · 08:00 – 22:00',
    address: 'The Jetty, Strand Street, Swakopmund, Namibia',
    menuItems: [
      { name: 'Grilled Kingklip', price: 'N$ 195', description: 'Line-caught kingklip with lemon butter, herb rice, and seasonal vegetables.', image: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&h=260&fit=crop&auto=format' },
      { name: 'Freshly Shucked Oysters (6)', price: 'N$ 145', description: 'Served with mignonette, lemon, and Tabasco. Sourced from Lüderitz daily.', image: 'https://images.unsplash.com/photo-1599033183537-54ff77f58f75?w=400&h=260&fit=crop&auto=format' },
      { name: 'Namibian Beef Fillet (250g)', price: 'N$ 220', description: 'Free-range Namibian beef, chimichurri, hand-cut chips.', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=260&fit=crop&auto=format' },
      { name: 'Bobotie (Local)', price: 'N$ 155', description: 'Traditional South African-Namibian baked meat dish with turmeric custard and yellow rice.', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=260&fit=crop&auto=format' },
    ],
    dietaryTags: ['Gluten-free options', 'Vegetarian options', 'Halal on request'],
    takesReservations: true,
    reviews: [
      { id: 'rv1', author: 'Amara S.', authorAvatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'The kingklip was the freshest I have ever tasted. Waterfront table at sunset — does not get better than this in Namibia.', verified: false },
      { id: 'rv2', author: 'Theo P.', authorAvatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', rating: 4, date: 'June 2026', body: 'Great food and atmosphere. The wait for a table on Saturday evening was about 30 minutes so book ahead.', verified: false },
    ],
    questions: [
      { id: 'q1', author: 'Priya K.', authorAvatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', question: 'Is there outdoor seating with ocean views?', timeAgo: '5 days ago', answers: [{ body: 'Yes — the deck wraps around the tugboat hull and faces directly over the water. Book early for a rail table.', fromBusiness: true, author: 'Tug Restaurant', timeAgo: '4 days ago' }] },
    ],
  },

  // ── ACTIVITY ──────────────────────────────────────────────────────────
  {
    id: 'lst-act-1',
    listingType: 'activity',
    serviceCategory: 'Activity',
    title: 'Guided Sandboarding on the Namibian Dunes',
    subtitle: 'Half-day experience from Swakopmund — all equipment included',
    business: 'Dune Riders Swakop',
    businessAvatar: 'https://images.unsplash.com/photo-1611854064186-d8dccbccb031?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'Swakopmund\'s longest-running adventure operator. Over 20 years of guided dune experiences with a safety-first approach.',
    destination: 'Namib Desert, Swakopmund, Namibia',
    media: [
      'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1769251297155-718a0012f72e?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.9,
    reviewCount: 312,
    price: '450',
    currency: 'N$',
    priceBasis: 'person',
    verification: { verified: true, label: 'Operator verified', scope: 'Operator permits, insurance, and guide certifications reviewed.' },
    availability: 'limited',
    availabilityNote: '3 spots left this Saturday',
    sponsored: false,
    description: 'Start with lie-down sandboarding — the fastest way down a 100-meter dune — then progress to stand-up sandboarding with full instruction from a certified guide. Suitable for all fitness levels. The group is capped at 8 participants for a personal experience. Transfers from Swakopmund town center are included.',
    highlights: ['All equipment included', 'Return transfer from town', 'Max 8 people per group', 'Suitable for all levels', 'Guides certified'],
    included: ['Return transfer from Swakopmund', 'Sandboard and protective gear', 'Water and light snack', 'Certified guide', 'Photos on request'],
    excluded: ['Travel insurance', 'Tip for guide', 'Extra photos/video package'],
    terms: 'Minimum age 7 years. Participants must sign a safety waiver. Guide may cancel if wind or visibility conditions are unsafe.',
    cancellation: 'Free cancellation up to 24 hours before. No refund within 24 hours.',
    safety: 'All participants must wear helmets and padded suits provided. Safety briefing is mandatory before descent.',
    bookingMethod: 'book',
    bookingActionLabel: 'Book this experience',
    duration: '4 hours (half day)',
    meetingPoint: 'Dune Riders base, 14 Strand Street, Swakopmund',
    groupSizeMin: 1,
    groupSizeMax: 8,
    ageGuidance: 'Minimum age 7 · All fitness levels',
    fitnessLevel: 'Easy to moderate',
    requirements: ['Minimum age 7 years', 'Weight limit 120 kg', 'No knee or back injuries (consult operator if unsure)'],
    whatToBring: ['Sunscreen', 'Sunglasses', 'Comfortable clothing', 'Closed shoes', 'Small backpack'],
    schedule: [
      { date: 'Sat 9 Aug 2026', time: '07:30', spotsLeft: 3 },
      { date: 'Sun 10 Aug 2026', time: '07:30', spotsLeft: 8 },
      { date: 'Mon 11 Aug 2026', time: '07:30', spotsLeft: 7 },
    ],
    activeDealId: 'deal-r2',
    reviews: [
      { id: 'rv1', author: 'Marcus V.', authorAvatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Most fun I have had on a trip in years. The guides are brilliant — patient, funny, and very safety-conscious. The stand-up run at the end was incredible.', verified: true },
      { id: 'rv2', author: 'Clara M.', authorAvatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'June 2026', body: 'Booked this for our family (kids aged 9 and 14). Both loved it. The guides adjust the experience to everyone in the group.', verified: true },
    ],
    questions: [
      { id: 'q1', author: 'Ben T.', authorAvatar: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=80&h=80&fit=crop&auto=format', question: 'Is it safe for someone who has never snowboarded or surfed?', timeAgo: '2 days ago', answers: [{ body: 'Absolutely — you start lie-down and build up. Most of our guests have no boarding experience at all.', fromBusiness: true, author: 'Dune Riders Swakop', timeAgo: '1 day ago' }] },
    ],
  },

  // ── GUIDE ─────────────────────────────────────────────────────────────
  {
    id: 'lst-guide-1',
    listingType: 'guide',
    serviceCategory: 'Guide',
    title: 'Anna N. — Local Guide, Swakopmund & Surrounds',
    subtitle: 'Certified nature guide with 12 years of experience across NamibRand and the Skeleton Coast',
    business: 'Anna N. Independent Guide',
    businessAvatar: 'https://images.unsplash.com/photo-1570630358718-4fb324824b3d?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'Namibian-born guide with certifications in ecotourism and wilderness first aid. Specialises in small-group nature experiences and cultural tours.',
    destination: 'Swakopmund, NamibRand, Skeleton Coast',
    media: [
      'https://images.unsplash.com/photo-1570630358718-4fb324824b3d?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 5.0,
    reviewCount: 43,
    price: '800',
    currency: 'N$',
    priceBasis: 'half day',
    verification: { verified: true, label: 'Identity verified', scope: 'Guide certification, ID document, and insurance reviewed by Delve.' },
    availability: 'available',
    availabilityNote: 'Available most weekends and weekdays by arrangement',
    sponsored: false,
    description: 'Anna has been guiding in Namibia since 2013. Her approach focuses on slow, observational travel — learning to read the desert, identifying endemic species, and understanding the cultural context of the places you visit. Tours operate in groups of no more than 6 and are tailored to each group\'s interests and pace.',
    highlights: ['Max 6 people', 'Certified ecotour guide', 'Wilderness first aid', 'English, Afrikaans, Khoekhoegowab', 'Custom itineraries', 'Own vehicle'],
    included: ['Transport in Anna\'s 4x4', 'Snacks and water', 'Field guide reference materials'],
    excluded: ['Park entry fees', 'Accommodation', 'Meals (full day)'],
    terms: 'Final itinerary confirmed 48 hours before. Guide may adjust route due to weather, wildlife activity, or road conditions.',
    cancellation: 'Free cancellation up to 48 hours before. 50% charge within 48 hours. No refund within 24 hours.',
    safety: 'Wilderness first aid certified. Emergency communication device carried on all remote tours.',
    bookingMethod: 'request',
    bookingActionLabel: 'Request to book',
    languages: ['English', 'Afrikaans', 'Khoekhoegowab'],
    areas: ['Swakopmund', 'NamibRand Nature Reserve', 'Skeleton Coast', 'Damaraland', 'Cape Cross'],
    experience: '12 years · 400+ groups guided',
    tripsCompleted: 418,
    packages: [
      { id: 'pkg1', name: 'Morning Desert Walk', duration: '3 hours', price: 'N$ 450 / person', groupSize: '1–6', description: 'Early-morning desert walk focusing on endemic plants, insects, and small reptiles. Departs at 06:30.' },
      { id: 'pkg2', name: 'Half Day Coastal & Dune', duration: '4 hours', price: 'N$ 800 / person', groupSize: '1–6', description: 'Drive the coastal road to Walvis Bay lagoon, then hike a desert dune. Flamingo sighting likely.' },
      { id: 'pkg3', name: 'Full Day NamibRand', duration: '8–10 hours', price: 'N$ 1 400 / person', groupSize: '1–4', description: 'Full-day excursion into NamibRand Nature Reserve with picnic lunch and a sundowner on the dunes.' },
    ],
    reviews: [
      { id: 'rv1', author: 'Lena B.', authorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'July 2026', body: 'Anna is a remarkable guide. She pointed out things I would never have noticed — oryx tracks, fog beetles, fairy circles. The most educational experience of my trip.', verified: true },
      { id: 'rv2', author: 'Theo P.', authorAvatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'May 2026', body: 'Took the Full Day NamibRand package with my partner. Completely tailored to what we wanted to see. Phenomenal knowledge and great personality.', verified: true },
    ],
    questions: [
      { id: 'q1', author: 'Priya K.', authorAvatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', question: 'Can you guide wheelchair users on the morning walk?', timeAgo: '1 week ago', answers: [{ body: 'Some paths are accessible but the morning desert walk involves uneven terrain. Please message me directly and I can suggest accessible alternatives.', fromBusiness: true, author: 'Anna N.', timeAgo: '6 days ago' }] },
    ],
  },

  // ── EVENT ─────────────────────────────────────────────────────────────
  {
    id: 'lst-event-1',
    listingType: 'event',
    serviceCategory: 'Event',
    title: 'Swakopmund Coastal Night Market',
    subtitle: 'Weekly open-air market on the jetty — food, craft, and live music',
    business: 'Swakopmund Tourism & Events',
    businessAvatar: 'https://images.unsplash.com/photo-1535898331935-2d274aff0fbc?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'An outdoor market celebrating Namibian craft producers, street food vendors, and local musicians. Running every Friday and Saturday evening.',
    destination: 'Swakopmund Jetty, Namibia',
    media: [
      'https://images.unsplash.com/photo-1535898331935-2d274aff0fbc?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.4,
    reviewCount: 56,
    price: '0',
    currency: 'N$',
    priceBasis: 'entry',
    verification: { verified: false, label: 'Information not verified', scope: 'This listing has not been independently verified by Delve. Details come from public sources.' },
    availability: 'available',
    availabilityNote: 'Every Friday and Saturday evening, weather permitting',
    sponsored: false,
    description: 'Every Friday and Saturday from 18:00, Swakopmund Jetty transforms into an open-air market with over 40 stalls. Expect local craft jewelry, hand-carved wood items, spiced game biltong, Namibian street food, and live acoustic music. Entry is free — vendors handle their own pricing.',
    highlights: ['Free entry', 'Every Fri & Sat', '40+ vendors', 'Live music', 'Street food', 'Local craft'],
    included: ['Free entry to the market'],
    excluded: ['Food and drink purchases', 'Craft or product purchases'],
    terms: 'Market operates weather permitting. Check local listings for cancellations. Vendor quality and product availability vary.',
    cancellation: 'Not applicable — free entry event.',
    safety: null,
    bookingMethod: 'check-availability',
    bookingActionLabel: 'Check dates & times',
    eventDate: 'Every Friday & Saturday',
    eventTime: '18:00 – 22:30',
    doorsOpen: 'Market opens at 18:00',
    venue: 'The Jetty, Swakopmund',
    venueAddress: 'Strand Street, Swakopmund 9000, Namibia',
    ageRestriction: 'All ages welcome',
    ticketOptions: [
      { id: 't1', name: 'General Entry', price: 'Free', available: true, description: 'Walk in at any time between 18:00 and 22:30.' },
    ],
    reviews: [
      { id: 'rv1', author: 'Marcus V.', authorAvatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', rating: 4, date: 'July 2026', body: 'Great atmosphere. The game biltong stall by the entrance is excellent. Gets busy after 20:00 on Saturdays so arrive earlier for a more relaxed experience.', verified: false },
    ],
    questions: [
      { id: 'q1', author: 'Clara M.', authorAvatar: 'https://images.unsplash.com/photo-1557002665-c552e1832483?w=80&h=80&fit=crop&auto=format', question: 'Is there seating available?', timeAgo: '3 days ago', answers: [{ body: 'Limited benches around the perimeter. Most vendors have small stools. Bring a blanket if you plan to stay a while.', fromBusiness: false, author: 'Marcus V.', timeAgo: '2 days ago' }] },
    ],
  },

  // ── SHOP ──────────────────────────────────────────────────────────────
  {
    id: 'lst-shop-1',
    listingType: 'shop',
    serviceCategory: 'Shop',
    title: 'Handwoven Bushman Grass Basket',
    subtitle: 'Handcrafted by San artisans from Omaheke Region',
    business: 'Namibia Craft Collective',
    businessAvatar: 'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?w=80&h=80&fit=crop&auto=format',
    businessDescription: 'A fair-trade collective representing over 60 San and Himba artisans from rural Namibia. Every item sold funds artisan income and craft training programs.',
    destination: 'Windhoek, Namibia (ships nationwide)',
    media: [
      'https://images.unsplash.com/photo-1601556809785-bb28cb558e65?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1519923041107-21548fcd0e82?w=900&h=600&fit=crop&auto=format',
    ],
    rating: 4.8,
    reviewCount: 92,
    price: '320',
    currency: 'N$',
    priceBasis: 'item',
    verification: { verified: true, label: 'Business verified', scope: 'Business registration and artisan partnership documentation reviewed.' },
    availability: 'limited',
    availabilityNote: '4 of this design in stock',
    sponsored: false,
    description: 'Woven by hand over several weeks using dried bushman grass sourced from the Omaheke Region, each basket is unique. Traditional geometric patterns are specific to individual San artisan families. The basket measures approximately 30cm diameter and 18cm height. Perfect as a storage piece or wall display.',
    highlights: ['Handmade by San artisans', 'Fair-trade certified', 'Unique pattern per basket', 'Natural materials', 'Ships nationwide'],
    included: ['Artisan certificate of origin', 'Care instructions'],
    excluded: ['Gift wrapping (available on request)', 'International shipping'],
    terms: 'Baskets are handmade — exact colors and patterns vary. Photos are representative. Size is approximate ±2cm.',
    cancellation: 'Returns accepted within 14 days of receipt if item arrives damaged. Exchange or credit only for change-of-mind returns.',
    safety: null,
    bookingMethod: 'add-to-cart',
    bookingActionLabel: 'Add to cart',
    productVariants: [
      { name: 'Size', options: ['Small (20cm)', 'Medium (30cm)', 'Large (40cm)'] },
      { name: 'Pattern', options: ['Geometric (Classic)', 'Diamond Weave', 'Sunrise Pattern'] },
    ],
    stockStatus: 'limited',
    stockCount: 4,
    fulfillmentOptions: ['Pickup at Windhoek store', 'Nationwide delivery (5–8 days)', 'Lodge delivery in Windhoek area'],
    returnPolicy: '14-day return on damaged items. Exchange or credit note for change-of-mind. Buyer covers return postage.',
    reviews: [
      { id: 'rv1', author: 'Amara S.', authorAvatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'June 2026', body: 'The quality is extraordinary. You can feel the time and skill in every strand. Arrived beautifully packaged with the artisan certificate.', verified: true },
      { id: 'rv2', author: 'Lena B.', authorAvatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', rating: 5, date: 'May 2026', body: 'Bought two — one for home and one as a gift. The collective is clearly doing important work and the craftsmanship is world-class.', verified: true },
    ],
    questions: [
      { id: 'q1', author: 'Theo P.', authorAvatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', question: 'Can I request a specific pattern or color?', timeAgo: '4 days ago', answers: [{ body: 'Yes — message us before ordering and we will try to match you with an artisan who can fulfill your preference. Lead time is 3–4 weeks for custom orders.', fromBusiness: true, author: 'Namibia Craft Collective', timeAgo: '3 days ago' }] },
    ],
  },
]

// ─── Category color / config ──────────────────────────────────────────────

export const listingCategoryColor: Record<string, string> = {
  'Stay':       '#6366F1',
  'Food & drink': '#F59E0B',
  'Activity':   '#EF4444',
  'Guide':      '#10A760',
  'Event':      '#EC4899',
  'Shop':       '#8B5CF6',
}

export const availabilityConfig: Record<AvailabilityStatus, { label: string; color: string; bg: string }> = {
  'available':  { label: 'Available',         color: '#10A760', bg: 'rgba(16,167,96,0.1)' },
  'limited':    { label: 'Limited spots',     color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'unavailable':{ label: 'Unavailable',       color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
  'sold-out':   { label: 'Sold out',          color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  'request':    { label: 'Enquire to book',   color: '#8C52FF', bg: 'rgba(140,82,255,0.1)' },
  'checking':   { label: 'Checking…',         color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}
