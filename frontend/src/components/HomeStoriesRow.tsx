import { useMemo, useState } from 'react'
import { buildSlidesForChannel, STORY_CHANNELS, type StoryChannelId, type StoryPreviewMedia } from '../data/homeStories'
import { StoryViewer } from './StoryViewer'

type Props = {
  preview: StoryPreviewMedia
}

const STORY_CHANNEL_INITIALS: Record<StoryChannelId, string> = {
  stays: 'S',
  go: 'T',
  live: 'E',
  eat: 'F',
  tours: 'G',
  pins: 'D',
}

export function HomeStoriesRow({ preview }: Props) {
  const [channelId, setChannelId] = useState<StoryChannelId | null>(null)

  const activeMeta = channelId ? STORY_CHANNELS.find((c) => c.id === channelId) : null

  const slides = useMemo(() => {
    if (!channelId) return []
    return buildSlidesForChannel(channelId, preview)
  }, [channelId, preview])

  return (
    <>
      <div className="stories-row" aria-label="Highlights">
        {STORY_CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="story-bubble story-bubble--btn"
            onClick={() => setChannelId(c.id)}
          >
            <div className="story-bubble__ring">
              <span className="story-bubble__inner" aria-hidden>
                {STORY_CHANNEL_INITIALS[c.id]}
              </span>
            </div>
            <span className="story-bubble__label">{c.label}</span>
          </button>
        ))}
      </div>

      {activeMeta && (
        <StoryViewer
          open={Boolean(channelId)}
          onClose={() => setChannelId(null)}
          channelLabel={activeMeta.label}
          explorePath={activeMeta.explorePath}
          slides={slides}
        />
      )}
    </>
  )
}
