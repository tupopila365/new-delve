import { regionFromPlace } from './communityAsk'

export function buildCommunityTipFormData(
  body: string,
  profileRegion?: string,
  place?: string,
  media?: { file: File; kind: 'image' | 'video' } | null,
): FormData {
  const trimmed = body.trim()
  const placeLabel = place?.trim() ?? ''
  const fd = new FormData()
  fd.append('body', trimmed)
  fd.append('region', placeLabel ? regionFromPlace(placeLabel, profileRegion) : (profileRegion?.trim() ?? ''))
  if (placeLabel) fd.append('place_label', placeLabel)
  fd.append('post_kind', 'tip')
  fd.append('is_delvers', 'false')
  if (media?.kind === 'video') fd.append('video', media.file)
  else if (media?.kind === 'image') fd.append('image', media.file)
  return fd
}
