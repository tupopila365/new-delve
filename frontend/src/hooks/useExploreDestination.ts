import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  EXPLORE_CHANGED_EVENT,
  announceExploreChanged,
  countryName,
  displayCurrencyForExploreCountry,
  exploreCountryOptions,
  readExploreCountry,
  readExploreMode,
  readExploreRegion,
  regionsForCountry,
  sanitizeRegionForCountry,
  writeExploreCountry,
  writeExploreMode,
  writeExploreRegion,
  type ExploreMode,
} from '../lib/exploreDestination'
import { trackExploreEnter, trackExploreExit } from '../lib/exploreAnalytics'

type ExploreDestinationState = {
  country: string
  countryLabel: string
  region: string
  regions: readonly string[]
  currency: string
  countries: ReturnType<typeof exploreCountryOptions>
  label: string
  /** Explore trip mode — on = browsing a destination; off = My Delve. */
  mode: ExploreMode
  /** Convenience: mode === 'on'. */
  exploring: boolean
  setCountry: (code: string) => void
  setRegion: (region: string) => void
  clearRegion: () => void
  /** Turn Explore ON (keeps last destination). */
  enterExplore: () => void
  /** Turn Explore OFF — destination stays saved for resume. */
  exitExplore: () => void
  setMode: (mode: ExploreMode) => void
  /** Set destination (optional) and force Explore ON — for /explore trip start. */
  startTrip: (opts?: { country?: string; region?: string }) => void
}

const ExploreDestinationContext = createContext<ExploreDestinationState | null>(null)

function loadState() {
  const country = readExploreCountry()
  const region = sanitizeRegionForCountry(country, readExploreRegion())
  const mode = readExploreMode()
  return { country, region, mode }
}

export function ExploreDestinationProvider({ children }: { children: ReactNode }) {
  const [{ country, region, mode }, setState] = useState(loadState)

  useEffect(() => {
    const sync = () => setState(loadState())
    window.addEventListener(EXPLORE_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EXPLORE_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setMode = useCallback((next: ExploreMode) => {
    const mode = next === 'off' ? 'off' : 'on'
    const prev = readExploreMode()
    writeExploreMode(mode)
    setState((s) => ({ ...s, mode }))
    if (prev !== mode) {
      if (mode === 'on') trackExploreEnter(countryName(readExploreCountry()))
      else trackExploreExit(countryName(readExploreCountry()))
    }
    announceExploreChanged()
  }, [])

  const enterExplore = useCallback(() => {
    const wasOn = readExploreMode() === 'on'
    writeExploreMode('on')
    setState((s) => ({ ...s, mode: 'on' }))
    if (!wasOn) trackExploreEnter(countryName(readExploreCountry()))
    announceExploreChanged()
  }, [])

  const exitExplore = useCallback(() => {
    const wasOn = readExploreMode() === 'on'
    const label = countryName(readExploreCountry())
    writeExploreMode('off')
    setState((s) => ({ ...s, mode: 'off' }))
    if (wasOn) trackExploreExit(label)
    announceExploreChanged()
  }, [])

  const setCountry = useCallback((code: string) => {
    const nextCountry = code.trim().toUpperCase()
    const prevRegion = readExploreRegion()
    const nextRegion = sanitizeRegionForCountry(nextCountry, prevRegion)
    const wasOn = readExploreMode() === 'on'
    writeExploreCountry(nextCountry)
    writeExploreRegion(nextRegion)
    writeExploreMode('on')
    setState({
      country: nextCountry || readExploreCountry(),
      region: nextRegion,
      mode: 'on',
    })
    if (!wasOn) trackExploreEnter(countryName(nextCountry || readExploreCountry()))
    announceExploreChanged()
  }, [])

  const setRegion = useCallback(
    (next: string) => {
      const trimmed = sanitizeRegionForCountry(country, next)
      const wasOn = readExploreMode() === 'on'
      writeExploreRegion(trimmed)
      writeExploreMode('on')
      setState((s) => ({ ...s, region: trimmed, mode: 'on' }))
      if (!wasOn) trackExploreEnter(countryName(country))
      announceExploreChanged()
    },
    [country],
  )

  const clearRegion = useCallback(() => {
    writeExploreRegion('')
    setState((s) => ({ ...s, region: '' }))
    announceExploreChanged()
  }, [])

  const startTrip = useCallback((opts?: { country?: string; region?: string }) => {
    const wasOn = readExploreMode() === 'on'
    let nextCountry = readExploreCountry()
    let nextRegion = sanitizeRegionForCountry(nextCountry, readExploreRegion())
    if (opts?.country) {
      nextCountry = opts.country.trim().toUpperCase() || nextCountry
      nextRegion = sanitizeRegionForCountry(nextCountry, opts.region ?? '')
      writeExploreCountry(nextCountry)
      writeExploreRegion(nextRegion)
    } else if (opts?.region != null) {
      nextRegion = sanitizeRegionForCountry(nextCountry, opts.region)
      writeExploreRegion(nextRegion)
    }
    writeExploreMode('on')
    setState({ country: nextCountry, region: nextRegion, mode: 'on' })
    if (!wasOn) trackExploreEnter(countryName(nextCountry))
    announceExploreChanged()
  }, [])

  const value = useMemo<ExploreDestinationState>(() => {
    const countryLabel = countryName(country)
    const regions = regionsForCountry(country)
    const currency = displayCurrencyForExploreCountry(country)
    const label = region ? `${countryLabel} · ${region}` : countryLabel
    return {
      country,
      countryLabel,
      region,
      regions,
      currency,
      countries: exploreCountryOptions(),
      label,
      mode,
      exploring: mode === 'on',
      setCountry,
      setRegion,
      clearRegion,
      enterExplore,
      exitExplore,
      setMode,
      startTrip,
    }
  }, [
    country,
    region,
    mode,
    setCountry,
    setRegion,
    clearRegion,
    enterExplore,
    exitExplore,
    setMode,
    startTrip,
  ])

  // Keep this file as .ts (no JSX) so Vite/esbuild parse it correctly.
  return createElement(ExploreDestinationContext.Provider, { value }, children)
}

export function useExploreDestination() {
  const ctx = useContext(ExploreDestinationContext)
  if (!ctx) {
    throw new Error('useExploreDestination outside ExploreDestinationProvider')
  }
  return ctx
}
