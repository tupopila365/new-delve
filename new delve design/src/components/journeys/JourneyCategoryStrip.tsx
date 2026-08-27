import { Building2, Car, Compass, Landmark, TreePine, Utensils, Waves } from 'lucide-react'
import type { ReactNode } from 'react'
import type { JourneySummary } from '@delve/contracts'

/** Keywords checked across multiple journey fields for each category */
export const CATEGORY_MATCHERS: Record<string, string[]> = {
  adventure: [
    'adventure', 'hike', 'hiking', 'trek', 'trekking', 'climb', 'climbing',
    'backpack', 'backpacking', 'safari', 'expedition', 'extreme', 'wild',
    'canyon', 'kayak', 'rafting', 'skydive', 'bungee', 'motorbike', 'off-road',
  ],
  food: [
    'food', 'foodie', 'culinary', 'eat', 'dining', 'restaurant', 'cuisine',
    'street food', 'market', 'tasting', 'wine', 'coffee', 'bake', 'grill',
    'farm-to-table', 'vegan', 'bbq', 'ramen', 'sushi', 'tapas', 'gastro',
  ],
  culture: [
    'culture', 'cultural', 'museum', 'history', 'historical', 'heritage',
    'temple', 'church', 'cathedral', 'palace', 'monument', 'ruin', 'ancient',
    'art', 'gallery', 'festival', 'tradition', 'local', 'architecture',
  ],
  beach: [
    'beach', 'coast', 'coastal', 'ocean', 'sea', 'island', 'snorkel',
    'dive', 'diving', 'surf', 'surfing', 'sand', 'tropical', 'lagoon',
    'reef', 'coral', 'sunbathe', 'maldives', 'caribbean', 'mediterranean',
  ],
  city: [
    'city', 'cities', 'urban', 'downtown', 'metro', 'capital', 'town',
    'skyline', 'nightlife', 'rooftop', 'bar', 'pub', 'club', 'shopping',
    'fashion', 'street art', 'graffiti', 'borough', 'neighbourhood',
  ],
  nature: [
    'nature', 'natural', 'forest', 'jungle', 'rainforest', 'park',
    'national park', 'wildlife', 'waterfall', 'mountain', 'volcano',
    'lake', 'river', 'valley', 'meadow', 'glacier', 'scenic', 'landscape',
  ],
  'road trip': [
    'road trip', 'road-trip', 'drive', 'driving', 'car', 'van', 'rv',
    'camper', 'motorcycle', 'route', 'highway', 'scenic drive', 'cross-country',
    'cross country', 'overland', 'bus', 'train', 'rail',
  ],
}

/**
 * Returns true if the journey matches the given category key.
 * Searches across: tags, title, summary, countries, startPlace, endPlace, transportModes.
 */
export function journeyMatchesCategory(journey: JourneySummary, categoryKey: string): boolean {
  const keywords = CATEGORY_MATCHERS[categoryKey]
  if (!keywords) return false

  const haystack = [
    ...journey.tags,
    journey.title,
    journey.summary,
    journey.startPlace,
    journey.endPlace,
    ...journey.countries,
    ...journey.transportModes,
  ]
    .join(' ')
    .toLowerCase()

  return keywords.some(kw => haystack.includes(kw))
}

// ─── UI Component ────────────────────────────────────────────────────────────

interface Category {
  label: string
  key: string
  icon: ReactNode
  accent: string
}

const CATEGORIES: Category[] = [
  { label: 'Adventure', key: 'adventure', icon: <Compass size={18} />, accent: '#E07B39' },
  { label: 'Food',      key: 'food',      icon: <Utensils size={18} />, accent: '#D9534F' },
  { label: 'Culture',   key: 'culture',   icon: <Landmark size={18} />, accent: '#9B59B6' },
  { label: 'Beach',     key: 'beach',     icon: <Waves size={18} />,    accent: '#1A9ECC' },
  { label: 'City',      key: 'city',      icon: <Building2 size={18} />, accent: '#3D7EAA' },
  { label: 'Nature',    key: 'nature',    icon: <TreePine size={18} />, accent: '#27AE60' },
  { label: 'Road Trip', key: 'road trip', icon: <Car size={18} />,      accent: '#8C52FF' },
]

interface Props {
  activeCategory: string | null
  /** Count of journeys matching each category key (for the badge) */
  matchCounts?: Record<string, number>
  onSelectCategory: (key: string | null) => void
}

export default function JourneyCategoryStrip({ activeCategory, matchCounts, onSelectCategory }: Props) {
  return (
    <nav
      className="px-4 sm:px-0 py-3 flex gap-2.5 overflow-x-auto scrollbar-none"
      aria-label="Browse by category"
    >
      {CATEGORIES.map(cat => {
        const isActive = activeCategory === cat.key
        const count = matchCounts?.[cat.key]
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelectCategory(isActive ? null : cat.key)}
            aria-pressed={isActive}
            aria-label={`Filter by ${cat.label}${count !== undefined ? ` (${count} journeys)` : ''}${isActive ? ' — active, tap to clear' : ''}`}
            className="flex-shrink-0 inline-flex flex-col items-center gap-1.5 px-3.5 pt-2.5 pb-2 rounded-2xl text-xs font-bold transition-all duration-200 min-w-[62px] relative"
            style={{
              border: `1.5px solid ${isActive ? cat.accent : 'var(--border)'}`,
              background: isActive ? `${cat.accent}18` : 'var(--surface)',
              color: isActive ? cat.accent : 'var(--fg-muted)',
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 0 2px ${cat.accent}28` : 'none',
            }}
          >
            <span style={{ color: isActive ? cat.accent : 'var(--fg-muted)' }}>
              {cat.icon}
            </span>
            {cat.label}
            {/* Match count badge */}
            {count !== undefined && count > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: isActive ? cat.accent : 'var(--border)', color: isActive ? '#fff' : 'var(--fg-muted)' }}
                aria-hidden="true"
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

