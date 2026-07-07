export type CommunityGroupTopic =
  | 'general'
  | 'safety'
  | 'transport'
  | 'food'
  | 'stay'
  | 'prices'
  | 'visas'
  | '4x4'
  | 'photography'

export type MockCommunityGroup = {
  id: string
  slug: string
  name: string
  description: string
  topic: CommunityGroupTopic
  visibility: 'public' | 'private'
  memberCount: number
  lastMessagePreview?: string
  lastActiveAt?: string
  coverSrc?: string
  joined?: boolean
  pendingRequest?: boolean
}

export const COMMUNITY_GROUP_TOPICS: { id: CommunityGroupTopic; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'safety', label: 'Safety' },
  { id: 'transport', label: 'Transport' },
  { id: 'food', label: 'Food' },
  { id: 'stay', label: 'Stay' },
  { id: 'prices', label: 'Prices' },
  { id: 'visas', label: 'Visas' },
  { id: '4x4', label: '4×4' },
  { id: 'photography', label: 'Photos' },
]

export const MOCK_DISCOVER_GROUPS: MockCommunityGroup[] = [
  {
    id: 'g1',
    slug: 'windhoek-weekend',
    name: 'Windhoek Weekend Crew',
    description: 'Short trips, food spots, and safety tips around the capital.',
    topic: 'food',
    visibility: 'public',
    memberCount: 128,
    lastMessagePreview: 'Try Joe\'s for breakfast before the museum.',
    lastActiveAt: '2026-07-05T14:20:00Z',
    coverSrc: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=200&q=70',
  },
  {
    id: 'g2',
    slug: 'sossusvlei-self-drive',
    name: 'Sossusvlei Self-Drive',
    description: 'Tyre pressure, fuel stops, and dune sunrise timing.',
    topic: '4x4',
    visibility: 'public',
    memberCount: 84,
    lastMessagePreview: 'Gate opens at 6 — queue early in peak season.',
    lastActiveAt: '2026-07-04T09:10:00Z',
    coverSrc: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=200&q=70',
  },
  {
    id: 'g3',
    slug: 'etosha-first-timers',
    name: 'Etosha First-Timers',
    description: 'Ask anything before your first park visit — routes, camps, sightings.',
    topic: 'safety',
    visibility: 'public',
    memberCount: 203,
    lastMessagePreview: 'Halali waterhole was busy at dusk yesterday.',
    lastActiveAt: '2026-07-05T18:45:00Z',
    coverSrc: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=200&q=70',
  },
  {
    id: 'g4',
    slug: 'swakop-surf-fog',
    name: 'Swakopmund & Coast',
    description: 'Fog, seafood, and coastal drives — local knowledge only.',
    topic: 'transport',
    visibility: 'private',
    memberCount: 56,
    lastMessagePreview: 'Request to join to see full conversation.',
    lastActiveAt: '2026-07-03T11:00:00Z',
  },
  {
    id: 'g5',
    slug: 'namibia-visas',
    name: 'Namibia Visas & Entry',
    description: 'Border crossings, extensions, and paperwork questions.',
    topic: 'visas',
    visibility: 'public',
    memberCount: 312,
    lastMessagePreview: 'SADC passport — no visa needed for 90 days.',
    lastActiveAt: '2026-07-05T08:30:00Z',
  },
]

export const MOCK_MY_GROUPS: MockCommunityGroup[] = [
  {
    id: 'm1',
    slug: 'kaoko-road-tips',
    name: 'Kaokoveld Road Tips',
    description: 'Remote north-west — fuel, permits, and recovery.',
    topic: '4x4',
    visibility: 'public',
    memberCount: 41,
    joined: true,
    lastMessagePreview: 'Carry extra water — Purros pump was slow last week.',
    lastActiveAt: '2026-07-05T16:00:00Z',
    coverSrc: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=200&q=70',
  },
]
