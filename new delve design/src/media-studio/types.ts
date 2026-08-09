/** Delve Media Studio — types. Backend remains authoritative for limits, rights, and moderation. */

export type MediaKind =
  | 'image'
  | 'video'
  | 'mixed'
  | 'audio-supported-video'
  | 'commercial-listing'
  | 'review-evidence'
  | 'support-evidence'
  | 'dispute-evidence'
  | 'verification-document'

export type StudioContext =
  | 'delvers-post'
  | 'delvers-short'
  | 'journey'
  | 'journey-highlight'
  | 'community'
  | 'traveler-profile'
  | 'review'
  | 'deal'
  | 'listing'
  | 'activity'
  | 'event'
  | 'accommodation'
  | 'transport'
  | 'business-content'
  | 'identity-verification'
  | 'business-document'
  | 'transport-permit'
  | 'insurance'
  | 'payment-dispute'
  | 'refund-evidence'
  | 'safety-report'
  | 'support-evidence'

export type StudioMode = 'social' | 'commercial' | 'restricted'

export type UploadStatus =
  | 'selecting'
  | 'validating'
  | 'reading-metadata'
  | 'generating-preview'
  | 'ready'
  | 'unsupported-format'
  | 'file-too-large'
  | 'video-too-long'
  | 'video-too-short'
  | 'resolution-too-low'
  | 'corrupted'
  | 'no-audio'
  | 'variable-framerate'
  | 'permission-denied'
  | 'storage-denied'

export type ProcessingStage =
  | 'preparing'
  | 'uploading'
  | 'upload-paused'
  | 'upload-complete'
  | 'validating'
  | 'transcoding'
  | 'generating-previews'
  | 'processing-audio'
  | 'processing-captions'
  | 'moderation-review'
  | 'ready'
  | 'published'
  | 'failed'

export type FailureReason =
  | 'network-interrupted'
  | 'upload-expired'
  | 'unsupported-codec'
  | 'corrupted-video'
  | 'transcoding-failed'
  | 'audio-failed'
  | 'caption-failed'
  | 'cover-failed'
  | 'music-unavailable'
  | 'rights-failed'
  | 'moderation-required'
  | 'content-rejected'
  | 'storage-unavailable'
  | 'server-error'

export type AspectRatioId = 'original' | '9:16' | '4:5' | '1:1' | '16:9' | '3:2' | 'listing'

export type VideoTool =
  | 'trim'
  | 'split'
  | 'crop'
  | 'adjust'
  | 'filter'
  | 'cover'
  | 'audio'
  | 'music'
  | 'captions'
  | 'speed'
  | 'transition'
  | 'text'
  | 'clips'

export type Visibility =
  | 'public'
  | 'followers'
  | 'journey-members'
  | 'community-members'
  | 'private'
  | 'business-listing'

export interface UploadLimits {
  acceptedMimeTypes: string[]
  maxFileSizeBytes: number
  maxDurationSec: number
  minDurationSec: number
  minWidth: number
  minHeight: number
  maxClips: number
  audioSupported: boolean
  allowMusic: boolean
  allowFilters: boolean
  allowSpeed: boolean
  allowTransitions: boolean
  allowTextOverlays: boolean
  allowDecorativeEffects: boolean
  listingAspectRatio?: AspectRatioId
}

export interface MediaAsset {
  id: string
  ownerId: string
  context: StudioContext
  mediaType: MediaKind
  source: 'device' | 'camera' | 'record' | 'draft' | 'business-library' | 'sample'
  fileName: string
  mimeType: string
  fileSize: number
  width: number
  height: number
  duration: number
  orientation: 'portrait' | 'landscape' | 'square'
  uploadStatus: UploadStatus
  processingStatus: ProcessingStage
  moderationStatus: 'none' | 'automated' | 'manual' | 'ready' | 'restricted' | 'blocked'
  createdAt: string
  updatedAt: string
  objectUrl: string
  hasAudio: boolean
}

export interface VideoClip {
  id: string
  sourceAssetId: string
  sourceStart: number
  sourceEnd: number
  timelineStart: number
  duration: number
  order: number
  objectUrl: string
}

export interface CropState {
  zoom: number
  offsetX: number
  offsetY: number
  rotation: 0 | 90 | 180 | 270
  fit: 'fit' | 'fill'
  aspectRatio: AspectRatioId
}

