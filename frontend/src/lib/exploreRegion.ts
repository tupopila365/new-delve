/** Guest explore-region preference (localStorage). Signed-in profile.region wins when set. */

export const EXPLORE_REGION_STORAGE_KEY = 'delve_explore_region'

/** Common Namibian regions used across marketplace and home filters. */
export const EXPLORE_REGIONS = [
  'Khomas',
  'Erongo',
  'Oshana',
  'Otjozondjupa',
  'Hardap',
  'Karas',
  'Kunene',
  'Ohangwena',
  'Omusati',
  'Oshikoto',
  'Kavango East',
  'Kavango West',
  'Zambezi',
] as const

export type ExploreRegion = (typeof EXPLORE_REGIONS)[number]

export function readGuestExploreRegion(): string {
  try {
    const raw = localStorage.getItem(EXPLORE_REGION_STORAGE_KEY)
    return typeof raw === 'string' ? raw.trim() : ''
  } catch {
    return ''
  }
}

export function writeGuestExploreRegion(region: string): void {
  const next = region.trim()
  try {
    if (!next) {
      localStorage.removeItem(EXPLORE_REGION_STORAGE_KEY)
      return
    }
    localStorage.setItem(EXPLORE_REGION_STORAGE_KEY, next)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearGuestExploreRegion(): void {
  writeGuestExploreRegion('')
}
