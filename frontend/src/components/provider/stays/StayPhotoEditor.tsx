import { useEffect, useMemo, useRef, useState } from 'react'
import { ListingPhotoManager } from '../../listing/photos'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import {
  stayFormPatchFromPhotos,
  stayPhotosFromForm,
  type StayMediaFormFields,
} from './stayPhotosCloudinary'

type Props = {
  values: StayMediaFormFields
  onChange: (partial: Partial<StayMediaFormFields>) => void
  hint?: string
  className?: string
}

function mediaFingerprint(values: StayMediaFormFields): string {
  const files = [
    values.cover_image_file ? `${values.cover_image_file.name}:${values.cover_image_file.size}` : '',
    ...(values.gallery_files ?? []).map((f) => `${f.name}:${f.size}`),
  ]
  return [values.cover_image_url.trim(), values.gallery_urls.trim(), ...files].join('|')
}

/** Cover + gallery editor — photo or short video cover (Delvers Cloudinary path). */
export function StayPhotoEditor({
  values,
  onChange,
  hint = 'Add a cover photo or short video, then gallery shots of the property.',
  className = '',
}: Props) {
  const photos = useMemo(
    () => stayPhotosFromForm(values),
    [values.cover_image_file, values.cover_image_url, values.gallery_urls, values.gallery_files],
  )
  const fingerprint = mediaFingerprint(values)
  const needsCloudUpload =
    Boolean(values.cover_image_file) ||
    (values.gallery_files?.length ?? 0) > 0 ||
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
          const snapshot = stayPhotosFromForm(values)
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
          onChangeRef.current(stayFormPatchFromPhotos(drafts))
          setUploadNote('Media ready — save the listing to publish.')
          window.setTimeout(() => setUploadNote(''), 2200)
        } catch (err) {
          if (gen !== uploadGen.current) return
          const detail = err instanceof Error ? err.message.trim() : ''
          setUploadNote(
            detail
              ? `Upload failed — ${detail}`
              : 'Upload failed — check your connection and try again.',
          )
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint captures media inputs
  }, [fingerprint, needsCloudUpload])

  return (
    <div className={`stay-photo-editor ${className}`.trim()}>
      <div className="stay-photo-editor__head">
        <strong>Cover & gallery</strong>
        <p>Upload photos or short videos. First item is the cover — it can be either.</p>
      </div>
      <ListingPhotoManager
        photos={photos}
        onChange={(next) => onChange(stayFormPatchFromPhotos(next))}
        allowVideoCover
        hint={hint}
      />
      {uploadNote ? (
        <p className="stay-form__hint" role="status">
          {uploadNote}
        </p>
      ) : null}
    </div>
  )
}
