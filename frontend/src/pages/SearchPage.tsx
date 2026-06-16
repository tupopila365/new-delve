import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BedDouble, Car, Compass, Search, Ticket, UserRound, Utensils } from 'lucide-react'
import { QuickFilterChips } from '../components/marketplace'
import './SearchPage.css'

const SEARCH_CATEGORIES = [
  { id: 'profile', label: 'Profile', Icon: UserRound },
  { id: 'food', label: 'Eat out', Icon: Utensils },
  { id: 'stay', label: 'Stay', Icon: BedDouble },
  { id: 'events', label: 'Events', Icon: Ticket },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'transport', label: 'Transport', Icon: Car },
] as const

type SearchCategory = (typeof SEARCH_CATEGORIES)[number]['id']

const PLACEHOLDERS: Record<SearchCategory, string> = {
  profile: 'Search people and profiles…',
  food: 'Search restaurants, cafés, and bars…',
  stay: 'Search hotels, lodges, and stays…',
  events: 'Search events and tickets…',
  guides: 'Search local guides and tours…',
  transport: 'Search rentals, routes, and trips…',
}

function isSearchCategory(value: string | null): value is SearchCategory {
  return SEARCH_CATEGORIES.some((category) => category.id === value)
}

function writeSearchParams(q: string, category: SearchCategory | '') {
  const params: Record<string, string> = {}
  const trimmed = q.trim()
  if (trimmed) params.q = trimmed
  if (category) params.category = category
  return params
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q')?.trim() ?? ''
  const urlCategory = searchParams.get('category')?.trim() ?? ''
  const [q, setQ] = useState(urlQ)
  const [category, setCategory] = useState<SearchCategory | ''>(
    isSearchCategory(urlCategory) ? urlCategory : '',
  )

  useEffect(() => {
    setQ(searchParams.get('q')?.trim() ?? '')
    const nextCategory = searchParams.get('category')?.trim() ?? ''
    setCategory(isSearchCategory(nextCategory) ? nextCategory : '')
  }, [searchParams])

  const placeholder = useMemo(() => {
    if (category) return PLACEHOLDERS[category]
    return 'Search DELVE…'
  }, [category])

  function syncParams(nextQ: string, nextCategory: SearchCategory | '') {
    setSearchParams(writeSearchParams(nextQ, nextCategory))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    syncParams(q, category)
  }

  function onCategoryClick(id: string) {
    const next = category === id ? '' : (id as SearchCategory)
    setCategory(next)
    syncParams(q, next)
  }

  return (
    <div className="search-page-simple">
      <div className="search-page-simple__panel">
        <form className="search-page-simple__form" onSubmit={onSubmit} role="search" aria-label="Search DELVE">
          <label className="visually-hidden" htmlFor="global-search-q">
            Search DELVE
          </label>
          <div className="search-page-simple__field">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="global-search-q"
              type="search"
              placeholder={placeholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              autoFocus
            />
          </div>
        </form>

        <QuickFilterChips
          ariaLabel="Search category"
          className="search-page-simple__categories"
          chips={SEARCH_CATEGORIES.map((item) => ({
            id: item.id,
            label: item.label,
            Icon: item.Icon,
            active: category === item.id,
          }))}
          onChipClick={onCategoryClick}
        />
      </div>
    </div>
  )
}
