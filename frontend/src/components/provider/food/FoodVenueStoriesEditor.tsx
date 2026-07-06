import type { VenueStoryChannelInput } from '../../food/stories/types'
import { HighlightChannelEditor } from '../../highlights/HighlightChannelEditor'

type Props = {
  channels: VenueStoryChannelInput[]
  onChange: (channels: VenueStoryChannelInput[]) => void
}

export function FoodVenueStoriesEditor({ channels, onChange }: Props) {
  return (
    <HighlightChannelEditor
      channels={channels}
      onChange={onChange}
      hint="Highlight rings on your venue page — specials, menu drops, or behind-the-scenes. Each ring is a story travellers can tap through."
      emptyCopy="No custom story rings yet. Auto-generated rings still use your photos and description."
    />
  )
}
