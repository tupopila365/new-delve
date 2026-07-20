import { useState } from 'react'
import { Check, ImagePlus, Play, Trash2, X } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import type { HighlightChannelInput } from './types'
import {
  MAX_HIGHLIGHT_CHANNELS,
  MAX_HIGHLIGHT_SLIDES,
  emptyHighlightChannel,
  emptyHighlightSlide,
  filledHighlightSlides,
} from './highlightFormUtils'
import { isRemoteMediaUrl } from './eagerHighlightUpload'
import { HighlightStudioSheet } from './HighlightStudioSheet'
import '../create/SocialCreateComposer.css'
import './highlights.css'

type Props = {
  channels: HighlightChannelInput[]
  onChange: (channels: HighlightChannelInput[]) => void
  hint: string
  emptyCopy?: string
}

type StudioTarget =
  | { mode: 'new'; channelIndex: number }
  | { mode: 'edit'; channelIndex: number; slideIndex: number }
  | null

function slideThumbSrc(slide: HighlightChannelInput['slides'][number]): string {
  const src = mediaUrl(slide.src) ?? slide.src
  return src
}

export function HighlightChannelEditor({
  channels,
  onChange,
  hint,
  emptyCopy = 'No custom highlight rings yet.',
}: Props) {
  const [studio, setStudio] = useState<StudioTarget>(null)

  function updateChannel(index: number, patch: Partial<HighlightChannelInput>) {
    onChange(channels.map((ch, i) => (i === index ? { ...ch, ...patch } : ch)))
  }

  function removeChannel(index: number) {
    onChange(channels.filter((_, i) => i !== index))
    setStudio(null)
  }

  function addChannel() {
    if (channels.length >= MAX_HIGHLIGHT_CHANNELS) return
    onChange([...channels, emptyHighlightChannel(channels.length)])
  }

  function removeSlide(channelIndex: number, slideIndex: number) {
    const channel = channels[channelIndex]
    if (!channel) return
    const slides = filledHighlightSlides(channel.slides)
    const next = slides.filter((_, i) => i !== slideIndex)
    updateChannel(channelIndex, {
      slides: next.length ? next : [emptyHighlightSlide()],
      coverSrc: next[0]?.src ?? '',
    })
    setStudio(null)
  }

  function saveSlide(
    channelIndex: number,
    saved: {
      src: string
      kind: 'image' | 'video'
      headline: string
      sub?: string
      captionX?: number
      captionY?: number
    },
    replaceIndex?: number,
  ) {
    const channel = channels[channelIndex]
    if (!channel) return
    const slide = {
      ...emptyHighlightSlide(replaceIndex ?? filledHighlightSlides(channel.slides).length),
      kind: saved.kind,
      src: saved.src,
      headline: saved.headline,
      sub: saved.sub,
      captionX: saved.captionX,
      captionY: saved.captionY,
    }
    const existing = filledHighlightSlides(channel.slides)
    const slides =
      replaceIndex !== undefined
        ? existing.map((s, i) => (i === replaceIndex ? { ...slide, id: s.id ?? slide.id } : s))
        : [...existing, slide]
    updateChannel(channelIndex, {
      slides,
      coverSrc: channel.coverSrc || saved.src,
    })
    setStudio(null)
  }

  const studioChannel = studio ? channels[studio.channelIndex] : null
  const studioSlides = studioChannel ? filledHighlightSlides(studioChannel.slides) : []
  const studioInitial =
    studio?.mode === 'edit' ? studioSlides[studio.slideIndex] ?? null : null

  return (
    <section className="hl-channel-editor" aria-label="Highlights">
      <p className="hl-channel-editor__hint">{hint}</p>

      {channels.length === 0 ? (
        <div className="hl-channel-editor__empty">
          <p>{emptyCopy}</p>
          <button type="button" className="hl-channel-editor__cta" onClick={addChannel}>
            <ImagePlus size={20} strokeWidth={2} aria-hidden />
            Create highlight ring
          </button>
        </div>
      ) : null}

      <div className="hl-channel-editor__rings">
        {channels.map((channel, channelIndex) => {
          const slides = filledHighlightSlides(channel.slides)
          const coverSrc = slides[0]?.src ? slideThumbSrc(slides[0]) : ''
          const canAddSlide = slides.length < MAX_HIGHLIGHT_SLIDES

          return (
            <article key={channel.id || `ch-${channelIndex}`} className="hl-channel-card">
              <div className="hl-channel-card__top">
                <div className="hl-channel-card__ring-preview" aria-hidden>
                  {coverSrc ? (
                    <img src={coverSrc} alt="" />
                  ) : (
                    <span className="hl-channel-card__ring-placeholder" />
                  )}
                </div>
                <input
                  type="text"
                  className="hl-channel-card__name"
                  value={channel.label}
                  onChange={(e) => updateChannel(channelIndex, { label: e.target.value })}
                  placeholder="Name this ring"
                  maxLength={80}
                  aria-label="Ring name"
                />
                <button
                  type="button"
                  className="hl-channel-card__remove"
                  onClick={() => removeChannel(channelIndex)}
                  aria-label="Remove ring"
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden />
                </button>
              </div>

              <div className="hl-channel-card__filmstrip" role="list" aria-label="Slides">
                {slides.map((slide, slideIndex) => {
                  const isVideo = slide.kind === 'video'
                  const remote = isRemoteMediaUrl(slide.src)
                  return (
                    <div key={slide.id || `slide-${slideIndex}`} className="hl-slide-tile" role="listitem">
                      <button
                        type="button"
                        className="hl-slide-tile__btn"
                        onClick={() => setStudio({ mode: 'edit', channelIndex, slideIndex })}
                        aria-label={`Edit slide: ${slide.headline}`}
                      >
                        <img src={slideThumbSrc(slide)} alt="" />
                        {isVideo ? (
                          <span className="hl-slide-tile__play" aria-hidden>
                            <Play size={12} strokeWidth={2.5} fill="currentColor" />
                          </span>
                        ) : null}
                        <span
                          className={`hl-slide-tile__status hl-slide-tile__status--${remote ? 'ready' : 'local'}`}
                          title={remote ? 'Uploaded' : 'Needs upload'}
                          aria-label={remote ? 'Uploaded' : 'Needs upload'}
                        >
                          {remote ? <Check size={10} strokeWidth={3} aria-hidden /> : null}
                        </span>
                        <span className="hl-slide-tile__caption">{slide.headline}</span>
                      </button>
                      {slides.length > 1 ? (
                        <button
                          type="button"
                          className="hl-slide-tile__delete"
                          onClick={() => removeSlide(channelIndex, slideIndex)}
                          aria-label="Remove slide"
                        >
                          <X size={12} strokeWidth={2.5} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  )
                })}

                {canAddSlide ? (
                  <button
                    type="button"
                    className="hl-slide-tile hl-slide-tile--add"
                    onClick={() => setStudio({ mode: 'new', channelIndex })}
                    aria-label="Add slide"
                  >
                    <ImagePlus size={22} strokeWidth={2} aria-hidden />
                    <span>Add</span>
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {channels.length > 0 && channels.length < MAX_HIGHLIGHT_CHANNELS ? (
        <button type="button" className="hl-channel-editor__add-ring" onClick={addChannel}>
          <ImagePlus size={16} strokeWidth={2} aria-hidden />
          Add another ring
        </button>
      ) : null}

      <HighlightStudioSheet
        open={studio !== null}
        title={studio?.mode === 'edit' ? 'Edit slide' : 'New slide'}
        submitLabel={studio?.mode === 'edit' ? 'Save changes' : 'Add to ring'}
        initialSlide={studioInitial}
        onClose={() => setStudio(null)}
        onSaved={(saved) => {
          if (!studio) return
          if (studio.mode === 'edit') {
            saveSlide(studio.channelIndex, saved, studio.slideIndex)
          } else {
            saveSlide(studio.channelIndex, saved)
          }
        }}
      />
    </section>
  )
}
