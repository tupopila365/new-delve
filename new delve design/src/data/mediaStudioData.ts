// ─── Core types ────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video'
export type UploadStatus = 'idle' | 'selecting' | 'validating' | 'invalid' | 'queued' | 'uploading' | 'processing' | 'ready' | 'failed' | 'moderation' | 'restricted' | 'offline'
export type LicenseType = 'delve-licensed' | 'royalty-free' | 'original-audio' | 'user-confirmed' | 'attribution-required' | 'restricted' | 'unavailable'
export type VisibilityOption = 'public' | 'followers' | 'community' | 'private' | 'draft'
export type AspectRatio = 'original' | '1:1' | '4:5' | '9:16' | '16:9' | 'journey-cover' | 'listing-cover' | 'avatar'
export type MusicCategory = 'Travel' | 'Calm' | 'Adventure' | 'Road trip' | 'Coast' | 'Nature' | 'Upbeat' | 'Cinematic' | 'Local sounds' | 'Instrumental'

export type ContextType =
  | 'delvers-post' | 'delvers-reel' | 'delvers-highlight'
  | 'journey-cover' | 'journey-stop' | 'journey-diary' | 'journey-highlight'
  | 'community-question' | 'community-discussion' | 'community-reply'
  | 'profile-avatar' | 'profile-cover'
  | 'review-media'
  | 'service-listing' | 'stay-listing' | 'food-listing' | 'activity-listing'
  | 'event-listing' | 'guide-profile' | 'shop-product'
  | 'transport-vehicle' | 'transport-bus' | 'transport-air' | 'transport-water'
  | 'business-profile' | 'deal'

// ─── Upload context config ──────────────────────────────────────────────────

export interface MediaUploadContext {
  contextType: ContextType
  label: string
  description: string
  allowedMediaTypes: MediaType[]
  allowedFileTypes: string[]
  maximumFileSize: number        // bytes
  maximumItems: number
  maximumVideoDuration: number   // seconds, 0 = n/a
  minimumDimensions: { width: number; height: number }
  allowedAspectRatios: AspectRatio[]
  musicAllowed: boolean
  uploadedAudioAllowed: boolean
  captionsAllowed: boolean
  alternativeTextRequired: boolean
  locationAllowed: boolean
  linkedObjectsAllowed: boolean
  visibilityOptions: VisibilityOption[]
  cropRequired: boolean
}

