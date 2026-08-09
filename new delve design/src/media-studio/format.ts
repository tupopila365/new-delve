export function formatTime(seconds: number, withMs = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  const base = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
  return withMs ? `${base}.${ms}` : base
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function cssFilterFromAdjustments(
  filterCss: string,
  adj: {
    brightness: number
    contrast: number
    saturation: number
    warmth: number
    highlights?: number
    shadows?: number
    fade?: number
  },
): string {
  const parts: string[] = []
  if (filterCss) parts.push(filterCss)
  if (adj.brightness) parts.push(`brightness(${1 + adj.brightness / 100})`)
  if (adj.contrast) parts.push(`contrast(${1 + adj.contrast / 100})`)
  if (adj.saturation) parts.push(`saturate(${1 + adj.saturation / 100})`)
  if (adj.fade) parts.push(`opacity(${1 - Math.abs(adj.fade) / 200})`)
  if ((adj.warmth ?? 0) > 0) parts.push(`sepia(${adj.warmth! / 150}) hue-rotate(-6deg)`)
  else if ((adj.warmth ?? 0) < 0) {
    parts.push(`hue-rotate(${Math.abs(adj.warmth!) / 8}deg) saturate(${1 - Math.abs(adj.warmth!) / 200})`)
  }
  return parts.join(' ') || 'none'
}

export function totalClipsDuration(clips: { duration: number }[]) {
  return clips.reduce((sum, c) => sum + c.duration, 0)
}
