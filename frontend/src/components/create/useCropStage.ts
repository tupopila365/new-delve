import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from 'react'
import type { CropSettings } from './types'
import { clamp, cropCoverOverflow, cropCoverTransform, MAX_CROP_ZOOM, MIN_CROP_ZOOM } from './mediaUtils'

type Size = { w: number; h: number }

type Options = {
  crop: CropSettings
  onChange: (next: CropSettings) => void
  frameRef: RefObject<HTMLElement | null>
  /** Enable drag/zoom gestures (typically only when the crop tool is active). */
  enabled?: boolean
}

/**
 * Instagram-style crop interaction: drag to reposition, pinch (or scroll) to zoom.
 * Keeps the preview WYSIWYG with the exported image via `cropCoverTransform`.
 */
export function useCropStage({ crop, onChange, frameRef, enabled = true }: Options) {
  const [natural, setNatural] = useState<Size | null>(null)
  const [frameSize, setFrameSize] = useState<Size>({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)

  const cropRef = useRef(crop)
  cropRef.current = crop
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const naturalRef = useRef<Size | null>(natural)
  naturalRef.current = natural
  const frameRef2 = useRef<Size>(frameSize)
  frameRef2.current = frameSize

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameRef])

  const onImageLoad = useCallback((el: HTMLImageElement) => {
    if (el.naturalWidth && el.naturalHeight) {
      setNatural({ w: el.naturalWidth, h: el.naturalHeight })
    }
  }, [])

  const onVideoLoad = useCallback((el: HTMLVideoElement) => {
    if (el.videoWidth && el.videoHeight) {
      setNatural({ w: el.videoWidth, h: el.videoHeight })
    }
  }, [])

  const applyPan = useCallback((clientX: number, clientY: number) => {
    const start = dragStart.current
    if (!start) return
    const nat = naturalRef.current
    const frame = frameRef2.current
    if (!nat || !frame.w || !frame.h) return
    const { overflowX, overflowY } = cropCoverOverflow(nat.w, nat.h, frame.w, frame.h, cropRef.current.zoom)
    const dx = clientX - start.x
    const dy = clientY - start.y
    const nextX = overflowX > 0 ? clamp(start.ox + (2 * dx) / overflowX, -1, 1) : 0
    const nextY = overflowY > 0 ? clamp(start.oy + (2 * dy) / overflowY, -1, 1) : 0
    onChangeRef.current({ ...cropRef.current, offsetX: nextX, offsetY: nextY })
  }, [])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 1) {
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        ox: cropRef.current.offsetX,
        oy: cropRef.current.offsetY,
      }
      setDragging(true)
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: cropRef.current.zoom }
      dragStart.current = null
    }
  }, [enabled])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchStart.current.dist > 0) {
        const zoom = clamp(
          (pinchStart.current.zoom * dist) / pinchStart.current.dist,
          MIN_CROP_ZOOM,
          MAX_CROP_ZOOM,
        )
        onChangeRef.current({ ...cropRef.current, zoom })
      }
      return
    }

    if (dragStart.current) {
      event.preventDefault()
      applyPan(event.clientX, event.clientY)
    }
  }, [enabled, applyPan])

  const endPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) {
      dragStart.current = null
      setDragging(false)
    } else if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()]
      dragStart.current = {
        x: only.x,
        y: only.y,
        ox: cropRef.current.offsetX,
        oy: cropRef.current.offsetY,
      }
    }
  }, [])

  const onWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    if (!enabled) return
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.06 : 0.94
    const zoom = clamp(cropRef.current.zoom * factor, MIN_CROP_ZOOM, MAX_CROP_ZOOM)
    onChangeRef.current({ ...cropRef.current, zoom })
  }, [enabled])

  const transform = cropCoverTransform(
    crop,
    natural?.w ?? 0,
    natural?.h ?? 0,
    frameSize.w,
    frameSize.h,
  )

  const naturalRatio = natural && natural.h > 0 ? natural.w / natural.h : null

  return {
    transform,
    dragging,
    naturalRatio,
    onImageLoad,
    onVideoLoad,
    stageHandlers: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp: endPointer,
          onPointerCancel: endPointer,
          onWheel,
        }
      : {},
  }
}
