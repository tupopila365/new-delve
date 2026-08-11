/** Relative activity labels for session cards. Preserves absolute time via title/tooltip. */
export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Unknown'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'Unknown'
  const diffSec = Math.round((now - then) / 1000)
  if (diffSec < 45) return 'Just now'
  if (diffSec < 90) return '1 minute ago'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`
  if (diffSec < 5400) return '1 hour ago'
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`
  if (diffSec < 172800) return 'Yesterday'
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} days ago`
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatAbsoluteTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
