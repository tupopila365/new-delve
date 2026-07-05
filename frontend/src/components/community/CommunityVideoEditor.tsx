import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, Pencil, Scissors, X } from 'lucide-react'
import type { VideoTrim } from '../create/types'
import { VideoTrimBar } from '../create/VideoTrimBar'
import '../create/SocialCreateComposer.css'
import {
  COMMUNITY_MAX_VIDEO_SEC,
  clampCommunityTrim,
  defaultCommunityTrim,
  prepareCommunityVideoForUpload,
  trimDurationSec,
  type CommunityDrawStroke,
} from '../../utils/communityVideoUtils'
import './community-video-editor.css'

const DRAW_COLORS = ['#ffffff', '#ff9f52', '#ff3040', '#7dcea0']

type Props = {
  file: File
  previewUrl: string
  onDone: (processed: File, previewUrl: string) => void
  onCancel: () => void
}

type EditorTool = 'trim' | 'draw'

export function CommunityVideoEditor({ file, previewUrl, onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState<VideoTrim>({ start: 0, end: 0 })
  const [tool, setTool] = useState<EditorTool>('trim')
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0])
  const [strokes, setStrokes] = useState<CommunityDrawStroke[]>([])
  const [activeStroke, setActiveStroke] = useState<CommunityDrawStroke | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectionSec = trimDurationSec(videoTrim)
  const trimInvalid = videoDuration > 0 && selectionSec > COMMUNITY_MAX_VIDEO_SEC

  const syncCanvasSize = useCallback(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return
    const rect = frame.getBoundingClientRect()
    canvas.width = Math.round(rect.width)
    canvas.height = Math.round(rect.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, canvas.width, canvas.height)
    }
    if (activeStroke) {
      drawStroke(ctx, activeStroke, canvas.width, canvas.height)
    }
  }, [activeStroke, strokes])

  useEffect(() => {
    syncCanvasSize()
    window.addEventListener('resize', syncCanvasSize)
    return () => window.removeEventListener('resize', syncCanvasSize)
  }, [syncCanvasSize])

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoDuration <= 0) return

    const tick = () => {
      if (video.currentTime >= videoTrim.end - 0.03) {
        video.currentTime = videoTrim.start
      }
    }
    video.addEventListener('timeupdate', tick)
    return () => video.removeEventListener('timeupdate', tick)
  }, [videoDuration, videoTrim.end, videoTrim.start])

  const pointerPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return
    event.preventDefault()
    const point = pointerPos(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveStroke({ color: drawColor, width: 3, points: [point] })
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw' || !activeStroke) return
    event.preventDefault()
    const point = pointerPos(event)
    if (!point) return
    setActiveStroke((stroke) =>
      stroke ? { ...stroke, points: [...stroke.points, point] } : stroke,
    )
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke) return
    event.preventDefault()
    if (activeStroke.points.length > 1) {
      setStrokes((prev) => [...prev, activeStroke])
    }
    setActiveStroke(null)
  }

  const handleSave = async () => {
    if (trimInvalid) {
      setError(`Clip must be ${COMMUNITY_MAX_VIDEO_SEC} seconds or less.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const processed = await prepareCommunityVideoForUpload(file, videoTrim, videoDuration, strokes)
      const nextPreview = URL.createObjectURL(processed)
      onDone(processed, nextPreview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare video.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cm-video-editor" aria-label="Edit video">
      <div className="cm-video-editor__head">
        <strong>Edit video</strong>
        <button type="button" className="cm-video-editor__close" onClick={onCancel} aria-label="Remove video">
          <X size={16} strokeWidth={2.35} aria-hidden />
        </button>
      </div>

      <div className="cm-video-editor__frame" ref={frameRef}>
        <video
          ref={videoRef}
          src={previewUrl}
          className="cm-video-editor__video"
          playsInline
          muted
          autoPlay
          loop
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration || 0
            setVideoDuration(duration)
            const nextTrim = defaultCommunityTrim(duration)
            setVideoTrim(nextTrim)
            event.currentTarget.currentTime = nextTrim.start
          }}
        />
        <canvas
          ref={canvasRef}
          className={`cm-video-editor__canvas${tool === 'draw' ? ' cm-video-editor__canvas--draw' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      <div className="cm-video-editor__tools" role="tablist" aria-label="Video editing tools">
        <button
          type="button"
          role="tab"
          aria-selected={tool === 'trim'}
          className={tool === 'trim' ? 'is-active' : ''}
          onClick={() => setTool('trim')}
        >
          <Scissors size={15} strokeWidth={2.25} aria-hidden />
          Trim
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tool === 'draw'}
          className={tool === 'draw' ? 'is-active' : ''}
          onClick={() => setTool('draw')}
        >
          <Pencil size={15} strokeWidth={2.25} aria-hidden />
          Draw
        </button>
      </div>

      {tool === 'trim' ? (
        <VideoTrimBar
          value={videoTrim}
          duration={videoDuration}
          maxDurationSec={COMMUNITY_MAX_VIDEO_SEC}
          onChange={(next) => setVideoTrim(clampCommunityTrim(next, videoDuration))}
        />
      ) : (
        <div className="cm-video-editor__draw-tools">
          <div className="cm-video-editor__colors" role="group" aria-label="Draw color">
            {DRAW_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={drawColor === color ? 'is-active' : ''}
                style={{ background: color }}
                onClick={() => setDrawColor(color)}
                aria-label={`Draw color ${color}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="cm-video-editor__clear-draw"
            onClick={() => {
              setStrokes([])
              setActiveStroke(null)
            }}
          >
            <Eraser size={14} strokeWidth={2.25} aria-hidden />
            Clear drawing
          </button>
          <p className="cm-video-editor__draw-hint">Draw directly on the video. Max {COMMUNITY_MAX_VIDEO_SEC}s clips.</p>
        </div>
      )}

      {error ? <p className="cm-video-editor__error">{error}</p> : null}

      <button type="button" className="btn btn-primary cm-video-editor__save" disabled={busy || trimInvalid} onClick={() => void handleSave()}>
        {busy ? 'Preparing…' : 'Use this video'}
      </button>
    </section>
  )
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: CommunityDrawStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length < 2) return
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height)
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height)
  }
  ctx.stroke()
}
