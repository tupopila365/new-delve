import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useExploreRegion } from '../hooks/useExploreRegion'
import { buildSlidesForChannel, STORY_CHANNELS, type StorySlide } from '../data/homeStories'
import { StoryViewer } from './StoryViewer'

type ApiStorySlide = {
  id: string
  kind: 'image' | 'video'
  src: string
  headline: string
  sub?: string
  duration_ms?: number
  cta_path?: string
  cta_label?: string
  source?: string
}

type ApiStoryChannel = {
  id: string
  label: string
  explore_path: string
  ring_initial?: string
  ring_image?: string | null
  slides: ApiStorySlide[]
}

type HomeStoriesResponse = {
  channels: ApiStoryChannel[]
}

type ChannelView = {
  id: string
  label: string
  explorePath: string
  ringInitial: string
  ringImage: string | null
  slides: StorySlide[]
}

function mapSlide(slide: ApiStorySlide): StorySlide {
  return {
    id: slide.id,
    kind: slide.kind === 'video' ? 'video' : 'image',
    src: mediaUrl(slide.src) || slide.src,
    headline: slide.headline,
    sub: slide.sub || undefined,
    durationMs: slide.duration_ms,
    ctaPath: slide.cta_path,
    ctaLabel: slide.cta_label,
  }
}

function mapApiChannels(rows: ApiStoryChannel[]): ChannelView[] {
  return rows
    .map((c) => {
      const slides = (c.slides || []).map(mapSlide).filter((s) => Boolean(s.src))
      return {
        id: c.id,
        label: c.label,
        explorePath: c.explore_path || STORY_CHANNELS.find((s) => s.id === c.id)?.explorePath || '/',
        ringInitial: (c.ring_initial || c.label.slice(0, 1) || '?').toUpperCase(),
        ringImage: mediaUrl(c.ring_image) || c.ring_image || slides[0]?.src || null,
        slides,
      }
    })
    .filter((c) => c.slides.length > 0)
}

/** Offline / network-failure only — backend already includes stock slides when live content is empty. */
function offlineFallbackChannels(): ChannelView[] {
  return STORY_CHANNELS.map((c) => ({
    id: c.id,
    label: c.label,
    explorePath: c.explorePath,
    ringInitial: c.label.slice(0, 1).toUpperCase(),
    ringImage: null,
    slides: buildSlidesForChannel(c.id, {}),
  })).filter((c) => c.slides.length > 0)
}

export function HomeStoriesRow() {
  const { region } = useExploreRegion()
  const [channelId, setChannelId] = useState<string | null>(null)

  const { data, isError, isPending } = useQuery({
    queryKey: ['home-stories', region],
    queryFn: () => {
      const qs = region ? `?region=${encodeURIComponent(region)}` : ''
      return apiFetch<HomeStoriesResponse>(`/api/home/stories/${qs}`, { auth: false })
    },
    staleTime: 60_000,
    // Keep showing last good API payload when a refetch fails — don't jump to Unsplash.
    retry: 1,
  })

  const channels = useMemo((): ChannelView[] => {
    if (data) return mapApiChannels(asArray<ApiStoryChannel>(data.channels))
    if (isError) return offlineFallbackChannels()
    return []
  }, [data, isError])

  const active = channelId ? channels.find((c) => c.id === channelId) : null
  const slides = active?.slides ?? []

  if (isPending && channels.length === 0) {
    return (
      <div className="stories-row stories-row--loading" aria-label="Loading highlights" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className="story-bubble story-bubble--sk" aria-hidden>
            <span className="story-bubble__ring">
              <span className="story-bubble__inner" />
            </span>
            <span className="story-bubble__label">···</span>
          </span>
        ))}
      </div>
    )
  }

  if (channels.length === 0) {
    return null
  }

  return (
    <>
      <div className="stories-row" aria-label="Highlights">
        {channels.map((c) => (
          <StoryBubbleButton key={c.id} channel={c} onOpen={() => setChannelId(c.id)} />
        ))}
      </div>

      {active && slides.length > 0 ? (
        <StoryViewer
          open={Boolean(channelId)}
          onClose={() => setChannelId(null)}
          channelLabel={active.label}
          explorePath={active.explorePath}
          slides={slides}
        />
      ) : null}
    </>
  )
}

function StoryBubbleButton({ channel, onOpen }: { channel: ChannelView; onOpen: () => void }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = Boolean(channel.ringImage) && !imgFailed

  return (
    <button type="button" className="story-bubble story-bubble--btn" onClick={onOpen}>
      <div className="story-bubble__ring">
        <span className={`story-bubble__inner${showImg ? ' story-bubble__inner--avatar' : ''}`} aria-hidden>
          {showImg ? (
            <img
              src={channel.ringImage!}
              alt=""
              className="story-bubble__avatar-img"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            channel.ringInitial
          )}
        </span>
      </div>
      <span className="story-bubble__label">{channel.label}</span>
    </button>
  )
}
