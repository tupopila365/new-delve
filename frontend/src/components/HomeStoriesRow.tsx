import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
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

function fallbackChannels(): ChannelView[] {
  return STORY_CHANNELS.map((c) => ({
    id: c.id,
    label: c.label,
    explorePath: c.explorePath,
    ringInitial: c.label.slice(0, 1).toUpperCase(),
    ringImage: null,
    slides: buildSlidesForChannel(c.id, {}),
  }))
}

export function HomeStoriesRow() {
  const { profile } = useAuth()
  const region = profile?.region?.trim() ?? ''
  const [channelId, setChannelId] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['home-stories', region],
    queryFn: () => {
      const qs = region ? `?region=${encodeURIComponent(region)}` : ''
      return apiFetch<HomeStoriesResponse>(`/api/home/stories/${qs}`, { auth: false })
    },
    staleTime: 60_000,
  })

  const channels = useMemo((): ChannelView[] => {
    const rows = asArray<ApiStoryChannel>(data?.channels)
    if (!rows.length) return fallbackChannels()
    return rows.map((c) => ({
      id: c.id,
      label: c.label,
      explorePath: c.explore_path || STORY_CHANNELS.find((s) => s.id === c.id)?.explorePath || '/',
      ringInitial: (c.ring_initial || c.label.slice(0, 1) || '?').toUpperCase(),
      ringImage: mediaUrl(c.ring_image) || c.ring_image || null,
      slides: (c.slides || []).map(mapSlide).filter((s) => Boolean(s.src)),
    }))
  }, [data])

  const active = channelId ? channels.find((c) => c.id === channelId) : null
  const slides = active?.slides ?? []

  return (
    <>
      <div className="stories-row" aria-label="Highlights">
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            className="story-bubble story-bubble--btn"
            onClick={() => setChannelId(c.id)}
          >
            <div className="story-bubble__ring">
              <span
                className={`story-bubble__inner${c.ringImage ? ' story-bubble__inner--avatar' : ''}`}
                aria-hidden
              >
                {c.ringImage ? (
                  <img src={c.ringImage} alt="" className="story-bubble__avatar-img" loading="lazy" />
                ) : (
                  c.ringInitial
                )}
              </span>
            </div>
            <span className="story-bubble__label">{c.label}</span>
          </button>
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
