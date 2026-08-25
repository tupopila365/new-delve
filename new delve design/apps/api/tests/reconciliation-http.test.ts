import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import { hashToken } from '../src/modules/auth/crypto.js'

vi.mock('@delve/database', () => {
  const fn = () => vi.fn()
  return {
    prisma: {
      session: { findUnique: fn(), update: fn(), updateMany: fn() },
      user: { findUnique: fn() },
      adminAuditLog: { create: fn() },
      financialReconciliationRun: { create: fn(), update: fn(), findFirst: fn() },
      financialReconciliationIssue: {
        count: fn(),
        findMany: fn(),
        findUnique: fn(),
        create: fn(),
        update: fn(),
      },
      unmatchedStripeFinancialEvent: { count: fn(), findMany: fn(), findUnique: fn(), update: fn() },
      financialRecoveryCase: { count: fn(), findMany: fn(), findUnique: fn(), create: fn(), update: fn() },
      payment: { findMany: fn(), findUnique: fn() },
      refund: { findMany: fn(), findUnique: fn() },
      businessPayable: { findMany: fn(), findUnique: fn() },
      transferReversal: { findMany: fn(), findUnique: fn() },
      paymentDispute: { findMany: fn(), findUnique: fn() },
      business: { findMany: fn() },
      booking: { findUnique: fn() },
    },
  }
})

vi.mock('../src/modules/payment/stripe-client.js', () => ({
  requireStripe: () => ({
    paymentIntents: { retrieve: vi.fn() },
    refunds: { retrieve: vi.fn() },
    transfers: { retrieve: vi.fn() },
    disputes: { retrieve: vi.fn() },
    accounts: { retrieve: vi.fn() },
  }),
  requireStripeWebhookSecret: () => 'whsec',
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { createApp } from '../src/app.js'
import { issueAdminCsrfToken } from '../src/modules/admin/admin-cookie.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  ADMIN_WEB_URL: 'http://localhost:5174',
  ADMIN_WEB_ORIGIN: 'http://localhost:5174',
  STRIPE_SECRET_KEY: 'sk_test_123',
  RECONCILIATION_SCHEDULE_ENABLED: 'false',
})

const app = createApp(env)
const server = app.listen(0)
const port = (server.address() as AddressInfo).port
const base = `http://127.0.0.1:${port}/api/v2`

const adminUser = {
  id: 'admin-1',
  email: 'ops@delveworldwide.me',
  username: 'opsadmin',
  role: 'admin',
  accountStatus: 'active',
  emailVerifiedAt: new Date(),
}

const travelerUser = {
  id: 'trav-1',
  email: 'trav@example.com',
  username: 'traveler1',
  role: 'traveler',
  accountStatus: 'active',
  emailVerifiedAt: new Date(),
}

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.financialReconciliationIssue.count).mockResolvedValue(0 as never)
  vi.mocked(prisma.unmatchedStripeFinancialEvent.count).mockResolvedValue(0 as never)
  vi.mocked(prisma.financialRecoveryCase.count).mockResolvedValue(0 as never)
  vi.mocked(prisma.financialReconciliationRun.findFirst).mockResolvedValue(null as never)
  vi.mocked(prisma.financialReconciliationIssue.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.unmatchedStripeFinancialEvent.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.financialRecoveryCase.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.financialReconciliationIssue.findUnique).mockResolvedValue({
    id: 'iss1',
    fingerprint: 'x',
    type: 'PAYMENT',
    severity: 'CRITICAL',
    status: 'OPEN',
    code: 'PAID_BUT_STRIPE_NOT_SUCCEEDED',
    summary: 'review',
    bookingId: null,
    businessId: null,
    stripeObjectId: 'pi_1',
    detectedAt: new Date(),
    lastDetectedAt: new Date(),
    runId: null,
    paymentId: 'pay1',
    businessPayableId: null,
    refundId: null,
    transferReversalId: null,
    disputeId: null,
    stripeObjectType: 'payment_intent',
    recommendedAction: 'Admin review',
    localState: 'PAID',
    stripeState: 'canceled',
    resolvedAt: null,
    resolutionType: null,
    resolutionNote: null,
  } as never)
  vi.mocked(prisma.financialRecoveryCase.findUnique).mockResolvedValue({
    id: 'rc1',
    type: 'DISPUTE_LOSS_REVERSAL_FAILED',
    status: 'OPEN',
    amount: { toString: () => '900.00' },
    currency: 'NAD',
    reason: 'failed',
    businessId: 'biz1',
    bookingId: 'bk1',
    paymentId: 'pay1',
    businessPayableId: 'pb1',
    disputeId: 'd1',
    transferReversalId: 'rev1',
    adminNote: null,
    createdAt: new Date(),
    resolvedAt: null,
  } as never)
  vi.mocked(prisma.booking.findUnique).mockResolvedValue({ bookingReference: 'DLV-BK-1' } as never)
  vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  vi.mocked(prisma.financialReconciliationRun.create).mockResolvedValue({
    id: 'run1',
    scope: 'STALE',
    status: 'RUNNING',
    startedAt: new Date(),
    completedAt: null,
    recordsChecked: 0,
    mismatchesFound: 0,
    recoveriesApplied: 0,
    errorsCount: 0,
    triggeredByType: 'ADMIN',
    createdAt: new Date(),
  } as never)
  vi.mocked(prisma.financialReconciliationRun.update).mockResolvedValue({
    id: 'run1',
    scope: 'STALE',
    status: 'COMPLETED',
    startedAt: new Date(),
    completedAt: new Date(),
    recordsChecked: 0,
    mismatchesFound: 0,
    recoveriesApplied: 0,
    errorsCount: 0,
    triggeredByType: 'ADMIN',
    createdAt: new Date(),
  } as never)
  vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.refund.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.businessPayable.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.transferReversal.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.business.findMany).mockResolvedValue([] as never)
})

