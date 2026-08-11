import type {
  ChangeUsernameSuccess,
  LoginSuccessData,
  PublicUser,
  UsernameAvailabilityData,
  VerifyEmailResult,
} from '@delve/contracts'

const ACCESS_KEY = 'delve_traveler_access'
const REFRESH_KEY = 'delve_traveler_refresh'
const USER_KEY = 'delve_traveler_user'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

export class AuthApiError extends Error {
  code?: string
  status?: number
  details?: unknown
  constructor(message: string, init?: { code?: string; status?: number; details?: unknown }) {
    super(message)
    this.name = 'AuthApiError'
    this.code = init?.code
    this.status = init?.status
    this.details = init?.details
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: { code?: string; message?: string; details?: unknown }
  }
  if (!res.ok || !body.success) {
    throw new AuthApiError(body.error?.message || 'Request failed', {
      code: body.error?.code,
      status: res.status,
      details: body.error?.details,
    })
  }
  return body.data as T
}

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as PublicUser) : null
  } catch {
    return null
  }
}

export function persistSession(data: LoginSuccessData) {
  localStorage.setItem(ACCESS_KEY, data.tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, data.tokens.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

export function updateStoredUser(user: PublicUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function registerAccount(input: {
  username: string
  email: string
  password: string
  passwordConfirmation: string
}) {
  const res = await fetch(`${apiBase()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<{ email: string; message: string; deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED' }>(res)
}

export async function checkUsernameAvailable(username: string, signal?: AbortSignal) {
  const res = await fetch(`${apiBase()}/auth/username-availability?username=${encodeURIComponent(username)}`, {
    signal,
  })
  return parseJson<UsernameAvailabilityData>(res)
}

export async function resendVerificationEmail(email: string) {
  const res = await fetch(`${apiBase()}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return parseJson<{ message: string }>(res)
}

export async function verifyEmailToken(token: string) {
  const res = await fetch(`${apiBase()}/auth/verify-email?token=${encodeURIComponent(token)}`)
  try {
    return await parseJson<{ result: VerifyEmailResult; message: string }>(res)
  } catch (err) {
    if (err instanceof AuthApiError && err.code) {
      const code = err.code.toLowerCase() as VerifyEmailResult
      return { result: code, message: err.message }
    }
    throw err
  }
}

export async function loginWithIdentifier(identifier: string, password: string) {
  const res = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  const data = await parseJson<LoginSuccessData>(res)
  persistSession(data)
  return data
}

export async function refreshSession(): Promise<LoginSuccessData | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null
  const res = await fetch(`${apiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    clearSession()
    return null
  }
  const data = await parseJson<LoginSuccessData>(res)
  persistSession(data)
  return data
}

export async function logoutSession() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  try {
    if (refreshToken) {
      await fetch(`${apiBase()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }
  } finally {
    clearSession()
  }
}

export async function fetchUsernameChangeStatus() {
  const token = getStoredAccessToken()
  if (!token) throw new AuthApiError('Sign in required', { code: 'UNAUTHORIZED', status: 401 })
  const res = await fetch(`${apiBase()}/users/me/username`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseJson<{
    username: string
    usernameChangedAt: string | null
    nextChangeAvailableAt: string | null
    canChange: boolean
  }>(res)
}

export async function changeUsername(input: { username: string; currentPassword: string }) {
  const token = getStoredAccessToken()
  if (!token) throw new AuthApiError('Sign in required', { code: 'UNAUTHORIZED', status: 401 })
  const res = await fetch(`${apiBase()}/users/me/username`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })
  const data = await parseJson<ChangeUsernameSuccess>(res)
  const user = getStoredUser()
  if (user) {
    updateStoredUser({ ...user, username: data.username, usernameChangedAt: data.usernameChangedAt })
  }
  return data
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getStoredAccessToken()
  const refresh = localStorage.getItem(REFRESH_KEY)
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(refresh ? { 'x-refresh-token': refresh } : {}),
  }
}

export async function fetchOnboarding() {
  const res = await fetch(`${apiBase()}/users/me/onboarding`, { headers: authHeaders() })
  return parseJson<import('@delve/contracts').TravelerProfileDto>(res)
}

export async function patchOnboarding(body: import('@delve/contracts').OnboardingPatch) {
  const res = await fetch(`${apiBase()}/users/me/onboarding`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return parseJson<import('@delve/contracts').TravelerProfileDto>(res)
}

export async function completeOnboarding(body: import('@delve/contracts').OnboardingComplete) {
  const res = await fetch(`${apiBase()}/users/me/onboarding/complete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return parseJson<import('@delve/contracts').TravelerProfileDto>(res)
}

export async function updateProfile(body: import('@delve/contracts').ProfileUpdate) {
  const res = await fetch(`${apiBase()}/users/me/profile`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return parseJson<import('@delve/contracts').TravelerProfileDto>(res)
}

export async function requestAvatarUploadUrl(input: {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  contentLength: number
}) {
  const res = await fetch(`${apiBase()}/users/me/avatar/upload-url`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })
  return parseJson<{
    uploadUrl: string
    publicUrl: string
    key: string
    headers: Record<string, string>
    expiresAt: string
  }>(res)
}

export async function deleteAvatar() {
  const res = await fetch(`${apiBase()}/users/me/avatar`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<{ message: string }>(res)
}

export async function requestEmailChange(input: { newEmail: string; currentPassword: string }) {
  const res = await fetch(`${apiBase()}/users/me/email-change`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })
  return parseJson<{ message: string }>(res)
}

export async function verifyEmailChange(token: string) {
  const res = await fetch(`${apiBase()}/users/me/email-change/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return parseJson<{ message: string }>(res)
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}) {
  const res = await fetch(`${apiBase()}/users/me/change-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...input,
      currentRefreshToken: localStorage.getItem(REFRESH_KEY),
    }),
  })
  const data = await parseJson<{
    message: string
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number }
  }>(res)
  if (data.tokens) {
    localStorage.setItem(ACCESS_KEY, data.tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, data.tokens.refreshToken)
  }
  return data
}

export async function fetchSessions() {
  const res = await fetch(`${apiBase()}/users/me/sessions`, { headers: authHeaders() })
  return parseJson<import('@delve/contracts').SessionSummary[]>(res)
}

export async function revokeSession(sessionId: string) {
  const res = await fetch(`${apiBase()}/users/me/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<{ message: string; revokedCurrent: boolean }>(res)
}

export async function logoutAllDevices() {
  const res = await fetch(`${apiBase()}/auth/logout-all`, {
    method: 'POST',
    headers: authHeaders(),
  })
  await parseJson<{ message: string; revokedCount: number }>(res)
  clearSession()
}

export async function logoutOtherDevices() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  const res = await fetch(`${apiBase()}/auth/logout-others`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ refreshToken }),
  })
  return parseJson<{ message: string; revokedCount: number }>(res)
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${apiBase()}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return parseJson<{ message: string }>(res)
}

export async function inspectPasswordResetToken(token: string) {
  const res = await fetch(`${apiBase()}/auth/reset-password?token=${encodeURIComponent(token)}`)
  return parseJson<{ result: 'valid' | 'expired' | 'used' | 'invalid'; message: string }>(res)
}

export async function resetPasswordWithToken(input: {
  token: string
  newPassword: string
  newPasswordConfirmation: string
}) {
  const res = await fetch(`${apiBase()}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<{ result: 'success' | 'expired' | 'used' | 'invalid'; message: string }>(res)
}

export async function fetchPreferences() {
  const res = await fetch(`${apiBase()}/users/me/preferences`, { headers: authHeaders() })
  return parseJson<import('@delve/contracts').NotificationPreferences>(res)
}

export async function updatePreferences(body: Record<string, boolean>) {
  const res = await fetch(`${apiBase()}/users/me/preferences`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return parseJson<import('@delve/contracts').NotificationPreferences>(res)
}

export async function deactivateAccount(input: { currentPassword: string; confirm: true }) {
  const res = await fetch(`${apiBase()}/users/me/deactivate`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ message: string }>(res)
  clearSession()
  return data
}

