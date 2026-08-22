import { prisma } from '@delve/database'
import { AppError } from '../../middleware/error-handler.js'
import { createCommunityActivityNotification } from '../notifications/notify.js'
import type { CommunityDto, CommunityMembershipStatus, CommunityType } from '@delve/contracts'

type DbMembershipStatus = 'JOINED' | 'REQUESTED' | 'MODERATOR'

const SEED: Array<{
  slug: string
  name: string
  description: string
  communityType: CommunityType
  destination: string
  topics: string[]
  coverUrl: string
  privacy: 'PUBLIC' | 'PRIVATE'
  official: boolean
  memberCount: number
}> = [
  {
    slug: 'windhoek-travelers',
    name: 'Windhoek Travelers',
    communityType: 'DESTINATION',
    description: "Everything you need to know about arriving, moving around, and living in Namibia's capital.",
    destination: 'Windhoek',
    topics: ['transport', 'stays', 'food', 'safety'],
    coverUrl: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 4820,
  },
  {
    slug: 'swakopmund-locals',
    name: 'Swakopmund Locals',
    communityType: 'DESTINATION',
    description: 'Ask locals about the coast, weather, activities, and the best spots visitors often miss.',
    destination: 'Swakopmund',
    topics: ['activities', 'food', 'local tips'],
    coverUrl: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 3140,
  },
  {
    slug: 'namibia-road-trips',
    name: 'Namibia Road Trips',
    communityType: 'INTEREST',
    description: 'Self-drive routes, road conditions, 4x4 advice, fuel stops, and campsite reviews across Namibia.',
    destination: 'Namibia',
    topics: ['road trips', 'self-drive', '4x4', 'camping'],
    coverUrl: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 8600,
  },
  {
    slug: 'etosha-trip-planning',
    name: 'Etosha Trip Planning',
    communityType: 'DESTINATION',
    description: 'Game drives, waterhole times, camp bookings, and what to realistically expect in Etosha.',
    destination: 'Etosha',
    topics: ['safari', 'wildlife', 'camping', 'game drives'],
    coverUrl: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 5210,
  },
  {
    slug: 'walvis-bay-coast',
    name: 'Walvis Bay & Coast',
    communityType: 'DESTINATION',
    description: 'Flamingos, oysters, the lagoon, and everything worth knowing about Walvis Bay.',
    destination: 'Walvis Bay',
    topics: ['nature', 'food', 'coastal'],
    coverUrl: 'https://images.unsplash.com/photo-1651149164822-210246e81f99?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 1870,
  },
  {
    slug: 'luderitz-explorers',
    name: 'Lüderitz Explorers',
    communityType: 'DESTINATION',
    description: 'Kolmanskop, the Sperrgebiet, flamingos, and the strange calm of the far south.',
    destination: 'Lüderitz',
    topics: ['history', 'nature', 'adventure'],
    coverUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=300&fit=crop&auto=format',
    privacy: 'PRIVATE' as const,
    official: false,
    memberCount: 920,
  },
  {
    slug: 'namibia-bus-routes',
    name: 'Namibia Bus Routes',
    communityType: 'TRANSPORT',
    description: 'Traveler discussions about intercity bus routes, schedules, and booking. Always verify with operators.',
    destination: 'Namibia',
    topics: ['bus', 'intercity', 'budget transport'],
    coverUrl: 'https://images.unsplash.com/photo-1548019142-cb7c1ee5594f?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 2340,
  },
  {
    slug: 'car-rentals-road-conditions',
    name: 'Car Rentals & Road Conditions',
    communityType: 'TRANSPORT',
    description: 'Community reviews and tips on car rentals, gravel roads, and driving in Namibia. Not official operator info.',
    destination: 'Namibia',
    topics: ['car rental', '4x4', 'road conditions'],
    coverUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 3980,
  },
  {
    slug: 'budget-namibia',
    name: 'Budget Namibia',
    communityType: 'INTEREST',
    description: 'Hostels, camping, buses, cheap eats, and how to do Namibia without breaking the budget.',
    destination: 'Namibia',
    topics: ['budget', 'camping', 'backpacking'],
    coverUrl: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: false,
    memberCount: 6120,
  },
  {
    slug: 'delve-official',
    name: 'Delve Official',
    communityType: 'OFFICIAL',
    description: 'Updates, tips, and announcements from the Delve team.',
    destination: 'Namibia',
    topics: ['announcements', 'tips'],
    coverUrl: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&h=300&fit=crop&auto=format',
    privacy: 'PUBLIC',
    official: true,
    memberCount: 18400,
  },
]

