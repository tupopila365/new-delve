import { useCallback, useMemo } from 'react'
import {
  currencySymbol,
  formatDisplayMoney,
  formatMoneyThreshold,
  type FormatDisplayMoneyOptions,
} from '../lib/displayMoney'
import { defaultCurrencyForCountry } from '../lib/countryCurrencyPreferences'
import { useAuth } from '../auth/AuthContext'
import { useExploreDestination } from './useExploreDestination'

/**
 * Prices follow Explore destination currency while Exploring;
 * in My Delve they follow preferred / home-country currency (display-only; no FX).
 */
export function useDisplayMoney() {
  const { exploring, currency: exploreCurrency, country, countryLabel } = useExploreDestination()
  const { profile } = useAuth()

  const currency = useMemo(() => {
    if (exploring) return exploreCurrency
    const preferred = (profile?.preferred_currency || '').trim().toUpperCase()
    if (preferred && /^[A-Z]{3}$/.test(preferred)) return preferred
    const home = (profile?.country_code || '').trim().toUpperCase()
    if (home) return defaultCurrencyForCountry(home) || exploreCurrency
    return exploreCurrency
  }, [exploring, exploreCurrency, profile?.preferred_currency, profile?.country_code])

  const format = useCallback(
    (amount: string | number | null | undefined, options?: FormatDisplayMoneyOptions) =>
      formatDisplayMoney(amount, currency, options),
    [currency],
  )

  const threshold = useCallback(
    (amount: string | number, kind: 'under' | 'from' | 'plain' = 'plain') =>
      formatMoneyThreshold(amount, currency, kind),
    [currency],
  )

  return useMemo(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      country,
      countryLabel,
      exploring,
      format,
      threshold,
    }),
    [currency, country, countryLabel, exploring, format, threshold],
  )
}
