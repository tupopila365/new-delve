import type { StudioContext, StudioMode, UploadLimits } from './types'

/** Example upload limits shaped like backend configuration. Not production constants. */
export const EXAMPLE_UPLOAD_LIMITS: UploadLimits = {
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ],
  maxFileSizeBytes: 250 * 1024 * 1024,
  maxDurationSec: 180,
  minDurationSec: 1,
  minWidth: 480,
  minHeight: 480,
  maxClips: 10,
  audioSupported: true,
  allowMusic: true,
  allowFilters: true,
  allowSpeed: true,
  allowTransitions: true,
  allowTextOverlays: true,
  allowDecorativeEffects: true,
  listingAspectRatio: '4:5',
}

export const RESTRICTED_CONTEXTS: StudioContext[] = [
  'identity-verification',
  'business-document',
  'transport-permit',
  'insurance',
  'payment-dispute',
  'refund-evidence',
  'safety-report',
  'support-evidence',
]

export const SOCIAL_VIDEO_CONTEXTS: StudioContext[] = [
  'delvers-post',
  'delvers-short',
  'journey',
  'journey-highlight',
  'community',
  'traveler-profile',
  'review',
  'deal',
  'listing',
  'activity',
  'event',
  'accommodation',
  'transport',
  'business-content',
]

export function studioModeForContext(context: StudioContext): StudioMode {
  if (RESTRICTED_CONTEXTS.includes(context)) return 'restricted'
  if (['deal', 'listing', 'accommodation', 'transport', 'business-content', 'activity', 'event'].includes(context)) {
    return 'commercial'
  }
  return 'social'
}

export function limitsForContext(context: StudioContext, base: UploadLimits = EXAMPLE_UPLOAD_LIMITS): UploadLimits {
  const mode = studioModeForContext(context)
  if (mode === 'restricted') {
    return {
      ...base,
      maxDurationSec: Math.min(base.maxDurationSec, 120),
      maxClips: 1,
      allowMusic: false,
      allowFilters: false,
      allowSpeed: false,
      allowTransitions: false,
      allowTextOverlays: false,
      allowDecorativeEffects: false,
    }
  }
  if (mode === 'commercial') {
    return {
      ...base,
      allowDecorativeEffects: false,
      allowFilters: true,
      allowMusic: context === 'business-content' || context === 'deal',
    }
  }
  return base
}

export const ASPECT_OPTIONS: { id: import('./types').AspectRatioId; label: string; css: string }[] = [
  { id: 'original', label: 'Original', css: '' },
  { id: '9:16', label: '9:16', css: '9 / 16' },
  { id: '4:5', label: '4:5', css: '4 / 5' },
  { id: '1:1', label: '1:1', css: '1 / 1' },
  { id: '16:9', label: '16:9', css: '16 / 9' },
  { id: '3:2', label: '3:2', css: '3 / 2' },
  { id: 'listing', label: 'Listing', css: '4 / 5' },
]

export const VIDEO_FILTERS: import('./types').FilterOption[] = [
  { id: 'original', name: 'Original', css: '', commercialApproved: true },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.35) contrast(1.08)', commercialApproved: true },
  { id: 'warm', name: 'Warm', css: 'sepia(0.22) saturate(1.12) brightness(1.03)', commercialApproved: true },
  { id: 'cool', name: 'Cool', css: 'hue-rotate(12deg) saturate(0.9)', commercialApproved: true },
  { id: 'fade', name: 'Fade', css: 'brightness(1.06) saturate(0.75) contrast(0.92)', commercialApproved: true },
  { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.08)', commercialApproved: false },
  { id: 'film', name: 'Film', css: 'sepia(0.28) contrast(1.1) saturate(0.88)', commercialApproved: false },
]

export const IMAGE_FILTERS = VIDEO_FILTERS

export const DEFAULT_ADJUSTMENTS: import('./types').Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  sharpness: 0,
}

export const DEFAULT_CROP_STATE: import('./types').CropState = {
  zoom: 1,
  offsetX: 50,
  offsetY: 50,
  rotation: 0,
  fit: 'fill',
  aspectRatio: '4:5',
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const TRANSITIONS: { id: import('./types').TransitionType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'cut', label: 'Cut' },
  { id: 'crossfade', label: 'Crossfade' },
  { id: 'fade-to-black', label: 'Fade to black' },
  { id: 'fade-from-black', label: 'Fade from black' },
]

export function newId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
