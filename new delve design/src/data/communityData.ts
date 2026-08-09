// ─── Types ────────────────────────────────────────────────────────────────

export type CommunityType = 'destination' | 'interest' | 'transport' | 'official'
export type PrivacyType = 'public' | 'private'
export type MembershipStatus = 'none' | 'joined' | 'requested' | 'moderator'
export type AnswerType = 'traveler' | 'local' | 'business' | 'official'

export interface CommunityAuthor {
  id: string
  name: string
  handle: string
  avatar: string
  verified: boolean
}

export interface AcceptedAnswerPreview {
  authorName: string
  authorType: AnswerType
  preview: string
  helpful: number
}

export interface CommunitySummary {
  id: string
  name: string
  description: string
  communityType: CommunityType
  destination: string
  topics: string[]
  cover: string
  privacy: PrivacyType
  memberCount: number
  recentActivity: string
  official: boolean
  businessManaged: boolean
  membershipStatus: MembershipStatus
}

export interface CommunityQuestionSummary {
  id: string
  title: string
  author: CommunityAuthor
  community: string
  destination: string
  answerCount: number
  acceptedAnswer: AcceptedAnswerPreview | null
  linkedObject?: { type: string; title: string }
  saved: boolean
  createdAt: string
}

export interface CommunityDiscussionSummary {
  id: string
  title: string
  bodyPreview: string
  author: CommunityAuthor
  community: string
  destination: string
  topic: string
  replyCount: number
  pinned: boolean
  official: boolean
  businessContent: boolean
  businessName?: string
  linkedObjects?: { type: string; title: string }[]
  saved: boolean
  createdAt: string
}

// ─── Authors ──────────────────────────────────────────────────────────────

