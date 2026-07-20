import type { VenueStoryChannelInput } from '../../food/stories/types'
import { HighlightChannelEditor } from '../../highlights/HighlightChannelEditor'

type Props = {
  channels: VenueStoryChannelInput[]
  onChange: (channels: VenueStoryChannelInput[]) => void
}

export function GuideStoriesEditor({ channels, onChange }: Props) {
  return (
    <HighlightChannelEditor
      channels={channels}
      onChange={onChange}
      hint="Highlight rings on your guide page — trail moments, package teasers, or behind-the-scenes. Organize media travellers can tap through."
      emptyCopy="No custom highlights yet. Auto-generated rings still use your photos and packages."
    />
  )
}
