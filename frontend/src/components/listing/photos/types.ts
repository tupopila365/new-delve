import type { MediaKind } from '../../create/types'

export type ListingPhotoDraft = {
  id: string
  /** Preview or saved URL (blob, data, or https). */
  src: string
  kind?: MediaKind
  /** Thumbnail for video tiles in the grid. */
  posterSrc?: string | null
  /** Pending upload — resolved on save. */
  file?: File | null
}

export const MAX_LISTING_PHOTOS = 12
