/**
 * Idempotent marketing/demo Journeys for Delve Journeys page.
 *
 * Identify: Created under specific preview/marketing creator usernames:
 * - amara_n, liam_k, nandi_m, daniel_m, tuli_m
 *
 * Run: pnpm tsx scripts/seed-marketing-journeys.ts
 * Teardown: pnpm tsx scripts/seed-marketing-journeys.ts --cleanup
 */
import { prisma } from '@delve/database'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { JourneyPartyType, CreateJourneyBody } from '@delve/contracts'

function loadEnvFiles() {
  const here = fileURLToPath(new URL('.', import.meta.url))
  for (const rel of ['../../packages/database/.env', '../.env', '../../.env']) {
    const path = resolve(here, rel)
    if (existsSync(path) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(path)
    }
  }
}
loadEnvFiles()

const CREATORS = [
  { id: 'mkuser_amara', username: 'amara_n', displayName: 'Amara N.', email: 'amara.n@delve.internal' },
  { id: 'mkuser_liam', username: 'liam_k', displayName: 'Liam K.', email: 'liam.k@delve.internal' },
  { id: 'mkuser_nandi', username: 'nandi_m', displayName: 'Nandi M.', email: 'nandi.m@delve.internal' },
  { id: 'mkuser_daniel', username: 'daniel_m', displayName: 'Daniel M.', email: 'daniel.m@delve.internal' },
  { id: 'mkuser_tuli', username: 'tuli_m', displayName: 'Tuli M.', email: 'tuli.m@delve.internal' },
]

type JourneySeed = {
  slug: string
  title: string
  summary: string
  coverUrl: string
  startPlace: string
  endPlace: string
  countries: string[]
  durationDays: number
  transportModes: string[]
  historicalCost: string
  currency: string
  partyType: JourneyPartyType
  tags: string[]
  takeaway: string
  creatorUsername: string
  stops: CreateJourneyBody['stops']
}

