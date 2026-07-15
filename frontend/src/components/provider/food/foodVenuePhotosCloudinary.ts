import {
  formatGalleryUrlsField,
  parseGalleryUrlsField,
} from '../../listing/photos/listingGalleryMedia'
import {
  photoKind,
  resolveListingGalleryMedia,
} from '../../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import type { FoodVenueFormValues } from './foodVenueTypes'

/** Build ListingPhotoDraft[] from food venue form photo fields. */
export function foodVenuePhotosFromForm(values: FoodVenueFormValues): ListingPhotoDraft[] {
  const items: ListingPhotoDraft[] = []
  if (values.cover_image_file) {
    items.push({
      id: 'cover',
      src: URL.createObjectURL(values.cover_image_file),
      kind: values.cover_image_file.type.startsWith('video/') ? 'video' : 'image',
      file: values.cover_image_file,
    })
  } else if (values.cover_image_url.trim()) {
    const src = values.cover_image_url.trim()
    items.push({
      id: 'cover',
      src,
      kind: photoKind({ id: 'cover', src, kind: undefined }),
    })
  }
  const galleryItems = parseGalleryUrlsField(values.gallery_urls)
  galleryItems.forEach((item, index) => {
    items.push({ id: `gallery-url-${index}`, src: item.url, kind: item.kind })
  })
  values.gallery_files.forEach((file, index) => {
    items.push({
      id: `gallery-file-${index}`,
      src: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      file,
    })
  })
  return items
}

export function foodVenueFormPatchFromPhotos(photos: ListingPhotoDraft[]): Partial<FoodVenueFormValues> {
  if (!photos.length) {
    return {
      cover_image_url: '',
      cover_image_file: null,
      gallery_urls: '',
      gallery_files: [],
    }
  }
  const [cover, ...rest] = photos
  const galleryUrls: ReturnType<typeof parseGalleryUrlsField> = []
  const galleryFiles: File[] = []
  for (const photo of rest) {
    if (photo.file && (photo.src.startsWith('blob:') || photo.src.startsWith('data:'))) {
      galleryFiles.push(photo.file)
    } else if (photo.src && !photo.src.startsWith('blob:')) {
      galleryUrls.push({ url: photo.src, kind: photoKind(photo) })
    }
  }
  const coverIsRemote = cover.src && !cover.src.startsWith('blob:') && !cover.src.startsWith('data:')
  return {
    cover_image_url: coverIsRemote ? cover.src : '',
    cover_image_file: coverIsRemote ? null : cover.file ?? null,
    gallery_urls: formatGalleryUrlsField(galleryUrls),
    gallery_files: galleryFiles,
  }
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
