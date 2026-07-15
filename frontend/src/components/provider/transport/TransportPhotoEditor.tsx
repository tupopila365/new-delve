import { useEffect, useMemo, useRef, useState } from 'react'
import { ListingPhotoManager } from '../../listing/photos'
import type { ListingPhotoDraft } from '../../listing/photos/types'
import { resolveListingGalleryMedia } from '../../listing/photos/listingPhotoUtils'
import {
  transportFormPatchFromPhotos,
  transportPhotosFromForm,
  type TransportMediaFormFields,
} from './transportPhotosCloudinary'

type Props = {
  values: TransportMediaFormFields
  onChange: (partial: Partial<TransportMediaFormFields>) => void
  title?: string
  hint?: string
}

function mediaFingerprint(values: TransportMediaFormFields): string {
  const files = [
    values.cover_image_file ? `${values.cover_image_file.name}:${values.cover_image_file.size}` : '',
    ...(values.gallery_files ?? []).map((f) => `${f.name}:${f.size}`),
  ]
  return [values.cover_image_url.trim(), values.gallery_urls.trim(), ...files].join('|')
}

/** Cover + gallery editor with optional short video covers (Delvers Cloudinary path). */
export function TransportPhotoEditor({
  values,
  onChange,
  title = 'Photos & video',
  hint = 'Add a strong cover photo or short video, then gallery shots travellers care about — exterior, interior, and details.',
}: Props) {
  const photos = useMemo(
    () => transportPhotosFromForm(values),
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
          const snapshot = transportPhotosFromForm(values)
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
          onChangeRef.current(transportFormPatchFromPhotos(drafts))
          setUploadNote('Media ready — save the listing to publish.')
          window.setTimeout(() => setUploadNote(''), 2200)
        } catch {
          if (gen !== uploadGen.current) return
          setUploadNote('Upload failed — check your connection and try again.')
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint captures media inputs
  }, [fingerprint, needsCloudUpload])

  return (
    <div className="transport-form__section">
      <p className="transport-form__hint">{hint}</p>
      <ListingPhotoManager
        photos={photos}
        onChange={(next) => onChange(transportFormPatchFromPhotos(next))}
        allowVideoCover
        title={title}
      />
      {uploadNote ? <p className="transport-form__hint">{uploadNote}</p> : null}
    </div>
  )
}
