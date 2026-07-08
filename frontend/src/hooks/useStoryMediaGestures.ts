import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { storyHaptic } from '../utils/storyHaptics'

const HOLD_DELAY_MS = 280
const DOUBLE_TAP_MS = 320
const MOVE_TOLERANCE_PX = 14

type SwipeHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
}

type Options = {
  enabled?: boolean
  holdStart: () => void
  holdEnd: () => void
  onDoubleTap?: () => void
  swipeHandlers: SwipeHandlers
}

export function useStoryMediaGestures({
  enabled = true,
  holdStart,
  holdEnd,
  onDoubleTap,
  swipeHandlers,
}: Options) {
  const holdTimerRef = useRef<number | null>(null)
  const isHoldingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const lastTapRef = useRef(0)
  const movedRef = useRef(false)

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      swipeHandlers.onPointerDown(event)
      startXRef.current = event.clientX
      startYRef.current = event.clientY
      movedRef.current = false
      isHoldingRef.current = false
      clearHoldTimer()
      holdTimerRef.current = window.setTimeout(() => {
        isHoldingRef.current = true
        holdStart()
        storyHaptic('pause')
      }, HOLD_DELAY_MS)
    },
    [clearHoldTimer, enabled, holdStart, swipeHandlers],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      swipeHandlers.onPointerMove(event)
      const dx = Math.abs(event.clientX - startXRef.current)
      const dy = Math.abs(event.clientY - startYRef.current)
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        movedRef.current = true
        clearHoldTimer()
      }
    },
    [clearHoldTimer, enabled, swipeHandlers],
  )

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      const wasHolding = isHoldingRef.current
      clearHoldTimer()
      if (wasHolding) {
        isHoldingRef.current = false
        holdEnd()
      }
      swipeHandlers.onPointerUp(event)

      if (!wasHolding && !movedRef.current && onDoubleTap) {
        const now = Date.now()
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
          lastTapRef.current = 0
          onDoubleTap()
          event.preventDefault()
        } else {
          lastTapRef.current = now
        }
      }
      movedRef.current = false
    },
    [clearHoldTimer, enabled, holdEnd, onDoubleTap, swipeHandlers],
  )

  return {
    mediaPointerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
