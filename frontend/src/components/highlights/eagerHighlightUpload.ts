/**
 * Shared Delvers-style eager upload for provider highlight slides.
 * Fingerprints edit state, uploads in the background, skips re-upload when unchanged.
 */
import type { Adjustments, CropSettings, MediaFilter, MediaKind } from '../create/types'
import type { VideoTrim } from '../create/types'
import { renderEditedImage } from '../create/mediaUtils'
import { prepareVideoEffects } from '../create/videoEffects'
import { uploadHighlightMedia } from './highlightMediaApi'

export type EagerHighlightUploadStatus = 'idle' | 'uploading' | 'ready' | 'error'

export type EagerHighlightUploadState = {
  status: EagerHighlightUploadStatus
  fingerprint?: string
  url?: string
  kind?: MediaKind
  /** 0–1 while uploading */
  progress?: number
  error?: string
}

export type HighlightEditSnapshot = {
  file: File
  mediaKind: MediaKind
  filter: MediaFilter
  filterIntensity: number
  adjustments: Adjustments
  crop: CropSettings
  videoDuration: number
  videoTrim: VideoTrim
}

export function idleEagerUploadState(): EagerHighlightUploadState {
  return { status: 'idle' }
}

/** Content hash — when it matches a ready upload, skip re-upload. */
export function computeHighlightEditFingerprint(edit: HighlightEditSnapshot): string {
  if (edit.mediaKind === 'video') {
    return [
      `v:${edit.file.name}:${edit.file.size}:${edit.file.lastModified}`,
      edit.videoTrim.start.toFixed(3),
      edit.videoTrim.end.toFixed(3),
      edit.filter,
      edit.filterIntensity,
      JSON.stringify(edit.adjustments),
    ].join('|')
  }
  return [
    `i:${edit.file.name}:${edit.file.size}:${edit.file.lastModified}`,
    edit.filter,
    edit.filterIntensity,
    JSON.stringify(edit.adjustments),
    JSON.stringify(edit.crop),
  ].join('|')
}

export function eagerUploadIsReady(
  state: EagerHighlightUploadState,
  fingerprint: string,
): boolean {
  return state.status === 'ready' && state.fingerprint === fingerprint && Boolean(state.url)
}

/**
 * Bake edits and upload to Cloudinary (same path as Delvers / highlight proxy fallback).
 */
export async function uploadHighlightEdit(
  edit: HighlightEditSnapshot,
  onProgress?: (ratio: number) => void,
): Promise<EagerHighlightUploadState> {
  const fingerprint = computeHighlightEditFingerprint(edit)
  try {
    onProgress?.(0.05)
    if (edit.mediaKind === 'video') {
      const effects = await prepareVideoEffects(edit.file, {
        filter: edit.filter,
        filterIntensity: edit.filterIntensity,
        adjustments: edit.adjustments,
        textOverlays: [],
        stickers: [],
        strokes: [],
      })
      onProgress?.(0.25)
      const result = await uploadHighlightMedia(
        edit.file,
        'video',
        edit.videoTrim,
        edit.videoDuration,
        effects,
      )
      onProgress?.(1)
      return {
        status: 'ready',
        fingerprint,
        url: result.url,
        kind: result.kind,
        progress: 1,
      }
    }

    const blob = await renderEditedImage(
      edit.file,
      edit.filter,
      edit.crop,
      edit.adjustments,
      edit.filterIntensity,
    )
    onProgress?.(0.4)
    const uploadFile = new File([blob], 'slide.jpg', { type: 'image/jpeg' })
    const result = await uploadHighlightMedia(uploadFile, 'image')
    onProgress?.(1)
    return {
      status: 'ready',
      fingerprint,
      url: result.url,
      kind: result.kind,
      progress: 1,
    }
  } catch (err) {
    return {
      status: 'error',
      fingerprint,
      progress: 0,
      error: err instanceof Error ? err.message : 'Upload failed.',
    }
  }
}

/** True when src is already a remote URL (no local upload needed). */
export function isRemoteMediaUrl(src: string | null | undefined): boolean {
  if (!src?.trim()) return false
  return /^https?:\/\//i.test(src.trim())
}
