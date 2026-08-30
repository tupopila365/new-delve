import { create } from 'zustand'

export type LocalMediaStatus = 'pending' | 'uploading' | 'transcoding' | 'ready' | 'error'

export interface LocalVideoEntry {
  /** Unique client-side identifier for this pending asset */
  pendingAssetId: string
  /** The File or Blob object holding the video stream */
  file: File | Blob
  /** In-memory blob URL (e.g. blob:http://localhost:5173/...) */
  blobUrl: string
  /** Optional local poster thumbnail generated client-side */
  posterBlobUrl?: string
  /** Original file name */
  fileName: string
  /** MIME type (e.g. video/mp4, video/quicktime) */
  mimeType: string
  /** File size in bytes */
  fileSize: number
  /** Video width in pixels */
  width?: number
  /** Video height in pixels */
  height?: number
  /** Video duration in seconds */
  duration?: number
  /** Aspect ratio string or number */
  aspectRatio?: string
  /** Upload progress ratio from 0.0 to 1.0 */
  uploadProgress: number
  /** Current pipeline lifecycle status */
  status: LocalMediaStatus
  /** Error message if upload failed */
  errorMessage?: string
  /** Timestamp when local preview was registered */
  createdAt: number
  /** Associated context (e.g. delvers-post, delvers-short, journey, event) */
  context?: string
}

export interface AddLocalVideoInput {
  pendingAssetId: string
  file: File | Blob
  posterFile?: File | Blob
  fileName?: string
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  aspectRatio?: string
  context?: string
}

export interface LocalMediaStoreState {
  /** Map of pendingAssetId to LocalVideoEntry */
  videos: Record<string, LocalVideoEntry>

  /** Register a local video and generate its zero-latency Blob URL */
  addLocalVideo: (input: AddLocalVideoInput) => string

  /** Get a single local video entry by ID */
  getLocalVideo: (pendingAssetId: string) => LocalVideoEntry | undefined

  /** Check if an ID currently maps to a local Blob URL */
  hasLocalVideo: (pendingAssetId: string) => boolean

  /** Update upload progress and stage */
  updateLocalVideoProgress: (
    pendingAssetId: string,
    progress: number,
    status?: LocalMediaStatus,
  ) => void

  /** Mark a video upload as failed */
  markLocalVideoError: (pendingAssetId: string, errorMessage: string) => void

  /** Revoke Blob URLs and remove entry from store */
  removeLocalVideo: (pendingAssetId: string) => void

  /**
   * Promotes a pending local video to its final remote Cloudinary URL,
   * revoking the local Blob URL cleanly after transition.
   */
  promoteToRemote: (pendingAssetId: string, remoteUrl: string) => void

  /** Revoke all active Blob URLs in memory and reset store (prevents OOM on teardown) */
  clearAllLocalVideos: () => void
}

export const useLocalMediaStore = create<LocalMediaStoreState>((set, get) => ({
  videos: {},

  addLocalVideo: (input: AddLocalVideoInput): string => {
    const {
      pendingAssetId,
      file,
      posterFile,
      fileName = (file as File).name || `video-${Date.now()}.mp4`,
      mimeType = file.type || 'video/mp4',
      width,
      height,
      duration,
      aspectRatio,
      context,
    } = input

    // If an existing entry exists under this ID, revoke its URLs first to avoid leaks
    const existing = get().videos[pendingAssetId]
    if (existing) {
      try {
        URL.revokeObjectURL(existing.blobUrl)
        if (existing.posterBlobUrl) {
          URL.revokeObjectURL(existing.posterBlobUrl)
        }
      } catch (err) {
        console.warn('[useLocalMediaStore] Failed revoking old object URL:', err)
      }
    }

    // Generate local Blob URL for zero-latency playback
    const blobUrl = URL.createObjectURL(file)
    const posterBlobUrl = posterFile ? URL.createObjectURL(posterFile) : undefined

    const entry: LocalVideoEntry = {
      pendingAssetId,
      file,
      blobUrl,
      posterBlobUrl,
      fileName,
      mimeType,
      fileSize: file.size,
      width,
      height,
      duration,
      aspectRatio,
      uploadProgress: 0,
      status: 'pending',
      createdAt: Date.now(),
      context,
    }

    set((state) => ({
      videos: {
        ...state.videos,
        [pendingAssetId]: entry,
      },
    }))

    return blobUrl
  },

  getLocalVideo: (pendingAssetId: string): LocalVideoEntry | undefined => {
    return get().videos[pendingAssetId]
  },

  hasLocalVideo: (pendingAssetId: string): boolean => {
    return Boolean(get().videos[pendingAssetId])
  },

  updateLocalVideoProgress: (
    pendingAssetId: string,
    progress: number,
    status?: LocalMediaStatus,
  ) => {
    set((state) => {
      const current = state.videos[pendingAssetId]
      if (!current) return state

      const clampedProgress = Math.max(0, Math.min(1, progress))
      const nextStatus = status ?? (clampedProgress >= 1 ? 'transcoding' : 'uploading')

      return {
        videos: {
          ...state.videos,
          [pendingAssetId]: {
            ...current,
            uploadProgress: clampedProgress,
            status: nextStatus,
          },
        },
      }
    })
  },

  markLocalVideoError: (pendingAssetId: string, errorMessage: string) => {
    set((state) => {
      const current = state.videos[pendingAssetId]
      if (!current) return state

      return {
        videos: {
          ...state.videos,
          [pendingAssetId]: {
            ...current,
            status: 'error',
            errorMessage,
          },
        },
      }
    })
  },

  removeLocalVideo: (pendingAssetId: string) => {
    const entry = get().videos[pendingAssetId]
    if (!entry) return

    // CRITICAL: Revoke object URLs to prevent browser memory leaks and OOM crashes
    try {
      URL.revokeObjectURL(entry.blobUrl)
      if (entry.posterBlobUrl) {
        URL.revokeObjectURL(entry.posterBlobUrl)
      }
    } catch (err) {
      console.warn(`[useLocalMediaStore] Error revoking Blob URL for ${pendingAssetId}:`, err)
    }

    set((state) => {
      const next = { ...state.videos }
      delete next[pendingAssetId]
      return { videos: next }
    })
  },

  promoteToRemote: (pendingAssetId: string, _remoteUrl: string) => {
    // Revoke the blob URL to release RAM as soon as the remote CDN URL is active
    get().removeLocalVideo(pendingAssetId)
  },

  clearAllLocalVideos: () => {
    const all = get().videos
    Object.values(all).forEach((entry) => {
      try {
        URL.revokeObjectURL(entry.blobUrl)
        if (entry.posterBlobUrl) {
          URL.revokeObjectURL(entry.posterBlobUrl)
        }
      } catch (err) {
        console.warn(`[useLocalMediaStore] Error revoking Blob URL on cleanup:`, err)
      }
    })

    set({ videos: {} })
  },
}))

/**
 * React hook to reactively subscribe to a specific local video preview.
 */
export function useLocalVideo(pendingAssetId?: string | null): LocalVideoEntry | undefined {
  return useLocalMediaStore((state) => (pendingAssetId ? state.videos[pendingAssetId] : undefined))
}
