export const VISIBLE_MODERATION = 'VISIBLE' as const

export function publicModerationWhere() {
  return { moderationStatus: VISIBLE_MODERATION }
}

export function isModerationBlocked(status: string | null | undefined) {
  return status === 'HIDDEN' || status === 'REMOVED'
}