function mapMembership(status: DbMembershipStatus | null | undefined): CommunityMembershipStatus {
  if (!status) return 'none'
  if (status === 'JOINED') return 'joined'
  if (status === 'REQUESTED') return 'requested'
  return 'moderator'
}

function toDto(
  row: {
    id: string
    slug: string
    name: string
    description: string
    communityType: CommunityType
    destination: string
    topics: string[]
    coverUrl: string | null
    privacy: 'PUBLIC' | 'PRIVATE'
    official: boolean
    businessManaged: boolean
    memberCount: number
    lastActivityAt: Date
  },
  membershipStatus: CommunityMembershipStatus,
): CommunityDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    communityType: row.communityType,
    destination: row.destination,
    topics: row.topics,
    coverUrl: row.coverUrl,
    privacy: row.privacy,
    official: row.official,
    businessManaged: row.businessManaged,
    memberCount: row.memberCount,
    lastActivityAt: row.lastActivityAt.toISOString(),
    membershipStatus,
  }
}

let seedPromise: Promise<void> | null = null

/** Idempotent seed so Discover is never empty after deploy. */
export async function ensureCommunitySeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await prisma.community.count({ where: { deletedAt: null } })
      if (count === 0) {
        for (const c of SEED) {
          await prisma.community.upsert({
            where: { slug: c.slug },
            create: {
              slug: c.slug,
              name: c.name,
              description: c.description,
              communityType: c.communityType,
              destination: c.destination,
              topics: c.topics,
              coverUrl: c.coverUrl,
              privacy: c.privacy,
              official: c.official,
              memberCount: c.memberCount,
              lastActivityAt: new Date(),
            },
            update: {},
          })
        }
      }
      // Ensure demo private hub exists even on DBs seeded before Phase 6.
      await prisma.community.upsert({
        where: { slug: 'luderitz-explorers' },
        create: {
          slug: 'luderitz-explorers',
          name: 'Lüderitz Explorers',
          description: 'Kolmanskop, the Sperrgebiet, flamingos, and the strange calm of the far south.',
          communityType: 'DESTINATION',
          destination: 'Lüderitz',
          topics: ['history', 'nature', 'adventure'],
          coverUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=300&fit=crop&auto=format',
          privacy: 'PRIVATE',
          official: false,
          memberCount: 920,
          lastActivityAt: new Date(),
        },
        update: { privacy: 'PRIVATE' },
      })
    })().finally(() => {
      seedPromise = null
    })
  }
  return seedPromise
}

