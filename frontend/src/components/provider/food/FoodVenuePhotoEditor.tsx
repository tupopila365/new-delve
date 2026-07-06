import { useMemo } from 'react'
import { ListingPhotoManager } from '../../listing/photos'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import { photoKind } from '../../listing/photos/listingPhotoUtils'
import { formatGalleryUrlsField, parseGalleryUrlsField } from '../../listing/photos/listingGalleryMedia'
import type { FoodVenueFormValues } from './foodVenueTypes'

type Props = {
  values: FoodVenueFormValues
  onChange: (partial: Partial<FoodVenueFormValues>) => void
}

function photosFromForm(values: FoodVenueFormValues): ListingPhotoDraft[] {
  const items: ListingPhotoDraft[] = []
  if (values.cover_image_file) {
    items.push({
      id: 'cover',
      src: URL.createObjectURL(values.cover_image_file),
      kind: 'image',
      file: values.cover_image_file,
    })
  } else if (values.cover_image_url.trim()) {
    items.push({ id: 'cover', src: values.cover_image_url.trim(), kind: 'image' })
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

function patchFromPhotos(photos: ListingPhotoDraft[]): Partial<FoodVenueFormValues> {
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
    if (photo.file) {
      galleryFiles.push(photo.file)
    } else if (photo.src && !photo.src.startsWith('blob:')) {
      galleryUrls.push({ url: photo.src, kind: photoKind(photo) })
    }
  }
  return {
    cover_image_url: cover.file ? '' : cover.src.startsWith('blob:') ? '' : cover.src,
    cover_image_file: cover.file ?? null,
    gallery_urls: formatGalleryUrlsField(galleryUrls),
    gallery_files: galleryFiles,
  }
}

export function FoodVenuePhotoEditor({ values, onChange }: Props) {
  const photos = useMemo(() => photosFromForm(values), [
    values.cover_image_file,
    values.cover_image_url,
    values.gallery_urls,
    values.gallery_files,
  ])

  return (
    <ListingPhotoManager
      photos={photos}
      onChange={(next) => onChange(patchFromPhotos(next))}
      hint="Cover must be a photo. Gallery slots can be photos or videos up to 1 minute."
    />
  )
}
