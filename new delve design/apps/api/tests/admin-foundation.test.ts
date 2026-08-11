import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@delve/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(async (ops: unknown) => {
      if (typeof ops === 'function') return ops({
        user: { create: vi.fn(), update: vi.fn() },
        session: { updateMany: vi.fn() },
      })
      return Promise.all(ops as Promise<unknown>[])
    }),
  },
}))

import { prisma } from '@delve/database'
import { loadEnv } from '../src/config/env.js'
import { bootstrapFirstAdmin } from '../src/modules/admin/admin-bootstrap.js'
import { adminLogin, adminLogout, adminLogoutAll, removeAdminRole } from '../src/modules/admin/admin.service.js'
import { hashIdentifier } from '../src/modules/admin/admin-audit.js'
import { requireAdminSession, requireAdminCsrf, type AdminAuthedRequest } from '../src/middleware/require-admin-session.js'
import { hashPassword, hashToken } from '../src/modules/auth/crypto.js'
import { resetRateLimits } from '../src/modules/auth/rate-limit.js'
import { AppError } from '../src/middleware/error-handler.js'
import {
  setAdminSessionCookie,
  clearAdminSessionCookie,
  parseCookies,
  setAdminCsrfCookie,
  csrfHeaderMatchesCookie,
  issueAdminCsrfToken,
  adminCookiesMustBeSecure,
} from '../src/modules/admin/admin-cookie.js'

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
  email: 'ops@delveworldwide.me',
  username: 'opsadmin',
  usernameNormalized: 'opsadmin',
  role: 'admin' as const,
  accountStatus: 'active' as const,
  emailVerifiedAt: new Date(),
  travelerProfile: { displayName: 'Ops Admin' },
}

describe('admin bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as never)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('creates the first administrator with hashed password and audit event', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockImplementation(async ({ data }) => {
      expect(data.passwordHash).not.toBe('StrongPass1!')
      expect(data.passwordHash.length).toBeGreaterThan(20)
      expect(data.email).toBe('ops@delveworldwide.me')
      expect(data.usernameNormalized).toBe('opsadmin')
      expect(data.role).toBe('admin')
      expect(data.accountStatus).toBe('active')
      expect(data.emailVerifiedAt).toBeInstanceOf(Date)
      return { id: 'admin-1', email: data.email, username: data.username } as never
    })

    const result = await bootstrapFirstAdmin({
      email: '  Ops@DelveWorldwide.me ',
      username: 'OpsAdmin',
      password: 'StrongPass1!',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(JSON.stringify(result)).not.toMatch(/StrongPass1/)
    }
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_BOOTSTRAPPED', outcome: 'success' }),
      }),
    )
  })

  it('rejects weak passwords and existing administrators', async () => {
    const weak = await bootstrapFirstAdmin({
      email: 'a@b.co',
      username: 'opsadmin',
      password: 'short',
    })
    expect(weak.ok).toBe(false)
    if (!weak.ok) expect(weak.code).toBe('WEAK_PASSWORD')

    vi.mocked(prisma.user.count).mockResolvedValue(1)
    const exists = await bootstrapFirstAdmin({
      email: 'a@b.co',
      username: 'opsadmin',
      password: 'StrongPass1!',
    })
    expect(exists.ok).toBe(false)
    if (!exists.ok) expect(exists.code).toBe('ADMIN_EXISTS')
  })

  it('does not silently promote an existing traveler', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'traveler-1' } as never)
    const result = await bootstrapFirstAdmin({
      email: 'taken@example.com',
      username: 'freshname',
      password: 'StrongPass1!',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('EMAIL_TAKEN')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})