const authors: CommunityAuthor[] = [
  { id: 'a1', name: 'Lena Brandt',  handle: '@lenabrandt', avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format', verified: true },
  { id: 'a2', name: 'Theo P.',      handle: '@theop_na',   avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format', verified: false },
  { id: 'a3', name: 'Amara S.',     handle: '@amarasafari', avatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format', verified: true },
  { id: 'a4', name: 'Marcus V.',    handle: '@marcusv',    avatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format', verified: false },
  { id: 'a5', name: 'Priya K.',     handle: '@priyak',     avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format', verified: false },
  { id: 'a6', name: 'Delve Team',   handle: '@delve',      avatar: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=80&h=80&fit=crop&auto=format', verified: true },
]

// ─── Communities ──────────────────────────────────────────────────────────

export const allCommunities: CommunitySummary[] = [
  {
    id: 'c1', name: 'Windhoek Travelers', communityType: 'destination',
    description: 'Everything you need to know about arriving, moving around, and living in Namibia\'s capital.',
    destination: 'Windhoek', topics: ['transport', 'stays', 'food', 'safety'],
    cover: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 4820, recentActivity: '2 min ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c2', name: 'Swakopmund Locals', communityType: 'destination',
    description: 'Ask locals about the coast, weather, activities, and the best spots visitors often miss.',
    destination: 'Swakopmund', topics: ['activities', 'food', 'local tips'],
    cover: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 3140, recentActivity: '8 min ago',
    official: false, businessManaged: false, membershipStatus: 'joined',
  },
  {
    id: 'c3', name: 'Namibia Road Trips', communityType: 'interest',
    description: 'Self-drive routes, road conditions, 4x4 advice, fuel stops, and campsite reviews across Namibia.',
    destination: 'Namibia', topics: ['road trips', 'self-drive', '4x4', 'camping'],
    cover: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 8600, recentActivity: '15 min ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c4', name: 'Etosha Trip Planning', communityType: 'destination',
    description: 'Game drives, waterhole times, camp bookings, and what to realistically expect in Etosha.',
    destination: 'Etosha', topics: ['safari', 'wildlife', 'camping', 'game drives'],
    cover: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 5210, recentActivity: '1 hr ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c5', name: 'Walvis Bay & Coast', communityType: 'destination',
    description: 'Flamingos, oysters, the lagoon, and everything worth knowing about Walvis Bay.',
    destination: 'Walvis Bay', topics: ['nature', 'food', 'coastal'],
    cover: 'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 1870, recentActivity: '3 hrs ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c6', name: 'Lüderitz Explorers', communityType: 'destination',
    description: 'Kolmanskop, the Sperrgebiet, flamingos, and the strange calm of the far south.',
    destination: 'Lüderitz', topics: ['history', 'nature', 'adventure'],
    cover: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 920, recentActivity: '1 day ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c7', name: 'Namibia Bus Routes', communityType: 'transport',
    description: 'Traveler discussions about intercity bus routes, schedules, and booking. Always verify with operators.',
    destination: 'Namibia', topics: ['bus', 'intercity', 'budget transport'],
    cover: 'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 2340, recentActivity: '20 min ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c8', name: 'Car Rentals & Road Conditions', communityType: 'transport',
    description: 'Community reviews and tips on car rentals, gravel roads, and driving in Namibia. Not official operator info.',
    destination: 'Namibia', topics: ['car rental', '4x4', 'road conditions'],
    cover: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 3980, recentActivity: '45 min ago',
    official: false, businessManaged: false, membershipStatus: 'joined',
  },
  {
    id: 'c9', name: 'Budget Namibia', communityType: 'interest',
    description: 'Hostels, camping, buses, cheap eats, and how to do Namibia without breaking the budget.',
    destination: 'Namibia', topics: ['budget', 'camping', 'backpacking'],
    cover: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 6120, recentActivity: '30 min ago',
    official: false, businessManaged: false, membershipStatus: 'none',
  },
  {
    id: 'c10', name: 'Delve Official', communityType: 'official',
    description: 'Updates, tips, and announcements from the Delve team.',
    destination: 'Namibia', topics: ['announcements', 'tips'],
    cover: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&h=300&fit=crop&auto=format',
    privacy: 'public', memberCount: 18400, recentActivity: '2 days ago',
    official: true, businessManaged: false, membershipStatus: 'joined',
  },
]

// ─── Questions ────────────────────────────────────────────────────────────

export const recentQuestions: CommunityQuestionSummary[] = [
  {
    id: 'q1',
    title: 'What is the easiest way to get from Windhoek airport to the city?',
    author: authors[1], community: 'Windhoek Travelers', destination: 'Windhoek',
    answerCount: 12,
    acceptedAnswer: { authorName: 'Lena B.', authorType: 'traveler', preview: 'The Intercape shuttle runs twice a day for about N$180. Taxis are N$300–400 negotiated. Avoid the unofficial drivers who approach you in arrivals.', helpful: 34 },
    savedAt: '2 days ago', saved: false, createdAt: '3 days ago',
  },
  {
    id: 'q2',
    title: 'Are there buses from Swakopmund to Walvis Bay on Sundays?',
    author: authors[4], community: 'Swakopmund Locals', destination: 'Swakopmund',
    answerCount: 5,
    acceptedAnswer: { authorName: 'Marcus V.', authorType: 'traveler', preview: 'Yes, Intercape and local minibuses run on Sundays. The minibuses from the market are cheaper (N$30) but times are irregular — be at the rank by 8am.', helpful: 18 },
    saved: false, createdAt: '1 week ago',
  },
  {
    id: 'q3',
    title: 'Where can I find affordable local food near the Swakopmund waterfront?',
    author: authors[3], community: 'Swakopmund Locals', destination: 'Swakopmund',
    answerCount: 8,
    acceptedAnswer: { authorName: 'Amara S.', authorType: 'local', preview: 'The fish market stalls near the jetty do fresh grilled fish for N$60–80. The sit-down places on the main street are good but at tourist prices.', helpful: 27 },
    linkedObject: { type: 'place', title: 'Swakopmund Fish Market' },
    saved: true, createdAt: '5 days ago',
  },
  {
    id: 'q4',
    title: 'Is a rental car necessary for Sossusvlei, or can I go by tour?',
    author: authors[1], community: 'Namibia Road Trips', destination: 'Sossusvlei',
    answerCount: 0,
    acceptedAnswer: null,
    saved: false, createdAt: '12 hours ago',
  },
  {
    id: 'q5',
    title: 'What should I know before taking the Walvis Bay ferry?',
    author: authors[2], community: 'Walvis Bay & Coast', destination: 'Walvis Bay',
    answerCount: 3,
    acceptedAnswer: { authorName: 'Priya K.', authorType: 'traveler', preview: 'Book ahead in peak season — the boat fills fast. Bring layers, it gets cold on the water even in summer. The tour includes pelican and seal encounters.', helpful: 9 },
    linkedObject: { type: 'transport', title: 'Walvis Bay Catamaran Tour' },
    saved: false, createdAt: '2 days ago',
  },
]

// ─── Discussions ──────────────────────────────────────────────────────────

export const popularDiscussions: CommunityDiscussionSummary[] = [
  {
    id: 'd1',
    title: 'Planning a five-day coast road trip — stop recommendations?',
    bodyPreview: 'We have five days, a rental car from Windhoek, and want to hit Sossusvlei, then drive north along the coast to Swakopmund. Any stops we should add or avoid?',
    author: authors[0], community: 'Namibia Road Trips', destination: 'Namibia',
    topic: 'Trip planning', replyCount: 24, pinned: false, official: false, businessContent: false,
    linkedObjects: [{ type: 'journey', title: 'Namibia in 10 Days: Dunes to Coast' }],
    saved: false, createdAt: '1 day ago',
  },
  {
    id: 'd2',
    title: 'Best stops between Windhoek and Swakopmund',
    bodyPreview: 'I keep seeing different advice — Solitaire, Büllsport, the Khomas Hochland pass. What is actually worth stopping for on that drive?',
    author: authors[3], community: 'Windhoek Travelers', destination: 'Windhoek',
    topic: 'Route advice', replyCount: 41, pinned: true, official: false, businessContent: false,
    saved: true, createdAt: '3 days ago',
  },
  {
    id: 'd3',
    title: 'Flying or taking the bus from Windhoek to Cape Town?',
    bodyPreview: 'Looking at both options for two people. The bus is cheaper but takes 18 hours. Is the Intercape overnight actually comfortable, or is the flight worth the extra cost?',
    author: authors[4], community: 'Namibia Bus Routes', destination: 'Namibia',
    topic: 'Transport', replyCount: 18, pinned: false, official: false, businessContent: false,
    linkedObjects: [{ type: 'transport', title: 'Intercape Windhoek–Cape Town' }],
    saved: false, createdAt: '5 days ago',
  },
  {
    id: 'd4',
    title: 'What to expect from the Walvis Bay waterfront',
    bodyPreview: 'First time visiting next month. Is the waterfront worth a full day? What should I not miss, and what is overrated?',
    author: authors[1], community: 'Walvis Bay & Coast', destination: 'Walvis Bay',
    topic: 'Local advice', replyCount: 9, pinned: false, official: false, businessContent: false,
    saved: false, createdAt: '1 week ago',
  },
  {
    id: 'd5',
    title: 'Budget breakdown for a weekend in Lüderitz',
    bodyPreview: "I just got back. Total spend for two people for three nights including the Kolmanskop tour, the ghost town entry, and two restaurant dinners was N$6 200. Happy to break it down.",
    author: authors[2], community: 'Lüderitz Explorers', destination: 'Lüderitz',
    topic: 'Budget', replyCount: 33, pinned: false, official: false, businessContent: false,
    linkedObjects: [{ type: 'place', title: 'Kolmanskop Ghost Town' }],
    saved: false, createdAt: '2 weeks ago',
  },
]

// ─── Interest categories ───────────────────────────────────────────────────

export const interestCategories = [
  { label: 'Budget travel',      icon: 'wallet',    color: '#10A760' },
  { label: 'Solo travel',        icon: 'user',      color: '#8C52FF' },
  { label: 'Family travel',      icon: 'users',     color: '#EC4899' },
  { label: 'Food',               icon: 'utensils',  color: '#F59E0B' },
  { label: 'Nature',             icon: 'leaf',      color: '#06B6D4' },
  { label: 'Photography',        icon: 'camera',    color: '#6366F1' },
  { label: 'Road trips',         icon: 'car',       color: '#E05C1A' },
  { label: 'Air travel',         icon: 'plane',     color: '#3B82F6' },
  { label: 'Water travel',       icon: 'ship',      color: '#06B6D4' },
  { label: 'Events',             icon: 'calendar',  color: '#EC4899' },
  { label: 'Safety',             icon: 'shield',    color: '#EF4444' },
  { label: 'Accessible travel',  icon: 'heart',     color: '#8B5CF6' },
]

// ─── Transport communities ─────────────────────────────────────────────────

export const transportCommunities: CommunitySummary[] = allCommunities.filter(c => c.communityType === 'transport')

// ─── Nearby communities ────────────────────────────────────────────────────

export const nearbyCommunities: CommunitySummary[] = allCommunities.filter(c =>
  ['c1', 'c2', 'c5', 'c3'].includes(c.id)
)
