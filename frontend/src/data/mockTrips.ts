/** Mock travel diary trips for the Journeys feed — no backend needed. */

const IMG = {
  dunes: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70',
  coast: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=70',
  city: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
  safari: 'https://images.unsplash.com/photo-1564760290292-23341e4df6ec?auto=format&fit=crop&w=1200&q=70',
  camp: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=70',
  road: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=1200&q=70',
  sunset: 'https://images.unsplash.com/photo-1495562569060-2eec283d3391?auto=format&fit=crop&w=1200&q=70',
  food: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70',
  lodge: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70',
  fish: 'https://images.unsplash.com/photo-1559339352-11d035aa652d?auto=format&fit=crop&w=1200&q=70',
  canyon: 'https://images.unsplash.com/photo-1520962922320-2038eebab146?auto=format&fit=crop&w=1200&q=70',
  seal: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?auto=format&fit=crop&w=1200&q=70',
  market: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=70',
  hike: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=70',
  stars: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1200&q=70',
  village: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=70',
  elephant: 'https://images.unsplash.com/photo-1564760290292-23341e4df6ec?auto=format&fit=crop&w=1200&q=70',
  kayak: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=70',
}

const AV = {
  k: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80',
  s: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80',
  m: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80',
  p: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
  t: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=128&h=128&q=80',
}

export type TripStop = {
  id: number
  order: number
  place_name: string
  region?: string
  country_code: string
  arrived_on: string
  left_on: string
  notes: string
  cost?: number
  entries: TripEntry[]
}

export type TripEntry = {
  id: number
  body: string
  image: string | null
  video: string | null
  happened_at?: string
}

export type TripCost = {
  category: 'stay' | 'food' | 'transport' | 'activity' | 'other'
  amount: number
  note: string
}

export type MockTrip = {
  id: number
  author: {
    username: string
    display_name: string
    avatar: string | null
  }
  title: string
  summary: string
  cover_image: string | null
  starts_on: string
  ends_on: string
  countries: string[]
  transport_modes: string[]
  party: string
  tags: string[]
  total_cost: number
  currency: string
  days: number
  stops: TripStop[]
  costs: TripCost[]
  likes_count: number
  saves_count: number
  comments_count: number
  liked_by_me: boolean
  saved_by_me: boolean
}

