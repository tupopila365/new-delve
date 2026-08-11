import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, clearTokens, getAccessToken, login as apiLogin } from '../api/client'
import type { AdminProfile } from '../api/types'
import { mockLogout } from '../mocks/mockApi'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

type AuthState = {
  profile: AdminProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getAccessToken() && !USE_MOCKS) {
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const me = await apiFetch<AdminProfile>('/api/accounts/me/')
      setProfile(me)
    } catch {
      setProfile(null)
      clearTokens()
      if (USE_MOCKS) mockLogout()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email.trim(), password)
    const me = await apiFetch<AdminProfile>('/api/accounts/me/')
    if (!me.is_staff) {
      clearTokens()
      if (USE_MOCKS) mockLogout()
      throw new Error('This account does not have platform admin access.')
    }
    setProfile(me)
    setLoading(false)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    if (USE_MOCKS) mockLogout()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ profile, loading, login, logout, refresh }),
    [profile, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
