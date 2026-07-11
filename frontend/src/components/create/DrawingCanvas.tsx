import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Trash2, Undo2 } from 'lucide-react'
import { type DrawStroke } from './types'

type BrushSettings = {
  color: string
  size: number
  opacity: number
}

type PanelProps = {
  strokes: DrawStroke[]
  onChange: (next: DrawStroke[]) => void
  brush: BrushSettings
  onBrushChange: (next: BrushSettings) => void
}

type SurfaceProps = {
  strokes: DrawStroke[]
  onChange: (next: DrawStroke[]) => void
  frameRef: React.RefObject<HTMLDivElement | null>
  brush: BrushSettings
  active: boolean
}

let _strokeIdCounter = 0
function nextStrokeId() {
  _strokeIdCounter += 1
  return `stroke_${_strokeIdCounter}`
}

const COLOR_OPTIONS = [
  '#ffffff', '#ff4444', '#ff8c00', '#ffd700',
  '#44ff44', '#00d4ff', '#8a2be2', '#ff69b4',
]

const SIZE_OPTIONS = [4, 8, 14, 22, 32]

export function DrawingCanvas({ strokes, onChange, brush, onBrushChange }: PanelProps) {
  const { color, size, opacity } = brush

  const undoLast = () => {
    onChange(strokes.slice(0, -1))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="create-panel create-panel--draw">
      <div className="create-panel__header">
        <p className="create-panel__title">Draw</p>
        <div className="create-panel__header-actions">
          {strokes.length > 0 ? (
            <>
              <button type="button" className="create-panel__reset" onClick={undoLast} aria-label="Undo last stroke">
                <Undo2 size={14} strokeWidth={2.25} />
              </button>
              <button type="button" className="create-panel__reset" onClick={clearAll} aria-label="Clear all drawing">
                <Trash2 size={14} strokeWidth={2.25} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="create-draw-colors" role="group" aria-label="Drawing color">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            className={color === c ? 'is-active' : ''}
            style={{ background: c }}
            onClick={() => onBrushChange({ ...brush, color: c })}
            aria-label={`Draw color ${c}`}
          />
        ))}
      </div>

      <div className="create-draw-sizes" role="group" aria-label="Brush size">
        {SIZE_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={size === s ? 'is-active' : ''}
            onClick={() => onBrushChange({ ...brush, size: s })}
            aria-label={`Brush size ${s}`}
          >
            <span
              className="create-draw-size-dot"
              style={{ width: `${s}px`, height: `${s}px` }}
            />
          </button>
        ))}
      </div>

      <label className="create-slider">
        <span>Opacity</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => onBrushChange({ ...brush, opacity: Number(e.target.value) })}
        />
      </label>

      <p className="create-panel__hint">
        Draw directly on the preview. {strokes.length > 0 ? `${strokes.length} stroke${strokes.length !== 1 ? 's' : ''}` : ''}
      </p>
    </div>
  )
}

export function DrawingSurface({ strokes, onChange, frameRef, brush, active }: SurfaceProps) {
  const { color, size, opacity } = brush
  const [isDrawing, setIsDrawing] = useState(false)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const getRelativePoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const frame = frameRef.current
      if (!frame) return null
      const rect = frame.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      }
    },
    [frameRef],
  )

  const clearCurrentPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const renderCurrentStroke = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const pts = currentPointsRef.current
    if (pts.length < 2) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = color
    ctx.lineWidth = (size / 100) * rect.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = opacity

    ctx.beginPath()
    ctx.moveTo((pts[0].x / 100) * rect.width, (pts[0].y / 100) * rect.height)
    for (let i = 1; i < pts.length; i += 1) {
      ctx.lineTo((pts[i].x / 100) * rect.width, (pts[i].y / 100) * rect.height)
    }
    ctx.stroke()
  }, [color, frameRef, opacity, size])

  const startStroke = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    event.preventDefault()
    const point = getRelativePoint(event.clientX, event.clientY)
    if (!point) return
    currentPointsRef.current = [point]
    setIsDrawing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const continueStroke = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return
    const point = getRelativePoint(event.clientX, event.clientY)
    if (!point) return
    currentPointsRef.current.push(point)
    renderCurrentStroke()
  }

  const endStroke = () => {
    if (!isDrawing || currentPointsRef.current.length < 2) {
      setIsDrawing(false)
      currentPointsRef.current = []
      clearCurrentPreview()
      return
    }
    const stroke: DrawStroke = {
      id: nextStrokeId(),
      points: [...currentPointsRef.current],
      color,
      size,
      opacity,
    }
    onChange([...strokes, stroke])
    setIsDrawing(false)
    currentPointsRef.current = []
    clearCurrentPreview()
  }

  if (!active) return null

  return (
    <div
      className="create-draw-surface"
      onPointerDown={startStroke}
      onPointerMove={continueStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    >
      <canvas ref={previewCanvasRef} className="create-draw-preview" />
    </div>
  )
}

function drawStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  width: number,
  height: number,
) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = (stroke.size / 100) * width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = stroke.opacity

    ctx.beginPath()
    ctx.moveTo(
      (stroke.points[0].x / 100) * width,
      (stroke.points[0].y / 100) * height,
    )
    for (let i = 1; i < stroke.points.length; i += 1) {
      ctx.lineTo(
        (stroke.points[i].x / 100) * width,
        (stroke.points[i].y / 100) * height,
      )
    }
    ctx.stroke()
  }
}

/** Renders completed strokes on top of the media preview */
export function StrokeRenderer({
  strokes,
  frameRef,
}: {
  strokes: DrawStroke[]
  frameRef: React.RefObject<HTMLDivElement | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawStrokesOnCanvas(ctx, strokes, canvas.width, canvas.height)
  }, [strokes, frameRef])

  useEffect(() => {
    renderStrokes()
  }, [renderStrokes])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const observer = new ResizeObserver(() => {
      renderStrokes()
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [frameRef, renderStrokes])

  return (
    <canvas
      ref={canvasRef}
      className="create-stroke-canvas"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
    />
  )
}
