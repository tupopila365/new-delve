import { useEffect, useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import './ServiceProviderPageHeader.css'

type Props = {
  title: string
  subtitle?: string
  eyebrow?: string
  searchPlaceholder?: string
  searchInputSelector?: string
  filterButtonSelector?: string
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export function ServiceProviderPageHeader({
  title,
  subtitle,
  eyebrow = 'Service providers',
  searchPlaceholder = 'Search providers',
  searchInputSelector,
  filterButtonSelector,
}: Props) {
  const [searchValue, setSearchValue] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (!searchInputSelector) return
    const input = document.querySelector<HTMLInputElement>(searchInputSelector)
    if (!input) return
    setSearchValue(input.value)
  }, [searchInputSelector])

  const onSearchChange = (value: string) => {
    setSearchValue(value)
    if (!searchInputSelector) return
    const input = document.querySelector<HTMLInputElement>(searchInputSelector)
    if (input) setNativeInputValue(input, value)
  }

  const clearSearch = () => onSearchChange('')

  const toggleFilters = () => {
    setFiltersOpen((open) => !open)
    if (!filterButtonSelector) return
    const button = document.querySelector<HTMLButtonElement>(filterButtonSelector)
    button?.click()
  }

  return (
    <section className="sp-header" aria-label={`${title} header`}>
      <div className="sp-header__copy">
        <p className="sp-header__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="sp-header__subtitle">{subtitle}</p> : null}
      </div>

      <div className="sp-header__tools">
        <label className="sp-header__search">
          <Search size={17} strokeWidth={2.25} aria-hidden />
          <span className="visually-hidden">Search {title}</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchValue ? (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              <X size={15} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          className={filtersOpen ? 'sp-header__filter sp-header__filter--active' : 'sp-header__filter'}
          onClick={toggleFilters}
          aria-expanded={filtersOpen}
        >
          <Filter size={16} strokeWidth={2.25} aria-hidden />
          <span>{filtersOpen ? 'Hide filters' : 'Filters'}</span>
        </button>
      </div>
    </section>
  )
}
