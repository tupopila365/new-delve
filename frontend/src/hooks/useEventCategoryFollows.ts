import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type FollowListResponse = { categories: string[] }
type ToggleResponse = { following: boolean; followers_count: number; category: string }

export function useEventCategoryFollows() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const queryKey = ['event-category-follows', profile?.username ?? ''] as const

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(profile),
    queryFn: () => apiFetch<FollowListResponse>('/api/events/category-follows/'),
  })

  const categories = data?.categories ?? []

  const toggleMut = useMutation({
    mutationFn: (category: string) =>
      apiFetch<ToggleResponse>(`/api/events/categories/${encodeURIComponent(category)}/follow/`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-category-follows'] })
      void qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const isFollowing = useCallback(
    (category: string) =>
      categories.some((c) => c.toLowerCase() === category.trim().toLowerCase()),
    [categories],
  )

  const toggleFollow = useCallback(
    (category: string) => {
      if (!profile) {
        navigate('/login')
        return
      }
      const key = category.trim().toLowerCase()
      if (!key) return
      toggleMut.mutate(key)
    },
    [navigate, profile, toggleMut],
  )

  return {
    categories,
    isLoading,
    isFollowing,
    toggleFollow,
    busyCategory: toggleMut.isPending ? (toggleMut.variables ?? null) : null,
    requiresAuth: !profile,
  }
}
