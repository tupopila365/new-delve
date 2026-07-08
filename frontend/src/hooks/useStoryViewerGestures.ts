import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { storyHaptic } from '../utils/storyHaptics'

const HOLD_DELAY_MS = 280
const DOUBLE_TAP_MS = 320
const AXIS_LOCK_PX = 10
const HORIZONTAL_COMMIT_PX = 72
const HORIZONTAL_VELOCITY = 0.85
const VERTICAL_DISMISS_PX = 88
const VERTICAL_DISMISS_VELOCITY = 1.2
const LEFT_TAP_RATIO = 0.3
const RIGHT_TAP_RATIO = 0.7

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('button, a, input, textarea, [role="button"], form'))
}

type Axis = 'none' | 'x' | 'y'

type Options = {
  enabled?: boolean
  isFirstSlide: boolean
  isLastSlide: boolean
  canPrevRing: boolean
  canNextRing: boolean
  holdStart: () => void
  holdEnd: () => void
  onTapPrev: () => void
  onTapNext: () => void
  onToggleTapPause: () => void
  onDoubleTap?: () => void
  onDismiss: () => void
  onPrevRing: () => void
  onNextRing: () => void
}

export function useStoryViewerGestures({
  enabled = true,
  isFirstSlide,
  isLastSlide,
  canPrevRing,
  canNextRing,
  holdStart,
  holdEnd,
  onTapPrev,
  onTapNext,
  onToggleTapPause,
  onDoubleTap,
  onDismiss,
  onPrevRing,
  onNextRing,
}: Options) {
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const startTimeRef = useRef(0)
  const axisRef = useRef<Axis>('none')
  const holdTimerRef = useRef<number | null>(null)
  const isHoldingRef = useRef(false)
  const lastTapRef = useRef(0)
  const singleTapTimerRef = useRef<number | null>(null)
  const movedRef = useRef(false)
  const cardWidthRef = useRef(0)

  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const resetDrag = useCallback(() => {
    setOffsetX(0)
    setOffsetY(0)
    setDragging(false)
    axisRef.current = 'none'
    pointerIdRef.current = null
    movedRef.current = false
  }, [])

  const canDragHorizontal = useCallback(
    (deltaX: number) => {
      if (deltaX < 0 && isLastSlide && canNextRing) return true
      if (deltaX > 0 && isFirstSlide && canPrevRing) return true
      return false
    },
    [canNextRing, canPrevRing, isFirstSlide, isLastSlide],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return
      if (isInteractiveTarget(event.target)) return
      pointerIdRef.current = event.pointerId
      startXRef.current = event.clientX
      startYRef.current = event.clientY
      startTimeRef.current = performance.now()
      cardWidthRef.current = event.currentTarget.getBoundingClientRect().width
      axisRef.current = 'none'
      movedRef.current = false
      isHoldingRef.current = false
      setDragging(true)
      clearHoldTimer()
      holdTimerRef.current = window.setTimeout(() => {
        if (axisRef.current !== 'none') return
        isHoldingRef.current = true
        holdStart()
        storyHaptic('pause')
      }, HOLD_DELAY_MS)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [clearHoldTimer, enabled, holdStart],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) return
      const deltaX = event.clientX - startXRef.current
      const deltaY = event.clientY - startYRef.current

      if (axisRef.current === 'none') {
        if (Math.abs(deltaX) < AXIS_LOCK_PX && Math.abs(deltaY) < AXIS_LOCK_PX) return
        axisRef.current = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y'
        movedRef.current = true
        clearHoldTimer()
      }

      if (axisRef.current === 'x') {
        if (!canDragHorizontal(deltaX)) {
          setOffsetX(deltaX * 0.12)
          return
        }
        setOffsetX(deltaX)
        return
      }

      if (axisRef.current === 'y') {
        setOffsetY(deltaY > 0 ? deltaY : deltaY * 0.15)
      }
    },
    [canDragHorizontal, clearHoldTimer, enabled],
  )

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const deltaX = event.clientX - startXRef.current
      const deltaY = event.clientY - startYRef.current
      const elapsed = Math.max(performance.now() - startTimeRef.current, 1)
      const wasHolding = isHoldingRef.current
      const axis = axisRef.current

      clearHoldTimer()
      if (wasHolding) {
        isHoldingRef.current = false
        holdEnd()
      }

      if (axis === 'x') {
        const velocityX = Math.abs(deltaX) / elapsed
        const swipeLeft = deltaX < -HORIZONTAL_COMMIT_PX || (deltaX < -36 && velocityX > HORIZONTAL_VELOCITY)
        const swipeRight = deltaX > HORIZONTAL_COMMIT_PX || (deltaX > 36 && velocityX > HORIZONTAL_VELOCITY)

        if (swipeLeft && isLastSlide && canNextRing) {
          storyHaptic('tap')
          onNextRing()
        } else if (swipeRight && isFirstSlide && canPrevRing) {
          storyHaptic('tap')
          onPrevRing()
        }
        resetDrag()
        return
      }

      if (axis === 'y') {
        const velocityY = deltaY / elapsed
        if (deltaY > VERTICAL_DISMISS_PX || velocityY > VERTICAL_DISMISS_VELOCITY) {
          onDismiss()
          resetDrag()
          return
        }
        resetDrag()
        return
      }

      if (!wasHolding && !movedRef.current) {
        const rect = event.currentTarget.getBoundingClientRect()
        const tapX = (event.clientX - rect.left) / Math.max(rect.width, 1)
        const now = Date.now()

        if (onDoubleTap && now - lastTapRef.current < DOUBLE_TAP_MS) {
          if (singleTapTimerRef.current !== null) {
            window.clearTimeout(singleTapTimerRef.current)
            singleTapTimerRef.current = null
          }
          lastTapRef.current = 0
          onDoubleTap()
          resetDrag()
          return
        }

        lastTapRef.current = now
        if (singleTapTimerRef.current !== null) {
          window.clearTimeout(singleTapTimerRef.current)
        }
        singleTapTimerRef.current = window.setTimeout(() => {
          singleTapTimerRef.current = null
          if (tapX < LEFT_TAP_RATIO) {
            onTapPrev()
          } else if (tapX > RIGHT_TAP_RATIO) {
            onTapNext()
          } else {
            onToggleTapPause()
            storyHaptic('pause')
          }
        }, DOUBLE_TAP_MS)
      }

      resetDrag()
    },
    [
      canNextRing,
      canPrevRing,
      clearHoldTimer,
      enabled,
      holdEnd,
      isFirstSlide,
      isLastSlide,
      onDismiss,
      onDoubleTap,
      onNextRing,
      onPrevRing,
      onTapNext,
      onTapPrev,
      onToggleTapPause,
      resetDrag,
    ],
  )

  const style: CSSProperties | undefined =
    offsetX !== 0 || offsetY !== 0
      ? {
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${Math.max(0.9, 1 - Math.max(0, offsetY) / 900)})`,
          opacity: offsetY > 0 ? Math.max(0.45, 1 - offsetY / 420) : 1,
          transition: dragging ? 'none' : 'transform 0.22s ease, opacity 0.22s ease',
        }
      : undefined

  return {
    cardPointerProps: {
      onPointerDown,
      onPointerMove,
      onPointerMoveCapture: onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
    style,
  }
}
