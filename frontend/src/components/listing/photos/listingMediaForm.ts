import { formatGalleryUrlsField, parseGalleryUrlsField } from './listingGalleryMedia'
import { photoKind } from './listingPhotoUtils'
import type { ListingPhotoDraft } from './types'

/** Cover + gallery fields shared by every provider media form (stays, food, transport). */
export type ListingMediaFormFields = {
  cover_image_url: string
  cover_image_file?: File | null
  gallery_urls: string
  gallery_files?: File[]
}

/** Build the photo manager drafts (cover first) from a provider form's media fields. */
export function mediaFormToPhotoDrafts(values: ListingMediaFormFields): ListingPhotoDraft[] {
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
  parseGalleryUrlsField(values.gallery_urls).forEach((item, index) => {
    items.push({ id: `gallery-url-${index}`, src: item.url, kind: item.kind })
  })
  ;(values.gallery_files ?? []).forEach((file, index) => {
    items.push({
      id: `gallery-file-${index}`,
      src: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      file,
    })
  })
  return items
}

/** Fold reordered photo manager drafts back into a provider form patch. */
export function photoDraftsToMediaFormPatch(
  photos: ListingPhotoDraft[],
): Required<ListingMediaFormFields> {
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
