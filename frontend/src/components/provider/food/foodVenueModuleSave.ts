import { buildFoodVenuePhotosFormData } from './foodVenueFormData'
import {
  canSaveIdentity,
  contactPayload,
  hoursPayload,
  identityPayload,
  locationPayload,
  servicePayload,
  storiesPayload,
  type FoodVenueModuleId,
} from './foodVenueModules'
import type { FoodVenueFormValues } from './foodVenueTypes'
import type { OpeningHoursSchedule } from './openingHoursUtils'

export type SaveBuildResult =
  | { ok: true; body: FormData | string }
  | { ok: false; error: string }

export function buildFoodVenueModuleSaveBody(
  module: FoodVenueModuleId,
  form: FoodVenueFormValues,
  hours: OpeningHoursSchedule,
): SaveBuildResult {
  switch (module) {
    case 'identity':
      if (!canSaveIdentity(form)) {
        return { ok: false, error: 'Venue name is required.' }
      }
      return { ok: true, body: JSON.stringify(identityPayload(form)) }
    case 'location':
      return { ok: true, body: JSON.stringify(locationPayload(form)) }
    case 'hours':
      return { ok: true, body: JSON.stringify(hoursPayload(hours)) }
    case 'contact':
      return { ok: true, body: JSON.stringify(contactPayload(form)) }
    case 'service':
      return { ok: true, body: JSON.stringify(servicePayload(form)) }
    case 'photos': {
      const hasUploads = Boolean(form.cover_image_file) || form.gallery_files.length > 0
      const hasUrls = form.cover_image_url.trim() || form.gallery_urls.trim()
      if (!hasUploads && !hasUrls) {
        return { ok: false, error: 'Add a cover photo or gallery image to save.' }
      }
      if (hasUploads) {
        return { ok: true, body: buildFoodVenuePhotosFormData(form) }
      }
      return {
        ok: true,
        body: JSON.stringify({
          cover_image_url: form.cover_image_url.trim(),
          photos: form.gallery_urls
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((image, index) => ({
              id: index + 2,
              image,
              caption: '',
              category: 'food',
              is_cover: false,
            })),
        }),
      }
    }
    case 'stories':
      return { ok: true, body: JSON.stringify(storiesPayload(form)) }
    default:
      return { ok: false, error: 'Unknown section.' }
  }
}

/** Modules that support debounced auto-save (photos only when no pending file uploads). */
export function foodVenueModuleAutoSaveKey(
  module: FoodVenueModuleId,
  form: FoodVenueFormValues,
  hours: OpeningHoursSchedule,
): string | null {
  if (module === 'photos') {
    if (form.cover_image_file || form.gallery_files.length > 0) return null
  }
  const built = buildFoodVenueModuleSaveBody(module, form, hours)
  if (!built.ok) return null
  return typeof built.body === 'string' ? built.body : '[multipart]'
}
