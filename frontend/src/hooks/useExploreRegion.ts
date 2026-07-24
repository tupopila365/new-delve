import { useExploreDestination } from './useExploreDestination'

export type ExploreRegionSource = 'explore' | 'none'

/**
 * Effective explore region for feeds.
 * Always pickable — home profile.region no longer locks browsing.
 * Backed by ExploreDestinationProvider (country + region).
 */
export function useExploreRegion() {
  const { region, regions, setRegion, clearRegion, country, label, exploring, mode } =
    useExploreDestination()

  return {
    region,
    source: (region ? 'explore' : 'none') as ExploreRegionSource,
    canPick: exploring,
    guestRegion: region,
    profileRegion: '',
    regions,
    country,
    exploreLabel: label,
    exploring,
    mode,
    setGuestRegion: setRegion,
    clearGuestRegion: clearRegion,
  }
}
