import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, User, X } from 'lucide-react'
import type { StoryAuthorDto, StorySlideDto, StoryViewerDto } from '@delve/contracts'
import {
  fetchStoryRail,
  fetchUserStories,
  markStoriesViewed,
} from '../../api/socialClient'
import { fetchOnboarding, getStoredUser } from '../../api/authClient'
import MediaStudio from '../../pages/MediaStudio'
import { formatUsername } from '../../lib/formatUsername'

function RingAvatar({
  src,
  size = 56,
}: {
  src: string | null
  size?: number
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--surface-subtle)', border: '2px solid var(--surface)' }}
      >
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={size * 0.4} style={{ color: 'var(--fg-muted)' }} />
        )}
      </div>
    </div>
  )
}

function StoryCreateStudio({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  return (
    <MediaStudio
      open={open}
      onClose={onClose}
      initialContext="delvers-story"
      lockContext
      onStoryCreated={() => {
        onCreated()
        onClose()
      }}
    />
  )
}

function StoryViewer({
  authorId,
  onClose,
  onViewed,
}: {
  authorId: string
  onClose: () => void
  onViewed: (authorId: string) => void
}) {
  const [data, setData] = useState<StoryViewerDto | null>(null)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const markedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const viewer = await fetchUserStories(authorId)
        if (cancelled) return
        setData(viewer)
        setIndex(0)
        if (!markedRef.current) {
          markedRef.current = true
          try {
            await markStoriesViewed(authorId)
            onViewed(authorId)
          } catch {
            /* viewing still works if mark fails */
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open story')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authorId, onViewed])

  const slides = data?.slides ?? []
  const slide: StorySlideDto | undefined = slides[index]

  function goNext() {
    if (index < slides.length - 1) setIndex(i => i + 1)
    else onClose()
  }

  function goPrev() {
    if (index > 0) setIndex(i => i - 1)
    else onClose()
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el || !slide || slide.media.resourceType !== 'video') return
    el.currentTime = 0
    void el.play().catch(() => undefined)
  }, [slide?.id])

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col"
      style={{ background: '#0a0a0a' }}
      role="dialog"
      aria-label="Story viewer"
    >
      <div className="flex gap-1 px-3 pt-[max(12px,var(--safe-top))] pb-2">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="h-0.5 flex-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: i < index ? '100%' : i === index ? '100%' : '0%',
                background: '#fff',
                opacity: i <= index ? 1 : 0,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-2">
        <RingAvatar src={data?.author.avatarUrl ?? null} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold m-0 truncate" style={{ color: '#fff' }}>
            {data?.author.displayName || formatUsername(data?.author.username || '')}
          </p>
          {slide?.location && (
            <p className="text-xs m-0 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {slide.location}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer' }}
          aria-label="Close story"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-0 px-2 pb-6">
        {loading && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Loading…
          </p>
        )}
        {error && !loading && (
          <div className="text-center px-6">
            <p className="text-sm m-0 mb-3" style={{ color: '#fff' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        )}
        {!loading && !error && slide && (
          <>
            {slide.media.resourceType === 'video' ? (
              <video
                ref={videoRef}
                key={slide.id}
                src={slide.media.url}
                className="max-h-full max-w-full rounded-xl object-contain"
                playsInline
                controls={false}
                onEnded={goNext}
              />
            ) : (
              <img
                key={slide.id}
                src={slide.media.url}
                alt=""
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            )}
            {slide.caption && (
              <p
                className="absolute bottom-8 left-4 right-4 text-sm text-center m-0"
                style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
              >
                {slide.caption}
              </p>
            )}
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/3"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Previous"
              onClick={goPrev}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-2/3"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Next"
              onClick={goNext}
            />
          </>
        )}
      </div>
    </div>
  )
}

export interface DelversStoryRailProps {
  signedIn: boolean
  authReady: boolean
}

export default function DelversStoryRail({ signedIn, authReady }: DelversStoryRailProps) {
  const [authors, setAuthors] = useState<StoryAuthorDto[]>([])
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewerAuthorId, setViewerAuthorId] = useState<string | null>(null)

  const me = getStoredUser()

  const loadRail = useCallback(async () => {
    if (!signedIn) {
      setAuthors([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [rail, profile] = await Promise.all([
        fetchStoryRail(),
        fetchOnboarding().catch(() => null),
      ])
      setAuthors(rail.authors)
      if (profile?.avatarUrl) setMyAvatar(profile.avatarUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load stories')
      setAuthors([])
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    if (!authReady) return
    void loadRail()
  }, [authReady, loadRail])

  const onViewed = useCallback((authorId: string) => {
    setAuthors(prev =>
      prev.map(a => (a.id === authorId ? { ...a, unseen: false } : a)),
    )
  }, [])

  if (!authReady || !signedIn) return null

  const ownFromRail = authors.find(a => a.isOwn)
  const others = authors.filter(a => !a.isOwn)
  const ownHasSlides = (ownFromRail?.slideCount ?? 0) > 0
  const ownAvatar = ownFromRail?.avatarUrl ?? myAvatar
  const ownLabel = ownHasSlides ? 'Your story' : 'Add'

  return (
    <>
      <div
        className="border-b"
        style={{ borderColor: 'var(--border)' }}
        aria-label="Stories"
      >
        {loading && (
          <div className="story-rail scroll-rail--fade">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="story-rail__item flex flex-col items-center gap-1">
                <div
                  className="rounded-full animate-pulse"
                  style={{ width: 56, height: 56, background: 'var(--surface-subtle)' }}
                />
                <div
                  className="rounded h-2 w-10 animate-pulse"
                  style={{ background: 'var(--surface-subtle)' }}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadRail()}
              className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(140,82,255,0.12)',
                color: 'var(--primary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="story-rail scroll-rail--fade">
            {me && (
              <div className="story-rail__item flex flex-col items-center gap-1 relative">
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity w-full"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label={ownHasSlides ? 'View your story' : 'Add your story'}
                  onClick={() => {
                    if (ownHasSlides) setViewerAuthorId(me.id)
                    else setCreateOpen(true)
                  }}
                >
                  <div
                    className="p-0.5 rounded-full"
                    style={{
                      background: ownHasSlides
                        ? 'linear-gradient(135deg, #8C52FF, #E05C1A)'
                        : 'var(--surface-subtle)',
                    }}
                  >
                    <RingAvatar src={ownAvatar} />
                  </div>
                  <span className="story-rail__name text-xs font-medium" style={{ color: 'var(--fg)' }}>
                    {ownLabel}
                  </span>
                </button>
                <button
                  type="button"
                  className="absolute bottom-5 right-1 w-5 h-5 rounded-full flex items-center justify-center z-10"
                  style={{
                    background: 'var(--primary)',
                    border: '2px solid var(--surface)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label="Add to your story"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={10} color="#fff" />
                </button>
              </div>
            )}

            {others.map(author => (
              <button
                key={author.id}
                type="button"
                className="story-rail__item flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label={`${author.displayName}${author.unseen ? ', new story' : ''}`}
                onClick={() => setViewerAuthorId(author.id)}
              >
                <div
                  className="p-0.5 rounded-full"
                  style={{
                    background: author.unseen
                      ? 'linear-gradient(135deg, #8C52FF, #E05C1A)'
                      : 'var(--border)',
                  }}
                >
                  <RingAvatar src={author.avatarUrl} />
                </div>
                <span className="story-rail__name text-xs font-medium" style={{ color: 'var(--fg)' }}>
                  {author.displayName.split(' ')[0] || formatUsername(author.username)}
                </span>
              </button>
            ))}

            {!others.length && !ownHasSlides && (
              <p
                className="text-xs self-center m-0 pl-1"
                style={{ color: 'var(--fg-muted)', maxWidth: 160 }}
              >
                Follow travelers to see their stories here.
              </p>
            )}
          </div>
        )}
      </div>

      <StoryCreateStudio
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void loadRail()}
      />

      {viewerAuthorId && (
        <StoryViewer
          authorId={viewerAuthorId}
          onClose={() => setViewerAuthorId(null)}
          onViewed={onViewed}
        />
      )}
    </>
  )
}
