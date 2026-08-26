import type {
  CommentDto,
  CreateEventBody,
  CreatePostBody,
  CreateStoryBody,
  EventDto,
  FollowList,
  FollowResult,
  NotificationDto,
  PostDto,
  PublicTravelerProfile,
  SaveBody,
  SaveDto,
  StoryRailDto,
  StorySlideDto,
  StoryViewerDto,
  UpdateEventBody,
  CreateContentReportBody,
  CreateContentReportResult,
} from '@delve/contracts'
import { AuthApiError, authorizedJson } from './authClient'

export { AuthApiError }

export async function fetchPublicProfile(username: string) {
  return authorizedJson<PublicTravelerProfile>(`/users/${encodeURIComponent(username)}`)
}

export async function searchTravelers(q: string) {
  return authorizedJson<PublicTravelerProfile[]>(`/users/search?q=${encodeURIComponent(q)}`)
}

export async function searchPosts(q: string) {
  return authorizedJson<PostDto[]>(`/posts/search?q=${encodeURIComponent(q)}`)
}

export async function followTraveler(userId: string) {
  return authorizedJson<FollowResult>(`/follows/${encodeURIComponent(userId)}`, { method: 'POST' })
}

export async function unfollowTraveler(userId: string) {
  return authorizedJson<FollowResult>(`/follows/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export async function fetchFollowers(username: string, cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return authorizedJson<FollowList>(`/users/${encodeURIComponent(username)}/followers${qs}`)
}

export async function fetchFollowing(username: string, cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return authorizedJson<FollowList>(`/users/${encodeURIComponent(username)}/following${qs}`)
}

export async function createPost(body: CreatePostBody) {
  return authorizedJson<PostDto>('/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deletePost(postId: string) {
  return authorizedJson<{ message: string }>(`/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  })
}

export async function fetchFeed() {
  const started = performance.now()
  if (import.meta.env.DEV) console.debug('[delve-timing] posts request start')
  try {
    return await authorizedJson<PostDto[]>('/posts/feed')
  } finally {
    if (import.meta.env.DEV) {
      console.debug(`[delve-timing] posts request end ${Math.round(performance.now() - started)}ms`)
    }
  }
}

export async function fetchUserPosts(username: string) {
  return authorizedJson<PostDto[]>(`/users/${encodeURIComponent(username)}/posts`)
}

export async function likePost(postId: string) {
  return authorizedJson<PostDto>(`/posts/${encodeURIComponent(postId)}/reactions`, { method: 'POST' })
}

export async function unlikePost(postId: string) {
  return authorizedJson<PostDto>(`/posts/${encodeURIComponent(postId)}/reactions`, { method: 'DELETE' })
}

export async function likeEvent(eventId: string) {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}/reactions`, { method: 'POST' })
}

export async function unlikeEvent(eventId: string) {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}/reactions`, { method: 'DELETE' })
}

export async function fetchComments(postId: string) {
  return authorizedJson<CommentDto[]>(`/posts/${encodeURIComponent(postId)}/comments`)
}

export async function addComment(postId: string, body: string) {
  return authorizedJson<CommentDto>(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export async function deleteComment(commentId: string) {
  return authorizedJson<{ message: string }>(`/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  })
}

export async function saveItem(body: SaveBody) {
  return authorizedJson<{ saved: boolean }>('/saves', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function unsaveItem(body: SaveBody) {
  return authorizedJson<{ saved: boolean }>('/saves', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

export async function fetchSaves() {
  return authorizedJson<SaveDto[]>('/saves')
}

export async function searchEvents(q: string) {
  return authorizedJson<EventDto[]>(`/events/search?q=${encodeURIComponent(q)}`)
}

export async function fetchEvents(params?: {
  city?: string
  after?: string
  mine?: 'hosting' | 'attending'
  category?: string
  following?: boolean
  sort?: 'popular'
}) {
  const qs = new URLSearchParams()
  if (params?.city) qs.set('city', params.city)
  if (params?.after) qs.set('after', params.after)
  if (params?.mine) qs.set('mine', params.mine)
  if (params?.category) qs.set('category', params.category)
  if (params?.following) qs.set('following', 'true')
  if (params?.sort) qs.set('sort', params.sort)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return authorizedJson<EventDto[]>(`/events${suffix}`)
}

export async function createEvent(body: CreateEventBody) {
  return authorizedJson<EventDto>('/events', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateEvent(eventId: string, body: UpdateEventBody) {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchEvent(eventId: string) {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}`)
}

export async function fetchEventAttendees(eventId: string, status?: 'GOING' | 'INTERESTED') {
  const qs = status ? `?status=${status}` : ''
  return authorizedJson<import('@delve/contracts').EventAttendeeDto[]>(
    `/events/${encodeURIComponent(eventId)}/attendees${qs}`,
  )
}

export async function fetchUserEvents(username: string) {
  return authorizedJson<EventDto[]>(`/users/${encodeURIComponent(username)}/events`)
}

export async function setEventAttendance(eventId: string, status: 'GOING' | 'INTERESTED') {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export async function clearEventAttendance(eventId: string) {
  return authorizedJson<EventDto>(`/events/${encodeURIComponent(eventId)}/attendance`, {
    method: 'DELETE',
  })
}

export async function fetchNotifications() {
  return authorizedJson<NotificationDto[]>('/notifications')
}

export async function markNotificationRead(id: string) {
  return authorizedJson<{ message: string }>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  })
}

export async function markAllNotificationsRead() {
  return authorizedJson<{ message: string }>('/notifications/read-all', { method: 'POST' })
}

export async function createStory(body: CreateStoryBody) {
  return authorizedJson<StorySlideDto[]>('/stories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchStoryRail() {
  return authorizedJson<StoryRailDto>('/stories/rail')
}

export async function fetchUserStories(userId: string) {
  return authorizedJson<StoryViewerDto>(`/stories/${encodeURIComponent(userId)}`)
}

export async function markStoriesViewed(userId: string) {
  return authorizedJson<{ viewed: boolean; authorId: string }>(
    `/stories/${encodeURIComponent(userId)}/view`,
    { method: 'POST' },
  )
}

export async function deleteStorySlide(slideId: string) {
  return authorizedJson<{ message: string; id: string }>(`/stories/${encodeURIComponent(slideId)}`, {
    method: 'DELETE',
  })
}

export async function reportContent(body: CreateContentReportBody) {
  return authorizedJson<CreateContentReportResult>('/reports', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
