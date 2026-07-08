import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const DISMISS_THRESHOLD_PX = 88
const DISMISS_VELOCITY_PX = 1.2

type Options = {
  onDismiss: () => void
  enabled?: boolean
}

export function useStorySwipeDismiss({ onDismiss, enabled = true }: Options) {
  const startYRef = useRef(0)
  const startTimeRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const reset = useCallback(() => {
    setOffsetY(0)
    setDragging(false)
    pointerIdRef.current = null
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return
      pointerIdRef.current = event.pointerId
      startYRef.current = event.clientY
      startTimeRef.current = performance.now()
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [enabled],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) return
      const delta = event.clientY - startYRef.current
      setOffsetY(delta > 0 ? delta : delta * 0.15)
    },
    [enabled],
  )

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const delta = event.clientY - startYRef.current
      const elapsed = Math.max(performance.now() - startTimeRef.current, 1)
      const velocity = delta / elapsed

      if (delta > DISMISS_THRESHOLD_PX || velocity > DISMISS_VELOCITY_PX) {
        onDismiss()
        reset()
        return
      }

      reset()
    },
    [enabled, onDismiss, reset],
  )

  const style =
    offsetY !== 0
      ? {
          transform: `translateY(${offsetY}px) scale(${Math.max(0.9, 1 - offsetY / 900)})`,
          opacity: Math.max(0.45, 1 - offsetY / 420),
          transition: dragging ? 'none' : 'transform 0.22s ease, opacity 0.22s ease',
        }
      : undefined

  return {
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerMoveCapture: onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
    style,
    dragging,
  }
}
