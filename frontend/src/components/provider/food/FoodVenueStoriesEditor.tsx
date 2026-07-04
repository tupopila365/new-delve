import type { VenueStoryChannelInput } from '../../food/stories/types'
import {
  MAX_VENUE_STORY_CHANNELS,
  MAX_VENUE_STORY_SLIDES,
  emptyVenueStoryChannel,
  emptyVenueStorySlide,
} from './venueStoriesFormUtils'

type Props = {
  channels: VenueStoryChannelInput[]
  onChange: (channels: VenueStoryChannelInput[]) => void
}

export function FoodVenueStoriesEditor({ channels, onChange }: Props) {
  function updateChannel(index: number, patch: Partial<VenueStoryChannelInput>) {
    onChange(channels.map((ch, i) => (i === index ? { ...ch, ...patch } : ch)))
  }

  function removeChannel(index: number) {
    onChange(channels.filter((_, i) => i !== index))
  }

  function addChannel() {
    if (channels.length >= MAX_VENUE_STORY_CHANNELS) return
    onChange([...channels, emptyVenueStoryChannel(channels.length)])
  }

  function updateSlide(channelIndex: number, slideIndex: number, patch: Partial<VenueStoryChannelInput['slides'][number]>) {
    const channel = channels[channelIndex]
    if (!channel) return
    const slides = channel.slides.map((slide, i) => (i === slideIndex ? { ...slide, ...patch } : slide))
    updateChannel(channelIndex, { slides })
  }

  function addSlide(channelIndex: number) {
    const channel = channels[channelIndex]
    if (!channel || channel.slides.length >= MAX_VENUE_STORY_SLIDES) return
    updateChannel(channelIndex, {
      slides: [...channel.slides, emptyVenueStorySlide(channel.slides.length)],
    })
  }

  function removeSlide(channelIndex: number, slideIndex: number) {
    const channel = channels[channelIndex]
    if (!channel) return
    const slides = channel.slides.filter((_, i) => i !== slideIndex)
    updateChannel(channelIndex, { slides: slides.length ? slides : [emptyVenueStorySlide()] })
  }

  return (
    <div className="food-stories-editor">
      <p className="transport-form__hint">
        Highlight rings on your venue page — specials, menu drops, or behind-the-scenes. Each channel is a story ring
        travellers can tap through.
      </p>

      {channels.length === 0 ? (
        <div className="food-stories-editor__empty">
          <p>No custom story channels yet. Auto-generated rings still use your photos and description.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addChannel}>
            Add story channel
          </button>
        </div>
      ) : null}

      {channels.map((channel, channelIndex) => (
        <div key={channel.id || `ch-${channelIndex}`} className="food-stories-editor__channel">
          <div className="food-stories-editor__channel-head">
            <h3>Channel {channelIndex + 1}</h3>
            <button type="button" className="da-link-btn da-link-btn--danger" onClick={() => removeChannel(channelIndex)}>
              Remove
            </button>
          </div>

          <label className="transport-form__field">
            Ring label
            <input
              value={channel.label}
              onChange={(e) => updateChannel(channelIndex, { label: e.target.value })}
              placeholder="Grill night"
            />
          </label>
          <label className="transport-form__field">
            Cover image URL (optional)
            <input
              value={channel.coverSrc ?? ''}
              onChange={(e) => updateChannel(channelIndex, { coverSrc: e.target.value })}
              placeholder="https://…"
            />
          </label>

          <div className="food-stories-editor__slides">
            <p className="food-stories-editor__slides-label">Slides</p>
            {channel.slides.map((slide, slideIndex) => (
              <div key={slide.id || `slide-${slideIndex}`} className="food-stories-editor__slide">
                <div className="food-stories-editor__slide-head">
                  <span>Slide {slideIndex + 1}</span>
                  {channel.slides.length > 1 ? (
                    <button
                      type="button"
                      className="da-link-btn"
                      onClick={() => removeSlide(channelIndex, slideIndex)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className="transport-form__field">
                  Image URL
                  <input
                    value={slide.src}
                    onChange={(e) => updateSlide(channelIndex, slideIndex, { src: e.target.value })}
                    placeholder="https://…"
                  />
                </label>
                <label className="transport-form__field">
                  Headline
                  <input
                    value={slide.headline}
                    onChange={(e) => updateSlide(channelIndex, slideIndex, { headline: e.target.value })}
                    placeholder="Fire up Friday"
                  />
                </label>
                <label className="transport-form__field">
                  Subtitle (optional)
                  <input
                    value={slide.sub ?? ''}
                    onChange={(e) => updateSlide(channelIndex, slideIndex, { sub: e.target.value })}
                    placeholder="Live flame grill from 6pm"
                  />
                </label>
              </div>
            ))}
            {channel.slides.length < MAX_VENUE_STORY_SLIDES ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addSlide(channelIndex)}>
                Add slide
              </button>
            ) : null}
          </div>
        </div>
      ))}

      {channels.length > 0 && channels.length < MAX_VENUE_STORY_CHANNELS ? (
        <button type="button" className="btn btn-ghost btn-sm food-stories-editor__add" onClick={addChannel}>
          Add another channel
        </button>
      ) : null}
    </div>
  )
}
