/**
 * Idempotent marketing-preview Deals for the live Deals page.
 *
 * Identify: Business.slug starts with delve-preview-
 * Cleanup: pnpm db:seed:marketing-deals:cleanup
 *
 * These offers are visible but cannot be claimed, booked, or paid.
 */
import bcrypt from 'bcryptjs'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '@delve/database'
import { computeDealPrice, computedPriceToDto } from '../src/modules/deal/deal-pricing.js'
import { DELVE_PREVIEW_SLUG_PREFIX } from '../src/modules/deal/preview-deal.js'

function loadEnvFiles() {
  const here = fileURLToPath(new URL('.', import.meta.url))
  for (const rel of ['../../packages/database/.env', '../.env', '../../.env']) {
    const path = resolve(here, rel)
    if (existsSync(path) && typeof process.loadEnvFile === 'function') process.loadEnvFile(path)
  }
}
loadEnvFiles()

const SEED_USER_ID = 'dpuser_marketing_media'
const SEED_EMAIL = 'preview-seed@delve.internal'

type Discount =
  | { discountType: 'PERCENTAGE'; discountValue: number }
  | { discountType: 'FIXED_AMOUNT'; discountValue: number }

type DealSeed = {
  key: string
  featuredRank: number | null
  business: {
    name: string
    slug: string
    category: string
    description: string
    city: string
    countryCode: string
  }
  listing: { title: string; description: string; priceAmount: string; currency: string }
  deal: {
    title: string
    description: string
    category: string
    endDate: string
    terms: string
    included: string
    excluded: string
  } & Discount
  image: { url: string; alt: string }
}

const START = new Date('2026-08-20T08:00:00.000Z')

