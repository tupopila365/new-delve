import { mediaUrl } from '../api/client'

type Props = {
  image: string | null | undefined
  video: string | null | undefined
  alt?: string
  /** feed: autoplay muted loop; pin: often same; modal: controls */
  variant?: 'feed' | 'pin' | 'detail'
  className?: string
  /** Delvers feed: gradient overlay so video blocks do not look broken */
  showVideoPreview?: boolean
}

/**
 * Renders post video (preferred if both exist) or image with consistent sizing.
 */
export function PostMedia({
  image,
  video,
  alt = '',
  variant = 'feed',
  className = '',
  showVideoPreview = false,
}: Props) {
  const v = video ? mediaUrl(video) : undefined
  const img = image ? mediaUrl(image) : undefined

  const base = variant === 'pin' ? 'pin-card__media-el' : 'ig-post__media'

  if (v) {
    return (
      <div className={`post-media-wrap post-media-wrap--${variant} ${className}`.trim()}>
        {showVideoPreview && variant !== 'detail' ? (
          <div className="post-media-video-preview" aria-hidden>
            <span className="post-media-video-preview__title">Video preview</span>
            <span className="post-media-video-preview__sub">Tap to watch</span>
          </div>
        ) : variant !== 'detail' ? (
          <span className="post-media-badge">Video</span>
        ) : null}
        <video
          className={base}
          src={v}
          playsInline
          muted
          loop
          autoPlay={variant !== 'detail'}
          controls={variant === 'detail'}
          preload="metadata"
        />
      </div>
    )
  }

  if (img) {
    return (
      <div className={`post-media-wrap post-media-wrap--${variant} ${className}`.trim()}>
        <img className={base} src={img} alt={alt} loading="lazy" decoding="async" />
      </div>
    )
  }

  return (
    <div className={`post-media-placeholder post-media-wrap--${variant} ${className}`.trim()}>
      <span>Photo or video</span>
    </div>
  )
}
