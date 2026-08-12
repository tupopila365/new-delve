import type { BusinessDto } from '@delve/contracts'

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0)
}

/** 0–100 from filled business profile fields (equal weight). */
export function computeBusinessProfileCompletionPercent(business: BusinessDto): number {
  const checks = [
    hasText(business.name),
    hasText(business.description),
    hasText(business.logoUrl),
    hasText(business.coverUrl),
    hasText(business.email),
    hasText(business.phone) || hasText(business.website),
    hasText(business.city) || hasText(business.countryCode),
    hasText(business.category) || hasText(business.address),
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}
