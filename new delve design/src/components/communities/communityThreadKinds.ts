import type { CommunityThreadKind } from '@delve/contracts'

export const THREAD_KIND_META: Record<
  CommunityThreadKind,
  { label: string; composeLabel: string; needsTitle: boolean }
> = {
  POST: { label: 'Post', composeLabel: 'Share a post', needsTitle: true },
  QUESTION: { label: 'Question', composeLabel: 'Ask a question', needsTitle: true },
  TIP: { label: 'Tip', composeLabel: 'Share a tip', needsTitle: true },
  DISCUSSION: { label: 'Discussion', composeLabel: 'Start a discussion', needsTitle: true },
  RECOMMENDATION: { label: 'Recommendation', composeLabel: 'Recommend something', needsTitle: true },
  ANNOUNCEMENT: { label: 'Announcement', composeLabel: 'Post announcement', needsTitle: true },
  JOURNEY_SHARE: { label: 'Journey', composeLabel: 'Share a journey', needsTitle: false },
  EVENT_SHARE: { label: 'Event', composeLabel: 'Share an event', needsTitle: false },
}

export const FEED_KINDS: CommunityThreadKind[] = ['POST', 'DISCUSSION', 'ANNOUNCEMENT', 'RECOMMENDATION']
export const POST_KINDS: CommunityThreadKind[] = ['POST']
export const QUESTION_KINDS: CommunityThreadKind[] = ['QUESTION']
export const TIP_KINDS: CommunityThreadKind[] = ['TIP']
export const JOURNEY_KINDS: CommunityThreadKind[] = ['JOURNEY_SHARE']
export const EVENT_KINDS: CommunityThreadKind[] = ['EVENT_SHARE']
export const HOME_KINDS: CommunityThreadKind[] = [
  'POST',
  'QUESTION',
  'TIP',
  'JOURNEY_SHARE',
  'EVENT_SHARE',
]

export function kindLabel(kind: CommunityThreadKind) {
  return THREAD_KIND_META[kind]?.label ?? kind
}
