import React, { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Loader2, Play, Volume2, VolumeX, AlertCircle, ShieldAlert } from 'lucide-react'
import { useLocalVideo } from '../media/useLocalMediaStore'

export interface FeedVideoCardProps {
  /**
   * Unique identifier for the asset. Can be a local pendingAssetId during author upload
   * or a Cloudinary publicId / DB ID for remote playback.
   */
  assetId: string
  /**
   * Processing lifecycle status of the media asset.
   */
  status: 'PROCESSING' | 'READY' | 'PENDING' | 'UPLOADING' | 'FAILED' | string
  /**
   * AI Content moderation status
   */
  moderationStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'FLAGGED' | string
  /**
   * Auto-generated speech-to-text WebVTT transcription URL
   */
  captionVttUrl?: string
  /**
   * Cloudinary public ID if distinct from assetId (e.g. 'delve/users/u1/posts/vid-123')
   */
  publicId?: string
  /**
   * Cloudinary cloud name. Defaults to environment config or 'delve'.
   */
  cloudName?: string
  /**
   * Optional custom poster thumbnail URL
   */
  posterUrl?: string
  /**
   * Desired aspect ratio (e.g. '9:16', '16:9', '4:5', '1:1'). Defaults to '16:9'.
   */
  aspectRatio?: '9:16' | '16:9' | '4:5' | '1:1' | string
  /**
   * Custom CSS classes for the outer wrapper
   */
  className?: string
  /**
   * Auto-play when visible. Defaults to true.
   */
  autoPlay?: boolean
  /**
   * Muted playback. Defaults to true.
   */
  muted?: boolean
  /**
   * Loop video playback. Defaults to true.
   */
  loop?: boolean
  /**
   * Show native controls. Defaults to false.
   */
  controls?: boolean
  /**
   * Optional callback when HLS or video is loaded and ready to play
   */
  onReady?: () => void
  /**
   * Optional callback on fatal playback error
   */
  onError?: (error: Error) => void
}

/**
 * Aspect ratio map for consistent feed layouts
 */
const ASPECT_STYLES: Record<string, string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '4:5': 'aspect-[4/5]',
  '1:1': 'aspect-square',
}

