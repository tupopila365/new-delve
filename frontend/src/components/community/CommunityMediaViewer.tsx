import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { mediaUrl } from '../../api/client'
import type { FeedPost } from '../IgPostCard'
import { CommunityMediaLightbox } from './CommunityMediaLightbox'

export type CommunityMediaItem = {
  kind: 'image' | 'video'
  src: string
  poster?: string | null
  alt?: string
  caption?: string
}

type ViewerState = {
  items: CommunityMediaItem[]
  index: number
} | null

type CommunityMediaViewerContextValue = {
  openImage: (src: string, alt?: string, caption?: string) => void
  openVideo: (src: string, poster?: string | null, caption?: string) => void
  openMedia: (item: CommunityMediaItem) => void
  openGallery: (items: CommunityMediaItem[], startIndex?: number) => void
  openPostMedia: (post: Pick<FeedPost, 'image' | 'video' | 'body'>, alt?: string) => void
  close: () => void
}

const CommunityMediaViewerContext = createContext<CommunityMediaViewerContextValue | null>(null)

export function postToCommunityMedia(
  post: Pick<FeedPost, 'image' | 'video' | 'body'>,
  alt = '',
): CommunityMediaItem | null {
  const videoSrc = mediaUrl(post.video)
  const imageSrc = mediaUrl(post.image)
  const caption = post.body?.trim() || undefined

  if (videoSrc) {
    return { kind: 'video', src: videoSrc, poster: imageSrc, alt, caption }
  }
  if (imageSrc) {
    return { kind: 'image', src: imageSrc, alt, caption }
  }
  return null
}

export function CommunityMediaViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState>(null)

  const close = useCallback(() => setState(null), [])

  const openGallery = useCallback((items: CommunityMediaItem[], startIndex = 0) => {
    const filtered = items.filter((item) => item.src.trim())
    if (filtered.length === 0) return
    const index = Math.min(Math.max(startIndex, 0), filtered.length - 1)
    setState({ items: filtered, index })
  }, [])

  const openMedia = useCallback(
    (item: CommunityMediaItem) => {
      if (!item.src.trim()) return
      openGallery([item], 0)
    },
    [openGallery],
  )

  const openImage = useCallback(
    (src: string, alt = '', caption?: string) => {
      openMedia({ kind: 'image', src, alt, caption })
    },
    [openMedia],
  )

  const openVideo = useCallback(
    (src: string, poster?: string | null, caption?: string) => {
      openMedia({ kind: 'video', src, poster, caption })
    },
    [openMedia],
  )

  const openPostMedia = useCallback(
    (post: Pick<FeedPost, 'image' | 'video' | 'body'>, alt = '') => {
      const item = postToCommunityMedia(post, alt)
      if (item) openMedia(item)
    },
    [openMedia],
  )

  const setIndex = useCallback((index: number) => {
    setState((prev) => (prev ? { ...prev, index } : prev))
  }, [])

  const value = useMemo(
    () => ({ openImage, openVideo, openMedia, openGallery, openPostMedia, close }),
    [close, openGallery, openImage, openMedia, openPostMedia, openVideo],
  )

  return (
    <CommunityMediaViewerContext.Provider value={value}>
      {children}
      {state ? (
        <CommunityMediaLightbox
          items={state.items}
          index={state.index}
          onClose={close}
          onChange={setIndex}
        />
      ) : null}
    </CommunityMediaViewerContext.Provider>
  )
}

export function useCommunityMediaViewer() {
  const ctx = useContext(CommunityMediaViewerContext)
  if (!ctx) {
    throw new Error('useCommunityMediaViewer must be used within CommunityMediaViewerProvider')
  }
  return ctx
}
