/** Compact relative time for social comments (e.g. 2m, 3h, 5d). */
export function timeAgoShort(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const sec = Math.max(0, Math.floor((now - then) / 1000))
  if (sec < 60) return `${Math.max(1, sec)}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