export default function FeedVideoCard({
  assetId,
  status,
  moderationStatus,
  captionVttUrl,
  publicId,
  cloudName,
  posterUrl,
  aspectRatio = '16:9',
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  onReady,
  onError,
}: FeedVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [isMuted, setIsMuted] = useState(muted)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [hasPlaybackError, setHasPlaybackError] = useState(false)

  // SCENARIO 1: Consume local media store for instant author preview
  const localVideo = useLocalVideo(assetId) || (publicId ? useLocalVideo(publicId) : undefined)
  const hasLocalBlob = Boolean(localVideo?.blobUrl)

  const effectiveCloudName =
    cloudName ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) ||
    'delve'

  const effectivePublicId = (publicId || assetId || '').replace(/\.[^/.]+$/, '')

  // Generate Cloudinary blurred image URL for Scenario 2 (Viewer Processing)
  const blurredPosterUrl = useMemo(() => {
    if (posterUrl) return posterUrl
    if (!effectivePublicId) return ''
    return `https://res.cloudinary.com/${effectiveCloudName}/video/upload/e_blur:1000,f_auto,q_auto/${effectivePublicId}.jpg`
  }, [effectiveCloudName, effectivePublicId, posterUrl])

  // Generate HLS playlist (.m3u8) and MP4 fallback URLs for Scenario 3
  const hlsStreamUrl = useMemo(() => {
    if (!effectivePublicId) return ''
    return `https://res.cloudinary.com/${effectiveCloudName}/video/upload/${effectivePublicId}.m3u8`
  }, [effectiveCloudName, effectivePublicId])

  const mp4FallbackUrl = useMemo(() => {
    if (!effectivePublicId) return ''
    return `https://res.cloudinary.com/${effectiveCloudName}/video/upload/f_auto,q_auto/${effectivePublicId}.mp4`
  }, [effectiveCloudName, effectivePublicId])

  // SCENARIO 3: HLS Adaptive Bitrate Setup with Native Fallback & Lifecycle Cleanup
  useEffect(() => {
    // If author preview is active or video is not ready or moderated, skip remote HLS initialization
    if (hasLocalBlob || status !== 'READY' || moderationStatus === 'REJECTED') {
      return
    }

    const videoEl = videoRef.current
    if (!videoEl || !hlsStreamUrl) return

    setHasPlaybackError(false)

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Branch A: MediaSource Extensions with hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hlsRef.current = hls

      hls.loadSource(hlsStreamUrl)
      hls.attachMedia(videoEl)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onReady?.()
        if (autoPlay) {
          videoEl.play().catch(() => {
            // Autoplay policy fallback: mute and retry
            videoEl.muted = true
            setIsMuted(true)
            void videoEl.play()
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[FeedVideoCard] HLS network error, attempting recovery...', data)
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[FeedVideoCard] HLS media error, attempting recovery...', data)
              hls.recoverMediaError()
              break
            default:
              console.error('[FeedVideoCard] Fatal HLS error, falling back to direct MP4:', data)
              hls.destroy()
              hlsRef.current = null
              // Fallback to direct MP4 URL
              videoEl.src = mp4FallbackUrl
              if (autoPlay) void videoEl.play().catch(() => {})
              onError?.(new Error(`HLS Fatal Error: ${data.details}`))
              break
          }
        }
      })
    }
    // Branch B: Native iOS Safari HLS Support
    else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = hlsStreamUrl

      const handleLoadedMetadata = () => {
        onReady?.()
        if (autoPlay) {
          videoEl.play().catch(() => {
            videoEl.muted = true
            setIsMuted(true)
            void videoEl.play()
          })
        }
      }

      const handleNativeError = () => {
        console.warn('[FeedVideoCard] Native HLS failed, falling back to MP4...')
        videoEl.src = mp4FallbackUrl
        if (autoPlay) void videoEl.play().catch(() => {})
      }

      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata)
      videoEl.addEventListener('error', handleNativeError)

      return () => {
        videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
        videoEl.removeEventListener('error', handleNativeError)
      }
    }
    // Branch C: Direct MP4 Fallback for legacy browsers
    else {
      videoEl.src = mp4FallbackUrl
      if (autoPlay) void videoEl.play().catch(() => {})
    }

    // CRITICAL: Cleanup function to destroy hls.js instance on unmount (prevents memory leaks)
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hasLocalBlob, status, moderationStatus, hlsStreamUrl, mp4FallbackUrl, autoPlay, onReady, onError])

  // Toggle play/pause
  const togglePlay = () => {
    if (moderationStatus === 'REJECTED') return
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setIsPlaying(true)
    } else {
      el.pause()
      setIsPlaying(false)
    }
  }

  // Toggle mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setIsMuted(el.muted)
  }

  const aspectClass = ASPECT_STYLES[aspectRatio] || 'aspect-[16/9]'

  // ---------------------------------------------------------------------------
  // SAFETY: AI Moderation Rejected (NSFW / Content Policy Violation)
  // ---------------------------------------------------------------------------
  if (moderationStatus === 'REJECTED') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-neutral-950 flex flex-col items-center justify-center p-6 text-center select-none ${aspectClass} ${className}`}
        style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}
      >
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-rose-400 m-0">Content Flagged</h4>
        <p className="text-xs text-neutral-400 m-0 mt-1 max-w-[280px]">
          This media has been removed by automated safety moderation.
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Viewer Processing (No local blob & status === 'PROCESSING')
  // ---------------------------------------------------------------------------
  if (!hasLocalBlob && (status === 'PROCESSING' || status === 'PENDING' || status === 'UPLOADING')) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-neutral-950 flex flex-col items-center justify-center select-none ${aspectClass} ${className}`}
        style={{ border: '1px solid var(--border, rgba(255, 255, 255, 0.1))' }}
      >
        {/* Blurred background image placeholder */}
        {blurredPosterUrl && (
          <img
            src={blurredPosterUrl}
            alt="Video placeholder"
            className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 opacity-40 transition-opacity duration-700"
          />
        )}

        {/* Ambient dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/80" />

        {/* Processing Spinner & Status Text */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 animate-ping absolute" />
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white tracking-wide m-0">
              Optimizing video...
            </p>
            <p className="text-xs text-neutral-400 m-0">
              Preparing adaptive HD stream for your device
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 1 & SCENARIO 3: Author Preview (Local Blob) OR HLS Ready Stream
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black group cursor-pointer ${aspectClass} ${className}`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        // If Scenario 1, use the instant zero-latency Blob URL
        src={localVideo?.blobUrl || undefined}
        poster={localVideo?.posterBlobUrl || posterUrl}
        playsInline
        muted={isMuted}
        loop={loop}
        controls={controls}
        className="w-full h-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasPlaybackError(true)}
      >
        {captionVttUrl ? (
          <track
            kind="captions"
            src={captionVttUrl}
            srcLang="en"
            label="English"
            default
          />
        ) : (
          <track kind="captions" />
        )}
      </video>

      {/* Floating Author Preview / Upload Progress Badge */}
      {localVideo && localVideo.status !== 'ready' && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-white shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {localVideo.status === 'uploading'
              ? `Uploading ${Math.round(localVideo.uploadProgress * 100)}%`
              : localVideo.status === 'transcoding'
                ? 'Processing on cloud...'
                : 'Author Preview'}
          </span>
        </div>
      )}

      {/* Play / Pause Center Overlay Indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Floating Bottom Right Sound Control */}
      <button
        type="button"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        onClick={toggleMute}
        className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-105 transition-all shadow-md"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Error Fallback Banner */}
      {hasPlaybackError && (
        <div className="absolute inset-0 z-30 bg-neutral-900/90 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-xs font-medium text-white m-0">Unable to stream video</p>
          <p className="text-[11px] text-neutral-400 m-0 mt-1">
            Please check your network connection or try again later.
          </p>
        </div>
      )}
    </div>
  )
}
