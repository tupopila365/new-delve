import { useMemo, useState } from 'react'
import type { StorySlide } from '../data/homeStories'
import { StoryViewer } from './StoryViewer'
import './ProviderStoriesRow.css'

export type ProviderStoryItem = {
  id: string
  label: string
  channelLabel: string
  explorePath: string
  coverSrc: string | null
  /** When cover is story media, prefer video frame over broken <img>. */
  coverKind?: 'image' | 'video'
  fallbackInitial?: string
  slides: StorySlide[]
}

type Props = {
  items: ProviderStoryItem[]
  ariaLabel: string
  ctaLabel?: string
  className?: string
  title?: string
  subtitle?: string
}

function itemInitial(label: string, fallback?: string) {
  const w = (fallback || label).trim()
  return w ? w.charAt(0).toUpperCase() : '?'
}

function StoryRingCover({
  coverSrc,
  coverKind,
  label,
  fallbackInitial,
}: {
  coverSrc: string | null
  coverKind?: 'image' | 'video'
  label: string
  fallbackInitial?: string
}) {
  const [failed, setFailed] = useState(false)
  const showMedia = Boolean(coverSrc) && !failed
  const isVideo = showMedia && coverKind === 'video'

  if (isVideo) {
    return (
      <video
        src={`${coverSrc!}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className="provider-stories__img provider-stories__video"
        aria-hidden
        onError={() => setFailed(true)}
      />
    )
  }

  if (showMedia) {
    return (
      <img
        src={coverSrc!}
        alt=""
        className="provider-stories__img"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span className="provider-stories__initial" aria-hidden>
      {itemInitial(label, fallbackInitial)}
    </span>
  )
}

/** Simple story rings for service-provider pages (stays & events). */
export function ProviderStoriesRow({ items, ariaLabel, ctaLabel = 'View', className, title, subtitle }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => items.filter((item) => item.slides.length > 0), [items])
  const active = openId ? list.find((item) => item.id === openId) : null

  if (list.length === 0) return null

  return (
    <>
      <section className={`provider-stories${className ? ` ${className}` : ''}`.trim()} aria-label={ariaLabel}>
        {title ? (
          <div className="provider-stories__head">
            <h2 className="provider-stories__title">{title}</h2>
            {subtitle ? <p className="provider-stories__sub">{subtitle}</p> : null}
          </div>
        ) : null}
        <div className="provider-stories__row">
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              className="provider-stories__item"
              onClick={() => setOpenId(item.id)}
              aria-label={`Open story: ${item.label}`}
            >
              <span className="provider-stories__ring">
                <span className="provider-stories__media">
                  <StoryRingCover
                    coverSrc={item.coverSrc}
                    coverKind={item.coverKind}
                    label={item.label}
                    fallbackInitial={item.fallbackInitial}
                  />
                </span>
              </span>
              <span className="provider-stories__label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {active ? (
        <StoryViewer
          open
          onClose={() => setOpenId(null)}
          channelLabel={active.channelLabel}
          explorePath={active.explorePath}
          slides={active.slides}
          ctaLabel={ctaLabel}
        />
      ) : null}
    </>
  )
}