export interface Adjustments {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  highlights: number
  shadows: number
  fade: number
  sharpness: number
}

export interface FilterOption {
  id: string
  name: string
  css: string
  commercialApproved?: boolean
}

export type TransitionType = 'none' | 'cut' | 'crossfade' | 'fade-to-black' | 'fade-from-black'

export interface ClipTransition {
  afterClipId: string
  type: TransitionType
  duration: number
}

export interface CoverState {
  time: number
  customUrl: string | null
  altText: string
  source: 'frame' | 'upload' | 'generated'
}

export interface OriginalAudioState {
  keep: boolean
  muted: boolean
  volume: number
  fadeIn: number
  fadeOut: number
}

export interface MusicTrack {
  id: string
  title: string
  artist: string
  duration: number
  coverId: string
  category: string
  licenceType: 'delve-licensed' | 'royalty-free' | 'business-approved'
  commercialUseAllowed: boolean
  regionalAvailability: 'available' | 'unavailable-region'
  attribution: string
  previewToneHz?: number
}

export interface MusicEdit {
  trackId: string
  source: MusicTrack['licenceType']
  licenceType: MusicTrack['licenceType']
  commercialUseAllowed: boolean
  regionalAvailability: MusicTrack['regionalAvailability']
  attribution: string
  trimStart: number
  trimEnd: number
  timelineStart: number
  volume: number
  fadeIn: number
  fadeOut: number
  loop: boolean
}

export interface CaptionSegment {
  id: string
  language: string
  source: 'automatic' | 'manual' | 'upload'
  start: number
  end: number
  text: string
  confidence: number | null
  reviewed: boolean
  style: CaptionStyle
}

export interface CaptionStyle {
  position: 'bottom' | 'center' | 'top'
  alignment: 'left' | 'center' | 'right'
  textSize: 'sm' | 'md' | 'lg'
  highContrast: boolean
  color: string
}

export interface TextOverlay {
  id: string
  text: string
  start: number
  end: number
  x: number
  y: number
  alignment: 'left' | 'center' | 'right'
  size: 'sm' | 'md' | 'lg'
  color: string
}

export interface VideoEditState {
  sourceAssetId: string
  aspectRatio: AspectRatioId
  crop: CropState
  rotation: CropState['rotation']
  trimStart: number
  trimEnd: number
  playbackSpeed: number
  adjustments: Adjustments
  filter: string
  clips: VideoClip[]
  transitions: ClipTransition[]
  cover: CoverState
  originalAudio: OriginalAudioState
  music: MusicEdit | null
  captions: CaptionSegment[]
  textOverlays: TextOverlay[]
  captionLanguage: string
  autoCaptionsStatus: 'idle' | 'requesting' | 'processing' | 'ready' | 'failed' | 'unsupported'
}

export interface PublishingSettings {
  context: StudioContext
  caption: string
  location: string
  linkedJourneyId: string | null
  linkedCommunityId: string | null
  linkedDealId: string | null
  linkedListingId: string | null
  visibility: Visibility
  commentsEnabled: boolean
  sharingEnabled: boolean
  disclosure: string
  status: 'draft' | 'scheduled' | 'publishing' | 'published'
  contentDisclosure: boolean
  sponsoredLabel: boolean
}

export interface ProcessingState {
  uploadProgress: number | null
  processingStage: ProcessingStage
  processingProgress: number | null
  retryable: boolean
  failureReason: FailureReason | null
  outputAssetId: string | null
  previewUrls: string[]
  notificationWhenReady: boolean
}

export interface MediaStudioItem {
  id: string
  kind: 'image' | 'video'
  asset: MediaAsset
  imageEdit?: ImageEditState
  videoEdit?: VideoEditState
}

export interface ImageEditState {
  aspectRatio: string
  filter: FilterOption
  adjustments: Adjustments
  altText: string
  caption: string
  location: string
  rotation: 0 | 90 | 180 | 270
}

export interface MediaDraft {
  id: string
  coverUrl: string
  mediaType: MediaKind
  context: StudioContext
  lastEdited: string
  uploadStatus: UploadStatus
  processingStatus: ProcessingStage
  rightsWarning: string | null
  offlineAvailable: boolean
  sync: 'local' | 'cloud' | 'syncing' | 'synced' | 'conflict' | 'missing' | 'expired'
}
