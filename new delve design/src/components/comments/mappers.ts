import type { CommentDto, JourneyCommentDto } from '@delve/contracts'
import type { CommentItem } from './types'

export function mapPostComment(c: CommentDto): CommentItem {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: {
      id: c.author.id,
      username: c.author.username,
      displayName: c.author.displayName,
      avatarUrl: c.author.avatarUrl,
    },
  }
}

export function mapJourneyComment(c: JourneyCommentDto): CommentItem {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: {
      id: c.author.id,
      username: c.author.username,
      displayName: c.author.displayName,
      avatarUrl: c.author.avatarUrl,
    },
  }
}
