import type { TravelerProfileDto } from '@delve/contracts'

/** Fields that contribute to traveler profile completion (equal weight). */
export const PROFILE_COMPLETION_FIELDS = [
  'displayName',
  'username',
  'avatarUrl',
  'coverUrl',
  'bio',
  'location',
  'preferredLanguage',
  'interests',
] as const

export type ProfileCompletionInput = Pick<
  TravelerProfileDto,
  | 'displayName'
  | 'username'
  | 'avatarUrl'
  | 'coverUrl'
  | 'bio'
  | 'homeCity'
  | 'homeCountryCode'
  | 'preferredLanguage'
  | 'interests'
>

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0)
}

/** Returns 0–100 based on filled important profile fields. */
export function computeProfileCompletionPercent(profile: ProfileCompletionInput): number {
  const checks = [
    hasText(profile.displayName),
    hasText(profile.username),
    hasText(profile.avatarUrl),
    hasText(profile.coverUrl),
    hasText(profile.bio),
    hasText(profile.homeCity) || hasText(profile.homeCountryCode),
    hasText(profile.preferredLanguage),
    Array.isArray(profile.interests) && profile.interests.length > 0,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}
