/**
 * Traveler auth — Backend V2 (Render / local API) via VITE_API_BASE_URL.
 * Session: access + refresh tokens in localStorage; refresh on mount and 401.
 */
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

type TravelerProfileDto = import('@delve/contracts').TravelerProfileDto

const ONBOARDING_CACHE_TTL_MS = 20_000
let onboardingCache: { data: TravelerProfileDto; fetchedAt: number } | null = null
let onboardingInFlight: Promise<TravelerProfileDto> | null = null

export function invalidateOnboardingCache() {
  onboardingCache = null
}

/** Merge fields into the cached profile (e.g. avatar after media complete). */
export function patchOnboardingCache(partial: Partial<TravelerProfileDto>) {
  if (!onboardingCache) return
  onboardingCache = {
    data: { ...onboardingCache.data, ...partial },
    fetchedAt: Date.now(),
  }
}

function rememberOnboarding(data: TravelerProfileDto) {
  onboardingCache = { data, fetchedAt: Date.now() }
  return data
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  invalidateOnboardingCache()
}

let refreshInFlight: Promise<LoginSuccessData | null> | null = null

function devTimeLog(label: string, startedAt: number) {
  if (!import.meta.env.DEV) return
  console.debug(`[delve-timing] ${label} ${Math.round(performance.now() - startedAt)}ms`)
}

/** Single-flight refresh so parallel 401s share one token rotation. */
export async function refreshSession(): Promise<LoginSuccessData | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) return null

    const started = performance.now()
    if (import.meta.env.DEV) console.debug('[delve-timing] auth refresh start')

    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearSession()
      devTimeLog('auth refresh fail', started)
      return null
    }
    const data = await parseJson<LoginSuccessData>(res)
    persistSession(data)
    devTimeLog('auth refresh end', started)
    return data
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/**
 * Authenticated fetch using the canonical traveler Bearer token.
 * On 401, attempts one refresh then retries once — same store as login/navbar.
 */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`

  const buildHeaders = (): Headers => {
    const headers = new Headers(init.headers || {})
    const token = getStoredAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }
    return headers
  }

  let res = await fetch(url, { ...init, headers: buildHeaders() })
  if (res.status !== 401) return res

  const refreshed = await refreshSession()
  if (!refreshed) return res

  res = await fetch(url, { ...init, headers: buildHeaders() })
  return res
}

export async function authorizedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authorizedFetch(path, init)
  return parseJson<T>(res)
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
  return parseJson<{
    email: string
    message: string
    deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED'
    sessionCreated?: boolean
  }>(res)
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

export async function verifyEmailCode(email: string, code: string) {
  const res = await fetch(`${apiBase()}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.replace(/\D/g, '') }),
  })
  try {
    return await parseJson<{ result: VerifyEmailResult; message: string }>(res)
  } catch (err) {
    if (err instanceof AuthApiError && err.code) {
      const normalized = err.code.toLowerCase() as VerifyEmailResult
      if (
        normalized === 'success' ||
        normalized === 'already_verified' ||
        normalized === 'expired' ||
        normalized === 'used' ||
        normalized === 'invalid' ||
        normalized === 'account_disabled'
      ) {
        return { result: normalized, message: err.message }
      }
    }
    throw err
  }
}

/** @deprecated Link-based verification — use verifyEmailCode */
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
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  })
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

/**
 * Shared traveler profile/onboarding fetch.
 * Coalesces concurrent callers and briefly caches so App + dashboard + profile
 * do not each wait on a cold duplicate request.
 */
export async function fetchOnboarding(opts?: { force?: boolean }) {
  if (
    !opts?.force &&
    onboardingCache &&
    Date.now() - onboardingCache.fetchedAt < ONBOARDING_CACHE_TTL_MS
  ) {
    return onboardingCache.data
  }
  if (!opts?.force && onboardingInFlight) return onboardingInFlight

  const started = performance.now()
  if (import.meta.env.DEV) console.debug('[delve-timing] profile request start')

  onboardingInFlight = (async () => {
    try {
      const data = await authorizedJson<TravelerProfileDto>('/users/me/onboarding')
      return rememberOnboarding(data)
    } finally {
      onboardingInFlight = null
      devTimeLog('profile request end', started)
    }
  })()

  return onboardingInFlight
}

export async function patchOnboarding(body: import('@delve/contracts').OnboardingPatch) {
  const res = await fetch(`${apiBase()}/users/me/onboarding`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const data = await parseJson<TravelerProfileDto>(res)
  return rememberOnboarding(data)
}

export async function completeOnboarding(body: import('@delve/contracts').OnboardingComplete) {
  const res = await fetch(`${apiBase()}/users/me/onboarding/complete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const data = await parseJson<TravelerProfileDto>(res)
  return rememberOnboarding(data)
}

export async function updateProfile(body: import('@delve/contracts').ProfileUpdate) {
  const res = await fetch(`${apiBase()}/users/me/profile`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const data = await parseJson<TravelerProfileDto>(res)
  return rememberOnboarding(data)
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
  invalidateOnboardingCache()
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

export async function resetPasswordWithCode(input: {
  email: string
  code: string
  newPassword: string
  newPasswordConfirmation: string
}) {
  const res = await fetch(`${apiBase()}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email.trim(),
      code: input.code.replace(/\D/g, ''),
      newPassword: input.newPassword,
      newPasswordConfirmation: input.newPasswordConfirmation,
    }),
  })
  try {
    return await parseJson<{ result: 'success' | 'expired' | 'used' | 'invalid'; message: string }>(res)
  } catch (err) {
    if (err instanceof AuthApiError && err.code) {
      const normalized = err.code.toLowerCase()
      if (normalized === 'expired' || normalized === 'used' || normalized === 'invalid') {
        throw new AuthApiError(err.message, { code: normalized.toUpperCase(), status: err.status })
      }
    }
    throw err
  }
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
