import {
  formatGalleryUrlsField,
  isVideoUrl,
  parseGalleryUrlsField,
} from '../../listing/photos/listingGalleryMedia'
import {
  photoKind,
  resolveListingGalleryMedia,
} from '../../listing/photos/listingPhotoUtils'
import type { ListingPhotoDraft } from '../../listing/photos/types'

export type TransportMediaFormFields = {
  cover_image_url: string
  cover_image_file?: File | null
  gallery_urls: string
  gallery_files?: File[]
}

export function transportPhotosFromForm(values: TransportMediaFormFields): ListingPhotoDraft[] {
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

export function transportFormPatchFromPhotos(
  photos: ListingPhotoDraft[],
): Partial<TransportMediaFormFields> {
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
