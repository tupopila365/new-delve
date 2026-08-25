import { useEffect, useId, useRef, useState } from 'react'
import {
  AlertTriangle, Camera, FileVideo, Loader2, Mic, RotateCcw,
  Square, Upload, X,
} from 'lucide-react'
import { newId } from './config'
import { detectMimeKind, orientationOf, readVideoMetadata, uploadStatusMessage, validateAgainstLimits } from './detect'
import { formatBytes, formatTime } from './format'
import type { MediaAsset, StudioContext, UploadLimits, UploadStatus } from './types'

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'permanent' | 'unavailable'

export function VideoUpload({
  limits,
  context,
  onReady,
  onCancel,
  allowRecord = true,
}: {
  limits: UploadLimits
  context: StudioContext
  onReady: (asset: MediaAsset) => void
  onCancel?: () => void
  allowRecord?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<UploadStatus>('selecting')
  const [errorDetail, setErrorDetail] = useState('')
  const [dragging, setDragging] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [pendingTrim, setPendingTrim] = useState<{ file: File; url: string; duration: number } | null>(null)

  async function ingest(file: File) {
    setStatus('validating')
    setErrorDetail('')
    const kind = detectMimeKind(file.type, file.name)
    if (kind !== 'video') {
      setStatus('unsupported-format')
      setErrorDetail('Select a video file for the video editor.')
      return
    }
    const url = URL.createObjectURL(file)
    try {
      setStatus('reading-metadata')
      const meta = await readVideoMetadata(file, url)
      setStatus('generating-preview')
      const validation = validateAgainstLimits({
        kind: 'video',
        fileSize: file.size,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        mimeType: file.type || 'video/mp4',
        limits,
      })
      if (validation === 'video-too-long') {
        setPendingTrim({ file, url, duration: meta.duration })
        setStatus('video-too-long')
        setErrorDetail(`Max duration from configuration: ${formatTime(limits.maxDurationSec)}. You can trim to the allowed length.`)
        return
      }
      if (validation !== 'ready' && validation !== 'no-audio' && validation !== 'variable-framerate') {
        URL.revokeObjectURL(url)
        setStatus(validation)
        setErrorDetail(uploadStatusMessage(validation, limits))
        return
      }
      const now = new Date().toISOString()
      const asset: MediaAsset = {
        id: newId('asset'),
        ownerId: 'local-user',
        context,
        mediaType: 'audio-supported-video',
        source: 'device',
        fileName: file.name,
        mimeType: file.type || 'video/mp4',
        fileSize: file.size,
        width: meta.width,
        height: meta.height,
        duration: meta.duration,
        orientation: orientationOf(meta.width, meta.height),
        uploadStatus: validation === 'ready' ? 'ready' : validation,
        processingStatus: 'ready',
        moderationStatus: 'none',
        createdAt: now,
        updatedAt: now,
        objectUrl: url,
        hasAudio: meta.hasAudio,
        file,
      }
      setStatus('ready')
      onReady(asset)
    } catch {
      URL.revokeObjectURL(url)
      setStatus('corrupted')
      setErrorDetail('This file could not be read. Try another video.')
    }
  }

  function acceptTrimmed() {
    if (!pendingTrim) return
    const { file, url } = pendingTrim
    const now = new Date().toISOString()
    const asset: MediaAsset = {
      id: newId('asset'),
      ownerId: 'local-user',
      context,
      mediaType: 'audio-supported-video',
      source: 'device',
      fileName: file.name,
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
      width: 1080,
      height: 1920,
      duration: pendingTrim.duration,
      orientation: 'portrait',
      uploadStatus: 'ready',
      processingStatus: 'ready',
      moderationStatus: 'none',
      createdAt: now,
      updatedAt: now,
      objectUrl: url,
      hasAudio: true,
      file,
    }
    setPendingTrim(null)
    setStatus('ready')
    onReady(asset)
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-xl mx-auto w-full">
      <div
        className="rounded-2xl flex flex-col items-center justify-center gap-4 py-10 px-4"
        style={{
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
          background: dragging ? 'rgba(140,82,255,0.08)' : 'var(--surface-subtle)',
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) void ingest(f)
        }}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}>
          {status === 'validating' || status === 'reading-metadata' || status === 'generating-preview'
            ? <Loader2 size={28} className="animate-spin" />
            : <FileVideo size={28} />}
        </span>
        <div className="text-center">
          <p className="font-semibold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Upload or record video</p>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>
            Formats from configuration · max {formatBytes(limits.maxFileSizeBytes)} · {formatTime(limits.minDurationSec)}–{formatTime(limits.maxDurationSec)}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white min-h-[44px]"
            style={{ background: 'var(--primary)' }}>
            <Upload size={14} /> Select video
          </button>
          {allowRecord && (
            <button type="button" onClick={() => setRecordOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <Camera size={14} /> Record video
            </button>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm min-h-[44px]"
              style={{ color: 'var(--fg-muted)' }}>Cancel</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => {
          const f = e.target.files?.[0]
          if (f) void ingest(f)
        }} />
      </div>

      {status !== 'selecting' && status !== 'ready' && status !== 'validating' && status !== 'reading-metadata' && status !== 'generating-preview' && (
        <div className="rounded-xl p-3 flex gap-3 items-start" style={{ background: 'rgba(200,59,59,0.08)', border: '1px solid var(--border)' }} role="alert">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#C83B3B' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold m-0">{statusLabel(status)}</p>
            <p className="text-xs mt-1 m-0" style={{ color: 'var(--fg-muted)' }}>{errorDetail || uploadStatusMessage(status, limits)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {status === 'video-too-long' && pendingTrim && (
                <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--primary)' }} onClick={acceptTrimmed}>
                  Trim to allowed duration
                </button>
              )}
              <button type="button" className="min-h-[44px] px-3 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}
                onClick={() => { setStatus('selecting'); setPendingTrim(null); inputRef.current?.click() }}>
                Try another file
              </button>
            </div>
          </div>
        </div>
      )}

      {recordOpen && (
        <RecordVideoFlow
          maxDurationSec={limits.maxDurationSec}
          onCancel={() => setRecordOpen(false)}
          onCaptured={async file => {
            setRecordOpen(false)
            await ingest(file)
          }}
        />
      )}
    </div>
  )
}

function statusLabel(s: UploadStatus) {
  const map: Partial<Record<UploadStatus, string>> = {
    'unsupported-format': 'Unsupported format',
    'file-too-large': 'File too large',
    'video-too-long': 'Video too long',
    'video-too-short': 'Video too short',
    'resolution-too-low': 'Resolution too low',
    corrupted: 'Corrupted file',
    'no-audio': 'No audio track',
    'variable-framerate': 'Variable frame-rate warning',
    'permission-denied': 'Upload permission denied',
    'storage-denied': 'Storage permission denied',
  }
  return map[s] ?? s
}

export function RecordVideoFlow({
  maxDurationSec,
  onCancel,
  onCaptured,
}: {
  maxDurationSec: number
  onCancel: () => void
  onCaptured: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [camPerm, setCamPerm] = useState<PermissionState>('idle')
  const [micPerm, setMicPerm] = useState<PermissionState>('idle')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)
  const titleId = useId()

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    return () => {
      stopStream()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, [])

  useEffect(() => {
    if (!recording || paused) return
    const iv = setInterval(() => {
      setElapsed(e => {
        if (e + 0.2 >= maxDurationSec) {
          stopRecording()
          return maxDurationSec
        }
        return e + 0.2
      })
    }, 200)
    return () => clearInterval(iv)
  }, [recording, paused, maxDurationSec])

  async function startCamera(nextFacing: 'user' | 'environment' = facing) {
    setCamPerm('requesting')
    setMicPerm('requesting')
    stopStream()
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextFacing } },
          audio: true,
        })
      } catch {
        // Fallback without facing constraint (desktop / single-camera devices)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
      }
      streamRef.current = stream
      setFacing(nextFacing)
      setCamPerm('granted')
      setMicPerm('granted')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCamPerm('denied')
      setMicPerm('denied')
    }
  }

  async function switchCamera() {
    if (recording || previewUrl || switching) return
    const next = facing === 'user' ? 'environment' : 'user'
    setSwitching(true)
    try {
      if (camPerm === 'granted' || camPerm === 'idle') {
        await startCamera(next)
      } else {
        setFacing(next)
      }
    } finally {
      setSwitching(false)
    }
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = rec
    rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      stopStream()
    }
    rec.start(200)
    setElapsed(0)
    setRecording(true)
    setPaused(false)
  }

  function pauseRecording() {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'recording') return
    rec.pause()
    setPaused(true)
  }

  function resumeRecording() {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'paused') return
    rec.resume()
    setPaused(false)
  }

  function stopRecording() {
    const rec = recorderRef.current
    if (rec && (rec.state === 'recording' || rec.state === 'paused')) rec.stop()
    setRecording(false)
    setPaused(false)
  }

  function useVideo() {
    if (!previewUrl) return
    void fetch(previewUrl)
      .then(r => r.blob())
      .then(blob => onCaptured(new File([blob], `recording-${Date.now()}.webm`, { type: blob.type || 'video/webm' })))
  }

  const canSwitch = !recording && !previewUrl && camPerm !== 'denied' && camPerm !== 'permanent'

  return (
    <div className="fixed inset-0 z-[320] flex flex-col" style={{ background: '#0C0A09', color: '#FFFAF2' }} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid #39322E' }}>
        <button type="button" className="min-w-[44px] min-h-[44px]" onClick={onCancel} aria-label="Close recorder"><X size={22} /></button>
        <h2 id={titleId} className="text-base font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>Record video</h2>
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] disabled:opacity-40"
          disabled={!canSwitch || switching}
          onClick={() => void switchCamera()}
          aria-label={facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
          title={facing === 'user' ? 'Back camera' : 'Front camera'}
        >
          {switching ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {!previewUrl ? (
          <video
            ref={videoRef}
            className="max-h-full max-w-full"
            muted
            playsInline
            style={facing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
          />
        ) : (
          <video src={previewUrl} className="max-h-full max-w-full" controls playsInline />
        )}
        {recording && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(200,59,59,0.9)' }}>
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {formatTime(elapsed)} / {formatTime(maxDurationSec)}
          </div>
        )}
        {camPerm === 'granted' && !previewUrl && !recording && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#FFFAF2' }}>
            {facing === 'user' ? 'Front camera' : 'Back camera'}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3" style={{ background: '#12100F', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {camPerm === 'idle' && (
          <button type="button" onClick={() => void startCamera()} className="min-h-[48px] rounded-xl font-semibold text-white" style={{ background: 'var(--primary, #8C52FF)' }}>
            Allow camera & microphone
          </button>
        )}
        {(camPerm === 'denied' || camPerm === 'permanent') && (
          <p className="text-sm m-0" style={{ color: '#B8ADA3' }} role="alert">Camera or microphone permission denied. Enable access in browser settings, or upload a file instead.</p>
        )}
        {camPerm === 'granted' && !previewUrl && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              className="min-h-[44px] px-3 rounded-xl text-xs font-semibold disabled:opacity-40"
              style={{ border: '1px solid #39322E' }}
              disabled={recording || switching}
              onClick={() => void switchCamera()}
            >
              {facing === 'user' ? 'Use back' : 'Use front'}
            </button>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#B8ADA3' }}><Mic size={14} /> Mic</div>
            {!recording ? (
              <button type="button" className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center" onClick={startRecording} aria-label="Record">
                <span className="h-12 w-12 rounded-full" style={{ background: '#C83B3B' }} />
              </button>
            ) : (
              <>
                <button type="button" className="min-h-[44px] px-3 rounded-xl text-sm" style={{ border: '1px solid #39322E' }} onClick={paused ? resumeRecording : pauseRecording}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center" onClick={stopRecording} aria-label="Stop">
                  <Square size={22} fill="#C83B3B" color="#C83B3B" />
                </button>
              </>
            )}
          </div>
        )}
        {previewUrl && (
          <div className="flex gap-2">
            <button type="button" className="flex-1 min-h-[48px] rounded-xl font-semibold" style={{ border: '1px solid #39322E' }}
              onClick={() => { setPreviewUrl(null); setElapsed(0); void startCamera(facing) }}>Retake</button>
            <button type="button" className="flex-1 min-h-[48px] rounded-xl font-semibold text-white" style={{ background: 'var(--primary, #8C52FF)' }} onClick={useVideo}>Use video</button>
          </div>
        )}
      </div>
    </div>
  )
}