function adminSession(raw: string) {
  return {
    id: 's-admin',
    userId: 'admin-1',
    isAdminSession: true,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    tokenHash: hashToken(raw),
  }
}

async function asAdmin(path: string, init?: RequestInit) {
  const raw = 'admin-raw-token'
  vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
  const csrf = issueAdminCsrfToken()
  const headers = new Headers(init?.headers)
  headers.set('cookie', `delve_admin_session=${encodeURIComponent(raw)}; delve_admin_csrf=${csrf}`)
  if ((init?.method || 'GET') !== 'GET') {
    headers.set('x-csrf-token', csrf)
    headers.set('origin', 'http://localhost:5174')
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  }
  return fetch(`${base}${path}`, { ...init, headers })
}

describe('reconciliation HTTP authorization', () => {
  it('rejects anonymous reconciliation access', async () => {
    const res = await fetch(`${base}/admin/reconciliation/summary`)
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects traveler Bearer tokens on admin reconciliation', async () => {
    const res = await fetch(`${base}/admin/reconciliation/summary`, {
      headers: { authorization: 'Bearer traveler-access-token' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects a non-admin session cookie (provider OWNER/MANAGER/CONTENT_EDITOR)', async () => {
    const raw = 'provider-token'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      ...adminSession(raw),
      userId: 'trav-1',
      isAdminSession: false,
    } as never)
    const res = await fetch(`${base}/admin/reconciliation/summary`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(401)
  })

  it('rejects a traveler user even if they present an admin-looking cookie session', async () => {
    const raw = 'not-admin'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(travelerUser as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 } as never)
    const res = await fetch(`${base}/admin/reconciliation/summary`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ADMIN_FORBIDDEN')
  })

  it('allows administrator cookie access to summary, issue detail, unmatched list, and recovery detail', async () => {
    const summary = await asAdmin('/admin/reconciliation/summary')
    expect(summary.status).toBe(200)
    const issues = await asAdmin('/admin/reconciliation/issues?status=OPEN')
    expect(issues.status).toBe(200)
    const issue = await asAdmin('/admin/reconciliation/issues/iss1')
    expect(issue.status).toBe(200)
    const unmatched = await asAdmin('/admin/reconciliation/unmatched')
    expect(unmatched.status).toBe(200)
    const recovery = await asAdmin('/admin/reconciliation/recovery-cases/rc1')
    expect(recovery.status).toBe(200)
  })

  it('requires CSRF on reconciliation mutations', async () => {
    const raw = 'admin-raw-token'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/admin/reconciliation/run`, {
      method: 'POST',
      headers: {
        cookie: `delve_admin_session=${encodeURIComponent(raw)}`,
        origin: 'http://localhost:5174',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ scope: 'STALE' }),
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('CSRF_DENIED')
  })

  it('allows an administrator CSRF mutation to start a run', async () => {
    const res = await asAdmin('/admin/reconciliation/run', {
      method: 'POST',
      body: JSON.stringify({ scope: 'STALE' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data?: { id: string } }
    expect(body.success).toBe(true)
    expect(body.data?.id).toBe('run1')
  })
})
