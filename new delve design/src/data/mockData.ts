export interface UserSummary {
  id: string
  name: string
  avatar: string
  verified: boolean
  handle: string
}

export interface DealSummary {
  id: string
  title: string
  category: string
  business: string
  destination: string
  price: string
  priceUnit: string
  currency: string
  saving?: string
  eligibility: string
  expiry: string
  image: string
  sponsored: boolean
  action: string
  verified: boolean
}

export interface ServiceSummary {
  id: string
  type: string
  name: string
  place: string
  price?: string
  priceUnit?: string
  rating: number
  reviewCount: number
  image: string
  verified: boolean
  availability: string
}

export interface TransportSummary {
  id: string
  mode: string
  operatorType: string
  operator: string
  price: string
  priceUnit: string
  currency: string
  image: string
  verified: boolean
  seats?: number
}

export interface DelversPostSummary {
  id: string
  creator: UserSummary
  image: string
  place: string
  caption: string
  likes: number
  comments: number
  saves: number
  contentType: 'organic' | 'business' | 'sponsored'
  linkedService?: string
  verifiedExperience: boolean
}

export interface JourneySummary {
  id: string
  title: string
  creator: UserSummary
  route: string
  duration: string
  stops: number
  transportModes: string[]
  historicalBudget: string
  currency: string
  coverImage: string
}

export interface LocalQuestionSummary {
  id: string
  question: string
  place: string
  author: UserSummary
  timeAgo: string
  answered: boolean
  answerPreview?: string
  answerCount: number
}

export const deals: DealSummary[] = [
  {
    id: 'd1',
    title: 'Weekend Beachfront Bungalow',
    category: 'Stay',
    business: 'Swakop Beach Escapes',
    destination: 'Swakopmund, Namibia',
    price: '680',
    priceUnit: 'night',
    currency: 'N$',
    saving: '20% off this weekend',
    eligibility: 'Available to all travelers. Free cancellation.',
    expiry: 'Expires Sun 10 Aug',
    image: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=600&h=400&fit=crop&auto=format',
    sponsored: false,
    action: 'Book this rate',
    verified: true,
  },
  {
    id: 'd2',
    title: 'Airport Transfer — Windhoek',
    category: 'Transport',
    business: 'Swift Transfers NM',
    destination: 'Hosea Kutako Airport, Namibia',
    price: '900',
    priceUnit: 'transfer',
    currency: 'N$',
    eligibility: 'Up to 4 passengers. Meet & greet included.',
    expiry: 'Book 24 hrs in advance',
    image: 'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=600&h=400&fit=crop&auto=format',
    sponsored: false,
    action: 'View transport',
    verified: true,
  },
  {
    id: 'd3',
    title: 'Guided Dune Quad Experience',
    category: 'Activity',
    business: 'Dune Riders Swakop',
    destination: 'Swakopmund, Namibia',
    price: '550',
    priceUnit: 'person',
    currency: 'N$',
    saving: 'Local rate available',
    eligibility: 'Residents and long-stay travelers. ID required.',
    expiry: 'Ongoing — limited slots',
    image: 'https://images.unsplash.com/photo-1769251297155-718a0012f72e?w=600&h=400&fit=crop&auto=format',
    sponsored: true,
    action: 'See full terms',
    verified: true,
  },
  {
    id: 'd4',
    title: 'Set Lunch at Sardinia\'s',
    category: 'Food & drink',
    business: "Sardinia's Bistro",
    destination: 'Windhoek, Namibia',
    price: '195',
    priceUnit: 'person',
    currency: 'N$',
    eligibility: 'Walk-in or advance booking. Valid weekdays.',
    expiry: 'Mon–Fri until end of month',
    image: 'https://images.unsplash.com/photo-1599033183537-54ff77f58f75?w=600&h=400&fit=crop&auto=format',
    sponsored: false,
    action: 'View listing',
    verified: false,
  },
]

