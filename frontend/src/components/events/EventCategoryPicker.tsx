import type { LucideIcon } from 'lucide-react'
import { Briefcase, Landmark, Music, Sparkles, Trophy, Utensils } from 'lucide-react'
import './EventCategoryPicker.css'

export const EVENT_CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'music', label: 'Music', Icon: Music },
  { value: 'sports', label: 'Sports', Icon: Trophy },
  { value: 'culture', label: 'Culture', Icon: Landmark },
  { value: 'business', label: 'Business', Icon: Briefcase },
  { value: 'food', label: 'Foodies', Icon: Utensils },
  { value: 'other', label: 'Other', Icon: Sparkles },
]

type Props = {
  value: string
  onChange: (value: string) => void
}

export function EventCategoryPicker({ value, onChange }: Props) {
  return (
    <div className="event-category-picker">
      <span className="event-category-picker__label">Category</span>
      <div className="event-category-picker__grid" role="group" aria-label="Event category">
        {EVENT_CATEGORIES.map((item) => {
          const active = value === item.value
          return (
            <button
              key={item.value}
              type="button"
              className={active ? 'is-active' : ''}
              aria-pressed={active}
              onClick={() => onChange(item.value)}
            >
              <item.Icon size={16} strokeWidth={2.25} aria-hidden />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
