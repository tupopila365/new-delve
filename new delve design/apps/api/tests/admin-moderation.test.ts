import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/middleware/error-handler.js'

vi.mock('@delve/database', () => ({
  prisma: {
    contentReport: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    communityReport: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    contentModerationAction: { findMany: vi.fn(), create: vi.fn() },
    post: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
    travelerEvent: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    journey: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    community: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    communityThread: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityMembership: { findUnique: vi.fn() },
    communityAuditLog: { findMany: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    notification: { create: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

vi.mock('../src/modules/notifications/notify.js', () => ({
  createNotification: vi.fn(),
}))

import { prisma } from '@delve/database'
import {
  adminDecideModerationCase,
  adminGetModerationCase,
  adminListModerationJourneys,
  adminListModerationQueue,
} from '../src/modules/admin/admin-moderation.service.js'
import { getPostDto, listFeed, listPostsForUser } from '../src/modules/social/post.service.js'

vi.mock('../src/modules/admin/admin-audit.js', () => ({
  writeAdminAudit: vi.fn(),
}))

function postAuthor() {
  return {
    id: 'author-1',
    username: 'anna',
    accountStatus: 'active',
    travelerProfile: { displayName: 'Anna' },
  }
}

describe('admin moderation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.contentReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.communityReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.contentReport.findMany).mockResolvedValue([])
    vi.mocked(prisma.contentModerationAction.findMany).mockResolvedValue([])
    vi.mocked(prisma.post.count).mockResolvedValue(0)
    vi.mocked(prisma.travelerEvent.count).mockResolvedValue(0)
    vi.mocked(prisma.journey.count).mockResolvedValue(0)
    vi.mocked(prisma.contentReport.count).mockResolvedValue(0)
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never)
    vi.mocked(prisma.contentReport.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.contentModerationAction.create).mockResolvedValue({} as never)
    vi.mocked(prisma.post.update).mockResolvedValue({} as never)
  })

  it('groups multiple reports on the same post into one queue case', async () => {
    vi.mocked(prisma.contentReport.groupBy).mockImplementation(async (args: { by?: string[] }) => {
      if (args.by?.includes('reason')) {
        return [
          { targetType: 'POST', targetId: 'post-1', reason: 'SPAM', _count: { _all: 2 } },
          { targetType: 'POST', targetId: 'post-1', reason: 'OTHER', _count: { _all: 1 } },
        ] as never
      }
      return [
        {
          targetType: 'POST',
          targetId: 'post-1',
          _count: { _all: 3 },
          _min: { createdAt: new Date('2026-08-01') },
          _max: { createdAt: new Date('2026-08-02') },
        },
      ] as never
    })
    vi.mocked(prisma.communityReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.post.findMany).mockResolvedValue([
      {
        id: 'post-1',
        caption: 'Cheap bookings',
        status: 'PUBLISHED',
        moderationStatus: 'VISIBLE',
        author: postAuthor(),
      },
    ] as never)
    const queue = await adminListModerationQueue({ page: 1, pageSize: 25 })
    expect(queue.total).toBe(1)
    expect(queue.items[0]?.openReportCount).toBe(3)
    expect(queue.items[0]?.targetId).toBe('post-1')
  })

  it('includes community thread reports in the unified queue', async () => {
    vi.mocked(prisma.contentReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.communityReport.groupBy).mockImplementation(async (args: { by?: string[] }) => {
      if (args.by?.includes('reason')) {
        return [{ targetType: 'POST', targetId: 'thread-1', reason: 'Spam', _count: { _all: 1 } }] as never
      }
      return [
        {
          targetType: 'POST',
          targetId: 'thread-1',
          _count: { _all: 1 },
          _min: { createdAt: new Date('2026-08-01') },
          _max: { createdAt: new Date('2026-08-01') },
        },
      ] as never
    })
    vi.mocked(prisma.communityThread.findMany).mockResolvedValue([
      {
        id: 'thread-1',
        title: 'Rule break',
        status: 'PUBLISHED',
        community: { name: 'Windhoek' },
        author: postAuthor(),
      },
    ] as never)
    const queue = await adminListModerationQueue({ page: 1, pageSize: 25 })
    expect(queue.items[0]?.targetType).toBe('COMMUNITY_THREAD')
    expect(queue.items[0]?.source).toBe('COMMUNITY_REPORT')
  })

  it('does not list unreported private journeys for general browsing', async () => {
    vi.mocked(prisma.contentReport.findMany).mockResolvedValue([])
    vi.mocked(prisma.journey.count).mockResolvedValue(0)
    vi.mocked(prisma.journey.findMany).mockResolvedValue([])
    await adminListModerationJourneys({ page: 1, pageSize: 25 })
    expect(prisma.journey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([{ visibility: 'PUBLIC' }]),
            }),
          ]),
        }),
      }),
    )
  })

  it('allows inspection of a reported private journey', async () => {
    vi.mocked(prisma.contentReport.findMany).mockResolvedValue([])
    vi.mocked(prisma.journey.findUnique).mockResolvedValue({
      id: 'j-private',
      title: 'Secret trip',
      summary: 'private',
      coverUrl: null,
      createdAt: new Date(),
      visibility: 'PRIVATE',
      moderationStatus: 'VISIBLE',
      startPlace: 'A',
      endPlace: 'B',
      author: postAuthor(),
    } as never)
    vi.mocked(prisma.contentReport.count).mockResolvedValue(1)
    const detail = await adminGetModerationCase('JOURNEY', 'j-private')
    expect(detail.preview).toBe('Secret trip')
    expect(detail.visibility).toBe('PRIVATE')
  })

  it('hides unreported private journeys from moderation detail', async () => {
    vi.mocked(prisma.journey.findUnique).mockResolvedValue({
      id: 'j-private',
      title: 'Secret trip',
      summary: 'private',
      coverUrl: null,
      createdAt: new Date(),
      visibility: 'PRIVATE',
      moderationStatus: 'VISIBLE',
      startPlace: 'A',
      endPlace: 'B',
      author: postAuthor(),
    } as never)
    vi.mocked(prisma.contentReport.count).mockResolvedValue(0)
    await expect(adminGetModerationCase('JOURNEY', 'j-private')).rejects.toMatchObject({
      statusCode: 404,
    } satisfies Partial<AppError>)
  })

  it('removes a post without changing the traveler account', async () => {
    const post = {
      id: 'post-1',
      caption: 'Hello',
      createdAt: new Date(),
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      moderationStatus: 'VISIBLE',
      media: [],
      author: postAuthor(),
    }
    vi.mocked(prisma.post.findUnique).mockResolvedValue(post as never)
    vi.mocked(prisma.post.update).mockResolvedValue({ ...post, moderationStatus: 'REMOVED' } as never)
    vi.mocked(prisma.post.findUnique)
      .mockResolvedValueOnce(post as never)
      .mockResolvedValueOnce({ ...post, moderationStatus: 'REMOVED' } as never)
    const result = await adminDecideModerationCase('admin-1', 'sess-1', 'POST', 'post-1', {
      action: 'REMOVE',
      reason: 'SPAM',
    })
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { moderationStatus: 'REMOVED' },
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(result.moderationStatus).toBe('REMOVED')
  })

  it('restores a hidden post and keeps report history', async () => {
    const post = {
      id: 'post-1',
      caption: 'Hello',
      createdAt: new Date(),
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      moderationStatus: 'REMOVED',
      media: [],
      author: postAuthor(),
    }
    vi.mocked(prisma.post.findUnique).mockResolvedValue(post as never)
    vi.mocked(prisma.contentReport.findMany).mockResolvedValue([
      {
        id: 'r1',
        source: 'CONTENT_REPORT',
        reason: 'SPAM',
        details: null,
        status: 'RESOLVED',
        createdAt: new Date(),
        reporter: { username: 'bob', travelerProfile: null },
      },
    ] as never)
    vi.mocked(prisma.post.findUnique)
      .mockResolvedValueOnce(post as never)
      .mockResolvedValueOnce({ ...post, moderationStatus: 'VISIBLE' } as never)
    const result = await adminDecideModerationCase('admin-1', 'sess-1', 'POST', 'post-1', { action: 'RESTORE' })
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { moderationStatus: 'VISIBLE' },
    })
    expect(result.reports).toHaveLength(1)
  })

  it('does not leak another community when reviewing a thread', async () => {
    vi.mocked(prisma.communityThread.findUnique).mockResolvedValue({
      id: 'thread-a',
      title: 'Hello',
      body: 'body',
      mediaUrls: [],
      createdAt: new Date(),
      status: 'PUBLISHED',
      authorId: 'author-1',
      communityId: 'comm-a',
      community: {
        id: 'comm-a',
        name: 'Community A',
        slug: 'a',
        rules: [{ id: 'rule-1', title: 'Be kind', description: 'Yes' }],
      },
      author: postAuthor(),
    } as never)
    vi.mocked(prisma.communityMembership.findUnique).mockResolvedValue({ role: 'MEMBER' } as never)
    vi.mocked(prisma.communityAuditLog.findMany).mockResolvedValue([])
    vi.mocked(prisma.communityReport.findMany).mockResolvedValue([])
    await adminGetModerationCase('COMMUNITY_THREAD', 'thread-a')
    expect(prisma.communityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetId: 'thread-a' },
      }),
    )
    expect(prisma.communityAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { communityId: 'comm-a' },
      }),
    )
  })
})

describe('public post visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes moderated posts from the public feed', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([])
    await listFeed({ NODE_ENV: 'test' } as never, null)
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ moderationStatus: 'VISIBLE' }),
      }),
    )
  })

  it('excludes moderated posts from another traveler profile', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([])
    await listPostsForUser({ NODE_ENV: 'test' } as never, 'author-1', 'viewer-2')
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ moderationStatus: 'VISIBLE' }),
      }),
    )
  })

  it('returns unavailable for a non-author fetching a removed post', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({
      id: 'post-1',
      status: 'PUBLISHED',
      deletedAt: null,
      moderationStatus: 'REMOVED',
      authorId: 'author-1',
      media: [],
    } as never)
    await expect(getPostDto({ NODE_ENV: 'test' } as never, 'post-1', 'viewer-2')).rejects.toMatchObject({
      statusCode: 404,
      code: 'CONTENT_UNAVAILABLE',
    } satisfies Partial<AppError>)
  })
})
