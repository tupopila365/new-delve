import type { LucideIcon } from 'lucide-react'
import { Briefcase, Heart, UserPlus, UserRound, Users, UsersRound } from 'lucide-react'
import './PartyPicker.css'

export const PARTY_SUGGESTIONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'solo', label: 'Solo', Icon: UserRound },
  { id: 'couple', label: 'Couple', Icon: Heart },
  { id: 'family', label: 'Family', Icon: Users },
  { id: 'group', label: 'Group', Icon: UsersRound },
  { id: 'friends', label: 'Friends', Icon: UserPlus },
  { id: 'work', label: 'Work trip', Icon: Briefcase },
]

type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
}

function matchesSuggestion(value: string, suggestion: (typeof PARTY_SUGGESTIONS)[number]) {
  const trimmed = value.trim().toLowerCase()
  return trimmed === suggestion.id || trimmed === suggestion.label.toLowerCase()
}

export function PartyPicker({ value, onChange, label = 'Who travelled?' }: Props) {
  const activeSuggestion = PARTY_SUGGESTIONS.find((item) => matchesSuggestion(value, item))

  return (
    <div className="party-picker">
      <label className="party-picker__label" htmlFor="party-picker-input">
        {label}
      </label>
      <input
        id="party-picker-input"
        type="text"
        className="party-picker__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Solo, couple, friends, coworkers…"
        maxLength={48}
        autoComplete="off"
      />
      <p className="party-picker__hint">Type your own or tap a suggestion</p>
      <div className="party-picker__suggestions" role="list" aria-label="Party suggestions">
        {PARTY_SUGGESTIONS.map((item) => {
          const active = activeSuggestion?.id === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={active ? 'is-active' : ''}
              aria-pressed={active}
              onClick={() => onChange(item.id)}
            >
              <item.Icon size={15} strokeWidth={2.25} aria-hidden />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function normalizePartyValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'solo'
  const match = PARTY_SUGGESTIONS.find((item) => matchesSuggestion(trimmed, item))
  return match ? match.id : trimmed
}

export function partyDisplayLabel(party: string): string {
  const match = PARTY_SUGGESTIONS.find((item) => item.id === party)
  if (match) return match.label
  const byLabel = PARTY_SUGGESTIONS.find((item) => item.label.toLowerCase() === party.toLowerCase())
  if (byLabel) return byLabel.label
  return party
}
