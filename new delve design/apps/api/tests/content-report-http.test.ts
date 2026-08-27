import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

vi.mock('@delve/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    post: { findFirst: vi.fn() },
    travelerEvent: { findFirst: vi.fn() },
    journey: { findFirst: vi.fn() },
    comment: { findFirst: vi.fn() },
    contentReport: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('../src/modules/auth/crypto.js', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/auth/crypto.js')>('../src/modules/auth/crypto.js')
  return {
    ...actual,
    verifyAccessToken: vi.fn(),
  }
})

import { prisma } from '@delve/database'
import { verifyAccessToken } from '../src/modules/auth/crypto.js'
import { loadEnv } from '../src/config/env.js'
import { createSocialRouter } from '../src/modules/social/social.routes.js'
import { errorHandler } from '../src/middleware/error-handler.js'

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
  SESSION_SECRET: 'this-is-a-long-enough-session-secret',
  TRAVELER_WEB_URL: 'http://localhost:8443',
  ADMIN_WEB_URL: 'http://localhost:5174',
  ADMIN_WEB_ORIGIN: 'http://localhost:5174',
})

describe('traveler content report HTTP', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/v2', createSocialRouter(env))
    app.use(errorHandler)
    server = app.listen(0)
    const port = (server.address() as AddressInfo).port
    base = `http://127.0.0.1:${port}/api/v2`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects anonymous reports', async () => {
    const res = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }),
    })
    expect(res.status).toBe(401)
  })

  it('allows an authenticated traveler to report a post', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: 'user-a', sessionId: 'sess-a' } as never)
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 'sess-a',
      userId: 'user-a',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      isAdminSession: false,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-a',
      role: 'traveler',
      accountStatus: 'active',
    } as never)
    vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'post-1', caption: 'Hello' } as never)
    vi.mocked(prisma.contentReport.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.contentReport.create).mockResolvedValue({ id: 'rep-1' } as never)
    const res = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: { authorization: 'Bearer traveler-token', 'content-type': 'application/json' },
      body: JSON.stringify({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }),
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; data: { message: string } }
    expect(json.data.message).toContain('Thanks')
    expect(JSON.stringify(json)).not.toContain('reporter')
  })
})
