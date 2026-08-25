import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import { hashToken, signAccessToken } from '../src/modules/auth/crypto.js'

vi.mock('@delve/database', () => {
  const fn = () => vi.fn()
  return {
    prisma: {
      session: { findUnique: fn(), update: fn(), updateMany: fn() },
      user: { findUnique: fn() },
      adminAuditLog: { create: fn() },
      payment: { findMany: fn(), count: fn(), findUnique: fn(), findFirst: fn() },
      businessPayable: { findMany: fn(), findUnique: fn() },
      refund: { findMany: fn() },
      transferReversal: { findMany: fn() },
      paymentDispute: { findMany: fn() },
      financialRecoveryCase: { findMany: fn(), findFirst: fn() },
      unmatchedStripeFinancialEvent: { count: fn(), findMany: fn() },
      financialReconciliationIssue: { findMany: fn(), findFirst: fn(), count: fn() },
      booking: { findUnique: fn(), findMany: fn() },
      business: { findMany: fn(), findUnique: fn() },
      businessMember: { findUnique: fn() },
    },
  }
})

vi.mock('../src/modules/payment/stripe-client.js', () => ({
  requireStripe: () => ({
    balance: { retrieve: vi.fn(async () => ({ available: [], pending: [] })) },
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

const ownerUser = {
  id: 'owner-1',
  email: 'owner@example.com',
  username: 'owner1',
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
  vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.payment.count).mockResolvedValue(0 as never)
  vi.mocked(prisma.businessPayable.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.refund.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.transferReversal.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.financialRecoveryCase.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.unmatchedStripeFinancialEvent.count).mockResolvedValue(0 as never)
  vi.mocked(prisma.financialReconciliationIssue.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.financialReconciliationIssue.findFirst).mockResolvedValue(null as never)
  vi.mocked(prisma.business.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
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
  return fetch(`${base}${path}`, { ...init, headers })
}

async function asProvider(path: string, role: 'OWNER' | 'MANAGER' | 'CONTENT_EDITOR', businessId = 'biz-a') {
  const token = await signAccessToken(env, 'owner-1', 'sess-owner')
  vi.mocked(prisma.session.findUnique).mockResolvedValue({
    id: 'sess-owner',
    userId: 'owner-1',
    isAdminSession: false,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
    lastSeenAt: new Date(),
    createdAt: new Date(),
  } as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(ownerUser as never)
  vi.mocked(prisma.businessMember.findUnique).mockImplementation(async (args: { where: { userId_businessId: { businessId: string } } }) => {
    const requested = args.where.userId_businessId.businessId
    if (requested !== businessId) return null
    return { userId: 'owner-1', businessId, role } as never
  })
  return fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } })
}

describe('financial report HTTP authorization', () => {
  it('rejects anonymous Admin reports', async () => {
    const res = await fetch(`${base}/admin/reports/summary`)
    expect(res.status).toBe(401)
  })

  it('rejects traveler Bearer tokens on Admin reports', async () => {
    const token = await signAccessToken(env, 'owner-1', 'sess-owner')
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 'sess-owner',
      userId: 'owner-1',
      isAdminSession: false,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      lastSeenAt: new Date(),
      createdAt: new Date(),
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ownerUser as never)
    const res = await fetch(`${base}/admin/reports/summary`, { headers: { authorization: `Bearer ${token}` } })
    expect(res.status).toBe(401)
  })

  it('rejects provider members from Admin reports', async () => {
    const res = await asProvider('/admin/reports/summary', 'OWNER')
    expect(res.status).toBe(401)
  })

  it('allows Admin reports and CSV export', async () => {
    const summary = await asAdmin('/admin/reports/summary?preset=LAST_30_DAYS')
    expect(summary.status).toBe(200)
    const body = (await summary.json()) as { success: boolean; data: { byCurrency: unknown[] } }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.byCurrency)).toBe(true)

    const csv = await asAdmin('/admin/reports/export/payments?preset=LAST_30_DAYS')
    expect(csv.status).toBe(200)
    expect(csv.headers.get('content-type')).toMatch(/text\/csv/)
    const text = await csv.text()
    expect(text).toContain('grossAmount')
    expect(text).not.toContain('sk_test')
    expect(text).not.toContain('client_secret')
  })

  it('allows provider OWNER own reports and denies other businesses', async () => {
    const own = await asProvider('/businesses/biz-a/payments/reports?preset=THIS_MONTH', 'OWNER', 'biz-a')
    expect(own.status).toBe(200)
    const other = await asProvider('/businesses/biz-b/payments/reports?preset=THIS_MONTH', 'OWNER', 'biz-a')
    expect(other.status).toBe(403)
  })

  it('denies CONTENT_EDITOR financial reports and exports', async () => {
    const report = await asProvider('/businesses/biz-a/payments/reports?preset=THIS_MONTH', 'CONTENT_EDITOR', 'biz-a')
    expect(report.status).toBe(403)
    const csv = await asProvider('/businesses/biz-a/payments/reports/export.csv?preset=THIS_MONTH', 'CONTENT_EDITOR', 'biz-a')
    expect(csv.status).toBe(403)
  })
})
