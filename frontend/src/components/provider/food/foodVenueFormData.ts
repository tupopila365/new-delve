import { formToVenuePayload, type FoodVenueFormValues } from './foodVenueTypes'

function appendBool(fd: FormData, key: string, value: boolean) {
  fd.append(key, value ? 'true' : 'false')
}

/** Build multipart body for photos module save only. */
export function buildFoodVenuePhotosFormData(values: FoodVenueFormValues): FormData {
  const fd = new FormData()
  const gallery = values.gallery_urls
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const photos = gallery.map((image, index) => ({
    id: index + 2,
    image,
    caption: '',
    category: 'food',
    is_cover: false,
  }))
  fd.append('photos', JSON.stringify(photos))
  if (values.cover_image_file) {
    fd.append('cover_image', values.cover_image_file)
  } else if (values.cover_image_url.trim()) {
    fd.append('cover_image_url', values.cover_image_url.trim())
  }
  for (const file of values.gallery_files) {
    fd.append('gallery_images', file)
  }
  return fd
}

/** Build multipart body for provider venue create/update (cover + gallery file uploads). */
export function buildFoodVenueFormData(values: FoodVenueFormValues): FormData {
  const payload = formToVenuePayload(values)
  const fd = new FormData()

  fd.append('name', payload.name)
  fd.append('description', payload.description)
  fd.append('tagline', payload.tagline)
  fd.append('popular_dish', payload.popular_dish)
  fd.append('cuisine', payload.cuisine)
  fd.append('region', payload.region)
  fd.append('city', payload.city)
  fd.append('address', payload.address)
  fd.append('phone', payload.phone)
  fd.append('website', payload.website)
  fd.append('opening_hours', payload.opening_hours)
  fd.append('closes_at', payload.closes_at)
  fd.append('price_level', String(payload.price_level))
  appendBool(fd, 'dine_in', payload.dine_in)
  appendBool(fd, 'takeaway', payload.takeaway)
  appendBool(fd, 'delivery', payload.delivery)
  appendBool(fd, 'reservations', payload.reservations)
  appendBool(fd, 'is_active', payload.is_active)
  if (payload.is_open === null) {
    fd.append('is_open', '')
  } else {
    appendBool(fd, 'is_open', payload.is_open)
  }
  fd.append('amenities', JSON.stringify(payload.amenities))
  fd.append('photos', JSON.stringify(payload.photos))
  fd.append('venue_stories', JSON.stringify(payload.venue_stories))

  if (values.cover_image_file) {
    fd.append('cover_image', values.cover_image_file)
  } else if (payload.cover_image_url) {
    fd.append('cover_image_url', payload.cover_image_url)
  }

  for (const file of values.gallery_files) {
    fd.append('gallery_images', file)
  }

  return fd
}
