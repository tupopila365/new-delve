import type { QueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'

export async function uploadProfileAvatar(file: File): Promise<void> {
  const fd = new FormData()
  fd.append('avatar', file, file.name || 'avatar.jpg')
  await apiFetch('/api/accounts/me/update/', { method: 'PATCH', body: fd })
}

export async function clearProfileAvatar(): Promise<void> {
  await apiFetch('/api/accounts/me/update/', {
    method: 'PATCH',
    body: JSON.stringify({ avatar: null }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function invalidateAvatarCaches(qc: QueryClient, username?: string | null): Promise<void> {
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({ queryKey: ['conversations'] }),
    qc.invalidateQueries({ queryKey: ['message-people'] }),
    qc.invalidateQueries({ queryKey: ['messaging-unread-count'] }),
  ]
  if (username) {
    tasks.push(qc.invalidateQueries({ queryKey: ['public-profile', username] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['message-profile', username] }))
  }
  await Promise.all(tasks)
}
