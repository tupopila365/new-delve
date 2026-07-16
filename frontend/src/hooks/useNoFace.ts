import { useCallback, useSyncExternalStore } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

/**
 * "No Face" mode — an opt-in experience that hides social surfaces (feeds,
 * stories, other people's faces) and keeps only discovery/utility.
 *
 * Source of truth:
 *  - Logged in: `profile.no_face_mode` (persisted on the backend).
 *  - Guest: a device-local flag so the choice works before sign-in.
 *
 * Default is always the full social app — No Face is never on unless the user
 * turns it on.
 */

const GUEST_KEY = 'delve_no_face'
const ASKED_KEY = 'delve_no_face_asked'

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  emit()
}

const getGuestSnapshot = () => readFlag(GUEST_KEY)
const getAskedSnapshot = () => readFlag(ASKED_KEY)

export function useNoFace() {
  const { profile, refreshProfile } = useAuth()
  const guestNoFace = useSyncExternalStore(subscribe, getGuestSnapshot, () => false)
  const asked = useSyncExternalStore(subscribe, getAskedSnapshot, () => true)

  const enabled = profile ? Boolean(profile.no_face_mode) : guestNoFace

  const setNoFace = useCallback(
    async (on: boolean) => {
      // Persist locally for instant UI + guest support.
      writeFlag(GUEST_KEY, on)
      if (profile) {
        await apiFetch('/api/accounts/me/update/', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ no_face_mode: on }),
        })
        await refreshProfile()
      }
    },
    [profile, refreshProfile],
  )

  const markAsked = useCallback(() => {
    writeFlag(ASKED_KEY, true)
  }, [])

  return {
    /** Whether No Face mode is currently active. */
    enabled,
    /** Turn No Face on/off (persists to backend when logged in). */
    setNoFace,
    /** True until the user has answered the one-time choose-your-mode prompt. */
    shouldAsk: !asked,
    /** Record that the user has seen/answered the prompt. */
    markAsked,
  }
}
