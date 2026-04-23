import { useMemo, useState } from 'react'
import { mediaUrl } from '../api/client'
import { buildDelversSlidesForUser, type DelversStoryPin } from '../data/delversStories'
import type { StorySlide } from '../data/homeStories'
import { StoryViewer } from './StoryViewer'

type StoryAuthor = {
  username: string
  display_name: string
  avatar: string | null
  slides: StorySlide[]
}

function avatarInitial(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}

function labelForUser(displayName: string, username: string) {
  const first = (displayName || username).trim().split(/\s+/)[0]
  return first.length > 10 ? `${first.slice(0, 9)}…` : first
}

type Props = {
  pins: DelversStoryPin[]
  myUsername?: string | null
}

export function DelversStoriesRow({ pins, myUsername }: Props) {
  const [openUser, setOpenUser] = useState<string | null>(null)

  const authors = useMemo(() => {
    const map = new Map<string, DelversStoryPin[]>()
    for (const p of pins) {
      const u = p.author.username
      if (!map.has(u)) map.set(u, [])
      map.get(u)!.push(p)
    }
    const rows: (StoryAuthor & { latest: number })[] = []
    for (const [, userPosts] of map) {
      const slides = buildDelversSlidesForUser(userPosts)
      if (slides.length === 0) continue
      const first = userPosts[0]
      const latest = Math.max(...userPosts.map((x) => new Date(x.created_at || 0).getTime()))
      rows.push({
        username: first.author.username,
        display_name: first.author.display_name || first.author.username,
        avatar: first.author.avatar ?? null,
        slides,
        latest,
      })
    }
    rows.sort((a, b) => b.latest - a.latest)
    let cleaned: StoryAuthor[] = rows.map((row) => {
      const { latest, ...author } = row
      return author
    })

    if (myUsername) {
      const i = cleaned.findIndex((a) => a.username.toLowerCase() === myUsername.toLowerCase())
      if (i > 0) {
        const [me] = cleaned.splice(i, 1)
        cleaned = [me, ...cleaned]
      }
    }
    return cleaned.slice(0, 36)
  }, [pins, myUsername])

  const active = openUser ? authors.find((a) => a.username === openUser) : null

  if (authors.length === 0) {
    return (
      <p className="delvers-page__stories-empty page-sub" role="note">
        Story rings appear when pins include a photo or video — text-only posts stay in the grid below.
      </p>
    )
  }

  return (
    <>
      <div className="stories-row delvers-stories-row" aria-label="People on Delvers — tap a ring for their pins">
        {authors.map((a) => {
          const name = a.display_name || a.username
          const initial = avatarInitial(name)
          const label = labelForUser(a.display_name, a.username)
          return (
            <button
              key={a.username}
              type="button"
              className="story-bubble story-bubble--btn delvers-story-bubble"
              onClick={() => setOpenUser(a.username)}
            >
              <div className="story-bubble__ring">
                <div
                  className={`story-bubble__inner${a.avatar ? ' story-bubble__inner--avatar' : ''}`}
                  aria-hidden
                >
                  {a.avatar ? (
                    <img src={mediaUrl(a.avatar) || ''} alt="" className="story-bubble__avatar-img" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
              </div>
              <span className="story-bubble__label">{label}</span>
            </button>
          )
        })}
      </div>

      {active && (
        <StoryViewer
          open
          onClose={() => setOpenUser(null)}
          channelLabel={`@${active.username}`}
          explorePath={`/u/${encodeURIComponent(active.username)}`}
          slides={active.slides}
          ctaLabel="View profile"
        />
      )}
    </>
  )
}
