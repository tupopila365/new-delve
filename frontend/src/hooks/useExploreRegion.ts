import { useCallback, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  EXPLORE_REGIONS,
  readGuestExploreRegion,
  writeGuestExploreRegion,
} from '../lib/exploreRegion'

export type ExploreRegionSource = 'profile' | 'guest' | 'none'

/**
 * Effective region for consumer feeds (home, stories, delvers preview).
 * Prefers signed-in profile.region; otherwise uses a guest preference in localStorage.
 */
export function useExploreRegion() {
  const { profile } = useAuth()
  const [guestRegion, setGuestRegionState] = useState(() => readGuestExploreRegion())

  const profileRegion = profile?.region?.trim() ?? ''
  const region = profileRegion || guestRegion
  const source: ExploreRegionSource = profileRegion ? 'profile' : guestRegion ? 'guest' : 'none'
  /** Guests (and travellers without a profile region) can set / clear the preference. */
  const canPick = !profileRegion

  const setGuestRegion = useCallback((next: string) => {
    const trimmed = next.trim()
    writeGuestExploreRegion(trimmed)
    setGuestRegionState(trimmed)
  }, [])

  const clearGuestRegion = useCallback(() => {
    writeGuestExploreRegion('')
    setGuestRegionState('')
  }, [])

  return {
    region,
    source,
    canPick,
    guestRegion,
    profileRegion,
    regions: EXPLORE_REGIONS,
    setGuestRegion,
    clearGuestRegion,
  }
}
