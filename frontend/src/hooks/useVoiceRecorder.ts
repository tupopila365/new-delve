import { useCallback, useEffect, useRef, useState } from 'react'

export const VOICE_WAVEFORM_BAR_COUNT = 28

function pickAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  if (typeof MediaRecorder === 'undefined') return ''
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

function idleLevels(): number[] {
  return Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, () => 0.14)
}

export type VoiceRecorderState = {
  isRecording: boolean
  durationSec: number
  audioFile: File | null
  audioPreview: string | null
  error: string | null
  levels: number[]
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [durationSec, setDurationSec] = useState(0)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>(idleLevels)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const levelDataRef = useRef<Uint8Array | null>(null)

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const stopLevelLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const stopAnalyser = () => {
    stopLevelLoop()
    analyserRef.current = null
    levelDataRef.current = null
    void audioContextRef.current?.close().catch(() => {
      /* ignore */
    })
    audioContextRef.current = null
    setLevels(idleLevels())
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const clearAudio = useCallback(() => {
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    setAudioFile(null)
    setAudioPreview(null)
    setDurationSec(0)
    setError(null)
    setLevels(idleLevels())
  }, [audioPreview])

  /** Clear composer state but keep the preview blob URL alive (e.g. optimistic send). */
  const releaseAudioWithoutRevoke = useCallback(() => {
    setAudioFile(null)
    setAudioPreview(null)
    setDurationSec(0)
    setError(null)
    setLevels(idleLevels())
  }, [])

  const restoreAudio = useCallback(
    (file: File, preview: string, duration = 0) => {
      if (audioPreview && audioPreview !== preview) URL.revokeObjectURL(audioPreview)
      setAudioFile(file)
      setAudioPreview(preview)
      setDurationSec(duration)
      setError(null)
      setLevels(idleLevels())
    },
    [audioPreview],
  )

  const sampleLevels = useCallback(() => {
    const analyser = analyserRef.current
    const data = levelDataRef.current
    if (!analyser || !data) return

    analyser.getByteTimeDomainData(data)
    const bucketSize = Math.floor(data.length / VOICE_WAVEFORM_BAR_COUNT)
    const next: number[] = []

    for (let i = 0; i < VOICE_WAVEFORM_BAR_COUNT; i++) {
      let sum = 0
      const start = i * bucketSize
      const end = Math.min(data.length, start + bucketSize)
      for (let j = start; j < end; j++) {
        const centered = (data[j] - 128) / 128
        sum += Math.abs(centered)
      }
      const avg = sum / Math.max(1, end - start)
      next.push(Math.min(1, 0.12 + avg * 2.4))
    }

    setLevels(next)
  }, [])

  const startLevelLoop = useCallback(() => {
    const tick = () => {
      sampleLevels()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [sampleLevels])

  const cancelRecording = useCallback(() => {
    clearTick()
    stopAnalyser()
    recorderRef.current?.stop()
    recorderRef.current = null
    chunksRef.current = []
    stopStream()
    setIsRecording(false)
    setDurationSec(0)
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    if (audioPreview) clearAudio()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice notes are not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickAudioMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        clearTick()
        stopAnalyser()
        stopStream()
        setIsRecording(false)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size < 1) return
        const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `voice-note.${ext}`, { type: blob.type || 'audio/webm' })
        const preview = URL.createObjectURL(blob)
        setAudioFile(file)
        setAudioPreview(preview)
      }
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setDurationSec(0)
      setIsRecording(true)
      recorder.start()

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      levelDataRef.current = new Uint8Array(analyser.fftSize)
      startLevelLoop()

      tickRef.current = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
    } catch {
      stopAnalyser()
      stopStream()
      setError('Microphone access was denied.')
      setIsRecording(false)
    }
  }, [audioPreview, clearAudio, startLevelLoop])

  const stopRecording = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return
    recorderRef.current.stop()
    recorderRef.current = null
  }, [])

  useEffect(
    () => () => {
      cancelRecording()
      if (audioPreview) URL.revokeObjectURL(audioPreview)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return {
    isRecording,
    durationSec,
    audioFile,
    audioPreview,
    error,
    levels,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
    releaseAudioWithoutRevoke,
    restoreAudio,
  }
}

export function formatVoiceDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
