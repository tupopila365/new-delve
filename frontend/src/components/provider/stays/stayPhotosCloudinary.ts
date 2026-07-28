import { isVideoUrl } from '../../listing/photos/listingGalleryMedia'
import {
  mediaFormToPhotoDrafts,
  photoDraftsToMediaFormPatch,
  type ListingMediaFormFields,
} from '../../listing/photos/listingMediaForm'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../../listing/photos/types'

/** Shared cover + gallery fields used by stay listing and room media. */
export type StayMediaFormFields = ListingMediaFormFields

export function stayPhotosFromForm(values: StayMediaFormFields): ListingPhotoDraft[] {
  return mediaFormToPhotoDrafts(values)
}

export function stayFormPatchFromPhotos(photos: ListingPhotoDraft[]): Partial<StayMediaFormFields> {
  return photoDraftsToMediaFormPatch(photos)
}

export type StayPhotosRemotePayload = {
  cover_image: string
  media_gallery: Array<{ kind: 'image' | 'video'; src: string }>
}

export async function resolveStayPhotosForSave(
  form: StayMediaFormFields,
): Promise<StayPhotosRemotePayload> {
  const drafts = stayPhotosFromForm(form)
  if (!drafts.length) {
    return { cover_image: '', media_gallery: [] }
  }
  const resolved = await resolveListingGalleryMedia(drafts, { allowVideoCover: true })
  const cover = resolved.cover.trim()
  const coverKind: 'image' | 'video' =
    resolved.coverKind === 'video' || isVideoUrl(cover) ? 'video' : 'image'
  const gallery = resolved.gallery.map((item) => ({
    kind: (item.kind === 'video' ? 'video' : 'image') as 'image' | 'video',
    src: item.url,
  }))
  // Keep cover in media_gallery first when present so travellers see it in the strip.
  const media_gallery =
    cover
      ? [{ kind: coverKind, src: cover }, ...gallery.filter((g) => g.src !== cover)]
      : gallery
  return { cover_image: cover, media_gallery }
}

export async function resolveStayRoomMediaForSave(form: StayMediaFormFields): Promise<{
  image: string
  images: string[]
}> {
  const drafts = stayPhotosFromForm(form)
  if (!drafts.length) return { image: '', images: [] }
  const resolved = await resolveListingGalleryMedia(drafts, { allowVideoCover: true })
  const cover = resolved.cover.trim()
  const gallery = resolved.gallery.map((item) => item.url.trim()).filter(Boolean)
  const images = [...new Set([cover, ...gallery].filter(Boolean))]
  return { image: cover, images }
}