export async function listCommunities(
  viewerId: string | null,
  opts: { q?: string; type?: CommunityType; destination?: string } = {},
) {
  await ensureCommunitySeed()
  const q = opts.q?.trim()
  const where: {
    deletedAt: null
    communityType?: CommunityType
    destination?: { equals: string; mode: 'insensitive' }
    OR?: Array<Record<string, unknown>>
  } = {
    deletedAt: null,
    ...(opts.type ? { communityType: opts.type } : {}),
    ...(opts.destination ? { destination: { equals: opts.destination, mode: 'insensitive' as const } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { destination: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const rows = await prisma.community.findMany({
    where,
    orderBy: [{ official: 'desc' }, { memberCount: 'desc' }, { lastActivityAt: 'desc' }],
    take: 80,
  })
  const memberships = viewerId
    ? await prisma.communityMembership.findMany({
        where: { userId: viewerId, communityId: { in: rows.map(r => r.id) } },
      })
    : []
  const byCommunity = new Map(memberships.map(m => [m.communityId, m.status]))
  return rows.map(r => toDto(r, mapMembership(byCommunity.get(r.id))))
}

export async function listMyCommunities(viewerId: string) {
  await ensureCommunitySeed()
  const memberships = await prisma.communityMembership.findMany({
    where: {
      userId: viewerId,
      status: { in: ['JOINED', 'MODERATOR', 'REQUESTED'] },
      community: { deletedAt: null },
    },
    include: { community: true },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  })
  return memberships.map(m => toDto(m.community, mapMembership(m.status)))
}

export async function getCommunity(slugOrId: string, viewerId: string | null) {
  await ensureCommunitySeed()
  const row = await prisma.community.findFirst({
    where: {
      deletedAt: null,
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Community not found')
  const membership = viewerId
    ? await prisma.communityMembership.findUnique({
        where: { communityId_userId: { communityId: row.id, userId: viewerId } },
      })
    : null
  return toDto(row, mapMembership(membership?.status))
}

export async function joinCommunity(userId: string, communityId: string) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const existing = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  if (existing && (existing.status === 'JOINED' || existing.status === 'MODERATOR')) {
    return {
      community: toDto(community, mapMembership(existing.status)),
      membershipStatus: mapMembership(existing.status),
    }
  }

  const modCount = await prisma.communityMembership.count({
    where: { communityId, status: 'MODERATOR' },
  })

  let nextStatus: DbMembershipStatus =
    community.privacy === 'PRIVATE' ? 'REQUESTED' : 'JOINED'
  // First real member becomes moderator so private hubs can be managed.
  if (modCount === 0 && nextStatus === 'JOINED') {
    nextStatus = 'MODERATOR'
  }
  if (modCount === 0 && nextStatus === 'REQUESTED') {
    // Private with no mods: first requester is auto-approved as moderator.
    nextStatus = 'MODERATOR'
  }

  const membership = await prisma.communityMembership.upsert({
    where: { communityId_userId: { communityId, userId } },
    create: { communityId, userId, status: nextStatus },
    update: { status: nextStatus },
  })

  let memberCount = community.memberCount
  if (nextStatus === 'JOINED' || nextStatus === 'MODERATOR') {
    if (!existing || existing.status === 'REQUESTED') {
      const updated = await prisma.community.update({
        where: { id: communityId },
        data: {
          memberCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      })
      memberCount = updated.memberCount
    }
  } else {
    await prisma.community.update({
      where: { id: communityId },
      data: { lastActivityAt: new Date() },
    })

    const mods = await prisma.communityMembership.findMany({
      where: { communityId, status: 'MODERATOR' },
      select: { userId: true },
    })
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      include: { travelerProfile: true },
    })
    const actorName = actor?.travelerProfile?.displayName?.trim() || actor?.username || 'Someone'
    await Promise.all(
      mods.map(m =>
        createCommunityActivityNotification({
          userId: m.userId,
          type: 'COMMUNITY_JOIN_REQUEST',
          title: 'Join request',
          body: `${actorName} requested to join ${community.name}.`,
          entityType: 'community',
          entityId: communityId,
          actorId: userId,
        }),
      ),
    )
  }

  const dto = toDto({ ...community, memberCount, lastActivityAt: new Date() }, mapMembership(membership.status))
  return { community: dto, membershipStatus: mapMembership(membership.status) }
}

export async function leaveCommunity(userId: string, communityId: string) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const existing = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  if (!existing) {
    return {
      community: toDto(community, 'none'),
      membershipStatus: 'none' as const,
    }
  }

  await prisma.communityMembership.delete({ where: { id: existing.id } })

  let memberCount = community.memberCount
  if (existing.status === 'JOINED' || existing.status === 'MODERATOR') {
    const updated = await prisma.community.update({
      where: { id: communityId },
      data: {
        memberCount: { decrement: 1 },
        lastActivityAt: new Date(),
      },
    })
    memberCount = Math.max(0, updated.memberCount)
    if (updated.memberCount < 0) {
      await prisma.community.update({ where: { id: communityId }, data: { memberCount: 0 } })
      memberCount = 0
    }
  } else {
    await prisma.community.update({
      where: { id: communityId },
      data: { lastActivityAt: new Date() },
    })
  }

  const dto = toDto({ ...community, memberCount, lastActivityAt: new Date() }, 'none')
  return { community: dto, membershipStatus: 'none' as const }
}

export async function listCommunitiesForUsername(username: string, viewerId: string | null) {
  await ensureCommunitySeed()
  const user = await prisma.user.findFirst({
    where: { usernameNormalized: username.trim().toLowerCase() },
  })
  if (!user || user.accountStatus === 'deactivated') {
    throw new AppError(404, 'NOT_FOUND', 'Traveler not found')
  }

  const memberships = await prisma.communityMembership.findMany({
    where: {
      userId: user.id,
      status: { in: ['JOINED', 'MODERATOR'] },
      community: { deletedAt: null },
    },
    include: { community: true },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  })

  // Hide private communities from non-members / non-self viewers
  const visible = []
  for (const m of memberships) {
    if (m.community.privacy === 'PUBLIC' || viewerId === user.id) {
      visible.push(m)
      continue
    }
    if (!viewerId) continue
    const viewerMem = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: m.communityId, userId: viewerId } },
    })
    if (viewerMem && (viewerMem.status === 'JOINED' || viewerMem.status === 'MODERATOR')) {
      visible.push(m)
    }
  }

  return visible.map(m => toDto(m.community, mapMembership(m.status)))
}

