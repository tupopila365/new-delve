const UNITS: { secs: number; label: string }[] = [
  { secs: 31536000, label: 'year' },
  { secs: 2592000, label: 'month' },
  { secs: 86400, label: 'day' },
  { secs: 3600, label: 'hour' },
  { secs: 60, label: 'minute' },
]

/** YouTube-style relative timestamp, e.g. "5 months ago". */
export function relativeTime(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 45) return 'just now'

  for (const { secs, label } of UNITS) {
    const value = Math.floor(diffSec / secs)
    if (value >= 1) {
      return `${value} ${label}${value === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
