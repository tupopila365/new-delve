import { VideoTrimBar } from './VideoTrimBar'
import type { VideoTrim } from './types'
import './SocialCreateComposer.css'

type Props = {
  preview: string
  videoDuration: number
  videoTrim: VideoTrim
  onDuration: (duration: number) => void
  onTrimChange: (trim: VideoTrim) => void
}

export function PostVideoTrimPanel({
  preview,
  videoDuration,
  videoTrim,
  onDuration,
  onTrimChange,
}: Props) {
  return (
    <div className="post-video-trim-panel">
      <video
        src={preview}
        className="visually-hidden"
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration || 0
          onDuration(duration)
          onTrimChange({ start: 0, end: duration })
        }}
      />
      <VideoTrimBar value={videoTrim} duration={videoDuration} onChange={onTrimChange} previewUrl={preview} />
    </div>
  )
}
