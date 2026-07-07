import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { extractHashtags, MAX_TAGS_PER_POST } from '../utils/hashtags'
import { getActiveHashtagAtCursor, insertHashtagSuggestion } from '../utils/hashtagComposer'
import { useHashtagSuggest } from './useHashtagSuggest'

export type HashtagComposerConfig = {
  scope?: string
  maxTags?: number
  onMaxTags?: () => void
}

type Options = HashtagComposerConfig & {
  value: string
  onChange: (value: string) => void
  enabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function useHashtagComposer({
  value,
  onChange,
  scope = 'community',
  maxTags = MAX_TAGS_PER_POST,
  onMaxTags,
  enabled = true,
  inputRef,
}: Options) {
  const [cursor, setCursor] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const active = useMemo(
    () => (enabled ? getActiveHashtagAtCursor(value, cursor) : null),
    [enabled, value, cursor],
  )

  const existingTags = useMemo(() => new Set(extractHashtags(value)), [value])
  const atTagLimit = existingTags.size >= maxTags

  const suggestQuery = useHashtagSuggest(active?.query ?? '', scope, Boolean(active) && !atTagLimit)

  const suggestions = useMemo(() => {
    const rows = suggestQuery.data ?? []
    return rows.filter((row) => !existingTags.has(row.slug))
  }, [suggestQuery.data, existingTags])

  const menuOpen =
    Boolean(active) && !atTagLimit && !dismissed && (suggestQuery.isFetching || suggestions.length > 0)

  useEffect(() => {
    setSelectedIndex(0)
    setDismissed(false)
  }, [active?.start, active?.end, suggestions.length])

  const syncCursor = useCallback((next: number) => {
    setCursor(next)
  }, [])

  const pickSlug = useCallback(
    (slug: string) => {
      if (!active) return
      if (existingTags.has(slug)) return
      if (existingTags.size >= maxTags) {
        onMaxTags?.()
        return
      }
      const { nextText, nextCursor } = insertHashtagSuggestion(value, active, slug)
      onChange(nextText)
      syncCursor(nextCursor)
      window.requestAnimationFrame(() => {
        const el = inputRef?.current
        if (!el) return
        el.focus()
        el.setSelectionRange(nextCursor, nextCursor)
      })
    },
    [active, existingTags, maxTags, onChange, onMaxTags, value, inputRef, syncCursor],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!menuOpen || suggestions.length === 0) return false

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => (index + 1) % suggestions.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => (index - 1 + suggestions.length) % suggestions.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const row = suggestions[selectedIndex]
        if (row) pickSlug(row.slug)
        return true
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setDismissed(true)
        return true
      }
      return false
    },
    [menuOpen, suggestions, selectedIndex, pickSlug],
  )

  const fieldHandlers = {
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value)
      syncCursor(event.target.selectionStart ?? 0)
    },
    onSelect: (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      syncCursor(event.currentTarget.selectionStart ?? 0)
    },
    onClick: (event: React.MouseEvent<HTMLTextAreaElement>) => {
      syncCursor(event.currentTarget.selectionStart ?? 0)
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      syncCursor(event.currentTarget.selectionStart ?? 0)
    },
  }

  return {
    fieldHandlers,
    onKeyDown,
    menuOpen,
    suggestions,
    selectedIndex,
    setSelectedIndex,
    pickSlug,
    isLoading: suggestQuery.isFetching,
    atTagLimit,
  }
}
