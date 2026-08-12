import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/middleware/error-handler.js'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    follow: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
}))

import { prisma } from '@delve/database'
import { followUser, unfollowUser } from '../src/modules/social/follow.service.js'

describe('follow service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects self-follow', async () => {
    await expect(followUser('u1', 'u1')).rejects.toMatchObject({
      code: 'INVALID_FOLLOW',
    } satisfies Partial<AppError>)
  })

  it('creates follow and returns counts', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u2',
      accountStatus: 'active',
    } as never)
    vi.mocked(prisma.follow.upsert).mockResolvedValue({} as never)
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never)
    vi.mocked(prisma.follow.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
    vi.mocked(prisma.follow.findUnique).mockResolvedValue({ id: 'f1' } as never)

    const result = await followUser('u1', 'u2')
    expect(result.following).toBe(true)
    expect(result.followersCount).toBe(3)
    expect(prisma.follow.upsert).toHaveBeenCalled()
  })

  it('unfollows and returns counts', async () => {
    vi.mocked(prisma.follow.deleteMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.follow.count).mockResolvedValueOnce(2).mockResolvedValueOnce(0)
    vi.mocked(prisma.follow.findUnique).mockResolvedValue(null)

    const result = await unfollowUser('u1', 'u2')
    expect(result.following).toBe(false)
    expect(result.followersCount).toBe(2)
  })
})
