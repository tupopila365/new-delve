import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/middleware/error-handler.js'

vi.mock('@delve/database', () => ({
  prisma: {
    post: { findFirst: vi.fn() },
    travelerEvent: { findFirst: vi.fn() },
    journey: { findFirst: vi.fn() },
    comment: { findFirst: vi.fn() },
    contentReport: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

import { prisma } from '@delve/database'
import { createContentReport } from '../src/modules/safety/content-report.service.js'

describe('content reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing posts', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue(null)
    await expect(
      createContentReport('user-a', { targetType: 'POST', targetId: 'missing', reason: 'SPAM' }),
    ).rejects.toMatchObject({ statusCode: 404 } satisfies Partial<AppError>)
  })

  it('stores a report and returns a generic success message', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1', caption: 'Hello' } as never)
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.contentReport.create).mockResolvedValue({ id: 'rep-1' } as never)
    const result = await createContentReport('user-a', {
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'SPAM',
      details: 'Looks like a fake booking link',
    })
    expect(result.message).toContain('Thanks')
    expect(result.message.toLowerCase()).not.toContain('banned')
    expect(prisma.contentReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'user-a',
          targetType: 'POST',
          targetId: 'post-1',
          reason: 'SPAM',
        }),
      }),
    )
  })

  it('rejects a duplicate report from the same traveler', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1', caption: 'Hello' } as never)
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue({ id: 'rep-1', status: 'OPEN' } as never)
    await expect(
      createContentReport('user-a', { targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REPORT_EXISTS' } satisfies Partial<AppError>)
    expect(prisma.contentReport.create).not.toHaveBeenCalled()
  })

  it('stores a post comment report with a text snapshot', async () => {
    vi.mocked(prisma.comment.findFirst).mockResolvedValue({
      id: 'c-1',
      body: 'buy crypto now',
      post: { status: 'PUBLISHED', deletedAt: null },
    } as never)
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.contentReport.create).mockResolvedValue({ id: 'rep-c' } as never)
    const result = await createContentReport('user-b', {
      targetType: 'POST_COMMENT',
      targetId: 'c-1',
      reason: 'SCAM_OR_FRAUD',
    })
    expect(result.message).toContain('Thanks')
    expect(prisma.contentReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'user-b',
          targetType: 'POST_COMMENT',
          targetId: 'c-1',
          reportedTextSnapshot: 'buy crypto now',
        }),
      }),
    )
  })

  it('allows a new report after the previous episode is closed', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1', caption: 'Hello' } as never)
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.contentReport.create).mockResolvedValue({ id: 'rep-2' } as never)
    await createContentReport('user-a', { targetType: 'POST', targetId: 'post-1', reason: 'SPAM' })
    expect(prisma.contentReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reporterId: 'user-a',
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
        }),
      }),
    )
  })
})
