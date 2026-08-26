import { prisma } from '@delve/database'
import { AppError } from '../../middleware/error-handler.js'
import { createCommunityActivityNotification } from '../notifications/notify.js'
import { publicModerationWhere } from '../safety/moderation-visibility.js'
import { removeCommunityChatParticipant } from '../message/message.service.js'
import type { CommunityDto, CommunityMembershipStatus, CommunityType } from '@delve/contracts'

type DbMembershipStatus = 'JOINED' | 'REQUESTED' | 'MODERATOR' | 'BANNED'

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

function mapMembership(
  status: DbMembershipStatus | null | undefined,
  role?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | null,
): CommunityMembershipStatus {
  if (!status) return 'none'
  if (status === 'BANNED') return 'banned'
  if (status === 'REQUESTED') return 'requested'
  if (role === 'OWNER' || role === 'ADMIN' || role === 'MODERATOR') return 'moderator'
  return 'joined'
}

function toDto(
  row: {
    id: string
    slug: string
    name: string
    description: string
    about?: string
    communityType: CommunityType
    category?: string
    destination: string
    city?: string | null
    country?: string | null
    isGlobal?: boolean
    topics: string[]
    avatarUrl?: string | null
    coverUrl: string | null
    privacy: 'PUBLIC' | 'PRIVATE'
    requireJoinApproval?: boolean
    requireRuleAcknowledgement?: boolean
    requirePostApproval?: boolean
    postingPermission?: string
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
    about: row.about ?? '',
    communityType: row.communityType,
    category: (row.category ?? 'OTHER') as CommunityDto['category'],
    destination: row.destination,
    city: row.city ?? null,
    country: row.country ?? null,
    isGlobal: row.isGlobal ?? true,
    topics: row.topics,
    avatarUrl: row.avatarUrl ?? null,
    coverUrl: row.coverUrl,
    privacy: row.privacy,
    requireJoinApproval: row.requireJoinApproval ?? false,
    requireRuleAcknowledgement: row.requireRuleAcknowledgement ?? false,
    requirePostApproval: row.requirePostApproval ?? false,
    postingPermission: (row.postingPermission ?? 'MEMBERS') as CommunityDto['postingPermission'],
    official: row.official,
    businessManaged: row.businessManaged,
    memberCount: row.memberCount,
    lastActivityAt: row.lastActivityAt.toISOString(),
    membershipStatus,
  }
}

let seedPromise: Promise<void> | null = null

/** Idempotent seed — disabled unless COMMUNITY_SEED=true (no demo data in production). */
export async function ensureCommunitySeed() {
  if (process.env.COMMUNITY_SEED !== 'true') return
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
    moderationStatus?: 'VISIBLE'
    communityType?: CommunityType
    destination?: { equals: string; mode: 'insensitive' }
    OR?: Array<Record<string, unknown>>
  } = {
    deletedAt: null,
    ...publicModerationWhere(),
    ...(opts.type ? { communityType: opts.type } : {}),
    ...(opts.destination ? { destination: { equals: opts.destination, mode: 'insensitive' as const } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { about: { contains: q, mode: 'insensitive' } },
            { destination: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { country: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { topics: { has: q } },
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
  const byCommunity = new Map(memberships.map(m => [m.communityId, m]))
  return rows.map(r => {
    const mem = byCommunity.get(r.id)
    return toDto(r, mapMembership(mem?.status, mem?.role))
  })
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
  return memberships.map(m => toDto(m.community, mapMembership(m.status, m.role)))
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
  return toDto(row, mapMembership(membership?.status, membership?.role))
}

export async function joinCommunity(userId: string, communityId: string) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null, ...publicModerationWhere() },
  })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const existing = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  const prevStatus = existing?.status
  if (existing?.status === 'JOINED') {
    const ms = mapMembership(existing.status, existing.role)
    return {
      community: toDto(community, ms),
      membershipStatus: ms,
    }
  }
  if (existing?.status === 'REQUESTED') {
    const ms = mapMembership(existing.status, existing.role)
    return {
      community: toDto(community, ms),
      membershipStatus: ms,
    }
  }

  const modCount = await prisma.communityMembership.count({
    where: { communityId, role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] }, status: 'JOINED' },
  })

  let nextStatus: DbMembershipStatus = 'JOINED'
  let nextRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' = 'MEMBER'

  if (existing?.status === 'BANNED') {
    throw new AppError(403, 'FORBIDDEN', 'You are banned from this community')
  }

  if (community.requireJoinApproval || community.privacy === 'PRIVATE') {
    nextStatus = 'REQUESTED'
  }

  if (modCount === 0 && nextStatus === 'JOINED' && !community.ownerUserId) {
    nextRole = 'MODERATOR'
  }

  const membership = await prisma.communityMembership.upsert({
    where: { communityId_userId: { communityId, userId } },
    create: { communityId, userId, status: nextStatus, role: nextRole },
    update: { status: nextStatus, role: existing?.role === 'OWNER' ? 'OWNER' : nextRole },
  })

  let memberCount = community.memberCount
  if (nextStatus === 'JOINED') {
    const wasPending = prevStatus === 'REQUESTED' || prevStatus === 'MODERATOR'
    if (!existing || wasPending) {
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
      where: {
        communityId,
        role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] },
        status: { in: ['JOINED', 'MODERATOR'] },
      },
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

  const ms = mapMembership(membership.status, membership.role)
  const dto = toDto({ ...community, memberCount, lastActivityAt: new Date() }, ms)
  return { community: dto, membershipStatus: ms }
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
  await removeCommunityChatParticipant(communityId, userId)

  let memberCount = community.memberCount
  if (existing.status === 'JOINED') {
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
    if (viewerMem && viewerMem.status === 'JOINED') {
      visible.push(m)
    }
  }

  return visible.map(m => toDto(m.community, mapMembership(m.status, m.role)))
}

async function requireModerator(communityId: string, userId: string) {
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  const canMod =
    membership &&
    membership.status !== 'BANNED' &&
    (membership.role === 'OWNER' || membership.role === 'ADMIN' || membership.role === 'MODERATOR')
  if (!canMod) {
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
