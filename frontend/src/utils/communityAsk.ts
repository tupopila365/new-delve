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
