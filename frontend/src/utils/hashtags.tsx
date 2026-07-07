import { Link } from 'react-router-dom'
import { communityTagPath } from './communityTags'

const HASHTAG_RE = /#([\w\u00C0-\u024F]+)/g

export const MAX_TAGS_PER_POST = 5

/** Match backend tags.services.normalize_tag */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 64)
}

export function extractHashtags(text: string): string[] {
  const slugs: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(HASHTAG_RE)) {
    const slug = normalizeTag(match[1] ?? '')
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    slugs.push(slug)
  }
  return slugs
}

export function renderTextWithHashtags(
  text: string,
  linkableSlugs?: string[],
  className = 'cm-hashtag',
) {
  const linkable = linkableSlugs ? new Set(linkableSlugs) : null
  const parts: Array<string | JSX.Element> = []
  let lastIndex = 0

  for (const match of text.matchAll(HASHTAG_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }
    const rawTag = match[1] ?? ''
    const slug = normalizeTag(rawTag)
    const token = match[0]
    if (slug && linkable?.has(slug)) {
      parts.push(
        <Link
          key={`${slug}-${index}`}
          to={communityTagPath(slug)}
          className={className}
        >
          {token}
        </Link>,
      )
    } else {
      parts.push(token)
    }
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
