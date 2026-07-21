import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { loginHrefWithReturn } from '../utils/authRedirect'

/**
 * Gate review / save / book style actions.
 * Returns true when the caller may proceed.
 */
export function useAccountActionGate() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (action: string) => {
      const here = `${location.pathname}${location.search}`
      if (!profile) {
        navigate(loginHrefWithReturn(here))
        return false
      }
      if (!profile.email_verified) {
        navigate('/verify-email', {
          state: { reason: action, from: here, emailHint: profile.email },
        })
        return false
      }
      return true
    },
    [profile, navigate, location.pathname, location.search],
  )
}
