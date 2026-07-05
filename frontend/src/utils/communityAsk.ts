/** Map ask-locals form place text to a feed region string. */
export function regionFromPlace(place: string, profileRegion?: string): string {
  const fromProfile = profileRegion?.trim()
  if (fromProfile) return fromProfile.slice(0, 120)

  const trimmed = place.trim()
  if (!trimmed) return ''

  const firstSegment = trimmed.split(',')[0]?.trim() || trimmed
  return firstSegment.slice(0, 120)
}

export type AskLocalsPostPayload = {
  body: string
  region: string
  place_label: string
  post_kind: 'question'
  is_delvers: false
}

export function buildAskLocalsPost(
  place: string,
  question: string,
  profileRegion?: string,
): AskLocalsPostPayload {
  return {
    body: question.trim(),
    place_label: place.trim(),
    region: regionFromPlace(place, profileRegion),
    post_kind: 'question',
    is_delvers: false,
  }
}

export function buildAskLocalsFormData(
  place: string,
  question: string,
  profileRegion?: string,
  media?: { file: File; kind: 'image' | 'video' } | null,
): FormData {
  const payload = buildAskLocalsPost(place, question, profileRegion)
  const fd = new FormData()
  fd.append('body', payload.body)
  fd.append('place_label', payload.place_label)
  fd.append('region', payload.region)
  fd.append('post_kind', payload.post_kind)
  fd.append('is_delvers', 'false')
  if (media?.kind === 'video') fd.append('video', media.file)
  else if (media?.kind === 'image') fd.append('image', media.file)
  return fd
}
