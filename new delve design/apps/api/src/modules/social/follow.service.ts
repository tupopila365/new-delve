import { prisma } from '@delve/database'
import { AppError } from '../../middleware/error-handler.js'
import { createNotification } from '../notifications/notify.js'

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
