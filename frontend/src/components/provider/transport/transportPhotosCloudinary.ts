import { isVideoUrl } from '../../listing/photos/listingGalleryMedia'
import {
  mediaFormToPhotoDrafts,
  photoDraftsToMediaFormPatch,
  type ListingMediaFormFields,
} from '../../listing/photos/listingMediaForm'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../../listing/photos/types'

export type TransportMediaFormFields = ListingMediaFormFields

export function transportPhotosFromForm(values: TransportMediaFormFields): ListingPhotoDraft[] {
  return mediaFormToPhotoDrafts(values)
}

export function transportFormPatchFromPhotos(
  photos: ListingPhotoDraft[],
): Partial<TransportMediaFormFields> {
  return photoDraftsToMediaFormPatch(photos)
}

export type TransportPhotosRemotePayload = {
  cover_image_url: string
  cover_kind: 'image' | 'video'
  gallery_images: Array<string | { url: string; kind: 'image' | 'video' }>
}

export async function resolveTransportPhotosForSave(
  form: TransportMediaFormFields,
): Promise<TransportPhotosRemotePayload> {
  const drafts = transportPhotosFromForm(form)
  if (!drafts.length) {
    return { cover_image_url: '', cover_kind: 'image', gallery_images: [] }
  }
  const resolved = await resolveListingGalleryMedia(drafts, { allowVideoCover: true })
  const cover = resolved.cover.trim()
  const coverKind: 'image' | 'video' =
    resolved.coverKind === 'video' || isVideoUrl(cover) ? 'video' : 'image'
  const gallery = resolved.gallery.map((item) =>
    item.kind === 'video' ? { url: item.url, kind: 'video' as const } : item.url,
  )
  // Prefer objects whenever cover is video so clients keep playable covers.
  if (coverKind === 'video' && gallery.every((g) => typeof g === 'string')) {
    return {
      cover_image_url: cover,
      cover_kind: coverKind,
      gallery_images: gallery,
    }
  }
  return {
    cover_image_url: cover,
    cover_kind: coverKind,
    gallery_images: gallery,
  }
}