const JOURNEYS: JourneySeed[] = [
  {
    slug: 'weekend-in-swakopmund',
    title: 'A Weekend in Swakopmund',
    summary: 'A quick escape from Windhoek — good food, ocean views, and a little adventure along the coast.',
    coverUrl: 'https://images.unsplash.com/photo-1547190027-915990683905?w=1200&h=800&fit=crop&q=80',
    startPlace: 'Windhoek',
    endPlace: 'Windhoek',
    countries: ['Namibia'],
    durationDays: 3,
    transportModes: ['Car rental', 'On foot'],
    historicalCost: '4500',
    currency: 'N$',
    partyType: 'COUPLE',
    tags: ['coast', 'adventure', 'food', 'nature'],
    takeaway: 'Pack layers because the coast gets cold, and book Sandwich Harbour activities in advance.',
    creatorUsername: 'amara_n',
    stops: [
      {
        place: 'Windhoek to Swakopmund',
        region: 'Khomas',
        arrivalDay: 1,
        durationDays: 1,
        notes: 'Departed Windhoek early morning. Drove along the B2 highway as the landscape transition into sand dunes. Checked in at our hotel, walked along the iconic jetty at sunset, and had fresh oysters for dinner.',
        highlights: ['Road trip from Windhoek', 'Hotel check-in', 'Sunset jetty walk', 'Seafood dinner'],
        mediaUrls: ['https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
        transportModeToNext: 'Car rental',
        transportDurationToNext: '4 hrs',
      },
      {
        place: 'Sandwich Harbour',
        region: 'Erongo',
        arrivalDay: 2,
        durationDays: 1,
        notes: 'An incredible adventure where the dunes meet the ocean. Took a guided 4x4 desert drive down steep sand slopes, enjoyed a lunch picnic on the dunes, and got some amazing landscape photos.',
        highlights: ['4x4 desert adventure', 'Sandwich Harbour lagoon', 'Picnic lunch on dunes', 'Dune photography'],
        mediaUrls: ['https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
        transportModeToNext: 'Car rental',
        transportDurationToNext: '45 min',
      },
      {
        place: 'Swakopmund town center',
        region: 'Erongo',
        arrivalDay: 3,
        durationDays: 1,
        notes: 'A slow morning enjoying coffee and breakfast at a local cafe. Took a beach walk before exploring the colonial German architecture and driving back to Windhoek.',
        highlights: ['Slow breakfast', 'Coastal beach walk', 'Explore town center', 'Drive back to Windhoek'],
        mediaUrls: ['https://images.unsplash.com/photo-1547190027-915990683905?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
    ],
  },
  {
    slug: '5-days-in-cape-town',
    title: '5 Days in Cape Town',
    summary: 'First time in Cape Town. A mix of food, beaches, sightseeing and way too many photos.',
    coverUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&h=800&fit=crop&q=80',
    startPlace: 'Cape Town',
    endPlace: 'Cape Town',
    countries: ['South Africa'],
    durationDays: 5,
    transportModes: ['Uber', 'On foot'],
    historicalCost: '7200',
    currency: 'ZAR',
    partyType: 'SOLO',
    tags: ['city', 'beach', 'food', 'nature'],
    takeaway: 'Use Uber to get around easily and check the weather forecast daily before visiting Table Mountain.',
    creatorUsername: 'liam_k',
    stops: [
      {
        place: 'V&A Waterfront',
        region: 'Western Cape',
        arrivalDay: 1,
        durationDays: 1,
        notes: 'Arrived at the airport, checked into the hotel, and walked down to the harbor for dinner by the water.',
        highlights: ['Arrival', 'Hotel check-in', 'V&A Waterfront walk', 'Harbor dinner'],
        mediaUrls: ['https://images.unsplash.com/photo-1576485264979-4d6934c1b183?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Table Mountain & Camps Bay',
        region: 'Western Cape',
        arrivalDay: 2,
        durationDays: 1,
        notes: 'Woke up early to take the Cableway up Table Mountain for epic views. Headed down to Camps Bay for beach walking, coffee, and watching the sunset.',
        highlights: ['Table Mountain views', 'Camps Bay beach', 'Sunset coffee'],
        mediaUrls: ['https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Boulders Beach & Cape Point',
        region: 'Western Cape',
        arrivalDay: 3,
        durationDays: 1,
        notes: 'Drove out to Simon\'s Town to see the African penguins at Boulders Beach, went hiking at Cape Point, and finished with fresh seafood.',
        highlights: ['Boulders Beach penguins', 'Cape Point hike', 'Seafood lunch'],
        mediaUrls: ['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Stellenbosch Winelands',
        region: 'Western Cape',
        arrivalDay: 4,
        durationDays: 1,
        notes: 'Drove through Stellenbosch for a relaxing lunch and wine tasting session surrounded by green mountain scenery.',
        highlights: ['Wine tasting', 'Scenic winelands drive', 'Vineyard lunch'],
        mediaUrls: ['https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'V&A Waterfront to Airport',
        region: 'Western Cape',
        arrivalDay: 5,
        durationDays: 1,
        notes: 'Final breakfast overlooking the harbor, quick packing session, and headed out for departure.',
        highlights: ['Harbor breakfast', 'Packing', 'Departure'],
        mediaUrls: ['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
    ],
  },
  {
    slug: 'zanzibar-with-the-girls',
    title: 'Zanzibar With The Girls',
    summary: 'A few days of sunshine, ocean views, good food and exploring somewhere completely new.',
    coverUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200&h=800&fit=crop&q=80',
    startPlace: 'Zanzibar',
    endPlace: 'Zanzibar',
    countries: ['Tanzania'],
    durationDays: 4,
    transportModes: ['Taxi', 'On foot'],
    historicalCost: '8500',
    currency: 'USD',
    partyType: 'FRIENDS',
    tags: ['beach', 'nature', 'food', 'culture'],
    takeaway: 'Make sure to bring cash (USD) since card payments aren\'t accepted everywhere, and dress modestly in Stone Town.',
    creatorUsername: 'nandi_m',
    stops: [
      {
        place: 'Nungwi Beach',
        region: 'Zanzibar North',
        arrivalDay: 1,
        durationDays: 1,
        notes: 'Arrived at the hotel and spent the afternoon relaxedly swimming in the crystal clear water and watching the dhow boats pass by.',
        highlights: ['Beach afternoon', 'Poolside mocktails', 'Sunset views'],
        mediaUrls: ['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Mnemba Atoll Snorkeling',
        region: 'Zanzibar East',
        arrivalDay: 2,
        durationDays: 1,
        notes: 'Booked a private boat trip to snorkel in the vibrant coral reef around Mnemba Atoll. Saw dolphins and had a local seafood lunch on the beach.',
        highlights: ['Snorkeling reef', 'Dolphin spotting', 'Grilled fish lunch'],
        mediaUrls: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Stone Town',
        region: 'Zanzibar Urban',
        arrivalDay: 3,
        durationDays: 1,
        notes: 'Walked the labyrinth of historic streets, visited local cafes, and bought fresh spices at the market.',
        highlights: ['Historic Stone Town architecture', 'Local coffee shop', 'Spice market shopping'],
        mediaUrls: ['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
      {
        place: 'Zanzibar Beach & Airport',
        region: 'Zanzibar Urban',
        arrivalDay: 4,
        durationDays: 1,
        notes: 'Took a few final travel photos on the beach during a slow morning walk, packed up, and left for the airport.',
        highlights: ['Beach walk', 'Photo session', 'Departure'],
        mediaUrls: ['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
    ],
  },
  {
    slug: 'desert-escape-sossusvlei',
    title: 'Desert Escape — Sossusvlei',
    summary: 'A short desert escape for sunrise, massive dunes and a much-needed break from the city.',
    coverUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&h=800&fit=crop&q=80',
    startPlace: 'Sossusvlei',
    endPlace: 'Sossusvlei',
    countries: ['Namibia'],
    durationDays: 2,
    transportModes: ['Car rental'],
    historicalCost: '3200',
    currency: 'N$',
    partyType: 'SOLO',
    tags: ['nature', 'adventure', 'desert'],
    takeaway: 'Waking up early is essential. The colors on the dunes at first light are unmatched.',
    creatorUsername: 'daniel_m',
    stops: [
      {
        place: 'Sossusvlei Desert Lodge',
        region: 'Hardap',
        arrivalDay: 1,
        durationDays: 1,
        notes: 'Drove through Spreetshoogte Pass from Windhoek. Checked into the lodge and climbed the surrounding dunes for sunset stargazing.',
        highlights: ['Scenic desert drive', 'Lodge check-in', 'Sunset dune climb', 'Stargazing'],
        mediaUrls: ['https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
        transportModeToNext: 'Car rental',
        transportDurationToNext: '1 hr',
      },
      {
        place: 'Deadvlei & Sossusvlei Dunes',
        region: 'Hardap',
        arrivalDay: 2,
        durationDays: 1,
        notes: 'Woke up at 5:00 AM to see sunrise over Dune 45. Walked to the surreal clay pan of Deadvlei to capture the iconic dark trees before driving back to Windhoek.',
        highlights: ['Sunrise on Dune 45', 'Deadvlei clay pan hike', 'Landscape photography'],
        mediaUrls: ['https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
    ],
  },
  {
    slug: 'saturday-in-windhoek',
    title: 'Saturday in Windhoek',
    summary: 'Sometimes you don\'t need to leave the city to have a good day.',
    coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=800&fit=crop&q=80',
    startPlace: 'Windhoek',
    endPlace: 'Windhoek',
    countries: ['Namibia'],
    durationDays: 1,
    transportModes: ['On foot', 'Taxi'],
    historicalCost: '600',
    currency: 'N$',
    partyType: 'FRIENDS',
    tags: ['city', 'food', 'local'],
    takeaway: 'Windhoek\'s cafe scene is fantastic. Try to sit outside in the shade.',
    creatorUsername: 'tuli_m',
    stops: [
      {
        place: 'Windhoek Central',
        region: 'Khomas',
        arrivalDay: 1,
        durationDays: 1,
        notes: 'Started the morning with a flat white and pastries at a local cafe. Walked around downtown for some shopping, met friends for lunch, and capped off the day with live music and drinks at a local hotspot.',
        highlights: ['Morning coffee & breakfast', 'Shopping & lunch with friends', 'Live music & drinks'],
        mediaUrls: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80'],
        mediaResourceTypes: ['image'],
      },
    ],
  },
]

async function cleanup() {
  const creatorIds = CREATORS.map(c => c.id)
  
  // 1. Delete matching journeys
  await prisma.journey.deleteMany({
    where: {
      authorId: { in: creatorIds },
    },
  })
  
  // 2. Delete traveler profiles
  await prisma.travelerProfile.deleteMany({
    where: {
      userId: { in: creatorIds },
    },
  })

  // 3. Delete users
  await prisma.user.deleteMany({
    where: {
      id: { in: creatorIds },
    },
  })

  console.log(`Cleaned up ${CREATORS.length} marketing creators and their journeys.`)
}

async function seed() {
  // 1. Create or update marketing users
  const creatorMap: Record<string, string> = {}
  
  for (const c of CREATORS) {
    const existing = await prisma.user.findUnique({
      where: { id: c.id },
    })

    if (!existing) {
      await prisma.user.create({
        data: {
          id: c.id,
          email: c.email,
          username: c.username,
          usernameNormalized: c.username,
          passwordHash: '$2a$10$UncLeThIsIsAFaKePaSsWoRdHaShFoRSeEdInG', // placeholder
          emailVerifiedAt: new Date(),
          accountStatus: 'active',
          role: 'traveler',
          travelerProfile: {
            create: {
              displayName: c.displayName,
              onboardingStatus: 'COMPLETED',
              onboardingCompletedAt: new Date(),
            },
          },
        },
      })
    } else {
      // Ensure profile exists
      const profile = await prisma.travelerProfile.findUnique({
        where: { userId: c.id },
      })
      if (!profile) {
        await prisma.travelerProfile.create({
          data: {
            userId: c.id,
            displayName: c.displayName,
            onboardingStatus: 'COMPLETED',
            onboardingCompletedAt: new Date(),
          },
        })
      }
    }
    creatorMap[c.username] = c.id
  }

  // 2. Insert journeys
  for (const s of JOURNEYS) {
    const authorId = creatorMap[s.creatorUsername]
    if (!authorId) continue

    // Cleanup existing journey with this slug
    await prisma.journey.deleteMany({
      where: { slug: s.slug },
    })

    await prisma.journey.create({
      data: {
        slug: s.slug,
        authorId,
        title: s.title,
        summary: s.summary,
        coverUrl: s.coverUrl,
        coverResourceType: 'image',
        startPlace: s.startPlace,
        endPlace: s.endPlace,
        countries: s.countries,
        durationDays: s.durationDays,
        transportModes: s.transportModes,
        historicalCost: s.historicalCost,
        currency: s.currency,
        partyType: s.partyType,
        tags: s.tags,
        visibility: 'PUBLIC',
        takeaway: s.takeaway,
        publishedAt: new Date(),
        stops: {
          create: s.stops.map((stop, i) => ({
            sortOrder: i + 1,
            place: stop.place,
            region: stop.region || '',
            arrivalDay: stop.arrivalDay || i + 1,
            durationDays: stop.durationDays || 1,
            notes: stop.notes || '',
            highlights: stop.highlights || [],
            mediaUrls: stop.mediaUrls || [],
            mediaResourceTypes: stop.mediaResourceTypes || [],
            transportModeToNext: stop.transportModeToNext ?? null,
            transportDurationToNext: stop.transportDurationToNext ?? null,
            transportNotes: stop.transportNotes ?? null,
            historicalCostHint: stop.historicalCostHint ?? null,
          })),
        },
      },
    })
  }

  console.log(`Seeded ${JOURNEYS.length} marketing journeys successfully.`)
  for (const j of JOURNEYS) {
    console.log(`  - ${j.title} (@${j.creatorUsername})`)
  }
}

const cleanupFlag = process.argv.includes('--cleanup')
const task = cleanupFlag ? cleanup() : seed()
task
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
