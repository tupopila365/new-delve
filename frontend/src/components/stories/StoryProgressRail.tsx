import type { StoryPlaybackSlideKind } from '../../hooks/useStoryPlayback'

type Segment = {
  id: string | number
}

type Props = {
  segments: Segment[]
  index: number
  activeKind: StoryPlaybackSlideKind
  videoProgress: number
  imageDurationMs: number
  paused?: boolean
  variant?: 'home' | 'delvers'
}

export function StoryProgressRail({
  segments,
  index,
  activeKind,
  videoProgress,
  imageDurationMs,
  paused = false,
  variant = 'home',
}: Props) {
  const prefix = variant === 'delvers' ? 'ds-story-viewer' : 'story-viewer'

  return (
    <div className={`${prefix}__progress`} aria-hidden>
      {segments.map((segment, position) => {
        const done = position < index
        const active = position === index
        const isVideo = active && activeKind === 'video'
        const isImage = active && (activeKind === 'image' || activeKind === 'text')

        let fillClass = `${prefix}__fill ${prefix}__fill--idle`
        if (done) fillClass = `${prefix}__fill ${prefix}__fill--done`
        else if (active && isVideo) fillClass = `${prefix}__fill ${prefix}__fill--video`
        else if (active && isImage) {
          fillClass = `${prefix}__fill ${prefix}__fill--active${paused ? ` ${prefix}__fill--paused` : ''}`
        }

        const style =
          active && isVideo
            ? { transform: `scaleX(${Math.max(0.02, videoProgress)})` }
            : active && isImage
              ? { animationDuration: `${imageDurationMs}ms` }
              : undefined

        return (
          <div key={segment.id} className={`${prefix}__seg`}>
            <div className={fillClass} style={style} />
          </div>
        )
      })}
    </div>
  )
}
