import type { HighlightChannelInput } from './types'

/** When the owner saved custom rings, show only those — no auto-generated filler. */
export function ownerHighlightsOnly<T>(
  autoChannels: T[],
  customInputs: HighlightChannelInput[] | undefined,
  mapCustom: (input: HighlightChannelInput) => T | null,
): T[] {
  const custom = (customInputs ?? [])
    .map(mapCustom)
    .filter((ch): ch is T => ch != null)
  return custom.length > 0 ? custom : autoChannels
}
