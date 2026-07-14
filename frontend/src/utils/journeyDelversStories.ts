import type { MockTrip } from '../data/mockTrips'
import type { HighlightChannel, HighlightSlide } from '../components/highlights/types'
import type { DelversFeedPost } from '../components/social/delversFeedTypes'
import type { DelversStoryTarget } from '../components/social/DelversStoryViewer'
import { buildJourneyStoryChannels } from '../components/journeys/journeyStoriesUtils'
import { journeyCoverSrc } from './journeyDisplay'

/** Stable synthetic post ids in a negative range reserved for journey slides. */
function slidePostId(tripId: number, channelId: string, slideId: string, index: number): number {
  let hash = 0
  const key = `${tripId}:${channelId}:${slideId}:${index}`
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return -Math.abs(hash || 1) - 1_000_000
}

function slideToPost(trip: MockTrip, channelId: string, slide: HighlightSlide, index: number): DelversFeedPost {
  const body = [slide.headline?.trim(), slide.sub?.trim()].filter(Boolean).join('\n')
  return {
    id: slidePostId(trip.id, channelId, slide.id, index),
    author: {
      username: trip.author.username,
      display_name: trip.author.display_name,
      avatar: trip.author.avatar,
    },
    body: body || trip.title,
    region: '',
    image: slide.kind === 'image' ? slide.src : null,
    video: slide.kind === 'video' ? slide.src : null,
    liked_by_me: false,
    saved_by_me: false,
    fired_by_me: false,
    likes_count: 0,
    saves_count: 0,
    fires_count: 0,
    comments_count: 0,
    is_delvers_highlight: true,
  }
}

export function journeyChannelToStoryTarget(
  trip: MockTrip,
  channel: HighlightChannel,
): DelversStoryTarget {
  const slides = channel.slides.filter((s) => Boolean(s.src?.trim()))
  const posts =
    slides.length > 0
      ? slides.map((slide, i) => slideToPost(trip, channel.id, slide, i))
      : [
          slideToPost(
            trip,
            channel.id,
            {
              id: `${channel.id}-cover`,
              kind: 'image',
              src: channel.coverSrc || journeyCoverSrc(trip.cover_image) || '',
              headline: trip.title,
              sub: channel.label,
            },
            0,
          ),
        ]

  return {
    kind: 'board',
    title: trip.author.display_name || trip.author.username,
    subtitle: `${trip.title} · ${channel.label}`,
    avatar: trip.author.avatar ?? null,
    username: trip.author.username,
    posts,
  }
}

/** One Delvers-style ring per journey (all channels' slides flattened). */
export function journeyToStoryTarget(trip: MockTrip): DelversStoryTarget {
  const channels = buildJourneyStoryChannels(trip)
  const posts = channels.flatMap((ch) =>
    ch.slides.filter((s) => Boolean(s.src?.trim())).map((slide, i) => slideToPost(trip, ch.id, slide, i)),
  )
  if (posts.length === 0) {
    const cover = journeyCoverSrc(trip.cover_image) || ''
    posts.push(
      slideToPost(
        trip,
        'cover',
        {
          id: 'cover',
          kind: 'image',
          src: cover,
          headline: trip.title,
          sub: trip.summary?.trim() || '',
        },
        0,
      ),
    )
  }
  return {
    kind: 'board',
    title: trip.author.display_name || trip.author.username,
    subtitle: trip.title,
    avatar: trip.author.avatar ?? null,
    username: trip.author.username,
    posts,
  }
}

export function journeyChannelsToStoryTargets(
  trip: MockTrip,
  channels: HighlightChannel[],
): DelversStoryTarget[] {
  return channels
    .map((ch) => journeyChannelToStoryTarget(trip, ch))
    .filter((t) => t.posts.length > 0)
}