export const mockTrips: MockTrip[] = [
  {
    id: 1001,
    author: { username: 'kaoko_explorer', display_name: 'Kaoko Explorer', avatar: AV.k },
    title: 'Windhoek → Sossusvlei → Swakopmund',
    summary: 'A classic Namibian loop — city start, the red dunes of Sossusvlei, then coast life in Swakop. Six days, one rented 4×4, and not a single regret.',
    cover_image: IMG.dunes,
    starts_on: '2026-03-10',
    ends_on: '2026-03-15',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'couple',
    tags: ['4x4', 'dunes', 'coast', 'photography'],
    total_cost: 8400,
    currency: 'NAD',
    days: 6,
    likes_count: 42,
    saves_count: 18,
    comments_count: 7,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 1, order: 0, place_name: 'Windhoek', country_code: 'NA', region: 'Khomas',
        arrived_on: '2026-03-10', left_on: '2026-03-11',
        notes: 'Arrived late, grabbed a room near the city centre. Picked up the 4×4 in the morning — they threw in a cooler box which was a lifesaver.',
        cost: 1200,
        entries: [
          { id: 1, body: 'First night in Windhoek — Joe\'s Beerhouse for dinner. Oryx steak, 10/10.', image: IMG.food, video: null },
          { id: 2, body: 'Packed the car and hit the B1 south by 7am.', image: IMG.road, video: null },
        ],
      },
      {
        id: 2, order: 1, place_name: 'Sossusvlei', country_code: 'NA', region: 'Hardap',
        arrived_on: '2026-03-12', left_on: '2026-03-13',
        notes: 'Stayed at a small camp just outside the park gate. We did Dune 45 at sunrise — woke up at 4am, 100% worth it.',
        cost: 2800,
        entries: [
          { id: 3, body: 'Dune 45 at first light. Barely anyone there. Absolute silence.', image: IMG.dunes, video: null },
          { id: 4, body: 'Dead Vlei — these ancient camelthorn trees are over 900 years old and still standing.', image: IMG.sunset, video: null },
          { id: 5, body: 'Stargazing from the camp at night. No light pollution whatsoever.', image: IMG.stars, video: null },
        ],
      },
      {
        id: 3, order: 2, place_name: 'Swakopmund', country_code: 'NA', region: 'Erongo',
        arrived_on: '2026-03-13', left_on: '2026-03-15',
        notes: 'Coastal vibes after the dust and heat of the desert. Amazing contrast. Did sandboarding on day two.',
        cost: 2800,
        entries: [
          { id: 6, body: 'Fish and chips at the jetty. Cold Atlantic breeze, warm coffee.', image: IMG.coast, video: null },
          { id: 7, body: 'Sandboarding down Dune 7 — faces full of sand, zero regrets.', image: IMG.hike, video: null },
          { id: 8, body: 'Cape Cross seal colony on the way back — thousands of seals, incredible noise.', image: IMG.seal, video: null },
        ],
      },
    ],
    costs: [
      { category: 'transport', amount: 2100, note: 'Car rental (4×4, 5 days) + fuel' },
      { category: 'stay', amount: 3200, note: 'Camps and guesthouse (3 nights)' },
      { category: 'food', amount: 1800, note: 'Meals across 6 days' },
      { category: 'activity', amount: 900, note: 'Sandboarding, park entry, Cape Cross' },
      { category: 'other', amount: 400, note: 'Groceries and supplies' },
    ],
  },
  {
    id: 1002,
    author: { username: 'sarah_travels', display_name: 'Sarah T.', avatar: AV.s },
    title: 'Fish River Canyon on a budget',
    summary: 'Solo trip to the second-largest canyon in the world. Did it without a tour, stayed in a basic lodge, and came in well under N$2k. Here\'s exactly how.',
    cover_image: IMG.canyon,
    starts_on: '2026-02-20',
    ends_on: '2026-02-23',
    countries: ['NA'],
    transport_modes: ['bus', 'car'],
    party: 'solo',
    tags: ['budget', 'hiking', 'solo', 'canyon'],
    total_cost: 1850,
    currency: 'NAD',
    days: 4,
    likes_count: 87,
    saves_count: 56,
    comments_count: 22,
    liked_by_me: true,
    saved_by_me: false,
    stops: [
      {
        id: 4, order: 0, place_name: 'Keetmanshoop', country_code: 'NA', region: 'ǁKaras',
        arrived_on: '2026-02-20', left_on: '2026-02-21',
        notes: 'Took the Intercape bus from Windhoek — N$280. Arrived midday, hitched a ride to the canyon (free). Basic but clean lodge.',
        cost: 420,
        entries: [
          { id: 9, body: 'Bus from Windhoek took about 4.5 hours. Comfortable enough and cheap.', image: IMG.road, video: null },
        ],
      },
      {
        id: 5, order: 1, place_name: 'Fish River Canyon', country_code: 'NA', region: 'ǁKaras',
        arrived_on: '2026-02-21', left_on: '2026-02-23',
        notes: 'The viewpoints are free if you self-drive to the lookout. The canyon is enormous — photos don\'t do it justice.',
        cost: 980,
        entries: [
          { id: 10, body: 'First lookout point. 550 metres deep. You can\'t really comprehend it until you\'re standing there.', image: IMG.canyon, video: null },
          { id: 11, body: 'Hiked along the rim for 3km — no tour needed, the path is clear.', image: IMG.hike, video: null },
          { id: 12, body: 'Sunset from Hobas campsite. Ate a can of beans and felt like a millionaire.', image: IMG.sunset, video: null },
        ],
      },
    ],
    costs: [
      { category: 'transport', amount: 560, note: 'Bus + local rides' },
      { category: 'stay', amount: 720, note: 'Lodge (1 night) + Hobas campsite (2 nights)' },
      { category: 'food', amount: 340, note: 'Self-catered mostly' },
      { category: 'activity', amount: 130, note: 'Park entry and sundries' },
      { category: 'other', amount: 100, note: 'Misc' },
    ],
  },
  {
    id: 1003,
    author: { username: 'mike_namibia', display_name: 'Mike N.', avatar: AV.m },
    title: 'Namibia to Botswana — Chobe & Kasane',
    summary: 'Crossed the border from Namibia into Botswana for a 3-night wildlife trip. Chobe is something else entirely. Cost more than expected but every penny made sense.',
    cover_image: IMG.elephant,
    starts_on: '2026-01-05',
    ends_on: '2026-01-12',
    countries: ['NA', 'BW'],
    transport_modes: ['car', 'boat'],
    party: 'family',
    tags: ['wildlife', 'family', 'cross-border', 'safari'],
    total_cost: 24500,
    currency: 'NAD',
    days: 8,
    likes_count: 31,
    saves_count: 12,
    comments_count: 5,
    liked_by_me: false,
    saved_by_me: true,
    stops: [
      {
        id: 6, order: 0, place_name: 'Katima Mulilo', country_code: 'NA', region: 'Zambezi',
        arrived_on: '2026-01-05', left_on: '2026-01-06',
        notes: 'Drove up from Windhoek over two days. Last Namibian stop before crossing. Filled up fuel here — much cheaper than Botswana.',
        cost: 3200,
        entries: [
          { id: 13, body: 'Zambezi River from the guesthouse. Hippos about 100m away, visible with binoculars.', image: IMG.safari, video: null },
        ],
      },
      {
        id: 7, order: 1, place_name: 'Kasane, Botswana', country_code: 'BW', region: 'Chobe',
        arrived_on: '2026-01-06', left_on: '2026-01-10',
        notes: 'Border crossing took about 1.5 hours — bring printed car ownership docs. Worth it.',
        cost: 16800,
        entries: [
          { id: 14, body: 'Chobe boat safari: 4 hours, about 60 elephants at the river at once. My daughter said it was better than the zoo.', image: IMG.elephant, video: null },
          { id: 15, body: 'Game drive at dusk — lions less than 20 metres from the vehicle.', image: IMG.safari, video: null },
          { id: 16, body: 'Sundowners on the river with Mosi-Oa-Tunya in the distance. Perfect ending.', image: IMG.sunset, video: null },
        ],
      },
    ],
    costs: [
      { category: 'transport', amount: 6500, note: 'Car + fuel (long drive) + boat safari' },
      { category: 'stay', amount: 12000, note: '4 nights at Chobe lodge (pricey but worth it)' },
      { category: 'food', amount: 3200, note: 'Mostly lodge meals' },
      { category: 'activity', amount: 2200, note: 'Park fees, game drives' },
      { category: 'other', amount: 600, note: 'Border fees + misc' },
    ],
  },
  {
    id: 1004,
    author: { username: 'priya_wanders', display_name: 'Priya W.', avatar: AV.p },
    title: 'Etosha & the North — 5 days solo',
    summary: 'First time in Namibia. Did Etosha solo, stayed in rest camps, saw the Big Five. No guide, no tour group. Here\'s the self-drive route I used.',
    cover_image: IMG.safari,
    starts_on: '2026-04-01',
    ends_on: '2026-04-05',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'solo',
    tags: ['etosha', 'wildlife', 'self-drive', 'solo', 'first-timer'],
    total_cost: 6200,
    currency: 'NAD',
    days: 5,
    likes_count: 119,
    saves_count: 74,
    comments_count: 33,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 8, order: 0, place_name: 'Okaukuejo Camp, Etosha', country_code: 'NA', region: 'Oshana',
        arrived_on: '2026-04-01', left_on: '2026-04-03',
        notes: 'Self-check-in, cheap and functional. The waterhole at the camp is floodlit at night — sat there for 2 hours watching rhinos and elephants come and go.',
        cost: 2100,
        entries: [
          { id: 17, body: 'Arrived at the Anderson Gate around midday. First elephant 10 minutes inside the park.', image: IMG.elephant, video: null },
          { id: 18, body: 'Night waterhole: 3 rhinos, 12 elephants, one lion in the distance. Free. Just sit and watch.', image: IMG.safari, video: null },
        ],
      },
      {
        id: 9, order: 1, place_name: 'Halali Camp, Etosha', country_code: 'NA', region: 'Oshana',
        arrived_on: '2026-04-03', left_on: '2026-04-04',
        notes: 'Moved to Halali mid-park. Smaller and quieter than Okaukuejo. Better for self-catering.',
        cost: 1800,
        entries: [
          { id: 19, body: 'Cheetah crossing the road at 6am. Three cubs. Best thing I\'ve ever seen.', image: IMG.safari, video: null },
        ],
      },
      {
        id: 10, order: 2, place_name: 'Oshakati', country_code: 'NA', region: 'Oshana',
        arrived_on: '2026-04-04', left_on: '2026-04-05',
        notes: 'Drove north after Etosha to see a different side of Namibia. Local market, affordable guesthouse.',
        cost: 800,
        entries: [
          { id: 20, body: 'Oshakati market — fresh produce, homemade goods, brilliant chaos.', image: IMG.market, video: null },
          { id: 21, body: 'Stayed in a local family guesthouse. N$380 a night. Breakfast included.', image: IMG.village, video: null },
        ],
      },
    ],
    costs: [
      { category: 'transport', amount: 1800, note: 'Car hire (5 days, compact 4×4) + fuel' },
      { category: 'stay', amount: 2400, note: 'NWR rest camps + Oshakati guesthouse' },
      { category: 'food', amount: 1200, note: 'Self-catered + 2 camp dinners' },
      { category: 'activity', amount: 600, note: 'Park entry fees (5 days)' },
      { category: 'other', amount: 200, note: 'Supplies' },
    ],
  },
  {
    id: 1005,
    author: { username: 'tumi_roams', display_name: 'Tumi R.', avatar: AV.t },
    title: 'Walvis Bay long weekend — kayaking the lagoon',
    summary: 'Three days, mostly water. Kayaked with flamingos, did a boat tour to the seals, ate oysters fresh off the farm. Total spend N$2,900.',
    cover_image: IMG.kayak,
    starts_on: '2026-03-28',
    ends_on: '2026-03-30',
    countries: ['NA'],
    transport_modes: ['car', 'boat'],
    party: 'couple',
    tags: ['coast', 'kayaking', 'weekend', 'food', 'flamingos'],
    total_cost: 2900,
    currency: 'NAD',
    days: 3,
    likes_count: 54,
    saves_count: 29,
    comments_count: 11,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 11, order: 0, place_name: 'Walvis Bay', country_code: 'NA', region: 'Erongo',
        arrived_on: '2026-03-28', left_on: '2026-03-30',
        notes: 'Drove from Windhoek on Friday afternoon, 4 hours. Easy drive. Stayed in a self-catering flat near the lagoon — N$650/night.',
        cost: 2900,
        entries: [
          { id: 22, body: 'Kayaking with flamingos at sunrise. Pink birds literally all around you. Surreal.', image: IMG.kayak, video: null },
          { id: 23, body: 'Oyster farm tour — N$180 per person, you eat as many as you want fresh from the water.', image: IMG.food, video: null },
          { id: 24, body: 'Pelican Point boat tour. Jackass penguins and thousands of cape fur seals.', image: IMG.seal, video: null },
          { id: 25, body: 'Evening at the fishing harbour — casual sundowner, fresh fish, cold beer.', image: IMG.coast, video: null },
        ],
      },
    ],
    costs: [
      { category: 'transport', amount: 600, note: 'Fuel both ways (Windhoek–Walvis)' },
      { category: 'stay', amount: 1300, note: 'Self-catering flat, 2 nights' },
      { category: 'food', amount: 550, note: 'Meals + oyster farm' },
      { category: 'activity', amount: 360, note: 'Kayak hire + Pelican Point boat tour' },
      { category: 'other', amount: 90, note: 'Misc' },
    ],
  },
  {
    id: 1006,
    author: { username: 'desert_lens', display_name: 'Nadia F.', avatar: AV.p },
    title: 'Spitzkoppe & Damaraland — 4 days by 4×4',
    summary: 'Granite peaks, desert camps, and quiet gravel roads north of Usakos. A compact loop for photographers and campers.',
    cover_image: IMG.dunes,
    starts_on: '2026-04-12',
    ends_on: '2026-04-15',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'couple',
    tags: ['4x4', 'photography', 'dunes', 'weekend'],
    total_cost: 4800,
    currency: 'NAD',
    days: 4,
    likes_count: 63,
    saves_count: 34,
    comments_count: 9,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 26, order: 0, place_name: 'Spitzkoppe', country_code: 'NA', region: 'Erongo',
        arrived_on: '2026-04-12', left_on: '2026-04-14',
        notes: 'Camp under the granite dome. Sunrise climb on day two.',
        cost: 2200,
        entries: [{ id: 26, body: 'Milky Way from camp — no light pollution.', image: IMG.stars, video: null }],
      },
      {
        id: 27, order: 1, place_name: 'Twyfelfontein', country_code: 'NA', region: 'Kunene',
        arrived_on: '2026-04-14', left_on: '2026-04-15',
        notes: 'Rock engravings in the morning, back to Swakop same day.',
        cost: 1400,
        entries: [],
      },
    ],
    costs: [
      { category: 'transport', amount: 1400, note: '4×4 hire + fuel' },
      { category: 'stay', amount: 1800, note: 'Camps (2 nights)' },
      { category: 'food', amount: 900, note: 'Self-catered' },
      { category: 'activity', amount: 500, note: 'Park and camp fees' },
      { category: 'other', amount: 200, note: 'Supplies' },
    ],
  },
  {
    id: 1007,
    author: { username: 'roadtrip_nam', display_name: 'Jonas M.', avatar: AV.m },
    title: 'Windhoek to Gobabis — budget weekend',
    summary: 'Two nights out east on a shoestring: guesthouse, market stops, and open road. Under N$1.5k total.',
    cover_image: IMG.road,
    starts_on: '2026-05-02',
    ends_on: '2026-05-04',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'solo',
    tags: ['budget', 'weekend', 'solo'],
    total_cost: 1450,
    currency: 'NAD',
    days: 3,
    likes_count: 41,
    saves_count: 28,
    comments_count: 6,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 28, order: 0, place_name: 'Gobabis', country_code: 'NA', region: 'Omaheke',
        arrived_on: '2026-05-02', left_on: '2026-05-04',
        notes: 'Friday leave Windhoek, Sunday back. Cheap guesthouse, local braai.',
        cost: 1450,
        entries: [{ id: 28, body: 'B1 there and back — tar all the way.', image: IMG.road, video: null }],
      },
    ],
    costs: [
      { category: 'transport', amount: 450, note: 'Fuel' },
      { category: 'stay', amount: 520, note: 'Guesthouse 2 nights' },
      { category: 'food', amount: 380, note: 'Meals' },
      { category: 'activity', amount: 50, note: 'Market' },
      { category: 'other', amount: 50, note: 'Misc' },
    ],
  },
  {
    id: 1008,
    author: { username: 'coast_hopper', display_name: 'Lena V.', avatar: AV.t },
    title: 'Lüderitz & Kolmanskop ghost town',
    summary: 'Atlantic coast, art deco harbour, and sunrise at the abandoned diamond town. Four days from Windhoek.',
    cover_image: IMG.coast,
    starts_on: '2026-06-01',
    ends_on: '2026-06-04',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'couple',
    tags: ['coast', 'photography', 'weekend'],
    total_cost: 5100,
    currency: 'NAD',
    days: 4,
    likes_count: 72,
    saves_count: 45,
    comments_count: 14,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 29, order: 0, place_name: 'Lüderitz', country_code: 'NA', region: 'ǁKaras',
        arrived_on: '2026-06-01', left_on: '2026-06-03',
        notes: 'Harbour walks, fresh fish, cold Benguela breeze.',
        cost: 3200,
        entries: [{ id: 29, body: 'Pelicans on the waterfront at dusk.', image: IMG.coast, video: null }],
      },
      {
        id: 30, order: 1, place_name: 'Kolmanskop', country_code: 'NA', region: 'ǁKaras',
        arrived_on: '2026-06-03', left_on: '2026-06-04',
        notes: 'Permit booked online. Sunrise tour — sand in the rooms.',
        cost: 900,
        entries: [{ id: 30, body: 'Blue-hour shots before the tour buses arrive.', image: IMG.dunes, video: null }],
      },
    ],
    costs: [
      { category: 'transport', amount: 1800, note: 'Fuel + car' },
      { category: 'stay', amount: 1900, note: 'Guesthouse' },
      { category: 'food', amount: 900, note: 'Meals' },
      { category: 'activity', amount: 400, note: 'Kolmanskop permit + tour' },
      { category: 'other', amount: 100, note: 'Misc' },
    ],
  },
  {
    id: 1009,
    author: { username: 'family_roads', display_name: 'The Dube Family', avatar: AV.k },
    title: 'Family loop: Windhoek, Otjiwarongo, Waterberg',
    summary: 'Kid-friendly lodges, short driving days, and a rhino walk at Waterberg. Six days with two children.',
    cover_image: IMG.lodge,
    starts_on: '2026-07-10',
    ends_on: '2026-07-15',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'family',
    tags: ['family', 'wildlife', '4x4'],
    total_cost: 11200,
    currency: 'NAD',
    days: 6,
    likes_count: 38,
    saves_count: 21,
    comments_count: 8,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 31, order: 0, place_name: 'Otjiwarongo', country_code: 'NA', region: 'Otjozondjupa',
        arrived_on: '2026-07-10', left_on: '2026-07-12',
        notes: 'Cheetah sanctuary half-day — book morning slot.',
        cost: 4200,
        entries: [{ id: 31, body: 'Kids loved the cheetah feed.', image: IMG.safari, video: null }],
      },
      {
        id: 32, order: 1, place_name: 'Waterberg Plateau', country_code: 'NA', region: 'Otjozondjupa',
        arrived_on: '2026-07-12', left_on: '2026-07-15',
        notes: 'Plateau lodge, guided rhino walk, pool afternoons.',
        cost: 5200,
        entries: [{ id: 32, body: 'Rhino track at dawn — quiet and close.', image: IMG.elephant, video: null }],
      },
    ],
    costs: [
      { category: 'transport', amount: 2200, note: 'SUV hire + fuel' },
      { category: 'stay', amount: 5800, note: 'Lodges' },
      { category: 'food', amount: 2200, note: 'Meals' },
      { category: 'activity', amount: 800, note: 'Sanctuary + rhino walk' },
      { category: 'other', amount: 200, note: 'Snacks and supplies' },
    ],
  },
  {
    id: 1010,
    author: { username: 'trail_sam', display_name: 'Sam O.', avatar: AV.s },
    title: 'Waterberg to Grootfontein — hiking & lodges',
    summary: 'Plateau trails, fossil stops, and comfortable lodges. Five days mixing walks and easy drives.',
    cover_image: IMG.hike,
    starts_on: '2026-08-05',
    ends_on: '2026-08-09',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'solo',
    tags: ['hiking', 'wildlife', 'solo'],
    total_cost: 6800,
    currency: 'NAD',
    days: 5,
    likes_count: 29,
    saves_count: 17,
    comments_count: 4,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 33, order: 0, place_name: 'Waterberg Plateau Park', country_code: 'NA', region: 'Otjozondjupa',
        arrived_on: '2026-08-05', left_on: '2026-08-07',
        notes: 'Guided hikes only on plateau — book ahead.',
        cost: 3400,
        entries: [{ id: 33, body: 'Rim trail at sunrise — mist in the valleys.', image: IMG.hike, video: null }],
      },
      {
        id: 34, order: 1, place_name: 'Grootfontein', country_code: 'NA', region: 'Otjozondjupa',
        arrived_on: '2026-08-07', left_on: '2026-08-09',
        notes: 'Hoba meteorite stop, craft market, overnight before heading north.',
        cost: 1800,
        entries: [],
      },
    ],
    costs: [
      { category: 'transport', amount: 1600, note: 'Car + fuel' },
      { category: 'stay', amount: 3200, note: 'Lodges' },
      { category: 'food', amount: 1200, note: 'Meals' },
      { category: 'activity', amount: 600, note: 'Hikes and park fees' },
      { category: 'other', amount: 200, note: 'Misc' },
    ],
  },
  {
    id: 1011,
    author: { username: 'market_days', display_name: 'Zara H.', avatar: AV.p },
    title: 'Oshakati & northern towns — local markets',
    summary: 'A slower north: markets, guesthouses, and meeting locals. Budget-friendly and far from the tourist highway.',
    cover_image: IMG.market,
    starts_on: '2026-09-01',
    ends_on: '2026-09-04',
    countries: ['NA'],
    transport_modes: ['car', 'bus'],
    party: 'solo',
    tags: ['budget', 'first-timer', 'solo'],
    total_cost: 1900,
    currency: 'NAD',
    days: 4,
    likes_count: 47,
    saves_count: 31,
    comments_count: 12,
    liked_by_me: false,
    saved_by_me: false,
    stops: [
      {
        id: 35, order: 0, place_name: 'Oshakati', country_code: 'NA', region: 'Oshana',
        arrived_on: '2026-09-01', left_on: '2026-09-03',
        notes: 'Open market Saturday, guesthouse N$380/night.',
        cost: 1100,
        entries: [{ id: 35, body: 'Oshikandela and vetkoek at the market — under N$80.', image: IMG.market, video: null }],
      },
      {
        id: 36, order: 1, place_name: 'Ondangwa', country_code: 'NA', region: 'Oshana',
        arrived_on: '2026-09-03', left_on: '2026-09-04',
        notes: 'Short hop north, airport town, one night.',
        cost: 800,
        entries: [],
      },
    ],
    costs: [
      { category: 'transport', amount: 500, note: 'Bus + local rides' },
      { category: 'stay', amount: 720, note: 'Guesthouses' },
      { category: 'food', amount: 480, note: 'Market food' },
      { category: 'activity', amount: 100, note: 'Sundries' },
      { category: 'other', amount: 100, note: 'Misc' },
    ],
  },
  {
    id: 1012,
    author: { username: 'sunset_4x4', display_name: 'Chris L.', avatar: AV.m },
    title: 'NamibRand & Sesriem — desert nights',
    summary: 'Dark-sky reserve, dune afternoons, and camp cooking. A five-day desert escape for couples who love silence.',
    cover_image: IMG.camp,
    starts_on: '2026-10-03',
    ends_on: '2026-10-07',
    countries: ['NA'],
    transport_modes: ['car'],
    party: 'couple',
    tags: ['4x4', 'dunes', 'photography', 'weekend'],
    total_cost: 9200,
    currency: 'NAD',
    days: 5,
    likes_count: 91,
    saves_count: 52,
    comments_count: 19,
    liked_by_me: true,
    saved_by_me: false,
    stops: [
      {
        id: 37, order: 0, place_name: 'NamibRand Nature Reserve', country_code: 'NA', region: 'Hardap',
        arrived_on: '2026-10-03', left_on: '2026-10-05',
        notes: 'Reserve permit required. No self-drive off marked tracks.',
        cost: 4800,
        entries: [{ id: 37, body: 'Sunset over the gravel plains — gold for an hour.', image: IMG.sunset, video: null }],
      },
      {
        id: 38, order: 1, place_name: 'Sesriem / Sossusvlei', country_code: 'NA', region: 'Hardap',
        arrived_on: '2026-10-05', left_on: '2026-10-07',
        notes: 'Gate before dawn for Dune 45. Camp at Sesriem.',
        cost: 3200,
        entries: [{ id: 38, body: 'Dead Vlei in late afternoon light.', image: IMG.dunes, video: null }],
      },
    ],
    costs: [
      { category: 'transport', amount: 2200, note: '4×4 + fuel' },
      { category: 'stay', amount: 3800, note: 'Camps' },
      { category: 'food', amount: 1600, note: 'Self-catered' },
      { category: 'activity', amount: 1200, note: 'Permits and park fees' },
      { category: 'other', amount: 400, note: 'Supplies' },
    ],
  },
]
