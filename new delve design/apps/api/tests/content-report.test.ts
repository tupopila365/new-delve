import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/middleware/error-handler.js'

vi.mock('@delve/database', () => ({
  prisma: {
    post: { findFirst: vi.fn() },
    travelerEvent: { findFirst: vi.fn() },
    journey: { findFirst: vi.fn() },
    contentReport: { findUnique: vi.fn(), create: vi.fn() },
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
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1' } as never)
    vi.mocked(prisma.contentReport.findUnique).mockResolvedValue(null)
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
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1' } as never)
    vi.mocked(prisma.contentReport.findUnique).mockResolvedValue({ id: 'rep-1', status: 'OPEN' } as never)
    await expect(
      createContentReport('user-a', { targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REPORT_EXISTS' } satisfies Partial<AppError>)
    expect(prisma.contentReport.create).not.toHaveBeenCalled()
  })
})
