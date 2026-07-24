import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { useExploreDestination } from './useExploreDestination'
import {
  FOR_YOU_DEEP_CHANGED_EVENT,
  forYouDeepSubtitle,
  forYouItemBoost,
  forYouItemBoostPersonal,
  hasDeepPersonalization,
  listingTasteTags,
  recordForYouDeep,
  recordSessionView,
  topTasteTags,
  topTasteTagsPersonal,
  type ForYouDeepKind,
  type RecordForYouDeepInput,
} from '../lib/forYouDeep'
import type { ForYouVertical } from '../lib/forYou'

/** Subscribe to Niche 10 deep personalisation (items, tags, session, watch). */
export function useForYouDeep() {
  const { country, label: exploreLabel, exploring } = useExploreDestination()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const sync = () => setTick((n) => n + 1)
    window.addEventListener(FOR_YOU_DEEP_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FOR_YOU_DEEP_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const record = useCallback(
    (input: Omit<RecordForYouDeepInput, 'countryCode'>) => {
      recordForYouDeep({ ...input, countryCode: country })
    },
    [country],
  )

  const recordView = useCallback(
    (vertical: ForYouVertical, id: number | string, tags?: string[]) => {
      recordSessionView(vertical, id, tags, country)
    },
    [country],
  )

  const itemBoost = useCallback(
    (vertical: ForYouVertical, id: number | string, tags: string[] = []) =>
      exploring
        ? forYouItemBoost(vertical, id, tags, country)
        : forYouItemBoostPersonal(vertical, id, tags),
    [country, exploring],
  )

  const deep = useMemo(() => {
    void tick
    return hasDeepPersonalization(country, exploring)
  }, [country, exploring, tick])

  const tasteTags = useMemo(() => {
    void tick
    return exploring ? topTasteTags(country, 3) : topTasteTagsPersonal(3)
  }, [country, exploring, tick])

  const subtitle = useMemo(() => {
    void tick
    return forYouDeepSubtitle(exploreLabel, country, exploring)
  }, [country, exploreLabel, exploring, tick])

  return {
    country,
    exploring,
    record,
    recordView,
    itemBoost,
    deep,
    tasteTags,
    subtitle,
    listingTasteTags,
  }
}

export function useRecordListingView(
  vertical: ForYouVertical,
  id: number | string | undefined,
  tags: string[] | undefined,
  enabled = true,
) {
  const { recordView } = useForYouDeep()
  useEffect(() => {
    if (!enabled || id == null || id === '') return
    recordView(vertical, id, tags)
  }, [enabled, id, recordView, tags, vertical])
}

/** Record watch-time when a muted autoplay cover stays in view. */
export function useVideoWatchSignal(
  vertical: ForYouVertical,
  id: number | string | undefined,
  tags: string[] | undefined,
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled = true,
) {
  const { record } = useForYouDeep()

  useEffect(() => {
    if (!enabled || id == null || !videoRef.current) return
    const video = videoRef.current
    let accumulated = 0
    let last = 0
    let reported = 0

    const flush = (force = false) => {
      if (accumulated - reported < 1200 && !force) return
      const delta = accumulated - reported
      if (delta < 800) return
      reported = accumulated
      record({
        vertical,
        id,
        kind: 'watch' as ForYouDeepKind,
        tags,
        watchMs: accumulated,
      })
    }

    const onTime = () => {
      const t = video.currentTime
      if (last > 0 && t > last) {
        accumulated += (t - last) * 1000
        if (accumulated - reported >= 3500) flush()
      }
      last = t
    }

    const onPause = () => {
      flush(true)
      last = 0
    }

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onPause)
    return () => {
      flush(true)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onPause)
    }
  }, [enabled, id, record, tags, vertical, videoRef])
}
