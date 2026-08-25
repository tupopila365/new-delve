/** Marketing-preview businesses use this slug prefix. Cleanup deletes these rows. */
export const DELVE_PREVIEW_SLUG_PREFIX = 'delve-preview-'

export function isDelvePreviewBusinessSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && slug.startsWith(DELVE_PREVIEW_SLUG_PREFIX))
}

export const PREVIEW_OFFER_BLOCKED_MESSAGE =
  'This is a Delve preview offer for marketing. It cannot be claimed, booked, or paid.'
