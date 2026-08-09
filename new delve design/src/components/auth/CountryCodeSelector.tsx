import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { authConfig } from '../../data/authConfig'
import type { CountryDialCode } from '../../data/authConfig'

export interface CountryCodeSelectorProps {
  value: string
  onChange?: (countryCode: string) => void
  countries?: CountryDialCode[]
  disabled?: boolean
  /** Visually hidden label — the paired phone field carries the visible one. */
  label?: string
}

export default function CountryCodeSelector({
  value,
  onChange,
  countries = authConfig.countries,
  disabled = false,
  label = 'Country dialling code',
}: CountryCodeSelectorProps) {
  const id = useId()
  const selected = countries.find(country => country.code === value) ?? countries[0]

  return (
    <div className="relative flex-shrink-0">
      <label htmlFor={id} className="auth-visually-hidden">
        {label}
      </label>
      <select
        id={id}
        value={selected.code}
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
        className="text-base font-medium appearance-none"
        style={{
          minHeight: 48,
          height: 48,
          paddingLeft: 12,
          paddingRight: 34,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface)',
          color: 'var(--fg)',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {countries.map(country => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.dialCode}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        aria-hidden="true"
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--fg-muted)' }}
      />
    </div>
  )
}
