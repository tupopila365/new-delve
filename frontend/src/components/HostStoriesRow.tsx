import { useMemo, useState } from 'react'
import { mediaUrl } from '../api/client'
import { buildHostAccommodationSlides } from '../data/hostAccommodationStories'
import type { StorySlide } from '../data/homeStories'
import { mockHostAccommodationStoryPins } from '../mocks/mockData'
import { StoryViewer } from './StoryViewer'

type StoryAuthor = {
  username: string
  display_name: string
  avatar: string | null
  slides: StorySlide[]
}

function avatarInitial(name: string) {
  const w = name.trim()
  return w ? w.charAt(0).toUpperCase() : '?'
}

function labelForUser(displayName: string, username: string) {
  const d = displayName.trim()
  if (!d || d.toLowerCase() === username.toLowerCase()) {
    return `@${username}`
  }
  return d.length > 14 ? `${d.slice(0, 13)}…` : d
}

/** Story rings on Places to stay — uses static mock pins (no network). */
export function HostStoriesRow() {
  const [openUser, setOpenUser] = useState<string | null>(null)

  const pins = mockHostAccommodationStoryPins

  const authors = useMemo(() => {
    const map = new Map<string, typeof pins>()
    for (const p of pins) {
      const u = p.author.username
      if (!map.has(u)) map.set(u, [])
      map.get(u)!.push(p)
    }
    const rows: (StoryAuthor & { latest: number })[] = []
    for (const [, userPosts] of map) {
      const slides = buildHostAccommodationSlides(userPosts)
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
    return rows.map(({ latest, ...author }) => author).slice(0, 36)
  }, [pins])

  const active = openUser ? authors.find((a) => a.username === openUser) : null

  if (authors.length === 0) {
    return null
  }

  return (
    <>
      <div className="stories-row acc-host-stories-row" aria-label="Hosts — tap a ring for their stories (demo)">
        {authors.map((a) => {
          const name = a.display_name || a.username
          const initial = avatarInitial(name)
          const label = labelForUser(a.display_name, a.username)
          return (
            <button
              key={a.username}
              type="button"
              className="story-bubble story-bubble--btn acc-host-story-bubble"
              onClick={() => setOpenUser(a.username)}
            >
              <div className="story-bubble__ring">
                <div className={`story-bubble__inner${a.avatar ? ' story-bubble__inner--avatar' : ''}`} aria-hidden>
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
          ctaLabel="View host"
        />
      )}
    </>
  )
}
