export type StoryChannelId = 'stays' | 'go' | 'live' | 'eat' | 'tours' | 'pins'

export type StorySlide = {
  id: string
  kind: 'image' | 'video'
  src: string
  headline: string
  sub?: string
  durationMs?: number
  /** Per-slide footer CTA (e.g. link to a listing). */
  ctaPath?: string
  ctaLabel?: string
}

export type StoryPreviewMedia = {
  stayImage?: string | null
  eventImage?: string | null
  foodImage?: string | null
  guideImage?: string | null
  pinImage?: string | null
  pinVideo?: string | null
  vehicleImage?: string | null
}

const U = {
  stay1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1080&q=80',
  stay2: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1080&q=80',
  road: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=1080&q=80',
  bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1080&q=80',
  event: 'https://images.unsplash.com/photo-1429963354434-733ffa638db7?auto=format&fit=crop&w=1080&q=80',
  night: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1080&q=80',
  food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80',
  tour: 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1080&q=80',
  guide: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1080&q=80',
  pin1: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1080&q=80',
  pin2: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1080&q=80',
}

const FLOWER_MP4 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const IMG_MS = 5200

function img(
  id: string,
  src: string,
  headline: string,
  sub?: string,
  durationMs = IMG_MS,
): StorySlide {
  return { id, kind: 'image', src, headline, sub, durationMs }
}

function vid(id: string, src: string, headline: string, sub?: string): StorySlide {
  return { id, kind: 'video', src, headline, sub, durationMs: 12000 }
}

const BASE: Record<StoryChannelId, StorySlide[]> = {
  stays: [
    img('s1', U.stay1, 'Find your stay', 'Boutique rooms & desert lodges across Namibia'),
    img('s2', U.stay2, 'Book with confidence', 'Real listings from local hosts'),
    img('s3', U.stay1, 'Filter what matters', 'Guests, price, region — in seconds'),
  ],
  go: [
    img('g1', U.road, 'Hit the road', '4x4s and city cars, ready when you are'),
    img('g2', U.bus, 'Bus seats online', 'Pick a route, choose your seat, pay in-app'),
    vid('g3', FLOWER_MP4, 'Mock checkout', 'Full flow for demos — no real charge'),
  ],
  live: [
    img('l1', U.event, "What's on near you", 'Markets, music, and community events'),
    img('l2', U.night, 'Tonight & this week', 'Save the ones you love'),
    img('l3', U.event, 'Create your own', 'Post events for the city'),
  ],
  eat: [
    img('e1', U.food, 'Taste the place', 'Grills, cafés, and local flavours'),
    img('e2', U.cafe, 'Read the room', 'Cuisine, region, and price at a glance'),
  ],
  tours: [
    img('t1', U.tour, 'Walk with a local', 'Guides who know every dune and story'),
    img('t2', U.guide, 'Book by the hour', 'Languages & regions on every profile'),
  ],
  pins: [
    img('p1', U.pin1, 'Delvers pins', 'Save ideas like Pinterest, vibe like Instagram'),
    vid('p2', FLOWER_MP4, 'Photo & video', 'Short clips and stills in one grid'),
    img('p3', U.pin2, 'Your boards', 'Collect places to go later'),
  ],
}

export function buildSlidesForChannel(id: StoryChannelId, preview: StoryPreviewMedia): StorySlide[] {
  const slides = BASE[id].map((s) => ({ ...s }))

  const first = slides[0]
  if (!first || first.kind !== 'image') return slides

  const swap = (url: string | null | undefined) => {
    if (url) first.src = url
  }

  switch (id) {
    case 'stays':
      swap(preview.stayImage)
      break
    case 'live':
      swap(preview.eventImage)
      break
    case 'eat':
      swap(preview.foodImage)
      break
    case 'tours':
      swap(preview.guideImage)
      break
    case 'go':
      swap(preview.vehicleImage)
      break
    case 'pins':
      if (preview.pinVideo) {
        slides[1] = { ...slides[1], kind: 'video', src: preview.pinVideo }
      }
      if (preview.pinImage) {
        first.src = preview.pinImage
      }
      break
    default:
      break
  }

  return slides
}

export const STORY_CHANNELS: { id: StoryChannelId; label: string; emoji: string; explorePath: string }[] = [
  { id: 'stays', label: 'Stays', emoji: '🛏', explorePath: '/accommodation' },
  { id: 'go', label: 'Transport', emoji: '🚐', explorePath: '/transport' },
  { id: 'live', label: 'Events', emoji: '✨', explorePath: '/events' },
  { id: 'eat', label: 'Food', emoji: '🍽', explorePath: '/food' },
  { id: 'tours', label: 'Guides', emoji: '🧭', explorePath: '/guides' },
  { id: 'pins', label: 'Delvers', emoji: '📌', explorePath: '/delvers' },
]