describe('admin authentication', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.clearAllMocks()
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('signs in with email and creates an admin session without returning JS tokens', async () => {
    const passwordHash = await hashPassword('StrongPass1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...adminUser, passwordHash } as never)
    vi.mocked(prisma.session.create).mockResolvedValue({
      id: 'sess-admin',
      tokenFamilyId: 'fam',
      isAdminSession: true,
      expiresAt: new Date(Date.now() + 8 * 3600_000),
    } as never)

    const result = await adminLogin(env, { identifier: 'ops@delveworldwide.me', password: 'StrongPass1!' }, '1.1.1.1')
    expect(result.user.role).toBe('admin')
    expect(result.rawSessionToken).toBeTruthy()
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAdminSession: true,
          tokenHash: hashToken(result.rawSessionToken),
        }),
      }),
    )
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_LOGIN_SUCCEEDED' }),
      }),
    )
  })

  it('uses a generic failure for travelers, bad passwords, and unknown accounts', async () => {
    const passwordHash = await hashPassword('StrongPass1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...adminUser,
      role: 'traveler',
      passwordHash,
    } as never)
    await expect(
      adminLogin(env, { identifier: 'ops@delveworldwide.me', password: 'StrongPass1!' }, '2.2.2.2'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(
      adminLogin(env, { identifier: 'missing@x.com', password: 'StrongPass1!' }, '2.2.2.2'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_LOGIN_FAILED',
          identifierHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    )
    const meta = vi.mocked(prisma.adminAuditLog.create).mock.calls.map(c => JSON.stringify(c[0]))
    expect(meta.join('')).not.toMatch(/StrongPass1|passwordHash/)
  })

  it('rejects suspended and unverified administrators with the generic error', async () => {
    const passwordHash = await hashPassword('StrongPass1!')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...adminUser,
      passwordHash,
      accountStatus: 'disabled',
    } as never)
    await expect(
      adminLogin(env, { identifier: 'opsadmin', password: 'StrongPass1!' }, '3.3.3.3'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...adminUser,
      passwordHash,
      emailVerifiedAt: null,
    } as never)
    await expect(
      adminLogin(env, { identifier: 'opsadmin', password: 'StrongPass1!' }, '3.3.3.3'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('logs out and logout-all revokes admin sessions', async () => {
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })
    await adminLogout('sess-1', 'admin-1')
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedReason: 'admin_logout' }),
      }),
    )
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 3 })
    const all = await adminLogoutAll('admin-1', 'sess-1')
    expect(all.revokedCount).toBe(3)
  })

  it('rate limits admin login attempts', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    for (let i = 0; i < 20; i++) {
      await adminLogin(env, { identifier: 'x@y.com', password: 'nope' }, '9.9.9.9').catch(() => undefined)
    }
    await expect(adminLogin(env, { identifier: 'x@y.com', password: 'nope' }, '9.9.9.9')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
  })
})

describe('admin authorization middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('returns 401 without a cookie', async () => {
    const mw = requireAdminSession(env)
    const req = { headers: {} } as AdminAuthedRequest
    const next = vi.fn()
    await mw(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 })
  })

  it('returns 403 for traveler-owned non-admin sessions masquerading via cookie', async () => {
    const raw = 'traveler-token'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      isAdminSession: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      tokenHash: hashToken(raw),
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      role: 'traveler',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
    } as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 1 })

    const mw = requireAdminSession(env)
    const req = {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    } as AdminAuthedRequest
    const next = vi.fn()
    await mw(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'ADMIN_FORBIDDEN', statusCode: 403 })
  })

  it('allows a valid administrator cookie session', async () => {
    const raw = 'admin-token'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's1',
      userId: 'admin-1',
      isAdminSession: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      tokenHash: hashToken(raw),
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...adminUser,
    } as never)

    const mw = requireAdminSession(env)
    const req = {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    } as AdminAuthedRequest
    const next = vi.fn()
    await mw(req, {} as never, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.userId).toBe('admin-1')
    expect(req.isAdminSession).toBe(true)
  })

  it('rejects idle and revoked sessions', async () => {
    const raw = 'idle-token'
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: 's-idle',
      userId: 'admin-1',
      isAdminSession: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      lastSeenAt: new Date(Date.now() - 60 * 60_000),
      createdAt: new Date(Date.now() - 60 * 60_000),
      tokenHash: hashToken(raw),
    } as never)
    vi.mocked(prisma.session.update).mockResolvedValue({} as never)

    const mw = requireAdminSession(env)
    const req = {
      headers: { cookie: `delve_admin_session=${encodeURIComponent(raw)}` },
    } as AdminAuthedRequest
    const next = vi.fn()
    await mw(req, {} as never, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'SESSION_IDLE' })
  })
})

describe('admin role removal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never)
  })

  it('revokes admin sessions when role is removed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'admin-1', role: 'admin', accountStatus: 'active' } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(2)
    vi.mocked(prisma.$transaction).mockImplementation(async ops => {
      if (Array.isArray(ops)) {
        await Promise.all(ops)
      }
      return []
    })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 })

    const result = await removeAdminRole('admin-1', 'admin-2')
    expect(result.message).toMatch(/removed/i)
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_ROLE_REMOVED' }),
      }),
    )
  })
})

