import { normalizeTag } from './hashtags'

const ACTIVE_HASHTAG_RE = /(?:^|\s)#([\w\u00C0-\u024F]*)$/

export type ActiveHashtag = {
  query: string
  rawQuery: string
  start: number
  end: number
}

export function getActiveHashtagAtCursor(text: string, cursor: number): ActiveHashtag | null {
  const before = text.slice(0, cursor)
  const match = before.match(ACTIVE_HASHTAG_RE)
  if (!match) return null
  const rawQuery = match[1] ?? ''
  return {
    query: normalizeTag(rawQuery),
    rawQuery,
    start: cursor - match[0].length,
    end: cursor,
  }
}

export function insertHashtagSuggestion(text: string, range: Pick<ActiveHashtag, 'start' | 'end'>, slug: string) {
  const before = text.slice(0, range.start)
  const after = text.slice(range.end)
  const insertion = `#${slug} `
  const nextText = `${before}${insertion}${after}`
  const nextCursor = range.start + insertion.length
  return { nextText, nextCursor }
}