async function requireModerator(communityId: string, userId: string) {
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  if (!membership || membership.status !== 'MODERATOR') {
    throw new AppError(403, 'FORBIDDEN', 'Only community moderators can manage join requests.')
  }
  return membership
}

export async function listJoinRequests(moderatorId: string, communityId: string) {
  await requireModerator(communityId, moderatorId)
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const rows = await prisma.communityMembership.findMany({
    where: { communityId, status: 'REQUESTED' },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map(r => r.userId) } },
    include: { travelerProfile: true },
  })
  const byId = new Map(users.map(u => [u.id, u]))

  return rows.map(r => {
    const u = byId.get(r.userId)
    return {
      userId: r.userId,
      username: u?.username || 'unknown',
      displayName: u?.travelerProfile?.displayName?.trim() || u?.username || 'Traveler',
      avatarUrl: u?.travelerProfile?.avatarUrl ?? null,
      requestedAt: r.createdAt.toISOString(),
    }
  })
}

export async function approveJoinRequest(moderatorId: string, communityId: string, targetUserId: string) {
  await requireModerator(communityId, moderatorId)
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const request = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId: targetUserId } },
  })
  if (!request || request.status !== 'REQUESTED') {
    throw new AppError(404, 'NOT_FOUND', 'Join request not found')
  }

  await prisma.communityMembership.update({
    where: { id: request.id },
    data: { status: 'JOINED' },
  })
  const updated = await prisma.community.update({
    where: { id: communityId },
    data: { memberCount: { increment: 1 }, lastActivityAt: new Date() },
  })

  await createCommunityActivityNotification({
    userId: targetUserId,
    type: 'COMMUNITY_JOIN_APPROVED',
    title: 'Join request approved',
    body: `You were approved to join ${community.name}.`,
    entityType: 'community',
    entityId: communityId,
    actorId: moderatorId,
  })

  return toDto(updated, 'joined')
}

export async function denyJoinRequest(moderatorId: string, communityId: string, targetUserId: string) {
  await requireModerator(communityId, moderatorId)
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const request = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId: targetUserId } },
  })
  if (!request || request.status !== 'REQUESTED') {
    throw new AppError(404, 'NOT_FOUND', 'Join request not found')
  }

  await prisma.communityMembership.delete({ where: { id: request.id } })
  return toDto(community, mapMembership(undefined))
}
