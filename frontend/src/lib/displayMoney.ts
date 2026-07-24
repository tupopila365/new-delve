/**
 * Display-only money formatting for Explore destination currency.
 * Niche 3: no FX conversion — same numeric amounts, local symbol/code labels.
 */

const SYMBOLS: Record<string, string> = {
  NAD: 'N$',
  ZAR: 'R',
  BWP: 'P',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh',
  TZS: 'TSh',
  UGX: 'USh',
  NGN: '₦',
  GHS: 'GH₵',
  AOA: 'Kz',
  ZMW: 'ZK',
  MZN: 'MT',
  AUD: 'A$',
  NZD: 'NZ$',
  CAD: 'C$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  INR: '₹',
  AED: 'AED',
  LSL: 'L',
  SZL: 'E',
  ZWL: 'Z$',
}

export function normalizeCurrencyCode(code: string | null | undefined): string {
  return (code || '').trim().toUpperCase()
}

/** Compact symbol for UI (falls back to "CODE "). */
export function currencySymbol(code: string | null | undefined): string {
  const c = normalizeCurrencyCode(code)
  if (!c) return ''
  return SYMBOLS[c] ?? `${c} `
}

export type FormatDisplayMoneyOptions = {
  /** Appended after the amount, e.g. "/night". Leading space added if missing. */
  suffix?: string
  /** Force decimals (default: trim .00). */
  decimals?: number | 'auto'
  /** When amount is empty/invalid. Default: empty string. */
  fallback?: string
  /** Prefix "From " for catalogue cards. */
  from?: boolean
}

function parseAmount(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function formatNumber(n: number, decimals: number | 'auto'): string {
  if (decimals === 'auto') {
    const fixed = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '')
    const [whole, frac] = fixed.split('.')
    const withSep = Number(whole).toLocaleString('en-US')
    return frac ? `${withSep}.${frac}` : withSep
  }
  const fixed = n.toFixed(decimals)
  const [whole, frac] = fixed.split('.')
  const withSep = Number(whole).toLocaleString('en-US')
  return decimals > 0 ? `${withSep}.${frac}` : withSep
}

/**
 * Format an amount in a display currency (Explore destination by default).
 * Example: formatDisplayMoney(1200, 'ZAR', { suffix: '/night', from: true }) → "From R1,200/night"
 */
export function formatDisplayMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  options: FormatDisplayMoneyOptions = {},
): string {
  const { suffix = '', decimals = 'auto', fallback = '', from = false } = options
  const n = parseAmount(amount)
  if (n == null) return fallback

  const symbol = currencySymbol(currency)
  const code = normalizeCurrencyCode(currency)
  const num = formatNumber(n, decimals)
  const money =
    symbol && !symbol.endsWith(' ')
      ? `${symbol}${num}`
      : code
        ? `${code} ${num}`
        : num

  const suf = suffix ? (suffix.startsWith('/') || suffix.startsWith(' ') ? suffix : ` ${suffix}`) : ''
  const body = `${money}${suf}`
  return from ? `From ${body}` : body
}

/** Filter / chip labels like "Under R800". */
export function formatMoneyThreshold(
  amount: string | number,
  currency: string | null | undefined,
  kind: 'under' | 'from' | 'plain' = 'plain',
): string {
  const money = formatDisplayMoney(amount, currency)
  if (kind === 'under') return `Under ${money}`
  if (kind === 'from') return `From ${money}`
  return money
}
