import { prisma } from '@delve/database'
import type { FollowListItem } from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import { createNotification } from '../notifications/notify.js'

const PAGE_SIZE = 30

type FollowUserRow = {
  id: string
  username: string
  travelerProfile: { displayName: string; avatarUrl: string | null } | null
}

function parseCursor(cursor?: string) {
  if (!cursor) return null
  const sep = cursor.indexOf('|')
  if (sep <= 0) return null
  const createdAt = cursor.slice(0, sep)
  const id = cursor.slice(sep + 1)
  if (!createdAt || !id) return null
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  return { createdAt: date, id }
}

function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`
}

function toListItem(
  user: FollowUserRow,
  followingIds: Set<string>,
  followerIds: Set<string>,
  viewerId: string | null,
): FollowListItem {
  return {
    id: user.id,
    username: user.username,
    displayName: user.travelerProfile?.displayName?.trim() || user.username,
    avatarUrl: user.travelerProfile?.avatarUrl ?? null,
    isFollowing: viewerId ? followingIds.has(user.id) : false,
    followsYou: viewerId ? followerIds.has(user.id) : false,
  }
}

async function enrichFollowStates(viewerId: string | null, userIds: string[]) {
  if (!viewerId || userIds.length === 0) {
    return { followingIds: new Set<string>(), followerIds: new Set<string>() }
  }
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: userIds } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: viewerId, followerId: { in: userIds } },
      select: { followerId: true },
    }),
  ])
  return {
    followingIds: new Set(following.map(row => row.followingId)),
    followerIds: new Set(followers.map(row => row.followerId)),
  }
}

function cursorWhere(parsed: { createdAt: Date; id: string } | null) {
  if (!parsed) return {}
  return {
    OR: [
      { createdAt: { lt: parsed.createdAt } },
      { createdAt: parsed.createdAt, id: { lt: parsed.id } },
    ],
  }
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError(400, 'INVALID_FOLLOW', 'You cannot follow yourself.')
  }
  const target = await prisma.user.findUnique({ where: { id: followingId } })
  if (!target || target.accountStatus === 'deactivated') {
    throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  }
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  })
  await createNotification({
    userId: followingId,
    type: 'NEW_FOLLOWER',
    title: 'New follower',
    body: 'Someone started following you.',
    entityType: 'user',
    entityId: followerId,
    actorId: followerId,
  })
  return countsFor(followingId, followerId)
}

export async function unfollowUser(followerId: string, followingId: string) {
  await prisma.follow.deleteMany({ where: { followerId, followingId } })
  return countsFor(followingId, followerId)
}

async function countsFor(profileUserId: string, viewerId: string) {
  const [followersCount, followingCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: profileUserId } }),
    prisma.follow.count({ where: { followerId: profileUserId } }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
    }),
  ])
  return {
    following: Boolean(isFollowing),
    followersCount,
    followingCount,
  }
}

export async function getFollowState(viewerId: string | null, profileUserId: string) {
  const [followersCount, followingCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: profileUserId } }),
    prisma.follow.count({ where: { followerId: profileUserId } }),
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
        })
      : null,
  ])
  return {
    followersCount,
    followingCount,
    isFollowing: Boolean(isFollowing),
  }
}

export async function listFollowers(
  profileUserId: string,
  viewerId: string | null,
  opts: { cursor?: string } = {},
) {
  const parsed = parseCursor(opts.cursor)
  const rows = await prisma.follow.findMany({
    where: {
      followingId: profileUserId,
      follower: {
        accountStatus: { not: 'deactivated' },
        travelerProfile: { isNot: null },
      },
      ...cursorWhere(parsed),
    },
    include: {
      follower: { include: { travelerProfile: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
  })

  const page = rows.slice(0, PAGE_SIZE)
  const userIds = page.map(row => row.follower.id)
  const states = await enrichFollowStates(viewerId, userIds)
  const items = page.map(row => toListItem(row.follower, states.followingIds, states.followerIds, viewerId))
  const nextCursor =
    rows.length > PAGE_SIZE
      ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
      : null

  return { items, nextCursor }
}

export async function listFollowing(
  profileUserId: string,
  viewerId: string | null,
  opts: { cursor?: string } = {},
) {
  const parsed = parseCursor(opts.cursor)
  const rows = await prisma.follow.findMany({
    where: {
      followerId: profileUserId,
      following: {
        accountStatus: { not: 'deactivated' },
        travelerProfile: { isNot: null },
      },
      ...cursorWhere(parsed),
    },
    include: {
      following: { include: { travelerProfile: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
  })

  const page = rows.slice(0, PAGE_SIZE)
  const userIds = page.map(row => row.following.id)
  const states = await enrichFollowStates(viewerId, userIds)
  const items = page.map(row => toListItem(row.following, states.followingIds, states.followerIds, viewerId))
  const nextCursor =
    rows.length > PAGE_SIZE
      ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
      : null

  return { items, nextCursor }
}
