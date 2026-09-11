import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TravelerProfileDto } from '@delve/contracts'
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  patchOnboardingCache,
  type LoginCredentials,
} from '../api/authClient'

/** Strict interface for the authenticated user identity */
export interface AuthUser {
  id: string
  email: string
  username: string
}

/** Strict interface for traveler profile and onboarding state */
export interface AuthProfile {
  displayName: string | null
  avatarUrl: string | null
  onboardingStatus: string
  bio?: string | null
  coverUrl?: string | null
  homeCity?: string | null
  homeCountryCode?: string | null
  preferredCurrency?: TravelerProfileDto['preferredCurrency']
  preferredLanguage?: TravelerProfileDto['preferredLanguage']
  interests?: TravelerProfileDto['interests']
}

/** Core authentication state */
export interface AuthState {
  user: AuthUser | null
  profile: AuthProfile | null
  isAuthenticated: boolean
  isLoading: boolean
}

/** Context contract exposing state and authentication actions */
export interface AuthContextType extends AuthState {
  /** Log in with user credentials, persisting tokens and updating context state */
  login: (credentials: LoginCredentials) => Promise<void>
  /** Log out the active session on the backend, remove tokens, and clear local state */
  logout: () => Promise<void>
  /** Helper to patch local profile state immediately so UI reacts without a page reload */
  updateProfile: (newData: Partial<AuthProfile>) => void
  /** Helper to re-sync active user and profile from backend */
  refreshUser: () => Promise<void>
}

export { type LoginCredentials }

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Sync / refresh user and profile from backend
  const refreshUser = useCallback(async () => {
    try {
      const session = await fetchCurrentUser()
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.username,
        })
        setProfile(
          session.profile
            ? {
                displayName: session.profile.displayName ?? null,
                avatarUrl: session.profile.avatarUrl ?? null,
                onboardingStatus: session.profile.onboardingStatus,
                bio: session.profile.bio ?? null,
                coverUrl: session.profile.coverUrl ?? null,
                homeCity: session.profile.homeCity ?? null,
                homeCountryCode: session.profile.homeCountryCode ?? null,
                preferredCurrency: session.profile.preferredCurrency,
                preferredLanguage: session.profile.preferredLanguage,
                interests: session.profile.interests,
              }
            : null
        )
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (err) {
      console.error('[AuthContext] Failed to refresh user session:', err)
      setUser(null)
      setProfile(null)
    }
  }, [])

  // Initial mount: verify tokens, refresh if needed, and populate session
  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      try {
        const session = await fetchCurrentUser()
        if (!isMounted) return

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
          })
          setProfile(
            session.profile
              ? {
                  displayName: session.profile.displayName ?? null,
                  avatarUrl: session.profile.avatarUrl ?? null,
                  onboardingStatus: session.profile.onboardingStatus,
                  bio: session.profile.bio ?? null,
                  coverUrl: session.profile.coverUrl ?? null,
                  homeCity: session.profile.homeCity ?? null,
                  homeCountryCode: session.profile.homeCountryCode ?? null,
                  preferredCurrency: session.profile.preferredCurrency,
                  preferredLanguage: session.profile.preferredLanguage,
                  interests: session.profile.interests,
                }
              : null
          )
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('[AuthContext] Session initialization error:', err)
        setUser(null)
        setProfile(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // Action: Log in and populate session state
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const session = await loginUser(credentials)
      setUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
      })

      // Fetch fresh profile right after login
      try {
        const fresh = await fetchCurrentUser()
        if (fresh?.profile) {
          setProfile({
            displayName: fresh.profile.displayName ?? null,
            avatarUrl: fresh.profile.avatarUrl ?? null,
            onboardingStatus: fresh.profile.onboardingStatus,
            bio: fresh.profile.bio ?? null,
            coverUrl: fresh.profile.coverUrl ?? null,
            homeCity: fresh.profile.homeCity ?? null,
            homeCountryCode: fresh.profile.homeCountryCode ?? null,
            preferredCurrency: fresh.profile.preferredCurrency,
            preferredLanguage: fresh.profile.preferredLanguage,
            interests: fresh.profile.interests,
          })
        } else {
          setProfile(null)
        }
      } catch {
        setProfile(null)
      }
    } catch (err) {
      setUser(null)
      setProfile(null)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Action: Clear tokens on backend and client, reset state
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await logoutUser()
    } catch (err) {
      console.error('[AuthContext] Logout failed on server:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setIsLoading(false)
    }
  }, [])

  // Action: Optimistic / immediate local profile update
  const updateProfile = useCallback((newData: Partial<AuthProfile>) => {
    setProfile(prev => (prev ? { ...prev, ...newData } : null))
    const { displayName, ...rest } = newData
    const patchPayload = {
      ...rest,
      ...(displayName ? { displayName } : {}),
    } as Parameters<typeof patchOnboardingCache>[0]
    patchOnboardingCache(patchPayload)
  }, [])

  // Memoize value to prevent redundant consumer re-renders
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      updateProfile,
      refreshUser,
    }),
    [user, profile, isLoading, login, logout, updateProfile, refreshUser]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

/**
 * Custom hook to consume the AuthContext.
 * Throws a descriptive error if used outside an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
