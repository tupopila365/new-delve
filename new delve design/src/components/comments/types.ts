export type CommentAuthor = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type CommentItem = {
  id: string
  body: string
  createdAt: string
  author: CommentAuthor
}
