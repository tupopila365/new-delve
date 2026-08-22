import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    mediaAsset: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    storySlide: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    storyView: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    follow: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        storySlide: {
          create: vi.fn().mockImplementation(async (args: {
            data: {
              mediaId: string
              caption?: string
              location?: string | null
              createdAt: Date
              expiresAt: Date
              authorId: string
            }
          }) => ({
            id: `slide-${args.data.mediaId}`,
            authorId: args.data.authorId,
            mediaId: args.data.mediaId,
            caption: args.data.caption || '',
            location: args.data.location ?? null,
            createdAt: args.data.createdAt,
            expiresAt: args.data.expiresAt,
            media: {
              id: args.data.mediaId,
              publicId: `delve/users/author1/stories/${args.data.mediaId}`,
              version: 1,
              resourceType: 'image',
              secureUrl: null,
              width: 1080,
              height: 1920,
            },
          })),
        },
      }
      return fn(tx)
    }),
  },
}))

vi.mock('../src/modules/auth/rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true, remaining: 10, retryAfterSec: 0 })),
}))

vi.mock('../src/modules/media/cloudinary.js', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/media/cloudinary.js')>(
    '../src/modules/media/cloudinary.js',
  )
  return {
    ...actual,
    destroyCloudinaryAsset: vi.fn().mockResolvedValue({ ok: true, result: 'ok' }),
  }
})

vi.mock('../src/modules/notifications/notify.js', () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}))

vi.mock('../src/modules/media/metrics.js', () => ({
  recordMediaMetric: vi.fn(),
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { rateLimit } from '../src/modules/auth/rate-limit.js'
import { destroyCloudinaryAsset } from '../src/modules/media/cloudinary.js'
import {
  cleanupExpiredStories,
  createStorySlides,
  deleteStorySlide,
  getStoriesForUser,
  getStoryRail,
  markStoriesViewed,
} from '../src/modules/social/story.service.js'
import { AppError } from '../src/middleware/error-handler.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  CLOUDINARY_CLOUD_NAME: 'delve-test',
  CLOUDINARY_API_KEY: 'key123',
  CLOUDINARY_API_SECRET: 'secret1234567890',
  CLOUDINARY_FOLDER_PREFIX: 'delve',
  CLOUDINARY_UPLOAD_SIGNATURE_TTL_SECONDS: '300',
})

describe('delvers stories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rateLimit).mockReturnValue({ ok: true, remaining: 10, retryAfterSec: 0 })
  })

  it('creates slides from owned story media with 24h expiry', async () => {
    vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([
      { id: 'm1', purpose: 'story' },
    ] as never)
    vi.mocked(prisma.storySlide.count)
      .mockResolvedValueOnce(0) // already linked
      .mockResolvedValueOnce(0) // active count
      .mockResolvedValueOnce(0) // created last day
    vi.mocked(prisma.follow.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'author1',
      username: 'me',
      travelerProfile: { displayName: 'Me' },
    } as never)

    const slides = await createStorySlides(env, 'author1', { mediaIds: ['m1'], caption: 'Dunes' }, '127.0.0.1')
    expect(slides).toHaveLength(1)
    expect(slides[0]?.id).toBe('slide-m1')
    expect(slides[0]?.caption).toBe('Dunes')
    expect(slides[0]?.media.url).toContain('res.cloudinary.com')
    expect(new Date(slides[0]!.expiresAt).getTime() - new Date(slides[0]!.createdAt).getTime()).toBe(
      24 * 60 * 60 * 1000,
    )
  })

  it('rejects media that is not purpose=story or not owned', async () => {
    vi.mocked(prisma.mediaAsset.findMany).mockResolvedValue([])
    await expect(
      createStorySlides(env, 'author1', { mediaIds: ['m1'] }, '127.0.0.1'),
    ).rejects.toMatchObject({ code: 'INVALID_MEDIA' })
  })

  it('rate-limits story creation', async () => {
    vi.mocked(rateLimit).mockReturnValueOnce({ ok: false, remaining: 0, retryAfterSec: 60 })
    await expect(
      createStorySlides(env, 'author1', { mediaIds: ['m1'] }, '127.0.0.1'),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('builds rail for self + following with unseen flags', async () => {
    vi.mocked(prisma.follow.findMany).mockResolvedValue([{ followingId: 'u2' }] as never)
    vi.mocked(prisma.storySlide.findMany).mockResolvedValue([
      { authorId: 'author1', createdAt: new Date('2026-08-22T12:00:00.000Z') },
      { authorId: 'u2', createdAt: new Date('2026-08-22T11:00:00.000Z') },
      { authorId: 'u2', createdAt: new Date('2026-08-22T10:00:00.000Z') },
    ] as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'author1',
        username: 'me',
        travelerProfile: { displayName: 'Me', avatarUrl: null, profileVisibility: 'PUBLIC' },
      },
      {
        id: 'u2',
        username: 'lena',
        travelerProfile: { displayName: 'Lena', avatarUrl: 'https://x/a.jpg', profileVisibility: 'PUBLIC' },
      },
    ] as never)
    vi.mocked(prisma.storyView.findMany).mockResolvedValue([
      { authorId: 'u2', lastViewedAt: new Date('2026-08-22T09:00:00.000Z') },
    ] as never)

    const rail = await getStoryRail(env, 'author1')
    expect(rail.authors[0]?.isOwn).toBe(true)
    expect(rail.authors[0]?.unseen).toBe(false)
    const other = rail.authors.find(a => a.id === 'u2')
    expect(other?.unseen).toBe(true)
    expect(other?.slideCount).toBe(2)
  })

  it('blocks private-profile stories for non-followers', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u2',
      username: 'private_user',
      travelerProfile: { profileVisibility: 'PRIVATE', displayName: 'P', avatarUrl: null },
    } as never)
    vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)

    await expect(getStoriesForUser(env, 'viewer1', 'u2')).rejects.toBeInstanceOf(AppError)
    await expect(getStoriesForUser(env, 'viewer1', 'u2')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('marks stories viewed and deletes own slides', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u2',
      username: 'lena',
      travelerProfile: { profileVisibility: 'PUBLIC', displayName: 'Lena', avatarUrl: null },
    } as never)
    vi.mocked(prisma.storySlide.count).mockResolvedValue(1)
    vi.mocked(prisma.storyView.upsert).mockResolvedValue({} as never)

    const viewed = await markStoriesViewed('viewer1', 'u2')
    expect(viewed).toEqual({ viewed: true, authorId: 'u2' })

    vi.mocked(prisma.storySlide.findFirst).mockResolvedValue({ id: 'slide1', authorId: 'author1' } as never)
    vi.mocked(prisma.storySlide.update).mockResolvedValue({} as never)
    const deleted = await deleteStorySlide('author1', 'slide1')
    expect(deleted.id).toBe('slide1')
  })

  it('soft-deletes expired slides and destroys Cloudinary media', async () => {
    vi.mocked(prisma.storySlide.updateMany).mockResolvedValue({ count: 4 })
    vi.mocked(prisma.storySlide.findMany).mockResolvedValue([
      {
        id: 's1',
        media: { id: 'm1', publicId: 'delve/users/a/stories/m1', resourceType: 'image' },
      },
    ] as never)
    vi.mocked(prisma.mediaAsset.update).mockResolvedValue({} as never)

    const out = await cleanupExpiredStories(env)
    expect(out.expiredSlides).toBe(4)
    expect(out.destroyedMedia).toBe(1)
    expect(destroyCloudinaryAsset).toHaveBeenCalled()
  })
})
