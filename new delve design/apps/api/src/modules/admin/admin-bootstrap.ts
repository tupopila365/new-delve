import { prisma } from '@delve/database'
import {
  normalizeEmail,
  usernameSchema,
  passwordSchema,
  isReservedUsername,
} from '@delve/contracts'
import { hashPassword } from '../auth/crypto.js'
import { writeAdminAudit } from './admin-audit.js'

export type BootstrapInput = {
  email: string
  username: string
  password: string
}

export type BootstrapResult =
  | { ok: true; userId: string; email: string; username: string }
  | { ok: false; code: string; message: string }

/**
 * Idempotent first-administrator creation. Used by `pnpm admin:create` and tests.
 * Never prints or returns the password.
 */
export async function bootstrapFirstAdmin(input: BootstrapInput): Promise<BootstrapResult> {
  const email = normalizeEmail(input.email)
  if (!email.includes('@') || !email.includes('.')) {
    return { ok: false, code: 'INVALID_EMAIL', message: 'Enter a valid email address.' }
  }

  const usernameParsed = usernameSchema.safeParse(input.username)
  if (!usernameParsed.success) {
    return {
      ok: false,
      code: 'INVALID_USERNAME',
      message: usernameParsed.error.issues[0]?.message || 'Invalid username.',
    }
  }
  const usernameNormalized = usernameParsed.data
  if (isReservedUsername(usernameNormalized)) {
    return { ok: false, code: 'RESERVED_USERNAME', message: 'That username is reserved.' }
  }

  const passwordParsed = passwordSchema.safeParse(input.password)
  if (!passwordParsed.success) {
    return {
      ok: false,
      code: 'WEAK_PASSWORD',
      message: passwordParsed.error.issues[0]?.message || 'Password is too weak.',
    }
  }

  await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(hashtext('delve_admin_bootstrap'))`)
  try {
    const existingAdmins = await prisma.user.count({ where: { role: 'admin' } })
    if (existingAdmins > 0) {
      return {
        ok: false,
        code: 'ADMIN_EXISTS',
        message:
          'An administrator already exists. Create additional administrators through an authorized administrative process.',
      }
    }

    const emailOwner = await prisma.user.findUnique({ where: { email } })
    if (emailOwner) {
      return {
        ok: false,
        code: 'EMAIL_TAKEN',
        message: 'A user already owns that email. Refusing to silently promote a traveler.',
      }
    }
    const usernameOwner = await prisma.user.findUnique({ where: { usernameNormalized } })
    if (usernameOwner) {
      return {
        ok: false,
        code: 'USERNAME_TAKEN',
        message: 'A user already owns that username. Refusing to silently promote a traveler.',
      }
    }

    const passwordHash = await hashPassword(passwordParsed.data)
    const user = await prisma.user.create({
      data: {
        email,
        username: usernameNormalized,
        usernameNormalized,
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        emailVerifiedAt: new Date(),
      },
    })

    await writeAdminAudit({
      action: 'ADMIN_BOOTSTRAPPED',
      outcome: 'success',
      actorUserId: user.id,
      targetType: 'user',
      targetId: user.id,
      metadata: { via: 'admin:create' },
    })

    return { ok: true, userId: user.id, email: user.email, username: user.username }
  } finally {
    try {
      await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(hashtext('delve_admin_bootstrap'))`)
    } catch {
      // ignore
    }
  }
}
