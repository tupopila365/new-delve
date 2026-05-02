import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, clearTokens, getAccessToken, setTokens } from '../api/client'

export type UserType = 'normal' | 'service_provider'

export type Profile = {
  username: string
  email: string
  user_type: UserType
  display_name: string
  bio: string
  region: string
  city: string
  country_code: string
  preferred_currency: string
  avatar: string | null
  email_verified: boolean
}

type AuthState = {
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const me = await apiFetch<Profile>('/api/accounts/me/')
      setProfile({
        ...me,
        country_code: me.country_code ?? '',
        preferred_currency: me.preferred_currency ?? '',
      })
    } catch {
      setProfile(null)
      clearTokens()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await apiFetch<{ access: string; refresh: string }>('/api/accounts/token/', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ username, password }),
    })
    setTokens(tokens.access, tokens.refresh)
    const me = await apiFetch<Profile>('/api/accounts/me/')
    setProfile({
      ...me,
      country_code: me.country_code ?? '',
      preferred_currency: me.preferred_currency ?? '',
    })
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ profile, loading, refreshProfile, login, logout }),
    [profile, loading, refreshProfile, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
