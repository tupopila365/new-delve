/** Stable URL path for a social post (Phase 13). */
export function postPermalinkPath(postId: number): string {
  return `/delvers/posts/${postId}`
}

/** Community / ask-locals feed post permalink (Phase 1). */
export function communityPostPermalinkPath(postId: number): string {
  return `/community/posts/${postId}`
}

export function feedPostPermalinkPath(post: { id: number; is_delvers?: boolean; post_kind?: string }): string {
  if (post.is_delvers) return postPermalinkPath(post.id)
  return communityPostPermalinkPath(post.id)
}

export function postPermalinkUrl(postId: number): string {
  if (typeof window === 'undefined') return postPermalinkPath(postId)
  return `${window.location.origin}${postPermalinkPath(postId)}`
}

/** Synthetic listing-moment ids use 900_000_000 + index — real posts are below this. */
export function isRealPostId(id: string | number): boolean {
  const n = typeof id === 'number' ? id : Number(id)
  return Number.isFinite(n) && n > 0 && n < 900_000_000
}

export async function copyPostPermalink(postId: number): Promise<void> {
  await navigator.clipboard.writeText(postPermalinkUrl(postId))
}
