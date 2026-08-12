import type {
  CommentDto,
  CreateEventBody,
  CreatePostBody,
  EventDto,
  FollowResult,
  NotificationDto,
  PostDto,
  PublicTravelerProfile,
  SaveBody,
  SaveDto,
  UpdateEventBody,
} from '@delve/contracts'
import { getStoredAccessToken } from './authClient'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v2'
  return raw.replace(/\/$/, '')
}

function authHeaders(): HeadersInit {
  const token = getStoredAccessToken()
  return {
    'content-type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: { message?: string }
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || 'Request failed')
  }
  return body.data as T
}

export async function fetchPublicProfile(username: string) {
  const res = await fetch(`${apiBase()}/users/${encodeURIComponent(username)}`, {
    headers: authHeaders(),
  })
  return parseJson<PublicTravelerProfile>(res)
}

export async function searchTravelers(q: string) {
  const res = await fetch(`${apiBase()}/users/search?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  })
  return parseJson<PublicTravelerProfile[]>(res)
}

export async function followTraveler(userId: string) {
  const res = await fetch(`${apiBase()}/follows/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return parseJson<FollowResult>(res)
}

export async function unfollowTraveler(userId: string) {
  const res = await fetch(`${apiBase()}/follows/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<FollowResult>(res)
}

export async function createPost(body: CreatePostBody) {
  const res = await fetch(`${apiBase()}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return parseJson<PostDto>(res)
}

export async function fetchFeed() {
  const res = await fetch(`${apiBase()}/posts/feed`, { headers: authHeaders() })
  return parseJson<PostDto[]>(res)
}

export async function fetchUserPosts(username: string) {
  const res = await fetch(`${apiBase()}/users/${encodeURIComponent(username)}/posts`, {
    headers: authHeaders(),
  })
  return parseJson<PostDto[]>(res)
}

export async function likePost(postId: string) {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(postId)}/reactions`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return parseJson<PostDto>(res)
}

export async function unlikePost(postId: string) {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(postId)}/reactions`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<PostDto>(res)
}

export async function fetchComments(postId: string) {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(postId)}/comments`, {
    headers: authHeaders(),
  })
  return parseJson<CommentDto[]>(res)
}

export async function addComment(postId: string, body: string) {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ body }),
  })
  return parseJson<CommentDto>(res)
}

export async function deleteComment(commentId: string) {
  const res = await fetch(`${apiBase()}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<{ message: string }>(res)
}

export async function saveItem(body: SaveBody) {
  const res = await fetch(`${apiBase()}/saves`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return parseJson<{ saved: boolean }>(res)
}

export async function unsaveItem(body: SaveBody) {
  const res = await fetch(`${apiBase()}/saves`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return parseJson<{ saved: boolean }>(res)
}

export async function fetchSaves() {
  const res = await fetch(`${apiBase()}/saves`, { headers: authHeaders() })
  return parseJson<SaveDto[]>(res)
}

export async function createEvent(body: CreateEventBody) {
  const res = await fetch(`${apiBase()}/events`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return parseJson<EventDto>(res)
}

export async function updateEvent(eventId: string, body: UpdateEventBody) {
  const res = await fetch(`${apiBase()}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return parseJson<EventDto>(res)
}

export async function fetchEvent(eventId: string) {
  const res = await fetch(`${apiBase()}/events/${encodeURIComponent(eventId)}`, {
    headers: authHeaders(),
  })
  return parseJson<EventDto>(res)
}

export async function fetchUserEvents(username: string) {
  const res = await fetch(`${apiBase()}/users/${encodeURIComponent(username)}/events`, {
    headers: authHeaders(),
  })
  return parseJson<EventDto[]>(res)
}

export async function setEventAttendance(eventId: string, status: 'GOING' | 'INTERESTED') {
  const res = await fetch(`${apiBase()}/events/${encodeURIComponent(eventId)}/attendance`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  })
  return parseJson<EventDto>(res)
}

export async function clearEventAttendance(eventId: string) {
  const res = await fetch(`${apiBase()}/events/${encodeURIComponent(eventId)}/attendance`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseJson<EventDto>(res)
}

export async function fetchNotifications() {
  const res = await fetch(`${apiBase()}/notifications`, { headers: authHeaders() })
  return parseJson<NotificationDto[]>(res)
}

export async function markNotificationRead(id: string) {
  const res = await fetch(`${apiBase()}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return parseJson<{ message: string }>(res)
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${apiBase()}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return parseJson<{ message: string }>(res)
}
