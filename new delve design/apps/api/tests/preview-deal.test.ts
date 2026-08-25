import { describe, expect, it } from 'vitest'
import { isDelvePreviewBusinessSlug, DELVE_PREVIEW_SLUG_PREFIX } from '../src/modules/deal/preview-deal.js'

describe('isDelvePreviewBusinessSlug', () => {
  it('matches the marketing slug prefix', () => {
    expect(isDelvePreviewBusinessSlug(`${DELVE_PREVIEW_SLUG_PREFIX}wild-horizon`)).toBe(true)
  })

  it('does not match real partner slugs', () => {
    expect(isDelvePreviewBusinessSlug('wild-horizon-tours')).toBe(false)
    expect(isDelvePreviewBusinessSlug('delve-preview')).toBe(false)
    expect(isDelvePreviewBusinessSlug(null)).toBe(false)
    expect(isDelvePreviewBusinessSlug(undefined)).toBe(false)
  })
})
