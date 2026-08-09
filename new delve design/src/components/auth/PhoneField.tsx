import { Phone } from 'lucide-react'
import TextField from './TextField'
import CountryCodeSelector from './CountryCodeSelector'
import { countryByCode } from '../../data/authConfig'
import type { FieldState } from '../../data/authConfig'

export interface PhoneFieldProps {
  label?: string
  countryCode: string
  onCountryChange?: (code: string) => void
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  hint?: string
  error?: string
  successMessage?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  loading?: boolean
  previewState?: FieldState
  optionalLabel?: boolean
}

export default function PhoneField({
  label = 'Phone number',
  countryCode,
  onCountryChange,
  value,
  onChange,
  onBlur,
  hint,
  error,
  successMessage,
  disabled = false,
  readOnly = false,
  required = false,
  loading = false,
  previewState,
  optionalLabel = false,
}: PhoneFieldProps) {
  const country = countryByCode(countryCode)
  const defaultHint = `${country.dialCode} · ${country.exampleLength} digits, without the leading zero`

  return (
    <TextField
      label={optionalLabel ? `${label} (optional)` : label}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      value={value}
      onChange={next => onChange?.(next.replace(/[^\d\s]/g, ''))}
      onBlur={onBlur}
      hint={hint ?? defaultHint}
      error={error}
      successMessage={successMessage}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      loading={loading}
      previewState={previewState}
      iconLeft={<Phone size={17} />}
      maxLength={country.exampleLength + 4}
      leading={
        <CountryCodeSelector
          value={countryCode}
          onChange={onCountryChange}
          disabled={disabled || readOnly || previewState === 'disabled'}
        />
      }
    />
  )
}
