import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SafeAdminUser } from '@delve/contracts'
import { adminLoginSuccessSchema, adminMeDataSchema } from '@delve/contracts'
import { adminFetch, clearAdminCache, readCsrfFromDocumentCookie, setAdminCsrfToken } from '../api/adminClient'

export type BootState = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error'

type AdminAuthContextValue = {
  boot: BootState
  admin: SafeAdminUser | null
  sessionExpiresAt: string | null
  bootError: string | null
  sessionMessage: string | null
  restoreSession: () => Promise<void>
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  clearForbidden: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

function applyMeCache(data: { csrfToken?: string }) {
  setAdminCsrfToken(data.csrfToken || readCsrfFromDocumentCookie())
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<BootState>('loading')
  const [admin, setAdmin] = useState<SafeAdminUser | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  const restoreSession = useCallback(async () => {
    setBoot('loading')
    setBootError(null)
    try {
      const res = await adminFetch('/admin/auth/me')
      if (res.status === 401) {
        clearAdminCache()
        setAdmin(null)
        setBoot('unauthenticated')
        return
      }
      if (res.status === 403) {
        clearAdminCache()
        setAdmin(null)
        setBoot('forbidden')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: unknown = await res.json()
      const parsed = adminMeDataSchema.safeParse((json as { data?: unknown }).data ?? json)
      if (!parsed.success) throw new Error('Unexpected administrator response')
      applyMeCache(parsed.data)
      setAdmin(parsed.data.user)
      setSessionExpiresAt(parsed.data.session.expiresAt)
      setBoot('authenticated')
    } catch (e) {
      clearAdminCache()
      setAdmin(null)
      setBoot('error')
      setBootError(e instanceof Error ? e.message : 'Unable to reach Backend V2')
    }
  }, [])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await adminFetch('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid email/username or password')
    }
    if (res.status === 429) {
      throw new Error('Too many sign-in attempts. Try again later.')
    }
    if (!res.ok) throw new Error('Sign-in failed. Try again.')
    const json: unknown = await res.json()
    const parsed = adminLoginSuccessSchema.safeParse((json as { data?: unknown }).data ?? json)
    if (!parsed.success) throw new Error('Unexpected sign-in response')
    applyMeCache(parsed.data)
    setAdmin(parsed.data.user)
    setSessionExpiresAt(parsed.data.session.expiresAt)
    setSessionMessage(null)
    setBoot('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminFetch('/admin/auth/logout', { method: 'POST', body: '{}' })
    } catch {
      // Still clear local state if the session was already invalid.
    }
    clearAdminCache()
    setAdmin(null)
    setSessionExpiresAt(null)
    setSessionMessage('You have been signed out.')
    setBoot('unauthenticated')
  }, [])

  const logoutAll = useCallback(async () => {
    try {
      await adminFetch('/admin/auth/logout-all', { method: 'POST', body: '{}' })
    } catch {
      // ignore network; still clear
    }
    clearAdminCache()
    setAdmin(null)
    setSessionExpiresAt(null)
    setSessionMessage('Signed out from every administrator session.')
    setBoot('unauthenticated')
  }, [])

  const clearForbidden = useCallback(() => {
    clearAdminCache()
    setBoot('unauthenticated')
  }, [])

  const value = useMemo(
    () => ({
      boot,
      admin,
      sessionExpiresAt,
      bootError,
      sessionMessage,
      restoreSession,
      login,
      logout,
      logoutAll,
      clearForbidden,
    }),
    [
      boot,
      admin,
      sessionExpiresAt,
      bootError,
      sessionMessage,
      restoreSession,
      login,
      logout,
      logoutAll,
      clearForbidden,
    ],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
