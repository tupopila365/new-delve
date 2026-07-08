export type StoryHapticKind = 'like' | 'tap' | 'pause'

const PATTERNS: Record<StoryHapticKind, number | number[]> = {
  like: [12, 36, 16],
  tap: 8,
  pause: 10,
}

/** Light vibration for story interactions; no-op when unsupported. */
export function storyHaptic(kind: StoryHapticKind) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Ignore blocked vibrate calls (e.g. iOS Safari).
  }
}
