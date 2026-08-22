import type {
  CommentDto,
  CreateEventBody,
  CreatePostBody,
  CreateStoryBody,
  EventDto,
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

export async function createPost(body: CreatePostBody) {
  return authorizedJson<PostDto>('/posts', {
    method: 'POST',
    body: JSON.stringify(body),
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
