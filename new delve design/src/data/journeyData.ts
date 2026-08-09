// ─── Types ────────────────────────────────────────────────────────────────

export type JourneyVisibility = 'public' | 'private' | 'draft'
export type PartyType = 'solo' | 'couple' | 'family' | 'group' | 'friends'
export type TransportMode = 'Car rental' | 'Bus' | 'Private driver' | 'Community ride' | 'Air' | 'Ferry' | 'On foot' | 'Bicycle'
export type TravelStyle = 'budget' | 'mid-range' | 'comfort' | 'adventure' | 'cultural' | 'nature' | 'family'
export type BudgetCategory = 'Stays' | 'Road transport' | 'Air transport' | 'Water transport' | 'Food & drink' | 'Activities' | 'Events' | 'Guides' | 'Shopping' | 'Fees' | 'Other'

export interface JourneyCreator {
  id: string
  name: string
  handle: string
  avatar: string
  verified: boolean
  bio: string
  focus: string
  followers: number
}

export interface JourneyStop {
  id: string
  order: number
  place: string
  region: string
  arrivalDay: number
  durationDays: number
  transportToNext?: {
    mode: TransportMode
    duration: string
    notes?: string
    historicalCost?: string
  }
  notes: string
  media: string[]
  highlights: string[]
  linkedServiceId?: string
  linkedServiceTitle?: string
  activeDealAvailable?: boolean
  historicalCosts?: { label: string; amount: string }[]
}

export interface JourneyDayEntry {
  day: number
  date?: string
  title: string
  stops: string[]
  diaryText: string
  media: string[]
  mediaCaption?: string
  highlights: string[]
  transportUsed?: string
  costs?: { label: string; amount: string }[]
}

export interface JourneyReflection {
  type: 'what-worked' | 'what-surprised' | 'what-id-change' | 'worth-the-cost' | 'travel-tip' | 'local-insight' | 'safety'
  label: string
  body: string
}

export interface JourneyBudgetEntry {
  id: string
  category: BudgetCategory
  amount: string
  currency: string
  amountType: 'total' | 'per-person'
  day?: number
  stopId?: string
  note?: string
}

export interface JourneyComment {
  id: string
  author: JourneyCreator
  body: string
  timeAgo: string
  likes: number
  liked: boolean
  replies?: { author: JourneyCreator; body: string; timeAgo: string }[]
}

export interface JourneySummary {
  id: string
  title: string
  summary: string
  creator: JourneyCreator
  coverMedia: string
  startPlace: string
  endPlace: string
  countries: string[]
  durationDays: number
  stopCount: number
  transportModes: TransportMode[]
  historicalCost: string
  currency: string
  partyType: PartyType
  tags: TravelStyle[]
  visibility: JourneyVisibility
  publishedAt: string
  saves: number
  views: number
}

export interface JourneyDetail extends JourneySummary {
  media: string[]
  stops: JourneyStop[]
  days: JourneyDayEntry[]
  reflections: JourneyReflection[]
  budget: JourneyBudgetEntry[]
  takeaway: string
  comments: JourneyComment[]
  similarJourneyIds: string[]
}

// ─── Creators ─────────────────────────────────────────────────────────────

export const creators: JourneyCreator[] = [
  {
    id: 'c1',
    name: 'Lena Brandt',
    handle: '@lenabrandt',
    avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=80&h=80&fit=crop&auto=format',
    verified: true,
    bio: 'Slow traveler. Desert obsessed. Namibia 3× and counting.',
    focus: 'Desert & nature travel',
    followers: 4800,
  },
  {
    id: 'c2',
    name: 'Theo P.',
    handle: '@theop_na',
    avatar: 'https://images.unsplash.com/photo-1569342515654-a51ab4b2b050?w=80&h=80&fit=crop&auto=format',
    verified: false,
    bio: 'Budget trips through southern Africa. Bus routes & local hostels.',
    focus: 'Budget travel',
    followers: 1240,
  },
  {
    id: 'c3',
    name: 'Amara S.',
    handle: '@amarasafari',
    avatar: 'https://images.unsplash.com/photo-1599628489211-2e6e0a9cbb05?w=80&h=80&fit=crop&auto=format',
    verified: true,
    bio: 'Family safari planning. Two kids, one 4x4, zero regrets.',
    focus: 'Family & safari',
    followers: 7200,
  },
  {
    id: 'c4',
    name: 'Marcus V.',
    handle: '@marcusv_travels',
    avatar: 'https://images.unsplash.com/photo-1645036995768-bd4ea2589808?w=80&h=80&fit=crop&auto=format',
    verified: false,
    bio: 'Architecture, coastlines, and long drives. Swakopmund forever.',
    focus: 'Coastal & urban travel',
    followers: 2100,
  },
  {
    id: 'c5',
    name: 'Priya K.',
    handle: '@priyak',
    avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=80&h=80&fit=crop&auto=format',
    verified: false,
    bio: 'Solo female traveler. Namibia changed how I think about distance.',
    focus: 'Solo & cultural travel',
    followers: 3300,
  },
]

