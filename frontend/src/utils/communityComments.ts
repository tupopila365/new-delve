export type CommunityCommentAuthor = {
  username: string
  display_name?: string | null
  avatar?: string | null
}

export type CommunityComment = {
  id: number
  parent_id: number | null
  author?: CommunityCommentAuthor | null
  body: string
  created_at?: string
  is_accepted_answer?: boolean
  hearted_by_author?: boolean
  helpful_count?: number
  dislike_count?: number
  replies_count?: number
  marked_helpful_by_me?: boolean
  marked_disliked_by_me?: boolean
}

export type PaginatedComments = {
  count: number
  results: CommunityComment[]
  next_offset: number | null
}

export function isPaginatedComments(data: unknown): data is PaginatedComments {
  return (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as PaginatedComments).results)
  )
}

export function normalizeCommentsResponse(data: CommunityComment[] | PaginatedComments): PaginatedComments {
  if (isPaginatedComments(data)) return data
  return { count: data.length, results: data, next_offset: null }
}

export function communityCommentsPath(
  postId: number,
  opts?: { parentId?: number | null; limit?: number; offset?: number },
): string {
  const params = new URLSearchParams()
  if (opts?.parentId != null) {
    params.set('parent', String(opts.parentId))
  } else if (opts?.limit != null) {
    params.set('parent', 'root')
  }
  if (opts?.limit != null) params.set('limit', String(opts.limit))
  if (opts?.offset != null) params.set('offset', String(opts.offset))
  const qs = params.toString()
  return `/api/social/posts/${postId}/comments/${qs ? `?${qs}` : ''}`
}

export const TOP_LEVEL_COMMENT_PAGE = 10
export const REPLY_PAGE_SIZE = 3
