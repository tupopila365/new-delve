import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTagSuggest } from '../api/tags'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function useHashtagSuggest(query: string, scope = 'community', enabled = true, limit = 8) {
  const debounced = useDebouncedValue(query, 180)
  return useQuery({
    queryKey: ['tag-suggest', scope, debounced, limit],
    enabled,
    queryFn: () => fetchTagSuggest(debounced, scope, limit),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
