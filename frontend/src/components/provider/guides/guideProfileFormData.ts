import { formToProfilePayload, type GuidePackageFormValues, type GuideProfileFormValues } from './guideProfileTypes'
import type { TourPackage } from '../../guide/types'
import { ensureHighlightChannelsMediaUrls } from '../../highlights/highlightMediaApi'
import { normalizeGuideStoriesForSave } from './guideStoriesFormUtils'

function appendBool(fd: FormData, key: string, value: boolean) {
  fd.append(key, value ? 'true' : 'false')
}

type PackageUploadOptions = {
  packageId?: string
  packagePhoto?: File | null
  packageGallery?: File[]
}

/** Ensure highlight media is on Cloudinary before save (Delvers path). */
export async function resolveGuideProfileHighlights(
  values: GuideProfileFormValues,
): Promise<GuideProfileFormValues> {
  const guide_stories = await ensureHighlightChannelsMediaUrls(
    normalizeGuideStoriesForSave(values.guide_stories),
  )
  return { ...values, guide_stories }
}

/** Build multipart body for provider guide create/update (profile + portfolio + package uploads). */
export function buildGuideProfileFormData(
  values: GuideProfileFormValues,
  packages: TourPackage[],
  options: PackageUploadOptions = {},
): FormData {
  const payload = formToProfilePayload(values, packages)
  const fd = new FormData()

  fd.append('headline', payload.headline)
  fd.append('bio', payload.bio)
  fd.append('hourly_rate', payload.hourly_rate ?? '')
  fd.append('default_meeting_point', payload.default_meeting_point)
  fd.append('years_guiding', String(payload.years_guiding))
  fd.append('response_hours_typical', String(payload.response_hours_typical))
  appendBool(fd, 'licensed_guide', payload.licensed_guide)
  appendBool(fd, 'is_active', payload.is_active)
  fd.append('specialities', JSON.stringify(payload.specialities))
  fd.append('regions', JSON.stringify(payload.regions))
  fd.append('languages', JSON.stringify(payload.languages))
  fd.append('certifications', JSON.stringify(payload.certifications))
  fd.append('languages_detail', JSON.stringify(payload.languages_detail))
  fd.append('portfolio_gallery', JSON.stringify(payload.portfolio_gallery))
  fd.append('guide_stories', JSON.stringify(payload.guide_stories))
  fd.append('tour_packages', JSON.stringify(payload.tour_packages))

  if (values.photo_file) {
    fd.append('photo', values.photo_file)
  } else if (payload.photo_url) {
    fd.append('photo_url', payload.photo_url)
  }

  for (const file of values.portfolio_files) {
    fd.append('portfolio_images', file)
  }

  if (options.packageId) {
    fd.append('package_id', options.packageId)
  }
  if (options.packagePhoto) {
    fd.append('package_photo', options.packagePhoto)
  }
  for (const file of options.packageGallery ?? []) {
    fd.append('package_gallery_images', file)
  }

  return fd
}

export function packageFormHasUploads(form: GuidePackageFormValues): boolean {
  return Boolean(form.photo_file) || form.gallery_files.length > 0
}

export function profileFormHasUploads(form: GuideProfileFormValues): boolean {
  return Boolean(form.photo_file) || form.portfolio_files.length > 0
}