// ─── Mock journeys ────────────────────────────────────────────────────────

export const allJourneys: JourneyDetail[] = [

  // ── JOURNEY 1 ─────────────────────────────────────────────────────────
  {
    id: 'j1',
    title: 'Namibia in 10 Days: Dunes to Coast',
    summary: "A loop from Windhoek through Sossusvlei, the Namib coast, and back — the route I wish someone had told me about before I went.",
    creator: creators[0],
    coverMedia: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format',
    startPlace: 'Windhoek',
    endPlace: 'Windhoek',
    countries: ['Namibia'],
    durationDays: 10,
    stopCount: 7,
    transportModes: ['Car rental', 'On foot'],
    historicalCost: '14 200',
    currency: 'N$',
    partyType: 'couple',
    tags: ['nature', 'adventure', 'mid-range'],
    visibility: 'public',
    publishedAt: 'July 2026',
    saves: 314,
    views: 5800,
    media: [
      'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=900&h=600&fit=crop&auto=format',
    ],
    stops: [
      {
        id: 's1', order: 1, place: 'Windhoek', region: 'Khomas', arrivalDay: 1, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '5 hrs', notes: 'Drive the C14 through the Khomas Hochland. Stunning road, stop at the pass viewpoint.', historicalCost: 'N$ 700/day rental' },
        notes: 'Pick up the rental car, stock up on supplies at Checkers. This is your last reliable supermarket for several days.',
        media: ['https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Car hire from airport', 'Grocery stock-up', 'Stay: city guesthouse'],
        linkedServiceId: 'lst-stay-4', linkedServiceTitle: 'Klein Windhoek Guesthouse',
        historicalCosts: [{ label: 'Guesthouse (1 night)', amount: 'N$ 750' }, { label: 'Groceries', amount: 'N$ 680' }],
      },
      {
        id: 's2', order: 2, place: 'Solitaire', region: 'Hardap', arrivalDay: 2, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '1.5 hrs', notes: 'Short drive into NamibRand. The road becomes gravel just before Sesriem.' },
        notes: 'Solitaire is barely a town but the apple pie at the garage is famous. Fuel up here — last station before Sesriem.',
        media: ['https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Famous apple pie stop', 'Fuel up (last station)', 'Rusted car graveyard'],
        historicalCosts: [{ label: 'Fuel', amount: 'N$ 340' }, { label: 'Campsite (1 night)', amount: 'N$ 280' }],
      },
      {
        id: 's3', order: 3, place: 'Sossusvlei', region: 'Hardap', arrivalDay: 3, durationDays: 3,
        transportToNext: { mode: 'Car rental', duration: '4.5 hrs', notes: 'Drive the C14 north through Walvis Bay.' },
        notes: 'Get the park gate on Day 3 — it opens at sunrise and closes at sunset. Hire a guide for the first morning if you want to find Deadvlei without wandering. We stayed at the lodge and it was worth every cent.',
        media: [
          'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=400&fit=crop&auto=format',
          'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=400&fit=crop&auto=format',
        ],
        highlights: ['Sunrise on Dune 45', 'Deadvlei clay pan', 'Guided dune walk', 'Stargazing'],
        linkedServiceId: 'lst-stay-1', linkedServiceTitle: 'Dune View Guesthouse',
        activeDealAvailable: true,
        historicalCosts: [{ label: 'Lodge (3 nights)', amount: 'N$ 4 200' }, { label: 'Park fees', amount: 'N$ 480' }, { label: 'Guide (half day)', amount: 'N$ 800' }],
      },
      {
        id: 's4', order: 4, place: 'Walvis Bay', region: 'Erongo', arrivalDay: 6, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '20 min' },
        notes: 'Stop for flamingos at the lagoon — you almost always see them at low tide. The fish market is worth a visit for fresh oysters.',
        media: ['https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Flamingo lagoon', 'Fresh oysters at the market', 'Salt works viewpoint'],
        historicalCosts: [{ label: 'Lunch', amount: 'N$ 290' }, { label: 'Fuel', amount: 'N$ 180' }],
      },
      {
        id: 's5', order: 5, place: 'Swakopmund', region: 'Erongo', arrivalDay: 7, durationDays: 2,
        transportToNext: { mode: 'Car rental', duration: '3 hrs', notes: 'Head inland on the B2 back toward Windhoek.' },
        notes: 'Two full days here felt about right. Sandboarding on Day 7, the Tug for dinner, and the waterfront market on Day 8. Buy your craft souvenirs here — better selection than Windhoek.',
        media: [
          'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=600&h=400&fit=crop&auto=format',
          'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=400&fit=crop&auto=format',
        ],
        highlights: ['Sandboarding (half day)', 'Tug Restaurant dinner', 'Coastal market', 'Jetty walk'],
        linkedServiceId: 'lst-act-1', linkedServiceTitle: 'Guided Sandboarding',
        activeDealAvailable: true,
        historicalCosts: [{ label: 'Bungalow (2 nights)', amount: 'N$ 1 960' }, { label: 'Sandboarding', amount: 'N$ 450' }, { label: 'Meals (2 days)', amount: 'N$ 680' }],
      },
      {
        id: 's6', order: 6, place: 'Spitzkoppe', region: 'Erongo', arrivalDay: 9, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '2.5 hrs' },
        notes: "We camped here for one night on the way back. The rock formations at sunset are extraordinary. There's a community campsite — basic but memorable.",
        media: ['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Rock paintings', 'Sunset from the boulders', 'Community campsite'],
        historicalCosts: [{ label: 'Community campsite', amount: 'N$ 120 pp' }],
      },
      {
        id: 's7', order: 7, place: 'Windhoek', region: 'Khomas', arrivalDay: 10, durationDays: 1,
        notes: 'Return the car before noon to avoid late fees. Joe\'s Beerhouse near the airport is the classic last-night Namibia dinner.',
        media: ['https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=400&fit=crop&auto=format'],
        highlights: ["Joe's Beerhouse dinner", 'Car return', 'Departure'],
        historicalCosts: [{ label: 'Guesthouse (1 night)', amount: 'N$ 750' }, { label: 'Dinner', amount: 'N$ 340' }],
      },
    ],
    days: [
      { day: 1, title: 'Arrival in Windhoek', stops: ['Windhoek'], diaryText: 'Flight landed at Hosea Kutako just after noon. The airport is about 45km from the city — the transfer into town alone feels like Africa. We picked up the rental car, drove to the guesthouse in Klein Windhoek, and then walked to Checkers for supplies. Heavy on snacks and coffee sachets. The heat surprised me immediately.', media: ['https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=400&fit=crop&auto=format'], highlights: ['Car pickup', 'Klein Windhoek explore'], transportUsed: 'Car rental', costs: [{ label: 'Car hire (Day 1)', amount: 'N$ 700' }, { label: 'Groceries', amount: 'N$ 680' }] },
      { day: 2, title: 'Drive to Solitaire', stops: ['Solitaire'], diaryText: 'The C14 through the Khomas Hochland is one of those drives that makes you understand why people come back to Namibia. No traffic. Red earth. Mountains the color of dried blood. Solitaire is genuinely one petrol station, a bakery, and a collection of rusting cars. We ate the apple pie. It is legendary for a reason.', media: ['https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=400&fit=crop&auto=format'], highlights: ['Khomas Hochland views', 'Solitaire apple pie'], transportUsed: 'Car rental', costs: [{ label: 'Fuel', amount: 'N$ 340' }, { label: 'Campsite', amount: 'N$ 280' }] },
      { day: 3, title: 'Into the Namib — Sossusvlei', stops: ['Sossusvlei'], diaryText: "The park gate opens at sunrise and they mean it — we were third in the queue at 5:45am. The first hour inside the park, with the dunes turning from purple to orange to red, is something I can't do justice to in writing. Dune 45 takes 30 minutes to climb and about 4 minutes to run down.", media: ['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=400&fit=crop&auto=format', 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=400&fit=crop&auto=format'], mediaCaption: 'Dune 45 at 06:30, before the crowds arrived.', highlights: ['Sunrise on Dune 45', 'Deadvlei pan visit'], transportUsed: 'Car rental', costs: [{ label: 'Park fees', amount: 'N$ 160 pp' }] },
      { day: 7, title: 'Swakopmund — Sandboarding Day', stops: ['Swakopmund'], diaryText: 'Dune Riders picked us up at 7am from the guesthouse. Four hours of sandboarding — first lying down, then standing up. My knees were bruised and my face was full of sand and I have never laughed that hard. We recovered with oysters from the fish market and walked the jetty at sunset.', media: ['https://images.unsplash.com/photo-1651149164822-210246e81f99?w=600&h=400&fit=crop&auto=format'], highlights: ['Sandboarding (half day)', 'Oysters at the market', 'Jetty sunset'], transportUsed: 'On foot', costs: [{ label: 'Sandboarding', amount: 'N$ 450 pp' }, { label: 'Oysters & lunch', amount: 'N$ 310' }] },
    ],
    reflections: [
      { type: 'what-worked', label: 'What worked', body: 'Renting a car was the right call for this route. Public transport would have cut us off from Sossusvlei, Spitzkoppe, and anything off the main road. The rental cost more than the bus but less than a guided tour.' },
      { type: 'what-surprised', label: 'What surprised me', body: "The cold. Namibia in the desert at night in June — 3°C. We were not prepared for that. Pack a proper fleece even if you're coming from summer." },
      { type: 'what-id-change', label: "What I'd change", body: "We rushed Spitzkoppe. One night wasn't enough. I'd spend two nights there and do the full rock art loop." },
      { type: 'travel-tip', label: 'Travel tip', body: 'The 4G signal disappears between Solitaire and Swakopmund entirely. Download offline maps before you leave Windhoek and screenshot your accommodation confirmations.' },
      { type: 'local-insight', label: 'Local insight', body: "Ask at your lodge about current road conditions. The C14 gets corrugated depending on how recently it's been graded. It can ruin a 2WD vehicle in places." },
    ],
    budget: [
      { id: 'b1', category: 'Stays', amount: '7 660', currency: 'N$', amountType: 'total', note: 'Guesthouse Windhoek x2, Desert Lodge x3, Bungalow Swakop x2, Spitzkoppe campsite x1' },
      { id: 'b2', category: 'Road transport', amount: '4 200', currency: 'N$', amountType: 'total', note: 'Car rental 10 days at ~N$700/day including one-way drop fee' },
      { id: 'b3', category: 'Food & drink', amount: 'N$ 1 800', currency: 'N$', amountType: 'total', note: 'Mix of self-catering with groceries, and restaurants in Swakopmund' },
      { id: 'b4', category: 'Activities', amount: '900', currency: 'N$', amountType: 'total', note: 'Sandboarding + guide for half-day in Sossusvlei' },
      { id: 'b5', category: 'Fees', amount: '640', currency: 'N$', amountType: 'total', note: 'NamibRand/Sossusvlei park entry x2 people x2 days' },
      { id: 'b6', category: 'Other', amount: '1 000', currency: 'N$', amountType: 'total', note: 'Groceries, fuel stops, souvenirs, and market purchases' },
    ],
    takeaway: "Namibia is not a country you rush. Every section of this route deserves more time than we gave it. If I had to choose one thing to cut, I'd skip the Windhoek overnight at the end and spend the extra night at Spitzkoppe instead. Rent the car. Drive yourself. This is one of the last places where the road feels like it belongs to you.",
    comments: [
      { id: 'cm1', author: creators[1], body: "Did this same loop in March! We skipped Spitzkoppe and I've regretted it since. Adding it on our next trip.", timeAgo: '3 days ago', likes: 12, liked: false },
      { id: 'cm2', author: creators[4], body: 'The cold at Sossusvlei tip saved me — I nearly packed only summer clothes.', timeAgo: '1 week ago', likes: 8, liked: false, replies: [{ author: creators[0], body: 'Yes! I was genuinely shocked. The star photography is also better when it is cold because the air is cleaner.', timeAgo: '6 days ago' }] },
    ],
    similarJourneyIds: ['j2', 'j3'],
  },

  // ── JOURNEY 2 ─────────────────────────────────────────────────────────
  {
    id: 'j2',
    title: 'Weekend in Swakopmund on a Budget',
    summary: 'Three days, a bus ticket, and under N$ 4 000 for two people. Proof that the coast is not expensive if you know where to look.',
    creator: creators[1],
    coverMedia: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=900&h=600&fit=crop&auto=format',
    startPlace: 'Windhoek',
    endPlace: 'Windhoek',
    countries: ['Namibia'],
    durationDays: 3,
    stopCount: 2,
    transportModes: ['Bus', 'On foot'],
    historicalCost: '3 800',
    currency: 'N$',
    partyType: 'couple',
    tags: ['budget', 'cultural'],
    visibility: 'public',
    publishedAt: 'June 2026',
    saves: 186,
    views: 3200,
    media: [
      'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=900&h=600&fit=crop&auto=format',
    ],
    stops: [
      {
        id: 's1', order: 1, place: 'Windhoek', region: 'Khomas', arrivalDay: 1, durationDays: 1,
        transportToNext: { mode: 'Bus', duration: '4.5 hrs', notes: 'Intercape bus departs 06:30 from Wernhil Park. Book at least a day in advance.', historicalCost: 'N$ 380 pp' },
        notes: 'Early start from Windhoek — Intercape from Wernhil.',
        media: [],
        highlights: ['Bus from Wernhil Park 06:30'],
        historicalCosts: [{ label: 'Bus ticket x2', amount: 'N$ 760' }],
      },
      {
        id: 's2', order: 2, place: 'Swakopmund', region: 'Erongo', arrivalDay: 1, durationDays: 2,
        transportToNext: { mode: 'Bus', duration: '4.5 hrs' },
        notes: "We stayed at a backpackers. It was clean and central and everyone in the dorm was interesting. Walked everywhere — the town is completely walkable. Ate at the Tug once, street food the rest of the time.",
        media: ['https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Jetty walk', 'Beach at low tide', 'Craft market', 'Tug dinner'],
        historicalCosts: [{ label: 'Backpackers (2 nights)', amount: 'N$ 340 pp' }, { label: 'Food (2 days)', amount: 'N$ 520' }, { label: 'Tug dinner', amount: 'N$ 380' }],
      },
    ],
    days: [
      { day: 1, title: 'Bus to the coast', stops: ['Windhoek', 'Swakopmund'], diaryText: 'The Intercape is comfortable and punctual. Four and a half hours through the Namib with a coffee stop at a garage outside Usakos. By 11am we were checking into the backpackers and by noon we were walking on the beach.', media: ['https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=600&h=400&fit=crop&auto=format'], highlights: ['Beach arrival by noon'], transportUsed: 'Bus', costs: [{ label: 'Bus tickets', amount: 'N$ 760' }] },
      { day: 2, title: 'Full day on the coast', stops: ['Swakopmund'], diaryText: 'Walked the jetty at sunrise — it is free and extraordinary at that hour. Explored the colonial-era buildings in town, ate at a street food stall near the market, and sat on the beach for three hours in the afternoon. Dinner at the Tug was a splurge but absolutely worth it.', media: ['https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=400&fit=crop&auto=format'], highlights: ['Jetty sunrise', 'Colonial architecture', 'Tug dinner'], costs: [{ label: 'Tug dinner', amount: 'N$ 380' }] },
    ],
    reflections: [
      { type: 'worth-the-cost', label: 'Worth the cost', body: 'The Tug dinner was N$ 380 for two. Expensive for a budget trip but the ocean view and the kingklip made it the meal of the year. Do it once.' },
      { type: 'travel-tip', label: 'Travel tip', body: 'The backpackers in Swakopmund is central and clean and the vibe is social. If you are okay sharing a dorm you can do Swakopmund for under N$ 200/night pp.' },
    ],
    budget: [
      { id: 'b1', category: 'Stays', amount: '680', currency: 'N$', amountType: 'total', note: 'Backpackers dorm, 2 nights x 2 people at ~N$170/night pp' },
      { id: 'b2', category: 'Road transport', amount: '760', currency: 'N$', amountType: 'total', note: 'Intercape return x2 tickets' },
      { id: 'b3', category: 'Food & drink', amount: '1 280', currency: 'N$', amountType: 'total', note: 'Street food, market, one dinner at the Tug' },
      { id: 'b4', category: 'Activities', amount: '0', currency: 'N$', amountType: 'total', note: 'Jetty, beach, and walking cost nothing' },
      { id: 'b5', category: 'Other', amount: '580', currency: 'N$', amountType: 'total', note: 'Craft market purchases, snacks' },
    ],
    takeaway: "Swakopmund on a bus and a backpackers budget is completely doable and honestly one of the better ways to experience the town. You end up talking to people, eating at local spots, and walking everywhere rather than driving through it.",
    comments: [
      { id: 'cm1', author: creators[3], body: "Did you find the night market on the Saturday? That's the best version of the craft market.", timeAgo: '5 days ago', likes: 4, liked: false },
    ],
    similarJourneyIds: ['j1', 'j4'],
  },

  // ── JOURNEY 3 ─────────────────────────────────────────────────────────
  {
    id: 'j3',
    title: 'Family Safari — Etosha & Beyond',
    summary: 'Seven days in Etosha with two kids (8 and 11). Game drives, waterholes, and the elephant encounter that will stay with us forever.',
    creator: creators[2],
    coverMedia: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=900&h=600&fit=crop&auto=format',
    startPlace: 'Windhoek',
    endPlace: 'Windhoek',
    countries: ['Namibia'],
    durationDays: 7,
    stopCount: 4,
    transportModes: ['Car rental', 'Private driver'],
    historicalCost: '28 900',
    currency: 'N$',
    partyType: 'family',
    tags: ['nature', 'comfort', 'family'],
    visibility: 'public',
    publishedAt: 'May 2026',
    saves: 421,
    views: 9100,
    media: [
      'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&h=600&fit=crop&auto=format',
    ],
    stops: [
      {
        id: 's1', order: 1, place: 'Windhoek', region: 'Khomas', arrivalDay: 1, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '5.5 hrs', notes: 'Drive north on the B1, turn off at Otjiwarongo. The road is excellent tarmac all the way.' },
        notes: 'Flew in from Johannesburg, picked up a 4x4 at the airport, stayed one night before the long drive north.',
        media: [],
        highlights: ['Airport car hire', 'Windhoek city walk'],
        historicalCosts: [{ label: 'Guesthouse', amount: 'N$ 1 500' }, { label: 'Car hire (7 days)', amount: 'N$ 7 000' }],
      },
      {
        id: 's2', order: 2, place: 'Etosha National Park', region: 'Oshikoto', arrivalDay: 2, durationDays: 4,
        transportToNext: { mode: 'Car rental', duration: '5 hrs' },
        notes: 'We stayed at Okaukuejo camp inside the park. The floodlit waterhole there is genuinely magical at night — we saw lions, elephant, and black rhino over four evenings. The self-drive routes inside the park are well-signposted.',
        media: [
          'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=600&h=400&fit=crop&auto=format',
          'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&h=400&fit=crop&auto=format',
        ],
        highlights: ['Okaukuejo waterhole (lion + rhino)', 'Mornings at Halali waterhole', 'Self-drive Big Five loop', 'Kids junior ranger program'],
        historicalCosts: [{ label: 'Okaukuejo camp (4 nights)', amount: 'N$ 4 800' }, { label: 'Park fees (4 pax x 4 days)', amount: 'N$ 1 920' }],
      },
      {
        id: 's3', order: 3, place: 'Waterberg Plateau', region: 'Otjozondjupa', arrivalDay: 6, durationDays: 1,
        transportToNext: { mode: 'Car rental', duration: '3.5 hrs' },
        notes: 'One night as a stop on the way south. The plateau is beautiful and undervisited. Easy walk with the kids to the viewpoint.',
        media: ['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=400&fit=crop&auto=format'],
        highlights: ['Plateau viewpoint hike', 'Rare sable antelope sighting'],
        historicalCosts: [{ label: 'Rest camp', amount: 'N$ 960' }],
      },
      {
        id: 's4', order: 4, place: 'Windhoek', region: 'Khomas', arrivalDay: 7, durationDays: 1,
        notes: 'Return drive to Windhoek, car handover, airport departure in the evening.',
        media: [],
        highlights: ['Car return', 'Last Namibian dinner'],
        historicalCosts: [{ label: 'Dinner', amount: 'N$ 860' }],
      },
    ],
    days: [
      { day: 2, title: 'First game drive — Etosha', stops: ['Etosha National Park'], diaryText: 'We entered the park at the Anderson Gate at 09:00. Within 45 minutes the kids had spotted springbok, wildebeest, giraffe, and a cheetah crossing the road about 30 metres in front of us. My son went completely silent — the best reaction I have ever seen from him.', media: ['https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=600&h=400&fit=crop&auto=format'], highlights: ['Cheetah on the road', 'Giraffe herd'], costs: [{ label: 'Park entry', amount: 'N$ 480' }] },
      { day: 4, title: 'The elephant night', stops: ['Etosha National Park'], diaryText: "At 22:00 the kids were supposed to be in bed. Three elephants arrived at the Okaukuejo waterhole from the north and stayed for two hours. We were all sitting in camping chairs in the dark, whispering. My daughter said it was the best night of her life. I agreed.", media: ['https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&h=400&fit=crop&auto=format'], mediaCaption: 'Three elephants at the Okaukuejo waterhole. 22:40.', highlights: ['Elephant family at waterhole', 'Black rhino sighting'] },
    ],
    reflections: [
      { type: 'what-worked', label: 'What worked', body: 'Staying inside the park at Okaukuejo rather than outside was the right call. The floodlit waterhole is only accessible to camp guests and it is the entire experience.' },
      { type: 'what-surprised', label: 'What surprised me', body: 'The kids junior ranger program at Okaukuejo was free and brilliant. My daughter still has the ranger badge on her backpack.' },
      { type: 'safety', label: 'Safety note', body: 'The park gates close at sunset and the roads inside are not lit. Do not push the timing on your game drives — getting locked out overnight is a real consequence.' },
      { type: 'travel-tip', label: 'Travel tip', body: "Bring binoculars for every person. Sharing one pair between four people in the car means someone always misses the animal. We bought a second cheap pair at Windhoek's outdoor store." },
    ],
    budget: [
      { id: 'b1', category: 'Stays', amount: '8 260', currency: 'N$', amountType: 'total', note: 'Windhoek guesthouse + Okaukuejo x4 + Waterberg x1' },
      { id: 'b2', category: 'Road transport', amount: '7 000', currency: 'N$', amountType: 'total', note: '7-day 4x4 hire + fuel' },
      { id: 'b3', category: 'Food & drink', amount: '4 200', currency: 'N$', amountType: 'total', note: 'Camp shop meals, self-catering, two restaurants' },
      { id: 'b4', category: 'Fees', amount: '2 400', currency: 'N$', amountType: 'total', note: 'Etosha park entry 4 people x 4 days + conservation levy' },
      { id: 'b5', category: 'Other', amount: '7 040', currency: 'N$', amountType: 'total', note: 'Flights (internal) + airport costs + souvenirs + miscellaneous' },
    ],
    takeaway: "If you are doing Namibia with children, Etosha is the heart of the trip. Nothing else compares to a waterhole at night with your family. Spend at least 3 nights inside the park, stay at Okaukuejo for the waterhole, and give the kids the binoculars.",
    comments: [
      { id: 'cm1', author: creators[4], body: 'The junior ranger detail just sold me on Etosha for our next trip. I had no idea that existed.', timeAgo: '2 days ago', likes: 15, liked: false },
    ],
    similarJourneyIds: ['j1', 'j4'],
  },

  // ── JOURNEY 4 ─────────────────────────────────────────────────────────
  {
    id: 'j4',
    title: 'Solo on the Skeleton Coast',
    summary: 'Six days driving the Skeleton Coast alone — one of the emptiest, strangest, most rewarding roads on earth.',
    creator: creators[4],
    coverMedia: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=900&h=600&fit=crop&auto=format',
    startPlace: 'Swakopmund',
    endPlace: 'Opuwo',
    countries: ['Namibia'],
    durationDays: 6,
    stopCount: 4,
    transportModes: ['Car rental'],
    historicalCost: '9 400',
    currency: 'N$',
    partyType: 'solo',
    tags: ['adventure', 'nature', 'budget'],
    visibility: 'public',
    publishedAt: 'April 2026',
    saves: 228,
    views: 4400,
    media: [
      'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=900&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format',
    ],
    stops: [
      { id: 's1', order: 1, place: 'Swakopmund', region: 'Erongo', arrivalDay: 1, durationDays: 1, transportToNext: { mode: 'Car rental', duration: '2 hrs' }, notes: 'Starting point and last proper town. Stock up on water, fuel, and supplies.', media: [], highlights: ['Last supermarket', 'Fuel up'], historicalCosts: [{ label: 'Supplies', amount: 'N$ 680' }] },
      { id: 's2', order: 2, place: 'Henties Bay', region: 'Erongo', arrivalDay: 1, durationDays: 1, transportToNext: { mode: 'Car rental', duration: '3.5 hrs', notes: 'The road north becomes increasingly dramatic and increasingly empty.' }, notes: 'Fishing village. The seal colony at Cape Cross is 60km further up.', media: ['https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=400&fit=crop&auto=format'], highlights: ['Cape Cross seal colony (60,000 seals)'], historicalCosts: [{ label: 'Cape Cross entry', amount: 'N$ 80' }, { label: 'Campsite', amount: 'N$ 180' }] },
      { id: 's3', order: 3, place: 'Skeleton Coast National Park', region: 'Kunene', arrivalDay: 2, durationDays: 3, transportToNext: { mode: 'Car rental', duration: '6 hrs' }, notes: "The permits are issued at Springbokwasser gate and are limited. Book online before your trip — they do sell out.", media: ['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=400&fit=crop&auto=format'], highlights: ['Desert-adapted elephants', 'Shipwreck at low tide', 'Jackals on the beach', 'Zero other tourists for hours'], historicalCosts: [{ label: 'Park permit (3 days)', amount: 'N$ 360' }, { label: 'Camping', amount: 'N$ 480' }] },
      { id: 's4', order: 4, place: 'Opuwo', region: 'Kunene', arrivalDay: 6, durationDays: 1, notes: 'Himba cultural town. A very different Namibia from the south.', media: [], highlights: ['Himba market', 'Last stop before Angola border'], historicalCosts: [{ label: 'Guesthouse', amount: 'N$ 650' }] },
    ],
    days: [
      { day: 2, title: 'The seal colony and beyond', stops: ['Henties Bay'], diaryText: "Cape Cross has 60,000 Cape fur seals. The smell hits you half a kilometre before the colony. It is overwhelming and magnificent. I spent two hours there and did not see another tourist after the first 30 minutes. North of Cape Cross the road gets lonelier with every kilometre.", media: ['https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=400&fit=crop&auto=format'], highlights: ['Cape Cross colony', 'Empty road north'], costs: [{ label: 'Entry + camping', amount: 'N$ 260' }] },
      { day: 4, title: 'Desert elephants', stops: ['Skeleton Coast National Park'], diaryText: "I nearly drove past them. Seven elephants standing in a dry riverbed, eating from the sparse vegetation with a patience that made my hurry feel foolish. I stopped the car and watched for an hour. This is what I came here for.", media: ['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=400&fit=crop&auto=format'], mediaCaption: 'Desert-adapted elephants in the Hoarusib riverbed. Day 4.', highlights: ['Desert elephant herd', 'Shipwreck at Toscanini'] },
    ],
    reflections: [
      { type: 'what-worked', label: 'What worked', body: 'Going solo was the right choice for this route. There is a lot of waiting and watching. You cannot rush it and you cannot apologize for stopping when you want to.' },
      { type: 'safety', label: 'Safety note', body: "You are genuinely remote here. Tell someone your itinerary before you go. I emailed my route to my sister with checkpoint times. There is no mobile signal for stretches of 200km+." },
      { type: 'travel-tip', label: 'Travel tip', body: 'The Skeleton Coast park permit has a quota. Book it weeks in advance through NWR online. Turning up without a permit means turning around.' },
    ],
    budget: [
      { id: 'b1', category: 'Stays', amount: '1 310', currency: 'N$', amountType: 'total', note: 'Mix of campsites and one guesthouse in Opuwo' },
      { id: 'b2', category: 'Road transport', amount: '5 600', currency: 'N$', amountType: 'total', note: 'Car hire + fuel for 6 days (higher consumption on gravel)' },
      { id: 'b3', category: 'Food & drink', amount: '980', currency: 'N$', amountType: 'total', note: 'Mostly self-catering from supplies bought in Swakopmund' },
      { id: 'b4', category: 'Fees', amount: '440', currency: 'N$', amountType: 'total', note: 'Skeleton Coast permit + Cape Cross entry' },
      { id: 'b5', category: 'Other', amount: '1 070', currency: 'N$', amountType: 'total', note: 'Extra fuel jerry can, first aid kit, emergency supplies' },
    ],
    takeaway: "The Skeleton Coast is one of those places that earns its reputation. You do not go there for comfort. You go there because it shows you what the earth looked like before people arrived — and because on some days, driving that road, you are the only person in hundreds of square kilometres.",
    comments: [],
    similarJourneyIds: ['j1', 'j2'],
  },
]

