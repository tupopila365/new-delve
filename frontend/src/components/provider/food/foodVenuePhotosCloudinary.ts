import {
  mediaFormToPhotoDrafts,
  photoDraftsToMediaFormPatch,
} from '../../listing/photos/listingMediaForm'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import type { FoodVenueFormValues } from './foodVenueTypes'

/** Build ListingPhotoDraft[] from food venue form photo fields. */
export function foodVenuePhotosFromForm(values: FoodVenueFormValues): ListingPhotoDraft[] {
  return mediaFormToPhotoDrafts(values)
}

export function foodVenueFormPatchFromPhotos(photos: ListingPhotoDraft[]): Partial<FoodVenueFormValues> {
  return photoDraftsToMediaFormPatch(photos)
}

/** JSON payload after Delvers-style Cloudinary (or highlight proxy) upload. */
export type FoodVenuePhotosRemotePayload = {
  cover_image_url: string
  cover_kind: 'image' | 'video'
  photos: Array<{
    id: number
    image: string
    kind: 'image' | 'video'
    caption: string
    category: string
    is_cover: boolean
  }>
}

/**
 * Upload local cover/gallery files via the same Cloudinary path as Delvers/events,
 * then return a JSON-ready payload (no multipart through the API dyno).
 */
export async function resolveFoodVenuePhotosForSave(
  form: FoodVenueFormValues,
): Promise<FoodVenuePhotosRemotePayload> {
  const drafts = foodVenuePhotosFromForm(form)
  if (!drafts.length) {
    throw new Error('Add a cover photo or gallery image to save.')
  }
  const resolved = await resolveListingGalleryMedia(drafts, { allowVideoCover: true })
  if (!resolved.cover.trim()) {
    throw new Error('Add a cover photo or short video to save.')
  }
  const photos: FoodVenuePhotosRemotePayload['photos'] = [
    {
      id: 1,
      image: resolved.cover,
      kind: resolved.coverKind === 'video' ? 'video' : 'image',
      caption: 'Cover',
      category: 'food',
      is_cover: true,
    },
    ...resolved.gallery.map((item, index) => ({
      id: index + 2,
      image: item.url,
      kind: (item.kind === 'video' ? 'video' : 'image') as 'image' | 'video',
      caption: '',
      category: 'food',
      is_cover: false,
    })),
  ]
  return {
    cover_image_url: resolved.cover,
    cover_kind: resolved.coverKind === 'video' ? 'video' : 'image',
    photos,
  }
}