export const uploadContexts: Record<ContextType, MediaUploadContext> = {
  'delvers-post': {
    contextType: 'delvers-post', label: 'Delvers post', description: 'Share a photo or video to your Delvers feed.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov'],
    maximumFileSize: 100 * 1024 * 1024, maximumItems: 10, maximumVideoDuration: 60,
    minimumDimensions: { width: 320, height: 320 },
    allowedAspectRatios: ['original', '1:1', '4:5', '16:9'],
    musicAllowed: true, uploadedAudioAllowed: false, captionsAllowed: true,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: true,
    visibilityOptions: ['public', 'followers', 'private', 'draft'], cropRequired: false,
  },
  'delvers-reel': {
    contextType: 'delvers-reel', label: 'Delvers Reel', description: 'Create a short video Reel.',
    allowedMediaTypes: ['video'], allowedFileTypes: ['mp4', 'mov'],
    maximumFileSize: 500 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 90,
    minimumDimensions: { width: 720, height: 1280 },
    allowedAspectRatios: ['9:16'],
    musicAllowed: true, uploadedAudioAllowed: false, captionsAllowed: true,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: true,
    visibilityOptions: ['public', 'followers', 'draft'], cropRequired: true,
  },
  'delvers-highlight': {
    contextType: 'delvers-highlight', label: 'Delvers Highlight', description: 'Add to a Highlight collection.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maximumFileSize: 100 * 1024 * 1024, maximumItems: 20, maximumVideoDuration: 30,
    minimumDimensions: { width: 480, height: 480 },
    allowedAspectRatios: ['9:16', '1:1'],
    musicAllowed: true, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: true,
    visibilityOptions: ['public', 'followers', 'private'], cropRequired: false,
  },
  'journey-cover': {
    contextType: 'journey-cover', label: 'Journey cover', description: 'Set the main cover image for your Journey.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 0,
    minimumDimensions: { width: 800, height: 450 },
    allowedAspectRatios: ['journey-cover', '16:9', 'original'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'private', 'draft'], cropRequired: false,
  },
  'journey-stop': {
    contextType: 'journey-stop', label: 'Journey stop photos', description: 'Photos from this stop.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 6, maximumVideoDuration: 0,
    minimumDimensions: { width: 480, height: 320 },
    allowedAspectRatios: ['original', '4:5', '1:1', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'private'], cropRequired: false,
  },
  'journey-diary': {
    contextType: 'journey-diary', label: 'Diary entry media', description: 'Images or video for a diary day.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov'],
    maximumFileSize: 100 * 1024 * 1024, maximumItems: 8, maximumVideoDuration: 120,
    minimumDimensions: { width: 320, height: 320 },
    allowedAspectRatios: ['original', '4:5', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'private', 'draft'], cropRequired: false,
  },
  'journey-highlight': {
    contextType: 'journey-highlight', label: 'Journey highlight', description: 'A highlight moment from your Journey.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maximumFileSize: 100 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 30,
    minimumDimensions: { width: 480, height: 480 },
    allowedAspectRatios: ['original', '1:1', '4:5'],
    musicAllowed: true, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: true, linkedObjectsAllowed: true,
    visibilityOptions: ['public', 'private'], cropRequired: false,
  },
  'community-question': {
    contextType: 'community-question', label: 'Question photo', description: 'Attach a photo to your question.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 3, maximumVideoDuration: 0,
    minimumDimensions: { width: 200, height: 200 },
    allowedAspectRatios: ['original'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public'], cropRequired: false,
  },
  'community-discussion': {
    contextType: 'community-discussion', label: 'Discussion media', description: 'Images or video for your discussion.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maximumFileSize: 50 * 1024 * 1024, maximumItems: 5, maximumVideoDuration: 60,
    minimumDimensions: { width: 200, height: 200 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: true,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'community'], cropRequired: false,
  },
  'community-reply': {
    contextType: 'community-reply', label: 'Reply photo', description: 'Attach a photo to your reply.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 5 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 0,
    minimumDimensions: { width: 200, height: 200 },
    allowedAspectRatios: ['original'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public'], cropRequired: false,
  },
  'profile-avatar': {
    contextType: 'profile-avatar', label: 'Profile photo', description: 'Update your profile photo.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 0,
    minimumDimensions: { width: 200, height: 200 },
    allowedAspectRatios: ['avatar', '1:1'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public'], cropRequired: true,
  },
  'profile-cover': {
    contextType: 'profile-cover', label: 'Profile cover', description: 'Update your profile cover image.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 1, maximumVideoDuration: 0,
    minimumDimensions: { width: 800, height: 300 },
    allowedAspectRatios: ['listing-cover', '16:9', 'original'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public'], cropRequired: false,
  },
  'review-media': {
    contextType: 'review-media', label: 'Review photos', description: 'Attach photos to your review.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 5, maximumVideoDuration: 0,
    minimumDimensions: { width: 320, height: 320 },
    allowedAspectRatios: ['original', '1:1'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public'], cropRequired: false,
  },
  'service-listing': {
    contextType: 'service-listing', label: 'Listing gallery', description: 'Photos for your service listing.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 12, maximumVideoDuration: 0,
    minimumDimensions: { width: 800, height: 600 },
    allowedAspectRatios: ['original', '16:9', '4:3'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'stay-listing': {
    contextType: 'stay-listing', label: 'Stay photos', description: 'Photos of your accommodation.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 20, maximumVideoDuration: 0,
    minimumDimensions: { width: 800, height: 600 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'food-listing': {
    contextType: 'food-listing', label: 'Food & venue photos', description: 'Photos of your food venue.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 12, maximumVideoDuration: 0,
    minimumDimensions: { width: 600, height: 400 },
    allowedAspectRatios: ['original', '1:1', '4:3'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'activity-listing': {
    contextType: 'activity-listing', label: 'Activity photos', description: 'Show what your activity looks like.',
    allowedMediaTypes: ['image', 'video'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    maximumFileSize: 100 * 1024 * 1024, maximumItems: 10, maximumVideoDuration: 60,
    minimumDimensions: { width: 600, height: 400 },
    allowedAspectRatios: ['original', '16:9', '4:3'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'event-listing': {
    contextType: 'event-listing', label: 'Event photos', description: 'Photos for your event listing.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 8, maximumVideoDuration: 0,
    minimumDimensions: { width: 800, height: 450 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'guide-profile': {
    contextType: 'guide-profile', label: 'Guide profile photos', description: 'Photos for your guide profile.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 6, maximumVideoDuration: 0,
    minimumDimensions: { width: 400, height: 400 },
    allowedAspectRatios: ['original', '1:1'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'shop-product': {
    contextType: 'shop-product', label: 'Product photos', description: 'Photos of your product.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 8, maximumVideoDuration: 0,
    minimumDimensions: { width: 600, height: 600 },
    allowedAspectRatios: ['1:1', 'original'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'transport-vehicle': {
    contextType: 'transport-vehicle', label: 'Vehicle photos', description: 'Photos of the rental vehicle.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 8, maximumVideoDuration: 0,
    minimumDimensions: { width: 600, height: 400 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'transport-bus': {
    contextType: 'transport-bus', label: 'Bus / minibus photos', description: 'Photos of the bus or route.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 4, maximumVideoDuration: 0,
    minimumDimensions: { width: 480, height: 320 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'transport-air': {
    contextType: 'transport-air', label: 'Air transport photos', description: 'Aircraft or terminal photos.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 4, maximumVideoDuration: 0,
    minimumDimensions: { width: 480, height: 320 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'transport-water': {
    contextType: 'transport-water', label: 'Water transport photos', description: 'Boat or ferry photos.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 4, maximumVideoDuration: 0,
    minimumDimensions: { width: 480, height: 320 },
    allowedAspectRatios: ['original', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'business-profile': {
    contextType: 'business-profile', label: 'Business profile photos', description: 'Photos for your business profile.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 20 * 1024 * 1024, maximumItems: 10, maximumVideoDuration: 0,
    minimumDimensions: { width: 400, height: 400 },
    allowedAspectRatios: ['original', '1:1', '16:9'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: true, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
  'deal': {
    contextType: 'deal', label: 'Deal image', description: 'The main image for this deal.',
    allowedMediaTypes: ['image'], allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maximumFileSize: 10 * 1024 * 1024, maximumItems: 3, maximumVideoDuration: 0,
    minimumDimensions: { width: 600, height: 400 },
    allowedAspectRatios: ['original', '16:9', '1:1'],
    musicAllowed: false, uploadedAudioAllowed: false, captionsAllowed: false,
    alternativeTextRequired: false, locationAllowed: false, linkedObjectsAllowed: false,
    visibilityOptions: ['public', 'draft'], cropRequired: false,
  },
}

// ─── Mock music tracks ─────────────────────────────────────────────────────

export interface MusicTrackSummary {
  id: string
  title: string
  artist: string
  cover: string
  duration: number         // seconds
  licenseType: LicenseType
  attribution: string | null
  regionAvailability: 'worldwide' | 'restricted'
  allowedUses: ContextType[]
  category: MusicCategory
  status: 'available' | 'unavailable' | 'restricted'
  waveformBars: number[]   // mock waveform heights 0–100
}

export const musicLibrary: MusicTrackSummary[] = [
  {
    id: 'm1', title: 'Namib Sunrise', artist: 'Desert Collective', category: 'Travel',
    cover: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=80&h=80&fit=crop&auto=format',
    duration: 148, licenseType: 'delve-licensed', attribution: null,
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'delvers-highlight', 'journey-highlight'],
    status: 'available',
    waveformBars: [30,45,60,80,70,55,90,75,40,60,85,50,65,80,55,70,90,65,45,80,60,75,55,85,70,60,45,75,80,55,65,90,70,50,80,60,75,40,65,85,50,70,90,60,75,80,55,65,50,85],
  },
  {
    id: 'm2', title: 'Coastal Breeze', artist: 'Ocean Drift', category: 'Coast',
    cover: 'https://images.unsplash.com/photo-1780560034767-bc18365d4057?w=80&h=80&fit=crop&auto=format',
    duration: 210, licenseType: 'royalty-free', attribution: 'Ocean Drift via Delve Music Library',
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'delvers-highlight', 'journey-highlight'],
    status: 'available',
    waveformBars: [20,35,50,40,60,45,70,55,35,50,65,40,55,70,45,60,80,55,35,65,50,60,45,75,55,50,35,60,70,45,55,75,60,40,65,50,60,30,50,70,40,55,75,50,60,65,45,55,40,70],
  },
  {
    id: 'm3', title: 'Red Dune Drive', artist: 'Savanna Roads', category: 'Road trip',
    cover: 'https://images.unsplash.com/photo-1537430802614-118bf14be50c?w=80&h=80&fit=crop&auto=format',
    duration: 195, licenseType: 'delve-licensed', attribution: null,
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'delvers-highlight', 'journey-highlight'],
    status: 'available',
    waveformBars: [60,75,85,90,80,70,95,85,60,80,90,65,80,95,70,85,95,80,60,95,80,85,70,90,85,75,60,85,90,70,80,95,85,65,90,75,85,55,80,95,65,85,95,75,85,90,70,80,65,90],
  },
  {
    id: 'm4', title: 'Waterhole Evening', artist: 'Etosha Ambience', category: 'Nature',
    cover: 'https://images.unsplash.com/photo-1634919367249-cc2320d74d27?w=80&h=80&fit=crop&auto=format',
    duration: 180, licenseType: 'royalty-free', attribution: 'Etosha Ambience via Delve Music Library',
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'journey-highlight'],
    status: 'available',
    waveformBars: [15,25,20,35,30,20,45,30,20,35,40,25,30,45,25,35,50,35,20,40,30,35,25,45,30,35,20,35,45,25,30,50,35,22,40,28,38,18,32,44,26,34,48,30,38,42,26,32,22,44],
  },
  {
    id: 'm5', title: 'Windhoek After Dark', artist: 'City Pulse NA', category: 'Upbeat',
    cover: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=80&h=80&fit=crop&auto=format',
    duration: 165, licenseType: 'delve-licensed', attribution: null,
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'delvers-highlight'],
    status: 'available',
    waveformBars: [70,85,90,95,85,80,95,90,70,85,95,75,90,95,80,90,95,85,70,95,85,90,80,95,90,80,70,90,95,80,85,95,90,75,95,82,90,65,85,95,72,90,95,82,90,95,78,88,72,95],
  },
  {
    id: 'm6', title: 'Desert Calm', artist: 'Nomad Sounds', category: 'Calm',
    cover: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=80&h=80&fit=crop&auto=format',
    duration: 240, licenseType: 'royalty-free', attribution: 'Nomad Sounds via Delve Music Library',
    regionAvailability: 'worldwide',
    allowedUses: ['delvers-post', 'delvers-reel', 'delvers-highlight', 'journey-highlight'],
    status: 'available',
    waveformBars: [10,18,14,22,18,12,26,20,12,18,24,14,18,26,14,20,30,22,12,24,18,22,14,28,20,22,12,22,28,14,18,30,22,14,24,17,22,10,18,26,14,20,28,18,22,25,14,18,12,26],
  },
  {
    id: 'm7', title: 'Highland Pass', artist: 'Cinematic Africa', category: 'Cinematic',
    cover: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=80&h=80&fit=crop&auto=format',
    duration: 220, licenseType: 'attribution-required', attribution: 'Cinematic Africa — attribution required on final post',
    regionAvailability: 'restricted',
    allowedUses: ['delvers-reel', 'journey-highlight'],
    status: 'restricted',
    waveformBars: [40,55,65,75,65,55,80,65,40,60,75,50,60,80,55,65,80,65,40,75,60,65,50,75,65,60,40,65,75,50,60,80,65,45,75,55,65,38,55,78,47,62,80,55,65,72,50,60,44,75],
  },
]

// ─── Mock asset drafts (demo media) ────────────────────────────────────────

export interface MediaAssetDraft {
  id: string
  localPreview: string
  mediaType: MediaType
  fileName: string
  fileSize: number
  width: number
  height: number
  duration: number
  aspectRatio: AspectRatio
  uploadStatus: UploadStatus
  alternativeText: string
  caption: string
  selectedMusic: MusicTrackSummary | null
  musicVolume: number
  originalVolume: number
  trimStart: number
  trimEnd: number
  coverFrame: number
}

export function createDraftAsset(overrides: Partial<MediaAssetDraft> = {}): MediaAssetDraft {
  return {
    id: Math.random().toString(36).slice(2),
    localPreview: 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=800&h=600&fit=crop&auto=format',
    mediaType: 'image',
    fileName: 'photo.jpg',
    fileSize: 3.4 * 1024 * 1024,
    width: 1920, height: 1280,
    duration: 0,
    aspectRatio: 'original',
    uploadStatus: 'idle',
    alternativeText: '',
    caption: '',
    selectedMusic: null,
    musicVolume: 80,
    originalVolume: 100,
    trimStart: 0,
    trimEnd: 30,
    coverFrame: 0,
    ...overrides,
  }
}

// ─── Demo contexts shown on the showcase page ──────────────────────────────

export const showcaseContexts: { context: ContextType; icon: string; color: string }[] = [
  { context: 'delvers-post',      icon: 'image',      color: '#8C52FF' },
  { context: 'delvers-reel',      icon: 'video',      color: '#8C52FF' },
  { context: 'journey-cover',     icon: 'map',        color: '#E05C1A' },
  { context: 'journey-highlight', icon: 'star',       color: '#E05C1A' },
  { context: 'profile-avatar',    icon: 'user',       color: '#3B82F6' },
  { context: 'service-listing',   icon: 'building',   color: '#6366F1' },
  { context: 'review-media',      icon: 'thumbsup',   color: '#F59E0B' },
  { context: 'community-question',icon: 'help',       color: '#06B6D4' },
  { context: 'stay-listing',      icon: 'bed',        color: '#6366F1' },
  { context: 'shop-product',      icon: 'bag',        color: '#8B5CF6' },
  { context: 'transport-vehicle', icon: 'car',        color: '#E05C1A' },
  { context: 'deal',              icon: 'tag',        color: '#EF4444' },
]

export const musicCategories: MusicCategory[] = [
  'Travel', 'Calm', 'Adventure', 'Road trip', 'Coast', 'Nature', 'Upbeat', 'Cinematic', 'Local sounds', 'Instrumental',
]