// ─── Suggested searches ────────────────────────────────────────────────────

export const suggestedRoutes = [
  'Windhoek to Swakopmund',
  'Weekend near the coast',
  'Road trip through Namibia',
  'Budget trip to Etosha',
  'Skeleton Coast drive',
  'Family safari route',
  'Sossusvlei loop',
  'Solo south Namibia',
]

// ─── Budget category colors ────────────────────────────────────────────────

export const budgetCategoryColor: Record<BudgetCategory, string> = {
  'Stays':           '#6366F1',
  'Road transport':  '#E05C1A',
  'Air transport':   '#3B82F6',
  'Water transport': '#06B6D4',
  'Food & drink':    '#F59E0B',
  'Activities':      '#EF4444',
  'Events':          '#EC4899',
  'Guides':          '#10A760',
  'Shopping':        '#8B5CF6',
  'Fees':            '#9CA3AF',
  'Other':           '#6B7280',
}

// ─── Discovery mode tabs ───────────────────────────────────────────────────

export const discoveryModes = [
  { label: 'For you',  tags: [] as TravelStyle[] },
  { label: 'Weekend',  tags: ['nature', 'cultural', 'budget'] as TravelStyle[] },
  { label: 'Coast',    tags: ['cultural', 'adventure'] as TravelStyle[] },
  { label: 'Nature',   tags: ['nature', 'adventure'] as TravelStyle[] },
  { label: 'Budget',   tags: ['budget'] as TravelStyle[] },
]
