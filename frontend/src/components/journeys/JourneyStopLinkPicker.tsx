import { PlaceSearchSheet } from '../create/PlaceSearchSheet'
import type { PlaceLink } from '../create/types'

export type JourneyStopLink =
  | { kind: 'none' }
  | { kind: 'accommodation'; id: number; title: string }
  | { kind: 'food'; id: number; title: string }
  | { kind: 'event'; id: number; title: string }

type Props = {
  value: JourneyStopLink
  onChange: (next: JourneyStopLink) => void
  disabled?: boolean
}

function toPlaceLink(value: JourneyStopLink): PlaceLink {
  return value
}

function fromPlaceLink(value: PlaceLink): JourneyStopLink {
  if (value.kind === 'accommodation' || value.kind === 'food' || value.kind === 'event') {
    return value
  }
  return { kind: 'none' }
}

export function JourneyStopLinkPicker({ value, onChange, disabled = false }: Props) {
  return (
    <PlaceSearchSheet
      value={toPlaceLink(value)}
      onChange={(next) => onChange(fromPlaceLink(next))}
      disabled={disabled}
      allowedKinds={['accommodation', 'food', 'event']}
      triggerLabel="Link a listing"
      variant="light"
    />
  )
}
