export type StoryChannelId = 'stays' | 'go' | 'live' | 'eat' | 'tours' | 'pins'

export type StorySlide = {
  id: string
  kind: 'image' | 'video'
  src: string
  headline: string
  sub?: string
  captionX?: number
  captionY?: number
  durationMs?: number
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

const IMG_MS = 5200

function img(id: string, src: string, headline: string, sub?: string, durationMs = IMG_MS): StorySlide {
  return { id, kind: 'image', src, headline, sub, durationMs }
}

const BASE: Record<StoryChannelId, StorySlide[]> = {
  stays: [
    img('s1', U.stay1, 'Find your stay', 'Boutique rooms and desert lodges across Namibia'),
    img('s2', U.stay2, 'Request with confidence', 'Real listings from local hosts'),
    img('s3', U.stay1, 'Filter what matters', 'Guests, price, and region in seconds'),
  ],
  go: [
    img('g1', U.road, 'Hit the road', 'Vehicle rentals and transfers for flexible travel'),
    img('g2', U.bus, 'Plan the route', 'Compare bus trips, operators, and departure times'),
    img('g3', U.road, 'Confirm the details', 'Request transport and finalize arrangements with providers'),
  ],
  live: [
    img('l1', U.event, "What's on near you", 'Markets, music, and community events'),
    img('l2', U.night, 'Tonight and this week', 'Save the events worth showing up for'),
    img('l3', U.event, 'Create your own', 'Post events for travellers and locals'),
  ],
  eat: [
    img('e1', U.food, 'Taste the place', 'Grills, cafes, and local flavours'),
    img('e2', U.cafe, 'Read the room', 'Cuisine, region, and price at a glance'),
  ],
  tours: [
    img('t1', U.tour, 'Walk with a local', 'Guides who know every dune and story'),
    img('t2', U.guide, 'Request an experience', 'Languages and regions on every profile'),
  ],
  pins: [
    img('p1', U.pin1, 'Delvers pins', 'Save travel ideas and local tips'),
    img('p2', U.pin2, 'Photo and video', 'Short clips and stills in one grid'),
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
      if (preview.pinImage) first.src = preview.pinImage
      if (preview.pinVideo) slides[1] = { ...slides[1], kind: 'video', src: preview.pinVideo }
      break
    default:
      break
  }

  return slides
}

export const STORY_CHANNELS: { id: StoryChannelId; label: string; explorePath: string }[] = [
  { id: 'stays', label: 'Stays', explorePath: '/accommodation' },
  { id: 'go', label: 'Transport', explorePath: '/transport' },
  { id: 'live', label: 'Events', explorePath: '/events' },
  { id: 'eat', label: 'Food', explorePath: '/food' },
  { id: 'tours', label: 'Guides', explorePath: '/guides' },
  { id: 'pins', label: 'Delvers', explorePath: '/delvers' },
]
