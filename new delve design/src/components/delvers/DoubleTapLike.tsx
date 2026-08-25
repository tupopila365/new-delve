import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Heart } from 'lucide-react'

const TAP_MS = 280
const TAP_SLOP_PX = 36
const BURST_MS = 900
const HEART_PURPLE = '#8C52FF'

export function DoubleTapLike({
  onDoubleLike,
  onSingleTap,
  className = '',
  children,
}: {
  onDoubleLike?: () => void
  /** Fired after a pause so a second tap can still become a like. */
  onSingleTap?: () => void
  className?: string
  children: ReactNode
}) {
  const lastTap = useRef(0)
  const lastPos = useRef({ x: 0, y: 0 })
  const [burstId, setBurstId] = useState(0)
  const burstTimer = useRef(0)
  const singleTimer = useRef(0)

  useEffect(
    () => () => {
      window.clearTimeout(burstTimer.current)
      window.clearTimeout(singleTimer.current)
    },
    [],
  )

  function fireLike() {
    window.clearTimeout(burstTimer.current)
    window.clearTimeout(singleTimer.current)
    setBurstId(n => n + 1)
    burstTimer.current = window.setTimeout(() => setBurstId(0), BURST_MS)
    onDoubleLike?.()
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const now = Date.now()
    const dx = Math.abs(e.clientX - lastPos.current.x)
    const dy = Math.abs(e.clientY - lastPos.current.y)
    if (now - lastTap.current < TAP_MS && dx < TAP_SLOP_PX && dy < TAP_SLOP_PX) {
      lastTap.current = 0
      e.preventDefault()
      e.stopPropagation()
      fireLike()
      return
    }
    lastTap.current = now
    lastPos.current = { x: e.clientX, y: e.clientY }
    if (onSingleTap) {
      window.clearTimeout(singleTimer.current)
      singleTimer.current = window.setTimeout(() => onSingleTap(), TAP_MS + 40)
    }
  }

  return (
    <div className={`relative ${className}`} onPointerUp={onPointerUp}>
      {children}
      {burstId > 0 && (
        <div
          key={burstId}
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <Heart
            className="delve-like-burst"
            size={128}
            fill={HEART_PURPLE}
            color={HEART_PURPLE}
            strokeWidth={0}
          />
        </div>
      )}
    </div>
  )
}