export const nearbyServices: ServiceSummary[] = [
  {
    id: 's1',
    type: 'Stay',
    name: 'The Stiltz Swakopmund',
    place: 'Swakopmund',
    price: '1 240',
    priceUnit: 'night',
    rating: 4.8,
    reviewCount: 214,
    image: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=400&fit=crop&auto=format',
    verified: true,
    availability: 'Available this weekend',
  },
  {
    id: 's2',
    type: 'Restaurant',
    name: 'Tug Restaurant',
    place: 'Swakopmund Waterfront',
    price: '180',
    priceUnit: 'main',
    rating: 4.6,
    reviewCount: 381,
    image: 'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=400&fit=crop&auto=format',
    verified: true,
    availability: 'Open now',
  },
  {
    id: 's3',
    type: 'Activity',
    name: 'Desert Sandboarding',
    place: 'Namib Desert',
    price: '450',
    priceUnit: 'person',
    rating: 4.9,
    reviewCount: 127,
    image: 'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=600&h=400&fit=crop&auto=format',
    verified: true,
    availability: 'Next slot: Saturday',
  },
  {
    id: 's4',
    type: 'Event',
    name: 'Coastal Night Market',
    place: 'Swakopmund Jetty',
    rating: 4.4,
    reviewCount: 56,
    image: 'https://images.unsplash.com/photo-1535898331935-2d274aff0fbc?w=600&h=400&fit=crop&auto=format',
    verified: false,
    availability: 'This Friday & Saturday',
  },
  {
    id: 's5',
    type: 'Guide',
    name: 'Anna N. — Local Guide',
    place: 'Swakopmund & Surrounds',
    price: '800',
    priceUnit: 'half day',
    rating: 5.0,
    reviewCount: 43,
    image: 'https://images.unsplash.com/photo-1570630358718-4fb324824b3d?w=600&h=400&fit=crop&auto=format',
    verified: true,
    availability: 'Available weekends',
  },
]

export const transports: TransportSummary[] = [
  {
    id: 't1',
    mode: 'Rent a vehicle',
    operatorType: 'Rental business',
    operator: 'Namibia Car Hire Co.',
    price: '700',
    priceUnit: 'day',
    currency: 'N$',
    image: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=600&h=360&fit=crop&auto=format',
    verified: true,
  },
  {
    id: 't2',
    mode: 'Private ride with driver',
    operatorType: 'Private driver/operator',
    operator: 'Johannes M.',
    price: '1 200',
    priceUnit: 'trip',
    currency: 'N$',
    image: 'https://images.unsplash.com/photo-1665314673834-635d0fedab32?w=600&h=360&fit=crop&auto=format',
    verified: true,
  },
  {
    id: 't3',
    mode: 'Community ride',
    operatorType: 'Community ride host',
    operator: 'Selma K. (Swakop → Walvis)',
    price: '240',
    priceUnit: 'seat',
    currency: 'N$',
    image: 'https://images.unsplash.com/photo-1769251297155-718a0012f72e?w=600&h=360&fit=crop&auto=format',
    verified: false,
    seats: 2,
  },
  {
    id: 't4',
    mode: 'Bus / minibus',
    operatorType: 'Bus operator',
    operator: 'Intercape Namibia',
    price: '380',
    priceUnit: 'seat',
    currency: 'N$',
    image: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=600&h=360&fit=crop&auto=format',
    verified: true,
    seats: 14,
  },
  {
    id: 't5',
    mode: 'Airport transfer',
    operatorType: 'Airport-transfer operator',
    operator: 'SwiftShuttle NM',
    price: '900',
    priceUnit: 'transfer',
    currency: 'N$',
    image: 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=600&h=360&fit=crop&auto=format',
    verified: true,
  },
]

