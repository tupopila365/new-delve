import { Link } from 'react-router-dom'

const HASHTAG_RE = /#([\w\u00C0-\u024F]+)/g

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>()
  for (const match of text.matchAll(HASHTAG_RE)) {
    const tag = match[1]?.trim().toLowerCase()
    if (tag) tags.add(tag)
  }
  return [...tags]
}

export function renderTextWithHashtags(text: string, className = 'cm-hashtag') {
  const parts: Array<string | JSX.Element> = []
  let lastIndex = 0

  for (const match of text.matchAll(HASHTAG_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }
    const tag = match[1]?.toLowerCase() ?? ''
    parts.push(
      <Link
        key={`${tag}-${index}`}
        to={`/community?tag=${encodeURIComponent(tag)}`}
        className={className}
      >
        #{tag}
      </Link>,
    )
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
