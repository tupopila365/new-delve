import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FeedPost } from '../IgPostCard'
import { ProfilePostViewer } from '../profile'
import type { ListingMomentItem } from './types'
import { buildMomentsViewerState } from './listingMomentsViewer'
import { isRealPostId, postPermalinkPath } from '../../utils/postPermalink'

type ViewerState = {
  posts: FeedPost[]
  index: number
}

export function useListingMomentsViewer(queryKey: unknown[] = []) {
  const navigate = useNavigate()
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  const openMoment = useCallback((moments: ListingMomentItem[], momentId: string | number) => {
    if (isRealPostId(momentId)) {
      const id = typeof momentId === 'number' ? momentId : Number(momentId)
      navigate(postPermalinkPath(id))
      return
    }
    const state = buildMomentsViewerState(moments, momentId)
    if (state) setViewer(state)
  }, [navigate])

  const close = useCallback(() => setViewer(null), [])

  const overlay =
    viewer && viewer.posts.length > 0 ? (
      <ProfilePostViewer
        posts={viewer.posts}
        index={viewer.index}
        onClose={close}
        onChange={(index) => setViewer((current) => (current ? { ...current, index } : null))}
        queryKey={queryKey}
      />
    ) : null

  return { openMoment, close, overlay }
}
