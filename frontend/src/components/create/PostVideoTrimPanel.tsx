import { VideoTrimBar } from './VideoTrimBar'
import type { VideoTrim } from './types'
import './SocialCreateComposer.css'

type Props = {
  preview: string
  videoDuration: number
  videoTrim: VideoTrim
  onDuration: (duration: number) => void
  onTrimChange: (trim: VideoTrim) => void
  playheadSec?: number
  onScrub?: (sec: number) => void
}

export function PostVideoTrimPanel({
  preview,
  videoDuration,
  videoTrim,
  onDuration,
  onTrimChange,
  playheadSec,
  onScrub,
}: Props) {
  return (
    <div className="post-video-trim-panel">
      <p className="create-panel__title">Trim</p>
      <video
        src={preview}
        className="visually-hidden"
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration || 0
          onDuration(duration)
          onTrimChange({ start: 0, end: duration })
        }}
      />
      <VideoTrimBar
        value={videoTrim}
        duration={videoDuration}
        onChange={onTrimChange}
        previewUrl={preview}
        playheadSec={playheadSec}
        onScrub={onScrub}
      />
    </div>
  )
}
