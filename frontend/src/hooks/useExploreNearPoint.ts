import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import { useExploreDestination } from './useExploreDestination'
import {
  EXPLORE_NEAR_CHANGED_EVENT,
  clearExploreNearPoint,
  readExploreNearPoint,
  setExploreNearPoint,
  townCentresForCountry,
  type ExploreNearPoint,
  type TownCentrePreset,
} from '../lib/exploreNearPoint'
import { recordPlaceSignal } from '../lib/placeSignals'

type RecommendedPlacesResponse = {
  country: string
  places: {
    label: string
    region?: string
    latitude: number
    longitude: number
    score?: number
  }[]
}

function presetsAsTowns(country: string): TownCentrePreset[] {
  return [...townCentresForCountry(country)]
}

function mapApiPlaces(places: RecommendedPlacesResponse['places']): TownCentrePreset[] {
  return places
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.label?.trim())
    .map((p) => ({
      label: p.label.trim(),
      latitude: p.latitude,
      longitude: p.longitude,
      region: (p.region || '').trim() || undefined,
    }))
}

export function useExploreNearPoint() {
  const { country } = useExploreDestination()
  const [point, setPoint] = useState<ExploreNearPoint | null>(() => readExploreNearPoint(country))
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [towns, setTowns] = useState<TownCentrePreset[]>(() => presetsAsTowns(country))

  useEffect(() => {
    const sync = () => setPoint(readExploreNearPoint(country))
    sync()
    window.addEventListener(EXPLORE_NEAR_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EXPLORE_NEAR_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [country])

  // Drop a near-point that belongs to another Explore country.
  useEffect(() => {
    const stored = readExploreNearPoint()
    if (stored && stored.country.toUpperCase() !== country.toUpperCase()) {
      clearExploreNearPoint()
      setPoint(null)
    }
  }, [country])

  // Usage-ranked places from API; fall back to hardcoded town centres.
  useEffect(() => {
    const fallback = presetsAsTowns(country)
    setTowns(fallback)
    let cancelled = false
    void (async () => {
      try {
        const data = await apiFetch<RecommendedPlacesResponse>(
          `/api/explore/recommended-places/?country=${encodeURIComponent(country)}&limit=6`,
          { auth: false },
        )
        if (cancelled) return
        const mapped = mapApiPlaces(data.places || [])
        setTowns(mapped.length ? mapped : fallback)
      } catch {
        if (!cancelled) setTowns(fallback)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [country])

  const setNearPoint = useCallback((next: ExploreNearPoint) => {
    setExploreNearPoint(next)
    setPoint(next)
    setGeoError(null)
    // City picks from search / Places — not chips (those use source=preset).
    if (next.source === 'places' && next.kind === 'city' && next.label.trim()) {
      const hasCoords =
        Number.isFinite(next.latitude) &&
        Number.isFinite(next.longitude) &&
        !(next.latitude === 0 && next.longitude === 0)
      recordPlaceSignal(next.country || country, next.label, hasCoords ? 'near_point' : 'search')
    }
  }, [country])

  const clear = useCallback(() => {
    clearExploreNearPoint()
    setPoint(null)
    setGeoError(null)
  }, [])

  const useTown = useCallback(
    (town: TownCentrePreset) => {
      recordPlaceSignal(country, town.label, 'chip_click')
      setNearPoint({
        latitude: town.latitude,
        longitude: town.longitude,
        label: town.label,
        source: 'preset',
        country,
        kind: 'city',
        placeCountryCode: country,
      })
    },
    [country, setNearPoint],
  )

  const useGeolocation = useCallback((onSuccess?: () => void) => {
    if (!navigator.geolocation) {
      setGeoError('Location is not available on this device.')
      return
    }
    setGeoBusy(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false)
        setNearPoint({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Near me',
          source: 'geolocation',
          country,
          kind: 'here',
          placeCountryCode: country,
        })
        onSuccess?.()
      },
      (err) => {
        setGeoBusy(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied — pick a town instead.')
        } else {
          setGeoError('Could not get your location — pick a town instead.')
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    )
  }, [country, setNearPoint])

  return {
    point,
    towns,
    geoBusy,
    geoError,
    setNearPoint,
    useTown,
    useGeolocation,
    clear,
  }
}
