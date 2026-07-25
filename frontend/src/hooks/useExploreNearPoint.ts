import { useCallback, useEffect, useState } from 'react'
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

export function useExploreNearPoint() {
  const { country } = useExploreDestination()
  const [point, setPoint] = useState<ExploreNearPoint | null>(() => readExploreNearPoint(country))
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

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

  const towns = townCentresForCountry(country)

  const setNearPoint = useCallback((next: ExploreNearPoint) => {
    setExploreNearPoint(next)
    setPoint(next)
    setGeoError(null)
  }, [])

  const clear = useCallback(() => {
    clearExploreNearPoint()
    setPoint(null)
    setGeoError(null)
  }, [])

  const useTown = useCallback(
    (town: TownCentrePreset) => {
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
