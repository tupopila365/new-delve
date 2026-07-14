/** Stable URL path for a journey detail page. */
export function journeyPermalinkPath(journeyId: number | string): string {
  return `/journeys/${journeyId}`
}

export function journeyPermalinkUrl(journeyId: number | string): string {
  if (typeof window === 'undefined') return journeyPermalinkPath(journeyId)
  return `${window.location.origin}${journeyPermalinkPath(journeyId)}`
}

export async function copyJourneyPermalink(journeyId: number | string): Promise<void> {
  await navigator.clipboard.writeText(journeyPermalinkUrl(journeyId))
}
