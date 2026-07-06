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
      hint="Highlight rings on your guide page — trail moments, package teasers, or behind-the-scenes. Auto-generated rings still use your portfolio when you leave this empty."
      emptyCopy="No custom story rings yet. Auto-generated rings still use your photos and packages."
    />
  )
}