describe('admin cookies and interface', () => {
  it('sets HttpOnly Secure session cookies in production and issues CSRF cookies', () => {
    const headers: string[] = []
    const res = { append: (_k: string, v: string) => headers.push(v) } as never
    const prodEnv = loadEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://delve:delve@localhost:5432/delve',
      SESSION_SECRET: 'this-is-a-long-enough-session-secret',
      TRAVELER_WEB_URL: 'https://delveworldwide.me',
      ADMIN_WEB_URL: 'https://admin.delveworldwide.me',
      BREVO_API_KEY: 'key',
      BREVO_SENDER_EMAIL: 'noreply@delveworldwide.me',
      CLOUDINARY_CLOUD_NAME: 'c',
      CLOUDINARY_API_KEY: 'k',
      CLOUDINARY_API_SECRET: 's',
    })
    setAdminSessionCookie(res, prodEnv, 'raw-token-value')
    expect(headers[0]).toMatch(/HttpOnly/)
    expect(headers[0]).toMatch(/Secure/)
    expect(headers[0]).toMatch(/Path=\/api\/v2\/admin/)
    expect(adminCookiesMustBeSecure(prodEnv)).toBe(true)

    const csrf = issueAdminCsrfToken()
    setAdminCsrfCookie(res, prodEnv, csrf)
    expect(headers[1]).toMatch(/delve_admin_csrf=/)
    expect(headers[1]).toMatch(/Secure/)
    expect(headers[1]).not.toMatch(/HttpOnly/)
    expect(csrfHeaderMatchesCookie(csrf, csrf)).toBe(true)
    expect(csrfHeaderMatchesCookie('wrong', csrf)).toBe(false)
  })

  it('sets HttpOnly admin cookies without Secure in local development', () => {
    const headers: string[] = []
    const res = { append: (_k: string, v: string) => headers.push(v) } as never
    setAdminSessionCookie(res, env, 'raw-token-value')
    expect(headers[0]).toMatch(/HttpOnly/)
    expect(headers[0]).not.toMatch(/Secure/)
    expect(headers[0]).toMatch(/Path=\/api\/v2\/admin/)
    clearAdminSessionCookie(res, env)
    expect(headers[1]).toMatch(/Max-Age=0/)
    expect(parseCookies('delve_admin_session=abc%20123')).toEqual({ delve_admin_session: 'abc 123' })
  })

  it('hashes identifiers for anonymous failures', () => {
    expect(hashIdentifier('Ops@Example.com')).toBe(hashIdentifier('ops@example.com'))
  })

  it('admin-web has no Google/Apple controls and gates on /auth/me', () => {
    const root = join(process.cwd(), '../admin-web/src/App.tsx')
    const source = readFileSync(root, 'utf8')
    expect(source).toContain('/admin/auth/me')
    expect(source).toContain("credentials: 'include'")
    expect(source).toContain('X-CSRF-Token')
    expect(source).not.toMatch(/Continue with Google|Continue with Apple|localStorage\.setItem|isAdmin\s*=\s*true/)
    expect(source).toContain('Administrator access')
    expect(source).toContain('Caps Lock')
    expect(source).toContain('autoComplete="username"')
    expect(source).toContain('autoComplete="current-password"')
    expect(source).toContain('minHeight: 44')
  })

  it('bootstrap CLI source never prints the password', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/create-admin.ts'), 'utf8')
    expect(script).toContain('promptHidden')
    expect(script).not.toMatch(/console\.log\(\s*(password|confirm)\s*\)/)
    expect(script).toMatch(/Credentials were not printed/i)
  })

  it('rejects mutations without a matching CSRF token', () => {
    const mw = requireAdminCsrf(env)
    const next = vi.fn()
    mw(
      {
        method: 'POST',
        get: () => undefined,
        headers: { cookie: 'delve_admin_csrf=abc' },
      } as never,
      {} as never,
      next,
    )
    expect(next.mock.calls[0]?.[0]).toMatchObject({ code: 'CSRF_DENIED', statusCode: 403 })

    const nextOk = vi.fn()
    mw(
      {
        method: 'POST',
        get: (name: string) => (name.toLowerCase() === 'x-csrf-token' ? 'abc' : undefined),
        headers: { cookie: 'delve_admin_csrf=abc' },
      } as never,
      {} as never,
      nextOk,
    )
    expect(nextOk).toHaveBeenCalledWith()
  })

  it('does not grant administrator access from any localStorage value', () => {
    const middlewareSource = readFileSync(
      join(process.cwd(), 'src/middleware/require-admin-session.ts'),
      'utf8',
    )
    expect(middlewareSource).not.toMatch(/localStorage/)
    expect(middlewareSource).toContain('ADMIN_SESSION_COOKIE_NAME')
    expect(middlewareSource).toContain('requireAdminCsrf')

    const platformClient = readFileSync(join(process.cwd(), '../../src/platform/api/client.ts'), 'utf8')
    expect(platformClient).not.toMatch(/localStorage/)
    expect(platformClient).not.toMatch(/delve_admin_access|delve_admin_refresh|delve_admin_mock_user/)

    const platformAuth = readFileSync(join(process.cwd(), '../../src/platform/auth/AuthContext.tsx'), 'utf8')
    expect(platformAuth).not.toMatch(/localStorage|delve_admin_mock_user|setTokens\('mock-access'/)

    const mockApi = readFileSync(join(process.cwd(), '../../src/platform/mocks/mockApi.ts'), 'utf8')
    expect(mockApi).not.toMatch(/localStorage|delve_admin_mock_user/)

    const adminWeb = readFileSync(join(process.cwd(), '../admin-web/src/App.tsx'), 'utf8')
    expect(adminWeb).not.toMatch(/localStorage\.setItem|localStorage\.getItem\(['\"]delve_admin/)
  })
})
