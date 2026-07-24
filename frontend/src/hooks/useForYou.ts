import { useCallback, useEffect, useMemo, useState } from 'react'
import { useExploreDestination } from './useExploreDestination'
import {
  FOR_YOU_CHANGED_EVENT,
  forYouBoost,
  forYouBoostPersonal,
  forYouVerticalLabel,
  rankVerticalsByForYou,
  rankVerticalsByForYouPersonal,
  readForYouAffinities,
  readForYouAffinitiesPersonal,
  recordForYouSignal,
  topForYouVertical,
  topForYouVerticalPersonal,
  type ForYouSignalKind,
  type ForYouVertical,
} from '../lib/forYou'

const VERTICALS: ForYouVertical[] = [
  'food',
  'stays',
  'guides',
  'events',
  'transport',
  'shop',
  'activities',
  'journeys',
]

/** Subscribe to For You affinity — Explore-scoped when ON, personal when My Delve. */
export function useForYou() {
  const { country, exploring } = useExploreDestination()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const sync = () => setTick((n) => n + 1)
    window.addEventListener(FOR_YOU_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FOR_YOU_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const affinities = useMemo(() => {
    void tick
    return exploring ? readForYouAffinities(country) : readForYouAffinitiesPersonal()
  }, [country, exploring, tick])

  const record = useCallback(
    (vertical: ForYouVertical, kind: ForYouSignalKind) => {
      recordForYouSignal(vertical, kind, country)
    },
    [country],
  )

  const boost = useCallback(
    (vertical: ForYouVertical) =>
      exploring ? forYouBoost(vertical, country) : forYouBoostPersonal(vertical),
    [country, exploring],
  )

  const rankVerticals = useCallback(
    (verticals: readonly ForYouVertical[]) =>
      exploring
        ? rankVerticalsByForYou(verticals, country)
        : rankVerticalsByForYouPersonal(verticals),
    [country, exploring],
  )

  const topVertical = useMemo(() => {
    void tick
    return exploring
      ? topForYouVertical(VERTICALS, country, 3)
      : topForYouVerticalPersonal(VERTICALS, 1.5)
  }, [country, exploring, tick])

  return {
    country,
    exploring,
    affinities,
    record,
    boost,
    rankVerticals,
    topVertical,
    topLabel: topVertical ? forYouVerticalLabel(topVertical) : null,
    personalized: Boolean(topVertical),
  }
}
