import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@delve/database', () => ({
  prisma: {
    financialRecoveryCase: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    adminAuditLog: { create: vi.fn() },
  },
}))

import { prisma } from '@delve/database'
import { upsertFinancialRecoveryCase } from '../src/modules/payment/recovery-case.service.js'

describe('financial recovery cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('creates one open case and reuses it on repeat reconciliation', async () => {
    vi.mocked(prisma.financialRecoveryCase.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: 'case1', status: 'OPEN' } as never)
    vi.mocked(prisma.financialRecoveryCase.create).mockResolvedValue({ id: 'case1' } as never)
    vi.mocked(prisma.financialRecoveryCase.update).mockResolvedValue({ id: 'case1' } as never)

    const first = await upsertFinancialRecoveryCase({
      fingerprint: 'reversal-failed:rev1',
      type: 'DISPUTE_LOSS_REVERSAL_FAILED',
      businessId: 'biz1',
      paymentId: 'pay1',
      bookingId: 'bk1',
      amount: '900.00',
      currency: 'NAD',
      reason: 'reversal failed',
    })
    const second = await upsertFinancialRecoveryCase({
      fingerprint: 'reversal-failed:rev1',
      type: 'DISPUTE_LOSS_REVERSAL_FAILED',
      businessId: 'biz1',
      paymentId: 'pay1',
      bookingId: 'bk1',
      amount: '900.00',
      currency: 'NAD',
      reason: 'reversal failed again',
    })
    expect(first).toEqual({ created: true, id: 'case1' })
    expect(second).toEqual({ created: false, id: 'case1' })
    expect(prisma.financialRecoveryCase.create).toHaveBeenCalledTimes(1)
  })
})
