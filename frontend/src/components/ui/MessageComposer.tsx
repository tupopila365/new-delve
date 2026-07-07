import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { Camera, ImagePlus, Loader2, Mic, Send, X } from 'lucide-react'
import { CommunityVideoEditor } from '../community/CommunityVideoEditor'
import { VoiceWaveform } from '../messages/chat/VoiceWaveform'
import type { HashtagComposerConfig } from '../../hooks/useHashtagComposer'
import { formatVoiceDuration } from '../../hooks/useVoiceRecorder'
import { HashtagTextarea } from './HashtagTextarea'
import '../messages/chat/voice-waveform.css'
import './MessageComposer.css'

export type MessageComposerTheme = 'dark' | 'light'

export type MessageComposerMediaProps = {
  imagePreview: string | null
  videoPreview: string | null
  audioPreview?: string | null
  audioDurationSec?: number
  isRecordingVoice?: boolean
  recordingDurationSec?: number
  voiceLevels?: number[]
  onImageChange: (file: File | null, preview: string | null) => void
  onVideoChange: (file: File | null, preview: string | null) => void
  onAudioChange?: (file: File | null, preview: string | null, durationSec?: number) => void
  onVoiceRecordStart?: () => void
  onVoiceRecordStop?: () => void
  onVoiceRecordCancel?: () => void
  skipVideoEditor?: boolean
}

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  sendDisabled?: boolean
  sending?: boolean
  sendAriaLabel?: string
  inputAriaLabel?: string
  theme?: MessageComposerTheme
  className?: string
  autoFocus?: boolean
  inputRef?: RefObject<HTMLTextAreaElement | null>
  media?: MessageComposerMediaProps
  hashtags?: HashtagComposerConfig | false
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a message…',
  sendDisabled = false,
  sending = false,
  sendAriaLabel = 'Send',
  inputAriaLabel = 'Message',
  theme = 'dark',
  className = '',
  autoFocus = false,
  inputRef: inputRefProp,
  media,
  hashtags = false,
}: Props) {
  const localInputRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = inputRefProp ?? localInputRef
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [editingVideo, setEditingVideo] = useState<{ file: File; preview: string } | null>(null)

  const canSend = !sendDisabled && !sending
  const isRecording = Boolean(media?.isRecordingVoice)

  useEffect(() => {
    if (!autoFocus) return
    inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  useEffect(() => {
    return () => {
      if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    }
  }, [editingVideo])

  const clearImage = () => media?.onImageChange(null, null)

  const clearVideo = () => {
    media?.onVideoChange(null, null)
    if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    setEditingVideo(null)
  }

  const clearAudio = () => media?.onAudioChange?.(null, null)

  const pickVideo = (file: File) => {
    if (!media) return
    if (media.imagePreview) clearImage()
    if (media.audioPreview) clearAudio()
    if (media.skipVideoEditor) {
      if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
      setEditingVideo(null)
      media.onVideoChange(file, URL.createObjectURL(file))
      return
    }
    if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    setEditingVideo({ file, preview: URL.createObjectURL(file) })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  return (
    <form
      className={`msg-composer msg-composer--${theme}${className ? ` ${className}` : ''}`}
      onSubmit={handleSubmit}
    >
      {media?.isRecordingVoice ? (
        <div className="msg-composer__voice-live" aria-live="polite">
          <button
            type="button"
            className="msg-composer__voice-cancel"
            onClick={media.onVoiceRecordCancel}
            aria-label="Cancel recording"
          >
            <X size={16} strokeWidth={2.25} aria-hidden />
          </button>
          <VoiceWaveform levels={media.voiceLevels} live />
          <span className="msg-composer__voice-timer">{formatVoiceDuration(media.recordingDurationSec ?? 0)}</span>
          <button
            type="button"
            className="msg-composer__attach-btn msg-composer__attach-btn--voice-stop"
            onClick={media.onVoiceRecordStop}
            aria-label="Stop recording"
          >
            <Send size={16} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ) : null}

      {media && !isRecording ? (
        <div className="msg-composer__attach">
          <button
            type="button"
            className="msg-composer__attach-btn"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Add photo"
          >
            <ImagePlus size={18} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="msg-composer__attach-btn"
            onClick={() => videoInputRef.current?.click()}
            aria-label="Add video"
          >
            <Camera size={18} strokeWidth={2.25} aria-hidden />
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file || !media) return
              clearVideo()
              clearAudio()
              media.onImageChange(file, URL.createObjectURL(file))
              event.target.value = ''
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) pickVideo(file)
              event.target.value = ''
            }}
          />

          {media.onVoiceRecordStart ? (
            <button
              type="button"
              className="msg-composer__attach-btn"
              onClick={media.onVoiceRecordStart}
              aria-label="Record voice note"
            >
              <Mic size={18} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}

          {media.imagePreview ? (
            <div className="msg-composer__attach-preview">
              <img src={media.imagePreview} alt="" />
              <button type="button" onClick={clearImage} aria-label="Remove photo">
                <X size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}

          {media.videoPreview && !editingVideo ? (
            <div className="msg-composer__attach-preview">
              <video src={media.videoPreview} muted playsInline />
              <button type="button" onClick={clearVideo} aria-label="Remove video">
                <X size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}

          {media.audioPreview ? (
            <div className="msg-composer__voice-preview">
              <VoiceWaveform compact />
              <span className="msg-composer__voice-timer">{formatVoiceDuration(media.audioDurationSec ?? 0)}</span>
              <button type="button" onClick={clearAudio} aria-label="Remove voice note">
                <X size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {editingVideo && media && !media.skipVideoEditor ? (
        <div className="msg-composer__editor">
          <CommunityVideoEditor
            file={editingVideo.file}
            previewUrl={editingVideo.preview}
            onCancel={clearVideo}
            onDone={(processed, nextPreview) => {
              if (editingVideo.preview) URL.revokeObjectURL(editingVideo.preview)
              setEditingVideo(null)
              media.onVideoChange(processed, nextPreview)
            }}
          />
        </div>
      ) : null}

      {!isRecording ? (
        <>
          <HashtagTextarea
            inputRef={inputRef}
            inputClassName={`msg-composer__input composer-pill-input composer-pill-input--${theme}`}
            theme={theme}
            hashtags={hashtags}
            value={value}
            onChange={onChange}
            onComposerKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            aria-label={inputAriaLabel}
          />

          <button type="submit" className="msg-composer__send" disabled={!canSend} aria-label={sendAriaLabel}>
            {sending ? (
              <Loader2 size={18} strokeWidth={2.4} className="msg-composer__spin" aria-hidden />
            ) : (
              <Send size={18} strokeWidth={2.4} aria-hidden />
            )}
          </button>
        </>
      ) : null}
    </form>
  )
}
