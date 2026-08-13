import { Account, Client, ID } from 'appwrite'
import type { LoginSuccessData, PublicUser } from '@delve/contracts'

/** Marker stored as access/refresh so existing signed-in checks keep working. */
export const APPWRITE_SESSION_MARKER = 'appwrite'

export function isAppwriteConfigured(): boolean {
  const endpoint = String(import.meta.env.VITE_APPWRITE_ENDPOINT || '').trim()
  const projectId = String(import.meta.env.VITE_APPWRITE_PROJECT_ID || '').trim()
  return Boolean(endpoint && projectId)
}

/** Match Appwrite Console: require users to verify email before login. Default off. */
export function isAppwriteEmailVerificationRequired(): boolean {
  const raw = String(import.meta.env.VITE_APPWRITE_EMAIL_VERIFICATION || 'off').toLowerCase()
  return raw === 'on' || raw === 'true' || raw === '1'
}

let client: Client | null = null
let account: Account | null = null

export function getAppwriteClient(): Client {
  if (!isAppwriteConfigured()) {
    throw new Error('Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.')
  }
  if (!client) {
    client = new Client()
      .setEndpoint(String(import.meta.env.VITE_APPWRITE_ENDPOINT))
      .setProject(String(import.meta.env.VITE_APPWRITE_PROJECT_ID))
  }
  return client
}

export function getAppwriteAccount(): Account {
  if (!account) account = new Account(getAppwriteClient())
  return account
}

type AppwriteUserLike = {
  $id: string
  email: string
  name?: string
  emailVerification?: boolean
  prefs?: Record<string, unknown>
}

export function mapAppwriteUser(user: AppwriteUserLike): PublicUser {
  const prefs = user.prefs || {}
  const fromPrefs = typeof prefs.username === 'string' ? prefs.username.trim() : ''
  const username =
    fromPrefs ||
    (user.name && user.name.trim()) ||
    user.email.split('@')[0] ||
    'traveler'

  return {
    id: user.$id,
    email: user.email,
    username,
    emailVerified: Boolean(user.emailVerification),
  }
}

export function toAppwriteLoginSuccess(user: PublicUser): LoginSuccessData {
  return {
    user,
    tokens: {
      accessToken: APPWRITE_SESSION_MARKER,
      refreshToken: APPWRITE_SESSION_MARKER,
      expiresIn: 60 * 60 * 24 * 365,
    },
  }
}

export async function appwriteGetCurrentUser(): Promise<PublicUser | null> {
  try {
    const user = await getAppwriteAccount().get()
    return mapAppwriteUser(user as AppwriteUserLike)
  } catch {
    return null
  }
}

export async function appwriteRegister(input: {
  username: string
  email: string
  password: string
}): Promise<{ user: PublicUser; sessionCreated: boolean }> {
  const acc = getAppwriteAccount()
  const username = input.username.trim()
  const email = input.email.trim().toLowerCase()

  await acc.create({
    userId: ID.unique(),
    email,
    password: input.password,
    name: username,
  })

  if (isAppwriteEmailVerificationRequired()) {
    const redirectUrl = `${window.location.origin}/verify-email`
    try {
      await acc.createVerification({ url: redirectUrl })
    } catch {
      /* Verification email may fail if SMTP is unset; account still exists. */
    }
    return {
      user: {
        id: '',
        email,
        username,
        emailVerified: false,
      },
      sessionCreated: false,
    }
  }

  await acc.createEmailPasswordSession({ email, password: input.password })
  try {
    await acc.updatePrefs({ prefs: { username } })
  } catch {
    /* prefs are best-effort for Phase 1 */
  }
  const current = await acc.get()
  return { user: mapAppwriteUser(current as AppwriteUserLike), sessionCreated: true }
}

export async function appwriteLogin(email: string, password: string): Promise<PublicUser> {
  const acc = getAppwriteAccount()
  const normalized = email.trim().toLowerCase()

  try {
    await acc.deleteSession({ sessionId: 'current' })
  } catch {
    /* no existing session */
  }

  await acc.createEmailPasswordSession({ email: normalized, password })
  const current = await acc.get()
  return mapAppwriteUser(current as AppwriteUserLike)
}

export async function appwriteLogout(): Promise<void> {
  try {
    await getAppwriteAccount().deleteSession({ sessionId: 'current' })
  } catch {
    /* already logged out */
  }
}

export function mapAppwriteError(err: unknown): { message: string; code?: string; status?: number } {
  const e = err as { message?: string; code?: number; type?: string }
  const message = e.message || 'Request failed'
  const type = (e.type || '').toLowerCase()
  const codeNum = e.code

  if (type.includes('user_invalid_credentials') || codeNum === 401) {
    return { message: 'Invalid email/username or password', code: 'INVALID_CREDENTIALS', status: 401 }
  }
  if (type.includes('user_already_exists') || codeNum === 409) {
    return { message: 'An account with that email already exists', code: 'EMAIL_TAKEN', status: 409 }
  }
  if (type.includes('user_blocked') || type.includes('user_unauthorized')) {
    return { message: 'This account cannot sign in right now', code: 'ACCOUNT_RESTRICTED', status: 403 }
  }
  if (message.toLowerCase().includes('not verified') || type.includes('user_not_verified')) {
    return { message: 'Verify your email to continue', code: 'EMAIL_NOT_VERIFIED', status: 403 }
  }
  return { message, code: type || undefined, status: typeof codeNum === 'number' ? codeNum : undefined }
}