export const delversPosts: DelversPostSummary[] = [
  {
    id: 'dp1',
    creator: { id: 'u1', name: 'Lena Brandt', handle: '@lenabrandt', avatar: 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=80&h=80&fit=crop&auto=format', verified: true },
    image: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=700&fit=crop&auto=format',
    place: 'Namib Desert, Namibia',
    caption: 'Woke up to this at 5am. Zero other people. The silence is something I cannot describe.',
    likes: 842,
    comments: 37,
    saves: 211,
    contentType: 'organic',
    verifiedExperience: true,
    linkedService: 'Desert Sunrise Camp',
  },
  {
    id: 'dp2',
    creator: { id: 'u2', name: 'Marcus V.', handle: '@marcusv_travels', avatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', verified: false },
    image: 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=600&h=700&fit=crop&auto=format',
    place: 'Swakopmund, Namibia',
    caption: 'This bench has seen more sunsets than most people ever will.',
    likes: 312,
    comments: 14,
    saves: 88,
    contentType: 'organic',
    verifiedExperience: false,
  },
  {
    id: 'dp3',
    creator: { id: 'u3', name: 'Dune Riders Swakop', handle: '@duneriders', avatar: 'https://images.unsplash.com/photo-1611854064186-d8dccbccb031?w=80&h=80&fit=crop&auto=format', verified: true },
    image: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=700&fit=crop&auto=format',
    place: 'Namib Desert, Namibia',
    caption: 'Four hours of sand, speed, and sky. Book this weekend.',
    likes: 190,
    comments: 9,
    saves: 64,
    contentType: 'business',
    verifiedExperience: true,
    linkedService: 'Guided Dune Quad Experience',
  },
]

export const journeys: JourneySummary[] = [
  {
    id: 'j1',
    title: 'Namibia in 10 Days: Dunes to Coast',
    creator: { id: 'u1', name: 'Lena Brandt', handle: '@lenabrandt', avatar: 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=80&h=80&fit=crop&auto=format', verified: true },
    route: 'Windhoek → Sossusvlei → Swakopmund → Damaraland',
    duration: '10 days',
    stops: 7,
    transportModes: ['Car rental', 'Community ride'],
    historicalBudget: '14 200',
    currency: 'N$',
    coverImage: 'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=700&h=440&fit=crop&auto=format',
  },
  {
    id: 'j2',
    title: 'Weekend in Swakopmund on a Budget',
    creator: { id: 'u4', name: 'Theo P.', handle: '@theop_na', avatar: 'https://images.unsplash.com/photo-1570630358718-4fb324824b3d?w=80&h=80&fit=crop&auto=format', verified: false },
    route: 'Windhoek → Swakopmund → Walvis Bay',
    duration: '3 days',
    stops: 4,
    transportModes: ['Bus', 'On foot'],
    historicalBudget: '3 800',
    currency: 'N$',
    coverImage: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=700&h=440&fit=crop&auto=format',
  },
  {
    id: 'j3',
    title: 'Family Safari — Etosha & Beyond',
    creator: { id: 'u5', name: 'Amara S.', handle: '@amarasafari', avatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', verified: true },
    route: 'Windhoek → Etosha → Waterberg → Windhoek',
    duration: '7 days',
    stops: 5,
    transportModes: ['Car rental', 'Private driver'],
    historicalBudget: '28 900',
    currency: 'N$',
    coverImage: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=700&h=440&fit=crop&auto=format',
  },
]

export const localQuestions: LocalQuestionSummary[] = [
  {
    id: 'q1',
    question: 'What\'s the best way to get from Windhoek to Swakopmund without renting a car?',
    place: 'Windhoek, Namibia',
    author: { id: 'u6', name: 'Priya K.', handle: '@priyak', avatar: 'https://images.unsplash.com/photo-1611854064186-d8dccbccb031?w=80&h=80&fit=crop&auto=format', verified: false },
    timeAgo: '2 hours ago',
    answered: true,
    answerPreview: 'Intercape runs daily — book the day before. Community rides are cheaper but less reliable.',
    answerCount: 4,
  },
  {
    id: 'q2',
    question: 'Are there any resident rates available for the Sossusvlei entry fee?',
    place: 'Sossusvlei, Namibia',
    author: { id: 'u7', name: 'Ben T.', handle: '@bena_travel', avatar: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=80&h=80&fit=crop&auto=format', verified: false },
    timeAgo: '1 day ago',
    answered: false,
    answerCount: 0,
  },
  {
    id: 'q3',
    question: 'Which restaurants in Swakopmund are open for Sunday lunch?',
    place: 'Swakopmund, Namibia',
    author: { id: 'u8', name: 'Clara M.', handle: '@claraexplores', avatar: 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=80&h=80&fit=crop&auto=format', verified: false },
    timeAgo: '3 days ago',
    answered: true,
    answerPreview: 'The Tug and Kücki\'s Pub are reliably open. The Jetty also has good hours.',
    answerCount: 7,
  },
]
