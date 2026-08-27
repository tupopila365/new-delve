import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    contentReport: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    communityReport: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    contentModerationAction: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    post: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    travelerEvent: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    journey: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    community: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    communityThread: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityMembership: { findUnique: vi.fn() },
    communityAuditLog: { findMany: vi.fn() },
    notification: { create: vi.fn() },
    adminAuditLog: { create: vi.fn(), count: vi.fn() },
    comment: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityAnswer: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))

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

describe('admin moderation HTTP auth', () => {
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
    vi.mocked(prisma.contentReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.communityReport.groupBy).mockResolvedValue([])
    vi.mocked(prisma.contentReport.count).mockResolvedValue(0)
    vi.mocked(prisma.communityReport.count).mockResolvedValue(0)
    vi.mocked(prisma.contentReport.findMany).mockResolvedValue([])
    vi.mocked(prisma.post.count).mockResolvedValue(0)
    vi.mocked(prisma.travelerEvent.count).mockResolvedValue(0)
    vi.mocked(prisma.journey.count).mockResolvedValue(0)
    vi.mocked(prisma.community.count).mockResolvedValue(0)
    vi.mocked(prisma.comment.count).mockResolvedValue(0)
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.contentModerationAction.count).mockResolvedValue(0)
    vi.mocked(prisma.contentModerationAction.findMany).mockResolvedValue([])
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.adminAuditLog.count).mockResolvedValue(0)
  })

  it('rejects anonymous queue requests', async () => {
    const res = await fetch(`${base}/moderation/queue`)
    expect(res.status).toBe(401)
  })

  it('rejects traveler Bearer tokens', async () => {
    const res = await fetch(`${base}/moderation/queue`, { headers: { Authorization: 'Bearer traveler-token' } })
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
    const res = await fetch(`${base}/moderation/queue`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(403)
  })

  it('allows a valid Admin cookie session', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/moderation/queue?page=1&pageSize=25`, {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { items: unknown[] } }
    expect(json.success).toBe(true)
    expect(json.data.items).toEqual([])
  })

  it('rejects decide without CSRF', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/moderation/cases/POST/post-1/decide`, {
      method: 'POST',
      headers: {
        cookie: `delve_admin_session=${encodeURIComponent(raw)}`,
        origin: 'http://localhost:5174',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'NO_ACTION' }),
    })
    expect(res.status).toBe(403)
  })

  it('rejects decide from an invalid origin', async () => {
    const raw = 'admin-cookie'
    vi.mocked(prisma.session.findUnique).mockResolvedValue(adminSession(raw) as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    const res = await fetch(`${base}/moderation/cases/POST/post-1/decide`, {
      method: 'POST',
      headers: {
        cookie: `delve_admin_session=${encodeURIComponent(raw)}; delve_admin_csrf=abc`,
        'x-csrf-token': 'abc',
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'NO_ACTION' }),
    })
    expect(res.status).toBe(403)
  })
})
