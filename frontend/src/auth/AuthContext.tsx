import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiFetch,
  clearTokens,
  getAccessToken,
  setTokens,
  SESSION_EXPIRED_EVENT,
} from '../api/client'

export type UserType = 'normal' | 'service_provider'

export type PostsVisibility = 'public' | 'only_me'

export type Profile = {
  username: string
  email: string
  user_type: UserType
  is_staff?: boolean
  display_name: string
  bio: string
  region: string
  city: string
  country_code: string
  preferred_currency: string
  avatar: string | null
  email_verified: boolean
  is_private: boolean
  posts_visibility: PostsVisibility
  allow_messages: boolean
  show_in_search: boolean
  no_face_mode: boolean
}

type AuthState = {
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function normalizeProfile(me: Profile): Profile {
  return {
    ...me,
    is_staff: me.is_staff ?? false,
    country_code: me.country_code ?? '',
    preferred_currency: me.preferred_currency ?? '',
    is_private: me.is_private ?? false,
    posts_visibility: me.posts_visibility ?? 'public',
    allow_messages: me.allow_messages ?? true,
    show_in_search: me.show_in_search ?? true,
    no_face_mode: me.no_face_mode ?? false,
  }
}

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
      setProfile(normalizeProfile(me))
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

  useEffect(() => {
    const onExpired = () => {
      setProfile(null)
    }
    const onPageShow = (e: PageTransitionEvent) => {
      // After logout + browser back (bfcache), re-sync session.
      if (e.persisted) void refreshProfile()
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refreshProfile])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<{ access: string; refresh: string }>('/api/accounts/token/', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    setTokens(tokens.access, tokens.refresh)
    const me = await apiFetch<Profile>('/api/accounts/me/')
    setProfile(normalizeProfile(me))
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setProfile(null)
    if (import.meta.env.VITE_USE_MOCKS === 'true') {
      void import('../mocks/mockApi').then((m) => m.clearMockSession())
    }
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
