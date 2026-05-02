/**
 * User-selectable country (ISO 3166-1 alpha-2) and default currency (ISO 4217)
 * for price display. Keep in sync with backend Profile.country_code / preferred_currency.
 */
export type CountryRow = { code: string; name: string; defaultCurrency: string }

export const COUNTRY_ROWS: CountryRow[] = [
  { code: 'NA', name: 'Namibia', defaultCurrency: 'NAD' },
  { code: 'ZA', name: 'South Africa', defaultCurrency: 'ZAR' },
  { code: 'BW', name: 'Botswana', defaultCurrency: 'BWP' },
  { code: 'AO', name: 'Angola', defaultCurrency: 'AOA' },
  { code: 'ZM', name: 'Zambia', defaultCurrency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', defaultCurrency: 'ZWL' },
  { code: 'MZ', name: 'Mozambique', defaultCurrency: 'MZN' },
  { code: 'LS', name: 'Lesotho', defaultCurrency: 'LSL' },
  { code: 'SZ', name: 'Eswatini', defaultCurrency: 'SZL' },
  { code: 'KE', name: 'Kenya', defaultCurrency: 'KES' },
  { code: 'TZ', name: 'Tanzania', defaultCurrency: 'TZS' },
  { code: 'UG', name: 'Uganda', defaultCurrency: 'UGX' },
  { code: 'NG', name: 'Nigeria', defaultCurrency: 'NGN' },
  { code: 'GH', name: 'Ghana', defaultCurrency: 'GHS' },
  { code: 'US', name: 'United States', defaultCurrency: 'USD' },
  { code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP' },
  { code: 'DE', name: 'Germany', defaultCurrency: 'EUR' },
  { code: 'FR', name: 'France', defaultCurrency: 'EUR' },
  { code: 'NL', name: 'Netherlands', defaultCurrency: 'EUR' },
  { code: 'IT', name: 'Italy', defaultCurrency: 'EUR' },
  { code: 'ES', name: 'Spain', defaultCurrency: 'EUR' },
  { code: 'PT', name: 'Portugal', defaultCurrency: 'EUR' },
  { code: 'AT', name: 'Austria', defaultCurrency: 'EUR' },
  { code: 'CH', name: 'Switzerland', defaultCurrency: 'CHF' },
  { code: 'SE', name: 'Sweden', defaultCurrency: 'SEK' },
  { code: 'NO', name: 'Norway', defaultCurrency: 'NOK' },
  { code: 'DK', name: 'Denmark', defaultCurrency: 'DKK' },
  { code: 'PL', name: 'Poland', defaultCurrency: 'PLN' },
  { code: 'AU', name: 'Australia', defaultCurrency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', defaultCurrency: 'NZD' },
  { code: 'CA', name: 'Canada', defaultCurrency: 'CAD' },
  { code: 'IN', name: 'India', defaultCurrency: 'INR' },
  { code: 'AE', name: 'United Arab Emirates', defaultCurrency: 'AED' },
].sort((a, b) => a.name.localeCompare(b.name))

const extraCurrencies: { code: string; label: string }[] = [
  { code: 'USD', label: 'USD — US dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British pound' },
  { code: 'NAD', label: 'NAD — Namibian dollar' },
  { code: 'ZAR', label: 'ZAR — South African rand' },
  { code: 'BWP', label: 'BWP — Botswana pula' },
  { code: 'AOA', label: 'AOA — Angolan kwanza' },
  { code: 'ZMW', label: 'ZMW — Zambian kwacha' },
  { code: 'ZWL', label: 'ZWL — Zimbabwean dollar' },
  { code: 'MZN', label: 'MZN — Mozambican metical' },
  { code: 'LSL', label: 'LSL — Lesotho loti' },
  { code: 'SZL', label: 'SZL — Swazi lilangeni' },
  { code: 'KES', label: 'KES — Kenyan shilling' },
  { code: 'TZS', label: 'TZS — Tanzanian shilling' },
  { code: 'UGX', label: 'UGX — Ugandan shilling' },
  { code: 'NGN', label: 'NGN — Nigerian naira' },
  { code: 'GHS', label: 'GHS — Ghanaian cedi' },
  { code: 'CHF', label: 'CHF — Swiss franc' },
  { code: 'SEK', label: 'SEK — Swedish krona' },
  { code: 'NOK', label: 'NOK — Norwegian krone' },
  { code: 'DKK', label: 'DKK — Danish krone' },
  { code: 'PLN', label: 'PLN — Polish złoty' },
  { code: 'AUD', label: 'AUD — Australian dollar' },
  { code: 'NZD', label: 'NZD — New Zealand dollar' },
  { code: 'CAD', label: 'CAD — Canadian dollar' },
  { code: 'INR', label: 'INR — Indian rupee' },
  { code: 'AED', label: 'AED — UAE dirham' },
]

export const CURRENCY_OPTIONS = extraCurrencies.sort((a, b) => a.label.localeCompare(b.label))

export function defaultCurrencyForCountry(countryCode: string): string {
  if (!countryCode) return ''
  const row = COUNTRY_ROWS.find((c) => c.code === countryCode)
  return row?.defaultCurrency ?? ''
}
