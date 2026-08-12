import { prisma } from '@delve/database'
import { AppError } from '../../middleware/error-handler.js'
import { getFollowState } from './follow.service.js'
import { countPostsForUser } from './post.service.js'

export async function getPublicProfileByUsername(usernameRaw: string, viewerId: string | null) {
  const usernameNormalized = usernameRaw.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: { usernameNormalized, accountStatus: { not: 'deactivated' } },
    include: { travelerProfile: true },
  })
  if (!user || !user.travelerProfile) {
    throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  }
  const profile = user.travelerProfile
  const isOwner = viewerId === user.id
  if (profile.profileVisibility === 'PRIVATE' && !isOwner) {
    throw new AppError(404, 'NOT_FOUND', 'Traveler not found.')
  }

  const [follow, delversCount] = await Promise.all([
    getFollowState(viewerId, user.id),
    countPostsForUser(user.id),
  ])

  return {
    id: user.id,
    displayName: profile.displayName,
    username: user.username,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    bio: profile.bio,
    homeCity: profile.homeCity,
    homeCountryCode: profile.homeCountryCode,
    preferredLanguage: profile.preferredLanguage,
    interests: profile.interests,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: profile.createdAt.toISOString(),
    profileVisibility: profile.profileVisibility,
    followersCount: follow.followersCount,
    followingCount: follow.followingCount,
    delversCount,
    isFollowing: follow.isFollowing,
  }
}

export async function searchTravelers(q: string, viewerId: string | null) {
  const query = q.trim().toLowerCase()
  if (query.length < 2) return []
  const users = await prisma.user.findMany({
    where: {
      accountStatus: { not: 'deactivated' },
      OR: [
        { usernameNormalized: { contains: query } },
        { travelerProfile: { displayName: { contains: query, mode: 'insensitive' } } },
      ],
      travelerProfile: { profileVisibility: 'PUBLIC' },
    },
    include: { travelerProfile: true },
    take: 20,
  })
  return Promise.all(users.map(u => getPublicProfileByUsername(u.username, viewerId)))
}