const DEALS: DealSeed[] = [
  {
    key: 'copper-dinner',
    featuredRank: null,
    business: {
      name: 'The Copper Table',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}copper-table`,
      category: 'Food & Drink',
      description: 'A Windhoek dining room built around seasonal Namibian produce and a warm evening table.',
      city: 'Windhoek',
      countryCode: 'NA',
    },
    listing: {
      title: 'Dinner for Two Experience',
      description: 'A shared evening food experience for two in Windhoek, with a seasonal set table.',
      priceAmount: '520.00',
      currency: 'NAD',
    },
    deal: {
      title: '20% Off Dinner for Two',
      description:
        'Enjoy an evening dining experience in Windhoek with a special Delve preview offer for two. A food and drink evening in the capital.',
      category: 'Food & Drink',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      endDate: '2026-09-15T21:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Dinner experience for two as described by the host.',
      excluded: 'Drinks, transport, and gratuities unless stated by the host.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80',
      alt: 'Restaurant dinner table',
    },
  },
  {
    key: 'desert-quad',
    featuredRank: null,
    business: {
      name: 'Desert Sky Adventures',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}desert-sky`,
      category: 'Things to Do',
      description: 'Guided dune adventures on the Swakopmund coast, built for travelers who want sand, wind, and big sky.',
      city: 'Swakopmund',
      countryCode: 'NA',
    },
    listing: {
      title: 'Desert Quad Bike Adventure',
      description: 'A guided quad bike adventure across the dunes outside Swakopmund.',
      priceAmount: '900.00',
      currency: 'NAD',
    },
    deal: {
      title: '15% Off Desert Quad Biking',
      description: 'Explore the dunes outside Swakopmund on an unforgettable desert adventure.',
      category: 'Things to Do',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      endDate: '2026-09-22T18:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability and weather. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Guided quad bike adventure as described.',
      excluded: 'Personal insurance, photos packages, and hotel transfers unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1400&q=80',
      alt: 'Namib desert dunes',
    },
  },
  {
    key: 'walvis-catamaran',
    featuredRank: null,
    business: {
      name: 'Dune & Tide Experiences',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}dune-tide`,
      category: 'Experiences',
      description: 'Coastal outings from Walvis Bay, from morning water time to quiet harbour views.',
      city: 'Walvis Bay',
      countryCode: 'NA',
    },
    listing: {
      title: 'Morning Catamaran Experience',
      description: 'A scenic morning catamaran experience on the Walvis Bay coastline.',
      priceAmount: '1050.00',
      currency: 'NAD',
    },
    deal: {
      title: 'Save NAD 150 on a Catamaran Experience',
      description: 'Spend the morning exploring the Walvis Bay coastline on a scenic catamaran experience.',
      category: 'Experiences',
      discountType: 'FIXED_AMOUNT',
      discountValue: 150,
      endDate: '2026-09-30T16:00:00.000Z',
      terms: 'Advance reservation required. Subject to sea conditions. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Morning catamaran outing as described.',
      excluded: 'Hotel collection and extra refreshments unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80',
      alt: 'Catamaran on open water',
    },
  },
  {
    key: 'etosha-drive',
    featuredRank: null,
    business: {
      name: 'Savanna Trails',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}savanna-trails`,
      category: 'Tours',
      description: 'Small-group wildlife tours around Etosha, paced for travelers who want time at the waterholes.',
      city: 'Etosha',
      countryCode: 'NA',
    },
    listing: {
      title: 'Etosha Guided Game Drive',
      description: 'A guided game drive through Etosha with a focus on wildlife viewing.',
      priceAmount: '1450.00',
      currency: 'NAD',
    },
    deal: {
      title: '20% Off an Etosha Game Drive',
      description: 'Discover Etosha with a guided wildlife tour designed for travelers who want more from their trip.',
      category: 'Tours',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      endDate: '2026-10-08T18:00:00.000Z',
      terms: 'Advance reservation required. Subject to park access and availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Guided game drive as described.',
      excluded: 'Park fees, meals, and overnight stay unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
      alt: 'Wildlife on an African savanna',
    },
  },
  {
    key: 'moonrise-stay',
    featuredRank: 2,
    business: {
      name: 'Moonrise Desert Lodge',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}moonrise-lodge`,
      category: 'Stays',
      description: 'A quiet desert stay near Sossusvlei, shaped around sunrise light and wide horizons.',
      city: 'Sossusvlei',
      countryCode: 'NA',
    },
    listing: {
      title: 'Desert Escape Stay',
      description: 'An overnight desert stay near the Sossusvlei dunes.',
      priceAmount: '1600.00',
      currency: 'NAD',
    },
    deal: {
      title: '25% Off a Desert Escape',
      description: 'Wake up surrounded by desert landscapes with a special Delve preview stay offer.',
      category: 'Stays',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      endDate: '2026-10-15T12:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Overnight stay as described.',
      excluded: 'Meals, transfers, and park entry unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80',
      alt: 'Desert lodge at dusk',
    },
  },
  {
    key: 'sossusvlei-sunrise',
    featuredRank: 1,
    business: {
      name: 'Wild Horizon Tours',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}wild-horizon`,
      category: 'Tours',
      description: 'Sunrise tours into the Sossusvlei dunes, timed for first light on the sand.',
      city: 'Sossusvlei',
      countryCode: 'NA',
    },
    listing: {
      title: 'Sossusvlei Sunrise Tour',
      description: 'A guided sunrise tour into Sossusvlei, built around the first light on the dunes.',
      priceAmount: '1200.00',
      currency: 'NAD',
    },
    deal: {
      title: 'Save 25% on a Sossusvlei Sunrise Tour',
      description:
        'Experience the dunes at sunrise on a guided Sossusvlei tour. This is the desert morning travelers come to Namibia for — quiet sand, long shadows, and a clear start to the day.',
      category: 'Tours',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      endDate: '2026-10-20T12:00:00.000Z',
      terms: 'Advance reservation required. Early start. Subject to weather and park access. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Guided sunrise excursion to Sossusvlei as described.',
      excluded: 'Park fees, meals, and overnight stay unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1400&q=80',
      alt: 'Sunrise light on desert dunes',
    },
  },
  {
    key: 'atlantic-stay',
    featuredRank: null,
    business: {
      name: 'Atlantic Breeze Escapes',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}atlantic-breeze`,
      category: 'Stays',
      description: 'A coastal Swakopmund stay for slow weekends, sea air, and easy walks into town.',
      city: 'Swakopmund',
      countryCode: 'NA',
    },
    listing: {
      title: 'Coastal Weekend Stay',
      description: 'A relaxed weekend stay on the Swakopmund coast.',
      priceAmount: '1350.00',
      currency: 'NAD',
    },
    deal: {
      title: '20% Off Your Coastal Stay',
      description: 'Enjoy a relaxed Swakopmund getaway with a Delve preview stay offer.',
      category: 'Stays',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      endDate: '2026-10-25T12:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Coastal stay as described.',
      excluded: 'Meals and activities unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80',
      alt: 'Coastal hotel terrace',
    },
  },
  {
    key: 'coastal-lunch',
    featuredRank: null,
    business: {
      name: 'Coastal Table',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}coastal-table`,
      category: 'Food & Drink',
      description: 'A Swakopmund lunch table with Atlantic seafood and a simple coastal setting.',
      city: 'Swakopmund',
      countryCode: 'NA',
    },
    listing: {
      title: 'Seafood Lunch Experience',
      description: 'A seafood lunch experience near Namibia’s Atlantic coast.',
      priceAmount: '380.00',
      currency: 'NAD',
    },
    deal: {
      title: 'Save NAD 80 on a Coastal Lunch',
      description: 'A relaxed seafood lunch and food experience near Namibia’s Atlantic coast.',
      category: 'Food & Drink',
      discountType: 'FIXED_AMOUNT',
      discountValue: 80,
      endDate: '2026-08-27T20:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Lunch experience as described.',
      excluded: 'Extra courses and drinks unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80',
      alt: 'Seafood lunch by the coast',
    },
  },
  {
    key: 'cape-sunset',
    featuredRank: 3,
    business: {
      name: 'Cape Horizon Experiences',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}cape-horizon`,
      category: 'Experiences',
      description: 'Water experiences on the Cape Town coastline, timed for late light.',
      city: 'Cape Town',
      countryCode: 'ZA',
    },
    listing: {
      title: 'Sunset Cruise Experience',
      description: 'A sunset cruise experience along the Cape Town coastline.',
      priceAmount: '750.00',
      currency: 'ZAR',
    },
    deal: {
      title: '20% Off a Cape Town Sunset Cruise',
      description: 'Take in Cape Town’s coastline during a sunset experience on the water.',
      category: 'Experiences',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      endDate: '2026-10-31T18:00:00.000Z',
      terms: 'Advance reservation required. Subject to weather. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Sunset cruise experience as described.',
      excluded: 'Hotel transfers and premium drinks unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1400&q=80',
      alt: 'Cape Town at sunset',
    },
  },
  {
    key: 'table-vine',
    featuredRank: null,
    business: {
      name: 'Table & Vine Collective',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}table-vine`,
      category: 'Food & Drink',
      description: 'A Cape Town food and wine table — small plates, local bottles, unhurried evenings.',
      city: 'Cape Town',
      countryCode: 'ZA',
    },
    listing: {
      title: 'Wine & Tapas Experience',
      description: 'A wine and tapas food experience in Cape Town.',
      priceAmount: '680.00',
      currency: 'ZAR',
    },
    deal: {
      title: '15% Off Wine & Tapas',
      description: 'Discover a relaxed Cape Town food and wine experience with a Delve preview offer.',
      category: 'Food & Drink',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      endDate: '2026-10-12T20:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Wine and tapas experience as described.',
      excluded: 'Extra bottles and transport unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=80',
      alt: 'Wine and tapas table',
    },
  },
  {
    key: 'ocean-kayak',
    featuredRank: null,
    business: {
      name: 'Ocean Trail Adventures',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}ocean-trail`,
      category: 'Things to Do',
      description: 'Coastal kayak sessions around Cape Town for travelers who want time on the water.',
      city: 'Cape Town',
      countryCode: 'ZA',
    },
    listing: {
      title: 'Kayak Coastal Experience',
      description: 'A coastal kayak outing near Cape Town.',
      priceAmount: '650.00',
      currency: 'ZAR',
    },
    deal: {
      title: 'Save ZAR 100 on a Coastal Kayak Experience',
      description: 'Paddle a Cape Town coastal kayak experience — an easy adventure on the water.',
      category: 'Things to Do',
      discountType: 'FIXED_AMOUNT',
      discountValue: 100,
      endDate: '2026-09-28T16:00:00.000Z',
      terms: 'Advance reservation required. Subject to sea conditions. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'Kayak experience as described.',
      excluded: 'Photos packages and hotel collection unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1400&q=80',
      alt: 'Sea kayaking along a coast',
    },
  },
  {
    key: 'city-nest',
    featuredRank: null,
    business: {
      name: 'City Nest Escapes',
      slug: `${DELVE_PREVIEW_SLUG_PREFIX}city-nest`,
      category: 'Stays',
      description: 'A boutique city stay in Cape Town for short trips and late dinners nearby.',
      city: 'Cape Town',
      countryCode: 'ZA',
    },
    listing: {
      title: 'Boutique City Stay',
      description: 'A boutique city stay in Cape Town.',
      priceAmount: '1400.00',
      currency: 'ZAR',
    },
    deal: {
      title: '20% Off a Cape Town City Stay',
      description: 'A polished Cape Town city stay with a Delve preview offer.',
      category: 'Stays',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      endDate: '2026-10-18T12:00:00.000Z',
      terms: 'Advance reservation required. Subject to availability. Valid during advertised dates. One offer per traveler. Cannot be exchanged for cash.',
      included: 'City stay as described.',
      excluded: 'Breakfast and parking unless stated.',
    },
    image: {
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      alt: 'Boutique city hotel room',
    },
  },
]

function ids(key: string) {
  return {
    businessId: `dpbiz_${key}`,
    listingId: `dplst_${key}`,
    dealId: `dpdeal_${key}`,
    mediaId: `dpmedia_${key}`,
    publicId: `delve-preview/${key}`,
  }
}

async function ensureSeedUser() {
  const existing = await prisma.user.findUnique({ where: { id: SEED_USER_ID } })
  if (existing) return existing
  const byEmail = await prisma.user.findUnique({ where: { email: SEED_EMAIL } })
  if (byEmail) return byEmail
  const passwordHash = await bcrypt.hash(`preview-${Date.now()}`, 10)
  return prisma.user.create({
    data: {
      id: SEED_USER_ID,
      email: SEED_EMAIL,
      username: 'delve_preview_seed',
      usernameNormalized: 'delve_preview_seed',
      passwordHash,
      emailVerifiedAt: new Date(),
      accountStatus: 'disabled',
      role: 'traveler',
    },
  })
}

async function cleanup() {
  const previewWhere = { slug: { startsWith: DELVE_PREVIEW_SLUG_PREFIX } }
  const businesses = await prisma.business.findMany({
    where: previewWhere,
    select: { id: true },
  })
  const businessIds = businesses.map(b => b.id)
  if (businessIds.length) {
    await prisma.dealReport.deleteMany({ where: { deal: { businessId: { in: businessIds } } } })
    await prisma.deal.updateMany({ where: { businessId: { in: businessIds } }, data: { coverMediaId: null } })
    await prisma.listing.updateMany({ where: { businessId: { in: businessIds } }, data: { coverMediaId: null } })
  }
  await prisma.mediaAsset.deleteMany({ where: { publicId: { startsWith: 'delve-preview/' } } })
  if (businessIds.length) {
    await prisma.deal.deleteMany({ where: { businessId: { in: businessIds } } })
    await prisma.listing.deleteMany({ where: { businessId: { in: businessIds } } })
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } })
  }
  console.log(`Removed ${businessIds.length} preview businesses and related listings/deals/media.`)
}

async function seed() {
  const user = await ensureSeedUser()
  const lines: string[] = []

  for (const row of DEALS) {
    const id = ids(row.key)
    const priced = computedPriceToDto(
      computeDealPrice({
        listingPrice: row.listing.priceAmount,
        listingCurrency: row.listing.currency,
        discountType: row.deal.discountType,
        discountValue: row.deal.discountValue,
        dealCurrency: row.listing.currency,
      }),
    )

    await prisma.business.upsert({
      where: { slug: row.business.slug },
      create: {
        id: id.businessId,
        name: row.business.name,
        slug: row.business.slug,
        description: row.business.description,
        city: row.business.city,
        countryCode: row.business.countryCode,
        category: row.business.category,
        status: 'VERIFIED',
        coverUrl: row.image.url,
      },
      update: {
        name: row.business.name,
        description: row.business.description,
        city: row.business.city,
        countryCode: row.business.countryCode,
        category: row.business.category,
        status: 'VERIFIED',
        coverUrl: row.image.url,
      },
    })

    const business = await prisma.business.findUniqueOrThrow({ where: { slug: row.business.slug } })

    await prisma.listing.upsert({
      where: { id: id.listingId },
      create: {
        id: id.listingId,
        businessId: business.id,
        title: row.listing.title,
        description: row.listing.description,
        status: 'PUBLISHED',
        priceAmount: row.listing.priceAmount,
        currency: row.listing.currency,
      },
      update: {
        title: row.listing.title,
        description: row.listing.description,
        status: 'PUBLISHED',
        priceAmount: row.listing.priceAmount,
        currency: row.listing.currency,
        businessId: business.id,
      },
    })

    await prisma.deal.upsert({
      where: { id: id.dealId },
      create: {
        id: id.dealId,
        businessId: business.id,
        listingId: id.listingId,
        title: row.deal.title,
        description: row.deal.description,
        discountType: row.deal.discountType,
        discountValue: row.deal.discountValue,
        currency: row.listing.currency,
        publishedBasePrice: row.listing.priceAmount,
        publishedCurrency: row.listing.currency,
        startDate: START,
        endDate: new Date(row.deal.endDate),
        status: 'PUBLISHED',
        city: row.business.city,
        countryCode: row.business.countryCode,
        category: row.deal.category,
        featured: row.featuredRank != null,
        featuredRank: row.featuredRank,
        claimMethod: 'IN_APP',
        maxClaims: 0,
        terms: row.deal.terms,
        eligibility: 'Delve preview offer. Not available to claim, book, or pay. Valid during advertised dates.',
        included: row.deal.included,
        excluded: row.deal.excluded,
      },
      update: {
        businessId: business.id,
        listingId: id.listingId,
        title: row.deal.title,
        description: row.deal.description,
        discountType: row.deal.discountType,
        discountValue: row.deal.discountValue,
        currency: row.listing.currency,
        publishedBasePrice: row.listing.priceAmount,
        publishedCurrency: row.listing.currency,
        startDate: START,
        endDate: new Date(row.deal.endDate),
        status: 'PUBLISHED',
        city: row.business.city,
        countryCode: row.business.countryCode,
        category: row.deal.category,
        featured: row.featuredRank != null,
        featuredRank: row.featuredRank,
        maxClaims: 0,
        terms: row.deal.terms,
        eligibility: 'Delve preview offer. Not available to claim, book, or pay. Valid during advertised dates.',
        included: row.deal.included,
        excluded: row.deal.excluded,
      },
    })

    await prisma.mediaAsset.upsert({
      where: { publicId: id.publicId },
      create: {
        id: id.mediaId,
        publicId: id.publicId,
        resourceType: 'image',
        deliveryType: 'fetch',
        format: 'jpg',
        secureUrl: row.image.url,
        status: 'READY',
        purpose: 'deal',
        altText: row.image.alt,
        uploadedByUserId: user.id,
        businessId: business.id,
        listingId: id.listingId,
        dealId: id.dealId,
      },
      update: {
        secureUrl: row.image.url,
        status: 'READY',
        altText: row.image.alt,
        businessId: business.id,
        listingId: id.listingId,
        dealId: id.dealId,
      },
    })

    await prisma.listing.update({
      where: { id: id.listingId },
      data: { coverMediaId: id.mediaId },
    })
    await prisma.deal.update({
      where: { id: id.dealId },
      data: { coverMediaId: id.mediaId },
    })

    lines.push(
      `${row.deal.title} · ${priced.currency} ${priced.originalAmount} → ${priced.dealAmount} (save ${priced.savingAmount}, ${priced.discountPercentage}%)`,
    )
  }

  console.log(`Seeded ${DEALS.length} preview deals.`)
  for (const line of lines) console.log(`  ${line}`)
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
