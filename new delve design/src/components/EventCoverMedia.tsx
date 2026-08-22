interface EventCoverMediaProps {
  url: string
  resourceType?: 'image' | 'video' | string | null
  className?: string
  /** Show playback controls (detail views). List cards can omit. */
  controls?: boolean
}

export default function EventCoverMedia({
  url,
  resourceType,
  className = 'w-full object-cover',
  controls = true,
}: EventCoverMediaProps) {
  if (resourceType === 'video') {
    return (
      <video
        src={url}
        className={className}
        controls={controls}
        playsInline
        preload="metadata"
      />
    )
  }
  return <img src={url} alt="" className={className} />
}
