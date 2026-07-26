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

/** Shared cover + gallery fields used by stay listing and room media. */
export type StayMediaFormFields = {
  cover_image_url: string
  cover_image_file?: File | null
  gallery_urls: string
  gallery_files?: File[]
}

export function stayPhotosFromForm(values: StayMediaFormFields): ListingPhotoDraft[] {
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

export function stayFormPatchFromPhotos(photos: ListingPhotoDraft[]): Partial<StayMediaFormFields> {
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
