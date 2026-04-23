import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import type { StoryPreviewMedia } from '../data/homeStories'
import type { FeedPost } from '../components/IgPostCard'

type Stay = { id: number; cover_image: string | null }
type Ev = { id: number; cover_image: string | null }
type Food = { id: number; cover_image: string | null }
type Guide = { id: number; photo: string | null }
type VehiclePreview = { id: number; cover_image: string | null }

/** Shared story-ring preview media (home, Delvers, etc.). */
export function useStoryPreview(): StoryPreviewMedia {
  const { data: stays } = useQuery({
    queryKey: ['home-stays'],
    queryFn: () => apiFetch<Stay[]>('/api/accommodation/listings/?ordering=-created_at', { auth: false }),
  })
  const { data: events } = useQuery({
    queryKey: ['home-events'],
    queryFn: () => apiFetch<Ev[]>('/api/events/?ordering=starts_at', { auth: false }),
  })
  const { data: food } = useQuery({
    queryKey: ['home-food'],
    queryFn: () => apiFetch<Food[]>('/api/food/venues/?ordering=name', { auth: false }),
  })
  const { data: guides } = useQuery({
    queryKey: ['home-guides'],
    queryFn: () => apiFetch<Guide[]>('/api/guides/profiles/?ordering=-created_at', { auth: false }),
  })
  const { data: vehicles } = useQuery({
    queryKey: ['home-vehicles-preview'],
    queryFn: () => apiFetch<VehiclePreview[]>('/api/transport/vehicles/', { auth: false }),
  })
  const { data: delversPreview } = useQuery({
    queryKey: ['home-delvers-preview'],
    queryFn: () => apiFetch<FeedPost[]>('/api/social/delvers/', { auth: false }),
  })

  return useMemo(() => {
    const pinWithVideo = delversPreview?.find((p) => p.video)
    const pinWithImage = delversPreview?.find((p) => p.image)
    return {
      stayImage: stays?.[0]?.cover_image ? (mediaUrl(stays[0].cover_image) ?? null) : null,
      eventImage: events?.[0]?.cover_image ? (mediaUrl(events[0].cover_image) ?? null) : null,
      foodImage: food?.[0]?.cover_image ? (mediaUrl(food[0].cover_image) ?? null) : null,
      guideImage: guides?.[0]?.photo ? (mediaUrl(guides[0].photo) ?? null) : null,
      vehicleImage: vehicles?.[0]?.cover_image ? (mediaUrl(vehicles[0].cover_image) ?? null) : null,
      pinImage: pinWithImage?.image ? (mediaUrl(pinWithImage.image) ?? null) : null,
      pinVideo: pinWithVideo?.video ? (mediaUrl(pinWithVideo.video) ?? null) : null,
    }
  }, [stays, events, food, guides, vehicles, delversPreview])
}
