import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    session: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    booking: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    dealClaim: { count: vi.fn(), findMany: vi.fn() },
    journey: { count: vi.fn(), findMany: vi.fn() },
    travelerEvent: { count: vi.fn(), findMany: vi.fn() },
    eventAttendance: { count: vi.fn() },
    communityMembership: { count: vi.fn(), findMany: vi.fn() },
    communityThread: { findMany: vi.fn() },
    communityReport: { count: vi.fn() },
    post: { count: vi.fn(), findMany: vi.fn() },
    comment: { count: vi.fn() },
    save: { count: vi.fn() },
    follow: { count: vi.fn() },
    payment: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    refund: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    paymentDispute: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    bookingCancellationRequest: { findMany: vi.fn(), count: vi.fn() },
    financialReconciliationIssue: { count: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

vi.mock('@delve/database/decimal', () => {
  class Decimal {
    static ROUND_HALF_UP = 4
    constructor(private v: string | number) {}
    toDecimalPlaces() {
      return this
    }
    toFixed() {
      return Number(this.v).toFixed(2)
    }
    toString() {
      return String(this.v)
    }
    isFinite() {
      return true
    }
    minus() {
      return this
    }
  }
  return { Decimal }
})

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { createAdminRouter } from '../src/modules/admin/admin.routes.js'
import { errorHandler } from '../src/middleware/error-handler.js'
import { hashToken } from '../src/modules/auth/crypto.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  ADMIN_WEB_URL: 'http://localhost:5174',
  ADMIN_WEB_ORIGIN: 'http://localhost:5174',
  ADMIN_SESSION_TTL_HOURS: '8',
  ADMIN_SESSION_IDLE_TIMEOUT_MINUTES: '30',
  ADMIN_SESSION_COOKIE_NAME: 'delve_admin_session',
})

const adminUser = {
  id: 'admin-1',
  role: 'admin' as const,
  accountStatus: 'active',
  emailVerifiedAt: new Date(),
}

function adminSession(raw: string) {
  return {
    id: 'sess-admin',
    userId: adminUser.id,
    isAdminSession: true,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    tokenHash: hashToken(raw),
  }
}

describe('admin travelers HTTP auth', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/v2/admin', createAdminRouter(env))
    app.use(errorHandler)
    server = app.listen(0)
    const port = (server.address() as AddressInfo).port
    base = `http://127.0.0.1:${port}/api/v2/admin`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    vi.mocked(prisma.paymentDispute.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingCancellationRequest.findMany).mockResolvedValue([])
    vi.mocked(prisma.refund.findMany).mockResolvedValue([])
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('rejects anonymous list requests', async () => {
    const res = await fetch(`${base}/travelers`)
    expect(res.status).toBe(401)
  })

  it('rejects traveler Bearer tokens', async () => {
    const res = await fetch(`${base}/travelers`, { headers: { Authorization: 'Bearer traveler-token' } })
    expect(res.status).toBe(401)
  })

  it('rejects provider users even with an admin-shaped cookie session', async () => {
    const raw = 'provider-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      ...adminSession(raw),
      userId: 'prov-1',
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'prov-1',
      role: 'traveler',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
    } as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 } as never)
    const res = await fetch(`${base}/travelers`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(403)
  })

  it('allows a valid Admin cookie session', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/travelers?page=1&pageSize=25`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { items: unknown[] } }
    expect(json.success).toBe(true)
    expect(json.data.items).toEqual([])
  })

  it('rejects restrict without CSRF', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/travelers/user-a/restrict`, {
      method: 'POST',
      headers: {
        cookie: `delve_admin_session=${encodeURIComponent(raw)}`,
        origin: 'http://localhost:5174',
        'content-type': 'application/json',
      },
      body: '{}',
    })
    expect(res.status).toBe(403)
  })

  it('rejects restrict from an invalid origin', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/travelers/user-a/restrict`, {
      method: 'POST',
      headers: {
        cookie: `delve_admin_session=${encodeURIComponent(raw)}; delve_admin_csrf=abc`,
        'x-csrf-token': 'abc',
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: '{}',
    })
    expect(res.status).toBe(403)
  })
})
