import { Search, X } from 'lucide-react'

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CommunitySearchBar({
  value,
  onChange,
  placeholder = 'Search questions, tips, and groups…',
}: Props) {
  const syncChange = (next: string) => {
    onChange(next)
    const input = document.getElementById('cm-search') as HTMLInputElement | null
    if (input) setNativeInputValue(input, next)
  }

  return (
    <label className="cm-hub__search">
      <Search size={17} strokeWidth={2.25} aria-hidden />
      <span className="visually-hidden">Search community</span>
      <input
        type="search"
        value={value}
        onChange={(event) => syncChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value ? (
        <button
          type="button"
          className="cm-hub__search-clear"
          onClick={() => syncChange('')}
          aria-label="Clear search"
        >
          <X size={15} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </label>
  )
}
