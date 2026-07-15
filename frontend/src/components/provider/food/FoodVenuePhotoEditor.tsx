import { useEffect, useMemo, useRef, useState } from 'react'
import { ListingPhotoManager } from '../../listing/photos'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import type { FoodVenueFormValues } from './foodVenueTypes'
import {
  foodVenueFormPatchFromPhotos,
  foodVenuePhotosFromForm,
} from './foodVenuePhotosCloudinary'

type Props = {
  values: FoodVenueFormValues
  onChange: (partial: Partial<FoodVenueFormValues>) => void
}

function mediaFingerprint(values: FoodVenueFormValues): string {
  const files = [
    values.cover_image_file ? `${values.cover_image_file.name}:${values.cover_image_file.size}` : '',
    ...values.gallery_files.map((f) => `${f.name}:${f.size}`),
  ]
  return [values.cover_image_url.trim(), values.gallery_urls.trim(), ...files].join('|')
}

/**
 * Food venue cover + gallery editor.
 * Eager-uploads local files to Cloudinary (same path as Delvers/events) once edits settle,
 * so Save is a fast JSON PATCH with remote URLs.
 */
export function FoodVenuePhotoEditor({ values, onChange }: Props) {
  const photos = useMemo(() => foodVenuePhotosFromForm(values), [
    values.cover_image_file,
    values.cover_image_url,
    values.gallery_urls,
    values.gallery_files,
  ])
  const fingerprint = mediaFingerprint(values)
  const needsCloudUpload =
    Boolean(values.cover_image_file) ||
    values.gallery_files.length > 0 ||
    values.cover_image_url.startsWith('blob:') ||
    values.cover_image_url.startsWith('data:') ||
    values.gallery_urls.includes('blob:') ||
    values.gallery_urls.includes('data:')

  const [uploadNote, setUploadNote] = useState('')
  const uploadGen = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!needsCloudUpload) {
      setUploadNote('')
      return
    }

    const gen = ++uploadGen.current
    setUploadNote('Uploading to Cloudinary…')
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const snapshot = foodVenuePhotosFromForm(values)
          const resolved = await resolveListingGalleryMedia(snapshot, { allowVideoCover: true })
          if (gen !== uploadGen.current) return
          const drafts: ListingPhotoDraft[] = [
            {
              id: 'cover',
              src: resolved.cover,
              kind: resolved.coverKind,
            },
            ...resolved.gallery.map((item, index) => ({
              id: `gallery-${index}`,
              src: item.url,
              kind: item.kind,
            })),
          ]
          onChangeRef.current(foodVenueFormPatchFromPhotos(drafts))
          setUploadNote('Media ready — tap Save photos to apply.')
          window.setTimeout(() => setUploadNote(''), 2200)
        } catch {
          if (gen !== uploadGen.current) return
          setUploadNote('Upload failed — try again or Save photos to retry.')
        }
      })()
    }, 550)

    return () => window.clearTimeout(timer)
    // Fingerprint captures local file / blob changes without looping after remote URLs settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, needsCloudUpload])

  return (
    <div className="food-photo-editor">
      <ListingPhotoManager
        photos={photos}
        onChange={(next) => onChange(foodVenueFormPatchFromPhotos(next))}
        allowVideoCover
        hint="Cover can be a photo or short clip. Gallery slots can be photos or videos up to 1 minute. Media uploads in the background like Delvers."
      />
      {uploadNote ? (
        <p className="fv-module__note" role="status">
          {uploadNote}
        </p>
      ) : null}
    </div>
  )
}
